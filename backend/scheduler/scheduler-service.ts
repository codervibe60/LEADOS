import cron, { ScheduledTask } from 'node-cron';
import { PipelineOrchestrator } from '../orchestrator/pipeline-orchestrator';
import { createLeadOSAgents } from '../agents/leados';

interface ScheduledJobDef {
  id: string;
  name: string;
  cronExpr: string;
  timezone: string;
  agentIds: string[];
  pipelineConfig?: Record<string, any>;
  enabled: boolean;
}

interface JobExecution {
  jobId: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  completedAt?: string;
  error?: string;
  results?: Record<string, any>;
}

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private orchestrator: PipelineOrchestrator;
  private executions: Map<string, JobExecution> = new Map();

  constructor() {
    const agents = createLeadOSAgents();
    this.orchestrator = new PipelineOrchestrator(agents);
  }

  /**
   * Schedule a job with a cron expression.
   * The job will run the specified agents in sequence via the pipeline orchestrator.
   */
  scheduleJob(job: ScheduledJobDef): void {
    // Remove existing task if re-scheduling
    this.removeJob(job.id);

    if (!job.enabled) return;

    if (!cron.validate(job.cronExpr)) {
      throw new Error(`Invalid cron expression: ${job.cronExpr}`);
    }

    const task = cron.schedule(
      job.cronExpr,
      async () => {
        await this.executeJob(job);
      },
      { timezone: job.timezone, name: job.id }
    );

    this.tasks.set(job.id, task);
    console.log(`[Scheduler] Job "${job.name}" scheduled: ${job.cronExpr} (${job.timezone})`);
  }

  /**
   * Execute a job immediately (used by cron trigger or manual trigger).
   */
  async executeJob(job: ScheduledJobDef): Promise<JobExecution> {
    const execution: JobExecution = {
      jobId: job.id,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    this.executions.set(job.id, execution);

    console.log(`[Scheduler] Running job "${job.name}" — agents: ${job.agentIds.join(', ')}`);

    try {
      const pipelineId = `sched_${job.id}_${Date.now()}`;
      const results = await this.orchestrator.runPipeline(
        pipelineId,
        'leados',
        job.agentIds,
        job.pipelineConfig || {}
      );

      execution.status = 'success';
      execution.completedAt = new Date().toISOString();
      execution.results = results;

      console.log(`[Scheduler] Job "${job.name}" completed successfully`);
      return execution;
    } catch (error: any) {
      execution.status = 'error';
      execution.completedAt = new Date().toISOString();
      execution.error = error.message;

      console.error(`[Scheduler] Job "${job.name}" failed:`, error.message);
      return execution;
    }
  }

  /** Remove a scheduled job */
  removeJob(jobId: string): void {
    const task = this.tasks.get(jobId);
    if (task) {
      task.stop();
      this.tasks.delete(jobId);
    }
  }

  /** Get the last execution for a job */
  getLastExecution(jobId: string): JobExecution | undefined {
    return this.executions.get(jobId);
  }

  /** Get all active job IDs */
  getActiveJobs(): string[] {
    return Array.from(this.tasks.keys());
  }

  /** Stop all scheduled jobs */
  stopAll(): void {
    for (const [id, task] of this.tasks) {
      task.stop();
      console.log(`[Scheduler] Stopped job ${id}`);
    }
    this.tasks.clear();
  }

  /** Validate a cron expression */
  static validateCron(expr: string): boolean {
    return cron.validate(expr);
  }
}

// Singleton instance
let instance: SchedulerService | null = null;

export function getScheduler(): SchedulerService {
  if (!instance) {
    instance = new SchedulerService();
  }
  return instance;
}

export type { ScheduledJobDef, JobExecution };
