import { Section } from '@angisoft/ui';

const SECTIONS = [
  {
    title: 'Engagements and estimates',
    body: 'Proposals and estimates are valid for the period stated and are based on the scope agreed in writing. Substantial changes to scope may result in revised estimates.',
  },
  {
    title: 'Payments',
    body: 'Payment terms are agreed per engagement. Work begins after the agreed initial payment. Late payments may pause delivery until outstanding amounts are settled.',
  },
  {
    title: 'Intellectual property',
    body: 'Upon full payment, ownership of custom work products transfers to the client. We retain the right to use frameworks, tools and generic components that are not unique to a project.',
  },
  {
    title: 'Confidentiality',
    body: 'Both parties agree to keep confidential information private, including business plans, customer data and unpublished materials shared during an engagement.',
  },
  {
    title: 'Limitation of liability',
    body: 'To the maximum extent permitted by law, liability is limited to the fees paid for the specific engagement giving rise to the claim. We are not liable for indirect or consequential damages.',
  },
  {
    title: 'Contact',
    body: 'Questions about these terms can be sent to hello@angisoft.co.ke.',
  },
];

export default function Terms() {
  return (
    <Section className="py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">Terms of Service</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">Last updated: January 2026</p>
        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{section.title}</h2>
              <p className="mt-2 text-base leading-relaxed text-[var(--text-secondary)]">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}