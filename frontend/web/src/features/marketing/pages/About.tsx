import { Link } from 'react-router-dom';
import { Button, Card, Hero, Section } from '@angisoft/ui';
import { fetchCompanyStats } from '@/hooks/data/useCareers';
import { useAsync } from '@/hooks/useAsync';

const VALUES = [
  {
    icon: '🎯',
    title: 'Mission',
    body: 'To build dependable software that helps African businesses operate with the speed, clarity and reach of global technology leaders.',
  },
  {
    icon: '🧭',
    title: 'Vision',
    body: 'A digitally confident Africa where every ambitious business has the tools to grow beyond its borders.',
  },
  {
    icon: '🤝',
    title: 'Values',
    body: 'Craftsmanship, honesty and relentless focus on outcomes. We measure success by the businesses we help move forward.',
  },
];

export default function About() {
  const stats = useAsync(fetchCompanyStats, []);

  return (
    <>
      <Hero
        badge="About AngiSoft"
        title="A Nairobi software studio on a mission"
        subtitle="We are a multidisciplinary team of engineers, designers and product thinkers who partner with businesses across Africa to design, build and scale software that works in the real world."
      />

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map((v) => (
            <Card key={v.title} hoverable className="p-8">
              <div className="text-3xl">{v.icon}</div>
              <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{v.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{v.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-[var(--bg-secondary)]">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Company at a glance
        </h2>
        {stats.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!stats.loading && (!stats.data || stats.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Company highlights will appear here shortly.
          </div>
        ) : null}
        {!stats.loading && stats.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.data.map((stat) => (
              <Card key={stat.id} className="p-6 text-center">
                <div className="text-4xl font-extrabold text-[#0875FF]">
                  {stat.value}
                  {stat.suffix ? <span className="text-2xl">{stat.suffix}</span> : null}
                </div>
                <div className="mt-2 text-sm font-medium text-[var(--text-muted)]">{stat.label}</div>
              </Card>
            ))}
          </div>
        ) : null}
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Want to work with us?</h2>
          <p className="mt-3 text-lg text-[var(--text-muted)]">
            We'd love to hear about the product you're building.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link to="/contact">
              <Button>Get in touch</Button>
            </Link>
            <Link to="/careers">
              <Button variant="outline">Join our team</Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}