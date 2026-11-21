import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@angisoft/utils';
import { Badge } from '@/lib/Badge';
import { apiFetch } from '@/lib/adminApi';
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from '@/components';

/**
 * AI Workforce — the company's automated employees.
 *
 * Each agent runs on a schedule (or on demand), produces a structured report,
 * and notifies the owner team. Agents never mutate business data directly;
 * recommendations surface here and in the Approvals queue for a human to act on.
 */

interface AgentRun {
  id: string;
  agentId: string;
  agentKey: string;
  trigger: string;
  status: string;
  summary: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

interface AgentRuntime {
  key: string;
  state: 'idle' | 'working' | 'scheduled' | 'unknown';
  pending: number;
  handled: number;
  lastEventAt: string | null;
  currentTask: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  updatedAt: string;
}

interface Agent {
  id: string;
  key: string;
  name: string;
  role: string;
  department: string | null;
  kind: string;
  description: string | null;
  status: string;
  scheduleMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  config?: { paCoaching?: { at: string; note: string }[]; activeTask?: string } | null;
  runtime?: AgentRuntime | null;
  charter?: {
    mandate: string;
    autonomous: string[];
    approvalRequired: string[];
    escalateToOwner: string[];
    workflow: string[];
    kpis: string[];
  } | null;
  lastRun?: AgentRun | null;
}

interface AgentsResponse {
  agents?: Agent[];
  workforce?: Record<string, AgentRuntime> | null;
}

interface RunsResponse {
  runs?: AgentRun[];
}

const KIND_LABEL: Record<string, string> = {
  coordinator: 'Coordination',
  marketing: 'Marketing',
  sales: 'Sales',
  support: 'Customer Care',
  monitoring: 'Monitoring',
  finance: 'Finance',
  hr: 'People',
  analytics: 'Analytics',
  security: 'Security',
  workforce: 'Workforce',
};

function scheduleLabel(minutes: number): string {
  if (minutes % (7 * 24 * 60) === 0) return `every ${minutes / (7 * 24 * 60)}w`;
  if (minutes % (24 * 60) === 0) return `daily`;
  if (minutes % 60 === 0) return `every ${minutes / 60}h`;
  return `every ${minutes}m`;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const STATE_TONE: Record<string, 'green' | 'amber' | 'blue' | 'red' | 'slate'> = {
  idle: 'slate',
  working: 'green',
  scheduled: 'blue',
  unknown: 'slate',
};

export function AgentsAdmin() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [taskFor, setTaskFor] = useState<string | null>(null);
  const [taskText, setTaskText] = useState('');
  const [workforce, setWorkforce] = useState<Record<string, AgentRuntime> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [roster, feed] = await Promise.all([
        apiFetch('/admin/agents') as Promise<AgentsResponse>,
        apiFetch('/admin/agents/runs?limit=50') as Promise<RunsResponse>,
      ]);
      setAgents(roster.agents ?? []);
      setRuns(feed.runs ?? []);
      setWorkforce(roster.workforce ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Live refresh — the runtime publishes status every second; poll gently.
  useEffect(() => {
    const t = setInterval(() => { void load(true); }, 8000);
    return () => clearInterval(t);
  }, [load]);

  const runNow = async (agent: Agent) => {
    setBusyKey(agent.key);
    try {
      const body: Record<string, unknown> = {};
      if (agent.status !== 'active') body.force = true;
      if (taskFor === agent.key && taskText.trim()) body.task = taskText.trim();
      const res = (await apiFetch(`/admin/agents/${agent.key}/run`, {
        method: 'POST',
        body,
      })) as { run?: AgentRun };
      if (res.run?.status === 'failed') {
        toast.error(`${agent.name}: run failed — ${res.run.error ?? 'unknown error'}`);
      } else {
        toast.success(`${agent.name} finished a run`);
      }
      setTaskFor(null);
      setTaskText('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setBusyKey(null);
    }
  };

  const toggleStatus = async (agent: Agent) => {
    setBusyKey(agent.key);
    try {
      await apiFetch(`/admin/agents/${agent.key}`, {
        method: 'PATCH',
        body: { status: agent.status === 'active' ? 'paused' : 'active' },
      });
      toast.success(`${agent.name} ${agent.status === 'active' ? 'paused' : 'resumed'}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyKey(null);
    }
  };

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const failedRuns = runs.filter((r) => r.status === 'failed').length;
  const workingCount = agents.filter((a) => a.runtime?.state === 'working').length;
  const pendingTotal = agents.reduce((n, a) => n + Math.max(0, a.runtime?.pending ?? 0), 0);
  const handledTotal = Object.values(workforce ?? {}).reduce((n, s) => n + (s.handled ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="AI Workforce"
        subtitle="12 automated colleagues covering operations, marketing, sales, care, engineering, finance, people, analytics, security, executive support and partnerships."
        actions={
          <div className="flex gap-2">
            <Link to="/approvals?entityType=agent_action">
              <Button variant="outline">Approval queue</Button>
            </Link>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card className="!p-4">
          <div className="text-2xl font-bold">{agents.length}</div>
          <div className="text-xs text-[var(--text-muted)]">Agents on roster</div>
        </Card>
        <Card className="!p-4">
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          <div className="text-xs text-[var(--text-muted)]">Active</div>
        </Card>
        <Card className="!p-4">
          <div className="text-2xl font-bold text-blue-600">{workingCount}</div>
          <div className="text-xs text-[var(--text-muted)]">Working now</div>
        </Card>
        <Card className="!p-4">
          <div className="text-2xl font-bold text-amber-600">{pendingTotal}</div>
          <div className="text-xs text-[var(--text-muted)]">Pending items</div>
        </Card>
        <Card className="!p-4">
          <div className="text-2xl font-bold">{handledTotal}</div>
          <div className="text-xs text-[var(--text-muted)]">Events handled</div>
        </Card>
        <Card className="!p-4">
          <div className="text-2xl font-bold text-red-600">{failedRuns}</div>
          <div className="text-xs text-[var(--text-muted)]">Failed runs (recent)</div>
        </Card>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <Card><p className="text-sm text-red-600">{error}</p></Card>
      ) : agents.length === 0 ? (
        <EmptyState title="No agents found" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const last = agent.lastRun;
            return (
              <Card key={agent.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{agent.name}</span>
                      <Badge tone={agent.status === 'active' ? 'green' : 'slate'}>{agent.status}</Badge>
                      {agent.runtime ? (
                        <Badge tone={STATE_TONE[agent.runtime.state] ?? 'slate'}>{agent.runtime.state}</Badge>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-sm text-[var(--text-secondary)]">{agent.role}</div>
                  </div>
                  <Badge tone="blue">{KIND_LABEL[agent.kind] ?? agent.kind}</Badge>
                </div>
                {agent.department ? (
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{agent.department}</div>
                ) : null}
                {agent.description ? (
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">{agent.description}</p>
                ) : null}
                <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
                  <div>Schedule: {scheduleLabel(agent.scheduleMinutes)}</div>
                  {agent.runtime ? (
                    <div className="flex flex-wrap gap-x-3">
                      <span>
                        Pending:{' '}
                        <span className={agent.runtime.pending > 0 ? 'font-semibold text-amber-600' : 'font-semibold'}>
                          {agent.runtime.pending < 0 ? '—' : agent.runtime.pending}
                        </span>
                      </span>
                      <span>Handled: {agent.runtime.handled}</span>
                      {agent.runtime.lastEventAt ? <span>Last event: {timeAgo(agent.runtime.lastEventAt)}</span> : null}
                    </div>
                  ) : null}
                  {agent.runtime?.currentTask || agent.config?.activeTask ? (
                    <p className="text-blue-600">Task: {agent.runtime?.currentTask ?? agent.config?.activeTask}</p>
                  ) : null}
                  <div>
                    Last run:{' '}
                    {last ? (
                      <>
                        <Badge tone={last.status === 'success' ? 'green' : last.status === 'failed' ? 'red' : 'amber'}>{last.status}</Badge>{' '}
                        {timeAgo(last.startedAt)}
                        {last.trigger === 'manual' ? ' (manual)' : ''}
                      </>
                    ) : (
                      'never'
                    )}
                  </div>
                  {last?.summary ? (
                    <p className="line-clamp-2 text-[var(--text-secondary)]">{last.summary}</p>
                  ) : null}
                  {last?.error ? <p className="line-clamp-2 text-red-600">{last.error}</p> : null}
                  {agent.config?.paCoaching?.length ? (
                    <p className="text-[var(--text-muted)]">
                      Coaching notes: {agent.config.paCoaching.length} (latest {new Date(agent.config.paCoaching[0].at).toLocaleDateString()})
                    </p>
                  ) : null}
                </div>
                {agent.charter ? (
                  <details className="mt-3 border-t border-[var(--border-light)] pt-2 text-xs text-[var(--text-muted)]">
                    <summary className="cursor-pointer font-medium text-[var(--text-secondary)]">Role charter &amp; decision rights</summary>
                    <p className="mt-2">{agent.charter.mandate}</p>
                    <p className="mt-2"><span className="font-medium">Escalates to owner:</span> {agent.charter.escalateToOwner.join(' · ')}</p>
                    <p className="mt-1"><span className="font-medium">Needs approval:</span> {agent.charter.approvalRequired.join(' · ')}</p>
                  </details>
                ) : null}
                {taskFor === agent.key ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded border border-[var(--border-light)] bg-transparent px-2 py-1.5 text-xs"
                      placeholder="Assign a task (e.g. follow up on the Acme lead)"
                      value={taskText}
                      onChange={(e) => setTaskText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void runNow(agent); }}
                    />
                  </div>
                ) : null}
                <div className="mt-4 flex gap-2 border-t border-[var(--border-light)] pt-3">
                  <Button
                    variant="primary"
                    className="flex-1 !py-1.5 text-xs"
                    disabled={busyKey === agent.key}
                    onClick={() => void runNow(agent)}
                  >
                    {busyKey === agent.key ? 'Running…' : 'Run now'}
                  </Button>
                  <Button
                    variant="outline"
                    className="!py-1.5 text-xs"
                    disabled={busyKey === agent.key}
                    onClick={() => { setTaskFor(taskFor === agent.key ? null : agent.key); setTaskText(''); }}
                  >
                    Assign
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 !py-1.5 text-xs"
                    disabled={busyKey === agent.key}
                    onClick={() => void toggleStatus(agent)}
                  >
                    {agent.status === 'active' ? 'Pause' : 'Resume'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Recent runs
      </h2>
      <Table<AgentRun>
        rows={runs.map((r) => ({ ...r, id: r.id }))}
        columns={[
          { key: 'agentKey', header: 'Agent' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <Badge tone={r.status === 'success' ? 'green' : r.status === 'failed' ? 'red' : 'amber'}>{r.status}</Badge>,
          },
          { key: 'trigger', header: 'Trigger' },
          { key: 'startedAt', header: 'Started', render: (r) => new Date(r.startedAt).toLocaleString() },
          {
            key: 'summary',
            header: 'Summary',
            render: (r) => (
              <span className="line-clamp-1 max-w-md text-xs text-[var(--text-secondary)]">
                {r.summary ?? r.error ?? '—'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
