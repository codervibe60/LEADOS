import { NextResponse } from 'next/server';
import { getJob, updateJob, deleteJob, recordJobRun } from '../../../../../backend/scheduler/job-store';
import { getScheduler } from '../../../../../backend/scheduler/scheduler-service';

// GET /api/scheduler/:id — get a single job
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const scheduler = getScheduler();
  return NextResponse.json({
    ...job,
    agentIds: typeof job.agentIds === 'string' ? JSON.parse(job.agentIds as string) : job.agentIds,
    isRunning: scheduler.getActiveJobs().includes(id),
    lastExecution: scheduler.getLastExecution(id) || null,
  });
}

// PATCH /api/scheduler/:id — update a job (toggle enabled, change cron, etc.)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const scheduler = getScheduler();

  // Validate cron if provided
  if (body.cronExpr) {
    const { default: cron } = await import('node-cron');
    if (!cron.validate(body.cronExpr)) {
      return NextResponse.json({ error: `Invalid cron expression: ${body.cronExpr}` }, { status: 400 });
    }
  }

  const updated = updateJob(id, body);
  if (!updated) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  // Re-schedule or remove based on enabled state
  if (updated.enabled) {
    scheduler.scheduleJob({
      id: updated.id,
      name: updated.name,
      cronExpr: updated.cronExpr,
      timezone: updated.timezone,
      agentIds: typeof updated.agentIds === 'string' ? JSON.parse(updated.agentIds as string) : updated.agentIds,
      pipelineConfig: updated.pipelineConfig ? (typeof updated.pipelineConfig === 'string' ? JSON.parse(updated.pipelineConfig) : updated.pipelineConfig) : undefined,
      enabled: true,
    });
  } else {
    scheduler.removeJob(id);
  }

  return NextResponse.json(updated);
}

// DELETE /api/scheduler/:id — delete a job
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scheduler = getScheduler();
  scheduler.removeJob(id);
  const deleted = deleteJob(id);
  if (!deleted) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

// POST /api/scheduler/:id — trigger a job manually (run now)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const scheduler = getScheduler();
  const agentIds = typeof job.agentIds === 'string' ? JSON.parse(job.agentIds as string) : job.agentIds;
  const config = job.pipelineConfig ? (typeof job.pipelineConfig === 'string' ? JSON.parse(job.pipelineConfig) : job.pipelineConfig) : {};

  const execution = await scheduler.executeJob({
    id: job.id,
    name: job.name,
    cronExpr: job.cronExpr,
    timezone: job.timezone,
    agentIds,
    pipelineConfig: config,
    enabled: job.enabled,
  });

  recordJobRun(id, execution.status, execution.error);

  return NextResponse.json(execution);
}
