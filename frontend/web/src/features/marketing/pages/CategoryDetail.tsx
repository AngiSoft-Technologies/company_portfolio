import { Link, useParams } from 'react-router-dom';
import { Button, Hero, Section } from '@angisoft/ui';
import { fetchIndustryBySlug } from '@/hooks/data/useIndustries';
import { useAsync } from '@/hooks/useAsync';

export default function CategoryDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const industry = useAsync(() => fetchIndustryBySlug(slug), [slug]);

  if (industry.loading) {
    return <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />;
  }

  if (industry.error || !industry.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-6xl font-black text-[var(--border)]">404</div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Industry not found</h1>
        <p className="mt-3 text-[var(--text-muted)]">This sector page isn't available right now.</p>
        <div className="mt-8 flex justify-center">
          <Link to="/industries">
            <Button variant="outline">All industries</Button>
          </Link>
        </div>
      </div>
    );
  }

  const i = industry.data;

  return (
    <>
      <Hero
        badge="Industry"
        title={i.name}
        subtitle={i.description}
        actions={
          <Link to="/contact">
            <Button size="lg">Talk to us</Button>
          </Link>
        }
        visual={
          <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
            {i.image ? (
              <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-8xl text-[#0875FF]">
                {i.icon ? i.icon : i.name.charAt(0)}
              </div>
            )}
          </div>
        }
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Working in {i.name}</h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
            {i.description}
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/contact">
              <Button size="lg">Start a project in {i.name}</Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}