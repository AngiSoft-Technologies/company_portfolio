import { useState, type FormEvent } from 'react';
import { Button, Card, Hero, Section } from '@angisoft/ui';
import { apiPost } from '@angisoft/api-client';
import { CONTACT_INFO } from '@/lib/constants';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        subject: form.subject || 'General enquiry',
        message: form.message,
      };
      await apiPost('/contact-enquiries', payload);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#0875FF]';

  return (
    <>
      <Hero
        badge="Contact"
        title="Let's talk about your project"
        subtitle="Tell us what you're building. We usually reply within one business day."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div className="flex flex-col gap-4">
            {[
              { label: 'Call us', value: CONTACT_INFO.phone },
              { label: 'Email us', value: CONTACT_INFO.email },
              { label: 'Find us', value: CONTACT_INFO.address },
            ].map((item) => (
              <Card key={item.label} className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {item.label}
                </h3>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{item.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-8">
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400">
                  ✓
                </div>
                <h3 className="mt-5 text-2xl font-bold text-[var(--text-primary)]">Message sent</h3>
                <p className="mt-3 max-w-sm text-sm text-[var(--text-muted)]">
                  Thanks for reaching out. Our team will get back to you shortly.
                </p>
                <Button className="mt-8" variant="outline" onClick={() => setSent(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
                    Name
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
                    Email
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@company.com"
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
                  Subject
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="What's this about?"
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
                  Message
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us about your project…"
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#0875FF]"
                  />
                </label>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
                <Button type="submit" disabled={submitting} className="mt-2">
                  {submitting ? 'Sending…' : 'Send message'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </Section>
    </>
  );
}