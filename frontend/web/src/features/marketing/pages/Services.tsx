import { Card, Hero, Section } from '@angisoft/ui';
import { fetchServices } from '@/hooks/data/useServices';
import { fetchFaqs } from '@/hooks/data/useSolutions';
import { useAsync } from '@/hooks/useAsync';

export default function Services() {
  const services = useAsync(fetchServices, []);
  const faqs = useAsync(fetchFaqs, []);

  return (
    <>
      <Hero
        badge="Services"
        title="Full-stack software services, end to end"
        subtitle="From the first workshop to ongoing support, we cover everything it takes to design, build and operate great software."
      />

      <Section>
        {services.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!services.loading && (!services.data || services.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            Services will appear here shortly.
          </div>
        ) : null}
        {!services.loading && services.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.data.map((service) => (
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
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Frequently asked questions
          </h2>
          {faqs.loading ? (
            <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
          ) : null}
          {!faqs.loading && (!faqs.data || faqs.data.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
              FAQs will appear here shortly.
            </div>
          ) : null}
          {!faqs.loading && faqs.data ? (
            <div className="flex flex-col gap-3">
              {faqs.data.map((faq) => (
                <details
                  key={faq.id}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 open:bg-[var(--surface-hover)]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[var(--text-primary)]">
                    {faq.question}
                    <span className="text-[#0875FF] transition-transform group-open:rotate-45">＋</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{faq.answer}</p>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}