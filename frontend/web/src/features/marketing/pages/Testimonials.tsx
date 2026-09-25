import { Hero, Section, Testimonial } from '@angisoft/ui';
import { fetchTestimonials } from '@/hooks/data/useTestimonials';
import { useAsync } from '@/hooks/useAsync';

export default function Testimonials() {
  const testimonials = useAsync(() => fetchTestimonials(false), []);

  return (
    <>
      <Hero
        badge="Testimonials"
        title="Don't take our word for it"
        subtitle="A few kind words from the teams we've worked with."
      />

      <Section>
        {testimonials.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!testimonials.loading && (!testimonials.data || testimonials.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Testimonials will appear here shortly.
          </div>
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
    </>
  );
}