import { Link } from 'react-router-dom';
import { Button, Card, Hero, LogoCloud, Section, Testimonial } from '@angisoft/ui';
import { fetchServices } from '@/hooks/data/useServices';
import { fetchProducts } from '@/hooks/data/useProducts';
import { fetchTestimonials } from '@/hooks/data/useTestimonials';
import { fetchProjects } from '@/hooks/data/useProjects';
import { fetchCompanyStats } from '@/hooks/data/useCareers';
import { useAsync } from '@/hooks/useAsync';

const Spinner = () => (
  <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
);

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
      {text}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-10 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h2>
      {subtitle ? <p className="mt-3 text-lg text-[var(--text-muted)]">{subtitle}</p> : null}
    </div>
  );
}

export default function Home() {
  const stats = useAsync(fetchCompanyStats, []);
  const services = useAsync(fetchServices, []);
  const products = useAsync(fetchProducts, []);
  const testimonials = useAsync(() => fetchTestimonials(true), []);
  const projects = useAsync(fetchProjects, []);

  const logoItems = (projects.data ?? [])
    .filter((p) => p.client)
    .slice(0, 6)
    .map((p) => ({ name: p.client as string }));

  return (
    <>
      <Hero
        badge="Nairobi-based software studio"
        title="Software products that move African business forward"
        subtitle="We design, build and ship web apps, mobile experiences and digital platforms for ambitious teams across Africa."
        actions={
          <>
            <Link to="/contact">
              <Button size="lg">Start a project</Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" size="lg">
                Explore products
              </Button>
            </Link>
          </>
        }
        visual={
          <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] sm:h-80">
            <div className="absolute inset-0 opacity-90" style={{ background: 'var(--gradient-brand)' }} />
            <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/80">
              A
            </div>
          </div>
        }
      />

      <Section className="bg-[var(--bg-secondary)]">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.loading ? <Spinner /> : null}
          {!stats.loading && (stats.error || !stats.data || stats.data.length === 0) ? (
            <div className="col-span-full">
              <EmptyState text="Company highlights will appear here shortly." />
            </div>
          ) : null}
          {!stats.loading && stats.data
            ? stats.data.slice(0, 4).map((stat) => (
                <Card key={stat.id} className="p-6 text-center">
                  <div className="text-4xl font-extrabold text-[#0875FF]">
                    {stat.value}
                    {stat.suffix ? <span className="text-2xl">{stat.suffix}</span> : null}
                  </div>
                  <div className="mt-2 text-sm font-medium text-[var(--text-muted)]">{stat.label}</div>
                </Card>
              ))
            : null}
        </div>
      </Section>

      <Section>
        <SectionHeading title="What we do" subtitle="End-to-end services from product strategy to launch." />
        {services.loading ? <Spinner /> : null}
        {!services.loading && (services.error || !services.data || services.data.length === 0) ? (
          <EmptyState text="Services will appear here shortly." />
        ) : null}
        {!services.loading && services.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.data.slice(0, 6).map((service) => (
              <Card key={service.id} hoverable className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0875FF]/10 text-xl text-[#0875FF]">
                  {service.icon ? service.icon : service.title.charAt(0)}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{service.description}</p>
              </Card>
            ))}
          </div>
        ) : null}
      </Section>

      <Section className="bg-[var(--bg-secondary)]">
        <SectionHeading title="Product spotlight" subtitle="Platforms built for real African workflows." />
        {products.loading ? <Spinner /> : null}
        {!products.loading && (products.error || !products.data || products.data.length === 0) ? (
          <EmptyState text="Products will appear here shortly." />
        ) : null}
        {!products.loading && products.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.data.slice(0, 4).map((product) => (
              <Link key={product.id} to={`/products/${product.slug}`}>
                <Card hoverable className="h-full p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00AFFF]/10 text-xl text-[#00AFFF]">
                    {product.icon ? product.icon : product.name.charAt(0)}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{product.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                    {product.description?.slice(0, 110)}
                    {product.description && product.description.length > 110 ? '…' : ''}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#0875FF]">
                    Learn more →
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
        <div className="mt-8 text-center">
          <Link to="/products">
            <Button variant="outline">View all products</Button>
          </Link>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Trusted by our clients" subtitle="What teams say about working with us." />
        {testimonials.loading ? <Spinner /> : null}
        {!testimonials.loading && (testimonials.error || !testimonials.data || testimonials.data.length === 0) ? (
          <EmptyState text="Client testimonials will appear here shortly." />
        ) : null}
        {!testimonials.loading && testimonials.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.data.map((t) => (
              <Testimonial
                key={t.id}
                quote={t.quote ?? ''}
                author={t.name}
                role={t.role ?? undefined}
                company={t.company ?? undefined}
                avatarUrl={t.avatar ?? undefined}
              />
            ))}
          </div>
        ) : null}
      </Section>

      <Section className="bg-[var(--bg-secondary)]">
        {logoItems.length > 0 ? (
          <LogoCloud title="Teams we've delivered for" items={logoItems} />
        ) : null}
        {logoItems.length === 0 && !projects.loading ? (
          <EmptyState text="Selected client logos will appear here shortly." />
        ) : null}
        {projects.loading ? <Spinner /> : null}
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Ready to build something great?</h2>
          <p className="mt-3 text-lg text-[var(--text-muted)]">
            Tell us what you're working on and we'll help you scope, design and ship it.
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