import { Link } from 'react-router-dom';
import { Card, Hero, Section } from '@angisoft/ui';
import { fetchProducts } from '@/hooks/data/useProducts';
import { useAsync } from '@/hooks/useAsync';

export default function Products() {
  const products = useAsync(fetchProducts, []);

  return (
    <>
      <Hero
        badge="Products"
        title="Software products for African business"
        subtitle="Purpose-built platforms that fit how businesses here actually work."
      />

      <Section>
        {products.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!products.loading && (!products.data || products.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Products will appear here shortly.
          </div>
        ) : null}
        {!products.loading && products.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.map((product) => (
              <Link key={product.id} to={`/products/${product.slug}`}>
                <Card hoverable className="h-full p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00AFFF]/10 text-2xl text-[#00AFFF]">
                    {product.icon ? product.icon : product.name.charAt(0)}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">{product.name}</h3>
                  {product.title ? (
                    <p className="mt-1 text-sm font-medium text-[#0875FF]">{product.title}</p>
                  ) : null}
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{product.description}</p>
                  {product.pricing ? (
                    <div className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{product.pricing}</div>
                  ) : null}
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#0875FF]">
                    Explore product →
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