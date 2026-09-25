import { Link, useParams } from 'react-router-dom';
import { Button, Card, Hero, Section } from '@angisoft/ui';
import { fetchProductBySlug } from '@/hooks/data/useProducts';
import { useAsync } from '@/hooks/useAsync';

const featureLabel = (f: string | Record<string, unknown>): string => {
  if (typeof f === 'string') return f;
  if (typeof f.title === 'string') return f.title;
  if (typeof f.name === 'string') return f.name;
  const values = Object.values(f);
  const text = values.find((v) => typeof v === 'string');
  return typeof text === 'string' ? text : '';
};

export default function ProductDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const product = useAsync(() => fetchProductBySlug(slug), [slug]);

  if (product.loading) {
    return <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />;
  }

  if (product.error || !product.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-6xl font-black text-[var(--border)]">404</div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Product not found</h1>
        <p className="mt-3 text-[var(--text-muted)]">The product you're looking for doesn't exist or was removed.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/products">
            <Button variant="outline">All products</Button>
          </Link>
          <Link to="/">
            <Button>Back home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const p = product.data;
  const features = (p.features ?? [])
    .map(featureLabel)
    .filter((f) => f.length > 0);

  return (
    <>
      <Hero
        badge="Product"
        title={p.name}
        subtitle={p.title ?? p.description}
        actions={
          <Link to="/contact">
            <Button size="lg">Start now</Button>
          </Link>
        }
        visual={
          <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
            {p.image ? (
              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-7xl font-black text-[var(--text-muted)]">
                {p.icon ? p.icon : p.name.charAt(0)}
              </div>
            )}
          </div>
        }
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">What it does</h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">{p.description}</p>

            {features.length > 0 ? (
              <>
                <h2 className="mt-10 text-2xl font-bold text-[var(--text-primary)]">Features</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
                      <span className="mt-0.5 text-[#0875FF]">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div>
            <Card className="p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Pricing</h3>
              <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)]">
                {p.pricing ?? 'Contact us'}
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Flexible plans for teams of every size.
              </p>
              <Link to="/contact" className="mt-6 block">
                <Button className="w-full">Start now</Button>
              </Link>
              <Link to="/pricing" className="mt-3 block">
                <Button variant="ghost" className="w-full">
                  View pricing
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}