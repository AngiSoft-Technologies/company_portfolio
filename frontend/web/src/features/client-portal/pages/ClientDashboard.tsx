// @ts-nocheck
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { clientApiGet, clientApiPost } from '@/lib/httpClient';
import { useTheme } from '@/lib/theme';
import GlassmorphismCard from '@/features/marketing/components/modern/GlassmorphismCard';
import ScrollReveal from '@/features/marketing/components/modern/ScrollReveal';
import { LoadingIndicator, VisualState } from '@angisoft/ui';

const ClientDashboard = () => {
  const { colors } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ text: '', rating: 5 });
  const [feedbackState, setFeedbackState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [payState, setPayState] = useState<Record<string, 'sending' | 'stk' | 'redirect' | 'error' | 'unavailable'>>({});

  useEffect(() => {
    const load = async () => {
      const safe = (p) => p.catch(() => ({ }));
      const [b, i, q, pjs, n] = await Promise.all([
        safe(clientApiGet('/client-portal/bookings')),
        safe(clientApiGet('/client-portal/invoices')),
        safe(clientApiGet('/client-portal/quotes')),
        safe(clientApiGet('/client-portal/projects')),
        safe(clientApiGet('/client-portal/notifications')),
      ]);
      setBookings(b?.bookings || []);
      setInvoices(i?.invoices || []);
      setQuotes(q?.quotes || []);
      setProjects(pjs?.projects || []);
      setNotifications(n?.notifications || []);
      setLoading(false);
    };
    void load();
  }, []);

  const submitFeedback = async () => {
    if (feedback.text.trim().length < 10) return;
    setFeedbackState('saving');
    try {
      await clientApiPost('/client-portal/testimonials', {
        text: feedback.text.trim(),
        rating: Number(feedback.rating) || undefined,
      });
      setFeedbackState('done');
      setFeedback({ text: '', rating: 5 });
    } catch {
      setFeedbackState('error');
    }
  };

  const payInvoice = async (inv) => {
    setPayState((s) => ({ ...s, [inv.id]: 'sending' }));
    // Try mobile-money providers first, then the card redirect as fallback.
    const providers = ['MPESA', 'PAYHERO', 'PAYSTACK'];
    let lastErr = '';
    for (const provider of providers) {
      try {
        const res = await clientApiPost(`/client-portal/invoices/${inv.id}/pay`, { provider });
        if (res?.kind === 'redirect' && res.checkoutUrl) {
          window.open(res.checkoutUrl, '_blank', 'noopener');
          setPayState((s) => ({ ...s, [inv.id]: 'redirect' }));
        } else {
          setPayState((s) => ({ ...s, [inv.id]: 'stk' }));
        }
        return;
      } catch (e) {
        lastErr = String(e?.message || '');
        if (!/not configured/i.test(lastErr)) break;
      }
    }
    setPayState((s) => ({ ...s, [inv.id]: /not configured/i.test(lastErr) ? 'unavailable' : 'error' }));
  };

  const activeProjects = useMemo(() => bookings.filter((booking) => booking.clientProject), [bookings]);
  const averageProgress = activeProjects.length
    ? Math.round(activeProjects.reduce((sum, booking) => sum + (booking.clientProject?.progress || 0), 0) / activeProjects.length)
    : 0;

  return (
    <section className="min-h-screen px-4 py-16" style={{ background: `radial-gradient(circle at top right, ${colors.secondary}22, transparent 32%), linear-gradient(135deg, ${colors.background}, ${colors.backgroundTertiary})` }}>
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="inline-flex rounded-full px-4 py-2 text-sm font-bold" style={{ backgroundColor: `${colors.primary}14`, color: colors.primary }}>Live Workspace</span>
              <h1 className="mt-5 text-4xl font-black md:text-6xl" style={{ color: colors.text }}>Client dashboard</h1>
              <p className="mt-3 text-lg" style={{ color: colors.textSecondary }}>Track AngiSoft bookings, project progress, milestones, and deliverables in one premium portal.</p>
            </div>
            <Link to="/book" className="rounded-full px-6 py-3 font-bold text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>New booking</Link>
          </div>
        </ScrollReveal>

        <div className="mb-8 grid gap-5 md:grid-cols-3">
          {[['Total bookings', bookings.length], ['Active projects', activeProjects.length], ['Average progress', `${averageProgress}%`]].map(([label, value]) => (
            <GlassmorphismCard key={label} glow className="p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: colors.textMuted }}>{label}</p>
              <p className="mt-3 text-4xl font-black" style={{ color: colors.text }}>{value}</p>
            </GlassmorphismCard>
          ))}
        </div>

        {loading ? (
          <GlassmorphismCard className="p-8 text-center"><LoadingIndicator variant="grid" size="lg" /></GlassmorphismCard>
        ) : bookings.length === 0 ? (
          <GlassmorphismCard className="p-8 text-center">
            <VisualState variant="unavailable" />
          </GlassmorphismCard>
        ) : (
          <div className="grid gap-5">
            {bookings.map((booking) => (
              <GlassmorphismCard key={booking.id} hover glow className="p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black" style={{ color: colors.text }}>{booking.title}</h2>
                      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${colors.primary}14`, color: colors.primary }}>{booking.status.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="mt-2 max-w-3xl" style={{ color: colors.textSecondary }}>{booking.description}</p>
                  </div>
                  {booking.clientProject ? (
                    <div className="min-w-[260px]">
                      <div className="mb-2 flex justify-between text-sm font-semibold" style={{ color: colors.textSecondary }}>
                        <span>{booking.clientProject.status}</span>
                        <span>{booking.clientProject.progress}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: colors.borderLight }}>
                        <div className="h-full rounded-full" style={{ width: `${booking.clientProject.progress}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.secondaryLight})` }} />
                      </div>
                      <Link to={`/portal/projects/${booking.clientProject.id}`} className="mt-4 inline-flex rounded-full px-5 py-2 text-sm font-bold text-white" style={{ background: colors.primary }}>Open tracker</Link>
                    </div>
                  ) : (
                    <p className="font-semibold" style={{ color: colors.textMuted }}>Tracker appears after approval.</p>
                  )}
                </div>
              </GlassmorphismCard>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-black" style={{ color: colors.text }}>Notifications</h2>
              {notifications.some((n) => !n.read) && (
                <button
                  type="button"
                  onClick={async () => {
                    await clientApiPost('/client-portal/notifications/mark-read', {});
                    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
                  }}
                  className="text-sm font-semibold"
                  style={{ color: colors.primary }}
                >
                  Mark all read
                </button>
              )}
            </div>
            <GlassmorphismCard className="p-5">
              <ul className="divide-y" style={{ borderColor: colors.borderLight }}>
                {notifications.slice(0, 8).map((n) => (
                  <li key={n.id} className="flex gap-3 py-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: n.read ? colors.borderLight : colors.primary }}
                    />
                    <div>
                      <p className="font-semibold" style={{ color: colors.text }}>{n.title}</p>
                      <p className="text-sm" style={{ color: colors.textMuted }}>{n.message}</p>
                      <p className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
                        {n._type === 'renewal' ? ' · account check-in' : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </GlassmorphismCard>
          </div>
        )}

        {projects.length > 0 && (
          <div id="projects" className="mt-12">
            <h2 className="mb-4 text-2xl font-black" style={{ color: colors.text }}>Your projects</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {projects.map((project) => (
                <GlassmorphismCard key={project.id} hover className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: colors.text }}>{project.title}</h3>
                      <p className="text-sm" style={{ color: colors.textMuted }}>
                        {project.booking?.title || project.status.replaceAll('_', ' ')}
                      </p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${colors.primary}14`, color: colors.primary }}>
                      {project.progress}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.borderLight }}>
                    <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: colors.primary }} />
                  </div>
                  <Link to={`/portal/projects/${project.id}`} className="mt-4 inline-flex rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: colors.primary }}>
                    Open tracker
                  </Link>
                </GlassmorphismCard>
              ))}
            </div>
          </div>
        )}

        {(invoices.length > 0 || quotes.length > 0) && (
          <div id="billing" className="mt-12 grid gap-5 lg:grid-cols-2">
            <GlassmorphismCard className="p-6">
              <h2 className="mb-4 text-xl font-black" style={{ color: colors.text }}>Invoices</h2>
              {invoices.length === 0 ? (
                <p className="text-sm" style={{ color: colors.textMuted }}>No invoices yet.</p>
              ) : (
                <ul className="divide-y" style={{ borderColor: colors.borderLight }}>
                  {invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-semibold" style={{ color: colors.text }}>{inv.number || inv.publicReference}</p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {inv.status.replaceAll('_', ' ')}{inv.dueAt ? ` · due ${new Date(inv.dueAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: colors.text }}>{inv.currency} {Number(inv.total).toLocaleString()}</p>
                        {Number(inv.balanceDue) > 0 && (
                          <>
                            <p className="text-xs" style={{ color: colors.secondary }}>Balance {inv.currency} {Number(inv.balanceDue).toLocaleString()}</p>
                            {['draft', 'void', 'paid'].includes(inv.status) ? null : (
                              <button
                                type="button"
                                onClick={() => void payInvoice(inv)}
                                disabled={payState[inv.id] === 'sending'}
                                className="mt-1 rounded-full px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                                style={{ background: colors.primary }}
                              >
                                {payState[inv.id] === 'sending' ? 'Sending…' : 'Pay now'}
                              </button>
                            )}
                            {payState[inv.id] === 'stk' ? (
                              <p className="mt-1 text-xs font-semibold" style={{ color: colors.secondary }}>Check your phone to complete payment.</p>
                            ) : null}
                            {payState[inv.id] === 'redirect' ? (
                              <p className="mt-1 text-xs font-semibold" style={{ color: colors.secondary }}>Complete payment in the opened tab.</p>
                            ) : null}
                            {payState[inv.id] === 'error' ? (
                              <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>Payment could not be started — try again.</p>
                            ) : null}
                            {payState[inv.id] === 'unavailable' ? (
                              <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>Online payment is not available — contact us to pay.</p>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </GlassmorphismCard>
            <GlassmorphismCard className="p-6">
              <h2 className="mb-4 text-xl font-black" style={{ color: colors.text }}>Quotes</h2>
              {quotes.length === 0 ? (
                <p className="text-sm" style={{ color: colors.textMuted }}>No quotes yet.</p>
              ) : (
                <ul className="divide-y" style={{ borderColor: colors.borderLight }}>
                  {quotes.map((quote) => (
                    <li key={quote.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-semibold" style={{ color: colors.text }}>{quote.number || quote.publicReference}</p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {quote.status.replaceAll('_', ' ')}{quote.validUntil ? ` · valid until ${new Date(quote.validUntil).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <p className="font-bold" style={{ color: colors.text }}>{quote.currency} {Number(quote.total).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </GlassmorphismCard>
          </div>
        )}

        <div id="feedback" className="mt-12">
          <GlassmorphismCard className="p-6">
            <h2 className="mb-2 text-xl font-black" style={{ color: colors.text }}>Share feedback</h2>
            <p className="mb-4 text-sm" style={{ color: colors.textSecondary }}>
              Tell us how we did — testimonials are reviewed before publishing.
            </p>
            {feedbackState === 'done' ? (
              <p className="font-semibold" style={{ color: colors.secondary }}>Thanks — your testimonial was submitted for review.</p>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={feedback.text}
                  onChange={(e) => setFeedback((f) => ({ ...f, text: e.target.value }))}
                  rows={4}
                  placeholder="Your experience working with AngiSoft…"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                  style={{ borderColor: colors.border, backgroundColor: colors.cardBg || 'transparent', color: colors.text }}
                />
                <div className="flex items-center justify-between gap-4">
                  <select
                    value={feedback.rating}
                    onChange={(e) => setFeedback((f) => ({ ...f, rating: Number(e.target.value) }))}
                    className="rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: colors.border, backgroundColor: colors.cardBg || 'transparent', color: colors.text }}
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void submitFeedback()}
                    disabled={feedbackState === 'saving' || feedback.text.trim().length < 10}
                    className="rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
                  >
                    {feedbackState === 'saving' ? 'Submitting…' : 'Submit testimonial'}
                  </button>
                </div>
                {feedbackState === 'error' ? (
                  <p className="text-sm" style={{ color: 'var(--color-error)' }}>Submission failed — please try again.</p>
                ) : null}
              </div>
            )}
          </GlassmorphismCard>
        </div>
      </div>
    </section>
  );
};

export default ClientDashboard;
