/**
 * In-memory job store with JSON file persistence.
 * Swap for Prisma when DB is fully configured.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface StoredJob {
  id: string;
  name: string;
  cronExpr: string;
  timezone: string;
  agentIds: string[];
  pipelineConfig?: Record<string, any>;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  lastStatus?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const STORE_PATH = join(process.cwd(), 'data', 'scheduled-jobs.json');

function ensureDir() {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) {
    const { mkdirSync } = require('fs');
    mkdirSync(dir, { recursive: true });
  }
}

function loadJobs(): StoredJob[] {
  try {
    if (existsSync(STORE_PATH)) {
      return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch {}
  return getDefaultJobs();
}

function saveJobs(jobs: StoredJob[]) {
  ensureDir();
  writeFileSync(STORE_PATH, JSON.stringify(jobs, null, 2));
}

function getDefaultJobs(): StoredJob[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'daily-research',
      name: 'Daily Service Research',
      cronExpr: '0 8 * * *',
      timezone: 'America/New_York',
      agentIds: ['service-research'],
      enabled: true,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'daily-full-pipeline',
      name: 'Daily Full Pipeline',
      cronExpr: '0 9 * * 1-5',
      timezone: 'America/New_York',
      agentIds: [
        'service-research', 'offer-engineering', 'validation',
        'funnel-builder', 'content-creative', 'paid-traffic',
        'outbound-outreach', 'inbound-capture', 'ai-qualification',
        'sales-routing', 'tracking-attribution', 'performance-optimization',
        'crm-hygiene',
      ],
      enabled: false,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'hourly-optimization',
      name: 'Hourly Performance Check',
      cronExpr: '0 * * * *',
      timezone: 'UTC',
      agentIds: ['performance-optimization', 'tracking-attribution'],
      enabled: false,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'nightly-crm-cleanup',
      name: 'Nightly CRM Hygiene',
      cronExpr: '0 2 * * *',
      timezone: 'America/New_York',
      agentIds: ['crm-hygiene'],
      enabled: false,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// Job store operations
export function getAllJobs(): StoredJob[] {
  return loadJobs();
}

export function getJob(id: string): StoredJob | undefined {
  return loadJobs().find((j) => j.id === id);
}

export function createJob(job: Omit<StoredJob, 'runCount' | 'createdAt' | 'updatedAt'>): StoredJob {
  const jobs = loadJobs();
  const now = new Date().toISOString();
  const newJob: StoredJob = { ...job, runCount: 0, createdAt: now, updatedAt: now };
  jobs.push(newJob);
  saveJobs(jobs);
  return newJob;
}

export function updateJob(id: string, update: Partial<StoredJob>): StoredJob | null {
  const jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...update, updatedAt: new Date().toISOString() };
  saveJobs(jobs);
  return jobs[idx];
}

export function deleteJob(id: string): boolean {
  const jobs = loadJobs();
  const filtered = jobs.filter((j) => j.id !== id);
  if (filtered.length === jobs.length) return false;
  saveJobs(filtered);
  return true;
}

export function recordJobRun(id: string, status: string, error?: string): void {
  const jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return;
  jobs[idx].lastRunAt = new Date().toISOString();
  jobs[idx].runCount += 1;
  jobs[idx].lastStatus = status;
  jobs[idx].lastError = error || undefined;
  jobs[idx].updatedAt = new Date().toISOString();
  saveJobs(jobs);
}

export type { StoredJob };
