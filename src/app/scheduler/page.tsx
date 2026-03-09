'use client';

import { useState, useEffect } from 'react';
import { Clock, Play, Pause, Trash2, Plus, RefreshCw, CheckCircle2, XCircle, Loader2, Calendar, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduledJob {
  id: string;
  name: string;
  cronExpr: string;
  timezone: string;
  agentIds: string[];
  enabled: boolean;
  lastRunAt?: string;
  runCount: number;
  lastStatus?: string;
  lastError?: string;
  isRunning: boolean;
  createdAt: string;
}

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 8 AM', value: '0 8 * * *' },
  { label: 'Daily at 9 AM (weekdays)', value: '0 9 * * 1-5' },
  { label: 'Nightly at 2 AM', value: '0 2 * * *' },
  { label: 'Every Monday 9 AM', value: '0 9 * * 1' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
];

const AGENT_OPTIONS = [
  { id: 'service-research', name: 'Service Research' },
  { id: 'offer-engineering', name: 'Offer Engineering' },
  { id: 'validation', name: 'Validation' },
  { id: 'funnel-builder', name: 'Funnel Builder' },
  { id: 'content-creative', name: 'Content & Creative' },
  { id: 'paid-traffic', name: 'Paid Traffic' },
  { id: 'outbound-outreach', name: 'Outbound Outreach' },
  { id: 'inbound-capture', name: 'Inbound Capture' },
  { id: 'ai-qualification', name: 'AI Qualification' },
  { id: 'sales-routing', name: 'Sales Routing' },
  { id: 'tracking-attribution', name: 'Tracking & Attribution' },
  { id: 'performance-optimization', name: 'Performance Optimization' },
  { id: 'crm-hygiene', name: 'CRM Hygiene' },
];

function cronToHuman(expr: string): string {
  const parts = expr.split(' ');
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;

  if (min === '0' && hour === '*') return 'Every hour';
  if (min === '*/30') return 'Every 30 minutes';
  if (min === '0' && hour.startsWith('*/')) return `Every ${hour.replace('*/', '')} hours`;
  if (min === '0' && dow === '1-5') return `Weekdays at ${hour}:00`;
  if (min === '0' && dow === '1') return `Mondays at ${hour}:00`;
  if (min === '0' && dow === '*' && dom === '*') return `Daily at ${hour}:${min.padStart(2, '0')}`;
  return expr;
}

export default function SchedulerPage() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newCron, setNewCron] = useState('0 8 * * *');
  const [newTimezone, setNewTimezone] = useState('America/New_York');
  const [newAgents, setNewAgents] = useState<string[]>(['service-research']);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/scheduler');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const toggleJob = async (id: string, enabled: boolean) => {
    await fetch(`/api/scheduler/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    fetchJobs();
  };

  const deleteJobHandler = async (id: string) => {
    await fetch(`/api/scheduler/${id}`, { method: 'DELETE' });
    fetchJobs();
  };

  const runNow = async (id: string) => {
    setRunningJob(id);
    try {
      await fetch(`/api/scheduler/${id}`, { method: 'POST' });
    } finally {
      setRunningJob(null);
      fetchJobs();
    }
  };

  const createJobHandler = async () => {
    if (!newName || newAgents.length === 0) return;
    await fetch('/api/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        cronExpr: newCron,
        timezone: newTimezone,
        agentIds: newAgents,
        enabled: true,
      }),
    });
    setShowCreate(false);
    setNewName('');
    setNewAgents(['service-research']);
    fetchJobs();
  };

  const toggleAgent = (agentId: string) => {
    setNewAgents((prev) =>
      prev.includes(agentId) ? prev.filter((a) => a !== agentId) : [...prev, agentId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scheduler</h1>
          <p className="mt-1 text-sm text-zinc-400">Automate agent runs with cron schedules</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchJobs} className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Schedule
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/10 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Create New Scheduled Job</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Job Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Daily Research"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Timezone</label>
              <select
                value={newTimezone}
                onChange={(e) => setNewTimezone(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Kolkata">India (IST)</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs text-zinc-400">Schedule (Cron Expression)</label>
            <div className="flex flex-wrap gap-2">
              {CRON_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setNewCron(preset.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    newCron === preset.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              value={newCron}
              onChange={(e) => setNewCron(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
              placeholder="0 8 * * *"
            />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs text-zinc-400">Agents to Run</label>
            <div className="flex flex-wrap gap-2">
              {AGENT_OPTIONS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                    newAgents.includes(agent.id)
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  {agent.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={createJobHandler}
              disabled={!newName || newAgents.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create Schedule
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-12 text-center text-zinc-500">
          <Calendar className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-2">No scheduled jobs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className={cn(
              'rounded-xl border p-5 transition-colors',
              job.enabled ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-800/50 bg-zinc-950/50 opacity-60'
            )}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-white">{job.name}</h3>
                    {job.enabled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-500">
                        <Pause className="h-3 w-3" /> Paused
                      </span>
                    )}
                    {job.lastStatus === 'error' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                        <XCircle className="h-3 w-3" /> Last run failed
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cronToHuman(job.cronExpr)}
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span>{job.timezone}</span>
                    <span className="text-zinc-600">|</span>
                    <span>{job.runCount} runs</span>
                    {job.lastRunAt && (
                      <>
                        <span className="text-zinc-600">|</span>
                        <span>Last: {new Date(job.lastRunAt).toLocaleString()}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(Array.isArray(job.agentIds) ? job.agentIds : []).map((id) => (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        <Bot className="h-3 w-3 text-indigo-400" />
                        {id}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => runNow(job.id)}
                    disabled={runningJob === job.id}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 disabled:opacity-50"
                    title="Run now"
                  >
                    {runningJob === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => toggleJob(job.id, !job.enabled)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
                    title={job.enabled ? 'Pause' : 'Enable'}
                  >
                    {job.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteJobHandler(job.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
