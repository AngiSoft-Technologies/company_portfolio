import { Link, useParams } from 'react-router-dom';
import { Button, Card } from '@angisoft/ui';
import { clientApiGet } from '@angisoft/api-client';
import { useAsync } from '@/hooks/useAsync';

interface ProjectStep {
  id?: string;
  title?: string;
  status?: string;
  order?: number;
  completed?: boolean;
}

interface ProjectDetail {
  id?: string;
  title?: string;
  status?: string | null;
  description?: string | null;
  progress?: number | null;
  steps?: ProjectStep[];
  client?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export default function ClientProjectTracking() {
  const { id = '' } = useParams<{ id: string }>();
  const project = useAsync(async () => {
    try {
      const res = await clientApiGet<{ data?: ProjectDetail }>(`/client-portal/projects/${id}`);
      return (res.data ?? undefined) as ProjectDetail | undefined;
    } catch {
      return undefined;
    }
  }, [id]);

  if (project.loading) {
    return <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />;
  }

  if (project.error || !project.data) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="text-6xl font-black text-[var(--border)]">404</div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Project not found</h1>
        <p className="mt-3 text-[var(--text-muted)]">This project isn't visible to your account.</p>
        <div className="mt-8 flex justify-center">
          <Link to="/portal">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const p = project.data;
  const progress = typeof p.progress === 'number' ? Math.max(0, Math.min(100, p.progress)) : null;
  const steps = Array.isArray(p.steps) ? p.steps : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{p.title ?? 'Project'}</h1>
        {p.status ? (
          <span className="mt-3 inline-block rounded-full bg-[#0875FF]/10 px-3 py-1 text-xs font-medium text-[#0875FF]">
            {p.status}
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Overview</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            {p.description ?? 'No description provided yet.'}
          </p>

          {progress !== null ? (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text-secondary)]">Progress</span>
                <span className="font-semibold text-[#0875FF]">{progress}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <div className="h-full rounded-full bg-[#0875FF]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}

          {steps.length > 0 ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Milestones</h3>
              <div className="mt-4 flex flex-col gap-4">
                {steps.map((step, i) => (
                  <div key={step.id ?? i} className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        step.completed || step.status === 'completed' || step.status === 'done'
                          ? 'bg-[#0875FF] text-white'
                          : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                      }`}
                    >
                      {step.completed || step.status === 'completed' || step.status === 'done' ? '✓' : i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {step.title ?? 'Milestone'}
                      </div>
                      {step.status ? (
                        <div className="text-sm text-[var(--text-muted)]">{step.status}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="h-fit p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Details</h2>
          <dl className="mt-4 flex flex-col gap-4 text-sm">
            {p.client ? (
              <div>
                <dt className="text-[var(--text-muted)]">Client</dt>
                <dd className="font-medium text-[var(--text-primary)]">{p.client}</dd>
              </div>
            ) : null}
            {p.startDate ? (
              <div>
                <dt className="text-[var(--text-muted)]">Started</dt>
                <dd className="font-medium text-[var(--text-primary)]">{p.startDate}</dd>
              </div>
            ) : null}
            {p.endDate ? (
              <div>
                <dt className="text-[var(--text-muted)]">Target end</dt>
                <dd className="font-medium text-[var(--text-primary)]">{p.endDate}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>
    </div>
  );
}