import { NextResponse } from 'next/server';
import { getAllJobs, createJob, updateJob } from '../../../../backend/scheduler/job-store';
import { getScheduler } from '../../../../backend/scheduler/scheduler-service';

// GET /api/scheduler — list all scheduled jobs
export async function GET() {
  const jobs = getAllJobs();
  const scheduler = getScheduler();
  const activeJobs = scheduler.getActiveJobs();

  return NextResponse.json(
    jobs.map((job) => ({
      ...job,
      agentIds: typeof job.agentIds === 'string' ? JSON.parse(job.agentIds) : job.agentIds,
      isRunning: activeJobs.includes(job.id),
      lastExecution: scheduler.getLastExecution(job.id) || null,
    }))
  );
}

// POST /api/scheduler — create a new scheduled job
export async function POST(req: Request) {
  const body = await req.json();
  const { name, cronExpr, timezone, agentIds, pipelineConfig, enabled } = body;

  if (!name || !cronExpr || !agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
    return NextResponse.json({ error: 'name, cronExpr, and agentIds[] are required' }, { status: 400 });
  }

  const { default: cron } = await import('node-cron');
  if (!cron.validate(cronExpr)) {
    return NextResponse.json({ error: `Invalid cron expression: ${cronExpr}` }, { status: 400 });
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const job = createJob({
    id,
    name,
    cronExpr,
    timezone: timezone || 'UTC',
    agentIds,
    pipelineConfig,
    enabled: enabled !== false,
  });

  // Schedule if enabled
  if (job.enabled) {
    const scheduler = getScheduler();
    scheduler.scheduleJob({
      id: job.id,
      name: job.name,
      cronExpr: job.cronExpr,
      timezone: job.timezone,
      agentIds: job.agentIds,
      pipelineConfig: job.pipelineConfig,
      enabled: true,
    });
  }

  return NextResponse.json(job, { status: 201 });
}
