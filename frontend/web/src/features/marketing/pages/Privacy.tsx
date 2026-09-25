import { Section } from '@angisoft/ui';

const SECTIONS = [
  {
    title: 'Information we collect',
    body: 'We collect information you provide directly, such as your name, email address, phone number and message content when you contact us or request access to our client portal.',
  },
  {
    title: 'How we use your information',
    body: 'We use the information we collect to respond to enquiries, deliver products and services, improve our offerings, and keep you informed about updates relevant to the services you use.',
  },
  {
    title: 'Data sharing',
    body: 'We do not sell your personal information. We only share data with trusted service providers who help us operate (such as hosting and communications), under terms that protect your privacy.',
  },
  {
    title: 'Data security',
    body: 'We apply industry-standard safeguards including encryption in transit, restricted access and regular review of our practices to protect the information we hold.',
  },
  {
    title: 'Your rights',
    body: 'You may request access to, correction of, or deletion of your personal information at any time by contacting us. We will respond to verified requests in line with applicable law.',
  },
  {
    title: 'Contact',
    body: 'Questions about this policy can be sent to hello@angisoft.co.ke. We are happy to help.',
  },
];

export default function Privacy() {
  return (
    <>
      <Section className="py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">Privacy Policy</h1>
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
    </>
  );
}