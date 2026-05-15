import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import GlassmorphismCard from '../components/modern/GlassmorphismCard';
import ScrollReveal from '../components/modern/ScrollReveal';

const ClientPortalRequest = () => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await apiPost('/client-portal/request-link', { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen px-4 py-20" style={{ background: `radial-gradient(circle at top left, ${colors.primary}20, transparent 35%), linear-gradient(135deg, ${colors.background}, ${colors.backgroundTertiary})` }}>
      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <GlassmorphismCard glow className="p-8 md:p-12">
            <div className="mb-8 text-center">
              <span className="inline-flex rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: `${colors.primary}14`, color: colors.primary }}>Client Portal</span>
              <h1 className="mt-6 text-4xl font-black md:text-5xl" style={{ color: colors.text }}>Access your AngiSoft workspace</h1>
              <p className="mt-4 text-lg" style={{ color: colors.textSecondary }}>Request a secure portal link to track bookings, milestones, deliverables, and project updates.</p>
            </div>

            {sent ? (
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: `${colors.success}12`, border: `1px solid ${colors.success}55` }}>
                <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Check your email</h2>
                <p className="mt-3" style={{ color: colors.textSecondary }}>If the email matches an AngiSoft client profile, a secure access link has been sent.</p>
                <Link to="/book" className="mt-6 inline-flex rounded-full px-6 py-3 font-bold text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>Book another service</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block font-semibold" style={{ color: colors.text }}>Client email address</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border px-5 py-4 outline-none transition focus:ring-4"
                    style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }}
                  />
                </label>
                <button type="submit" disabled={loading} className="w-full rounded-2xl px-6 py-4 font-bold text-white transition hover:scale-[1.01] disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                  {loading ? 'Sending secure link...' : 'Send secure portal link'}
                </button>
              </form>
            )}
          </GlassmorphismCard>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ClientPortalRequest;
