import { Card, Hero, Section } from '@angisoft/ui';
import { fetchCareers } from '@/hooks/data/useCareers';
import { useAsync } from '@/hooks/useAsync';

export default function Careers() {
  const careers = useAsync(fetchCareers, []);

  return (
    <>
      <Hero
        badge="Careers"
        title="Build your career building Africa's software"
        subtitle="Join a small, high-trust team shipping real products. Remote-friendly, Nairobi-rooted."
      />

      <Section>
        {careers.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!careers.loading && (!careers.data || careers.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            No open roles right now — check back soon.
          </div>
        ) : null}
        {!careers.loading && careers.data ? (
          <div className="flex flex-col gap-4">
            {careers.data.map((career) => (
              <details
                key={career.id}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 open:bg-[var(--surface-hover)]"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{career.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium text-[var(--text-muted)]">
                      {career.department ? (
                        <span className="rounded-full bg-[#0875FF]/10 px-3 py-1 text-[#0875FF]">
                          {career.department}
                        </span>
                      ) : null}
                      {career.location ? (
                        <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1">
                          {career.location}
                        </span>
                      ) : null}
                      {career.type ? (
                        <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1">{career.type}</span>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-[#0875FF] transition-transform group-open:rotate-45">＋</span>
                </summary>
                {career.description ? (
                  <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">{career.description}</p>
                ) : null}
              </details>
            ))}
          </div>
        ) : null}
      </Section>
    </>
  );
}