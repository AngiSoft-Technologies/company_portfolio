import { Card, Hero, Section } from '@angisoft/ui';
import { fetchProjects } from '@/hooks/data/useProjects';
import { useAsync } from '@/hooks/useAsync';

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400',
  active: 'bg-[#0875FF]/10 text-[#0875FF]',
  in_progress: 'bg-[#0875FF]/10 text-[#0875FF]',
  on_hold: 'bg-amber-500/10 text-amber-400',
  planning: 'bg-slate-500/10 text-slate-400',
};

const statusClass = (status: string): string => {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_STYLES[key] ?? 'bg-slate-500/10 text-slate-400';
};

export default function Projects() {
  const projects = useAsync(fetchProjects, []);

  const sorted = (projects.data ?? [])
    .slice()
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

  return (
    <>
      <Hero
        badge="Our work"
        title="Projects we're proud of"
        subtitle="A selection of platforms, products and experiments we've shipped."
      />

      <Section>
        {projects.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!projects.loading && (!projects.data || projects.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Projects will appear here shortly.
          </div>
        ) : null}
        {!projects.loading && sorted.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((project) => (
              <Card key={project.id} hoverable className="overflow-hidden">
                {project.image ? (
                  <img src={project.image} alt={project.title} className="h-44 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-[var(--surface-hover)] text-3xl font-black text-[var(--text-muted)]">
                    {project.title.charAt(0)}
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{project.title}</h3>
                    {project.status ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(project.status)}`}>
                        {project.status}
                      </span>
                    ) : null}
                  </div>
                  {project.client ? (
                    <p className="mt-1 text-sm font-medium text-[#0875FF]">{project.client}</p>
                  ) : null}
                  {project.category ? (
                    <p className="mt-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      {project.category}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{project.description}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </Section>
    </>
  );
}