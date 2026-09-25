import { Link } from 'react-router-dom';
import { Card, Hero, Section } from '@angisoft/ui';
import { fetchIndustries } from '@/hooks/data/useIndustries';
import { useAsync } from '@/hooks/useAsync';

export default function Industries() {
  const industries = useAsync(fetchIndustries, []);

  return (
    <>
      <Hero
        badge="Industries"
        title="Deep experience across sectors"
        subtitle="We bring industry-specific insight and compliance-ready engineering to every domain we serve."
      />

      <Section>
        {industries.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!industries.loading && (!industries.data || industries.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Industries will appear here shortly.
          </div>
        ) : null}
        {!industries.loading && industries.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {industries.data.map((industry) => (
              <Link key={industry.id} to={`/industries/${industry.slug}`}>
                <Card hoverable className="h-full p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0875FF]/10 text-xl text-[#0875FF]">
                    {industry.icon ? industry.icon : industry.name.charAt(0)}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{industry.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{industry.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#0875FF]">
                    Learn more →
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </Section>
    </>
  );
}