import { Link } from 'react-router-dom';
import { Button, Card, Hero, Section } from '@angisoft/ui';
import { fetchSolutions } from '@/hooks/data/useSolutions';
import { useAsync } from '@/hooks/useAsync';

export default function Solutions() {
  const solutions = useAsync(fetchSolutions, []);

  return (
    <>
      <Hero
        badge="Solutions"
        title="Ready-made answers to common challenges"
        subtitle="Battle-tested configurations we can assemble around your workflow — fast."
      />

      <Section>
        {solutions.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!solutions.loading && (!solutions.data || solutions.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Solutions will appear here shortly.
          </div>
        ) : null}
        {!solutions.loading && solutions.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {solutions.data.map((solution) => (
              <Card key={solution.id} hoverable className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00AFFF]/10 text-xl text-[#00AFFF]">
                  {solution.icon ? solution.icon : solution.name.charAt(0)}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{solution.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {solution.title ?? solution.description}
                </p>
              </Card>
            ))}
          </div>
        ) : null}
      </Section>

      <Section className="bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Not sure which solution fits?
          </h2>
          <p className="mt-3 text-lg text-[var(--text-muted)]">
            Describe your challenge and we'll recommend the right approach.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/contact">
              <Button size="lg">Talk to us</Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}