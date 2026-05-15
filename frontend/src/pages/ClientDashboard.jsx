import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { clientApiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import GlassmorphismCard from '../components/modern/GlassmorphismCard';
import ScrollReveal from '../components/modern/ScrollReveal';

const ClientDashboard = () => {
  const { colors } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientApiGet('/client-portal/bookings')
      .then((response) => setBookings(response.bookings || []))
      .finally(() => setLoading(false));
  }, []);

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
          <GlassmorphismCard className="p-8 text-center" style={{ color: colors.text }}>Loading your workspace...</GlassmorphismCard>
        ) : bookings.length === 0 ? (
          <GlassmorphismCard className="p-8 text-center">
            <h2 className="text-2xl font-bold" style={{ color: colors.text }}>No bookings yet</h2>
            <p className="mt-2" style={{ color: colors.textSecondary }}>Start with a service booking and your progress tracker will appear here once approved.</p>
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
      </div>
    </section>
  );
};

export default ClientDashboard;
