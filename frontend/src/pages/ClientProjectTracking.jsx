import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clientApiGet, clientApiPost } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import GlassmorphismCard from '../components/modern/GlassmorphismCard';
import ScrollReveal from '../components/modern/ScrollReveal';

const ClientProjectTracking = () => {
  const { id } = useParams();
  const { colors } = useTheme();
  const [project, setProject] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(() => clientApiGet(`/client-portal/projects/${id}`).then((response) => setProject(response.project)), [id]);

  useEffect(() => {
    loadProject().finally(() => setLoading(false));
  }, [loadProject]);

  const submitComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    await clientApiPost(`/client-portal/projects/${id}/comments`, { body: comment.trim() });
    setComment('');
    await loadProject();
  };

  if (loading) return <section className="min-h-screen p-10" style={{ background: colors.background, color: colors.text }}>Loading project tracker...</section>;
  if (!project) return <section className="min-h-screen p-10" style={{ background: colors.background, color: colors.text }}>Project not found.</section>;

  return (
    <section className="min-h-screen px-4 py-16" style={{ background: `radial-gradient(circle at top left, ${colors.primary}20, transparent 36%), linear-gradient(135deg, ${colors.background}, ${colors.backgroundTertiary})` }}>
      <div className="mx-auto max-w-7xl">
        <ScrollReveal>
          <Link to="/portal" className="mb-6 inline-flex font-bold" style={{ color: colors.primary }}>← Back to dashboard</Link>
          <GlassmorphismCard glow className="mb-8 p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <span className="rounded-full px-4 py-2 text-sm font-bold" style={{ backgroundColor: `${colors.secondary}18`, color: colors.primary }}>{project.status}</span>
                <h1 className="mt-5 text-4xl font-black md:text-5xl" style={{ color: colors.text }}>{project.title}</h1>
                <p className="mt-3 text-lg" style={{ color: colors.textSecondary }}>{project.description}</p>
              </div>
              <div>
                <div className="mb-3 flex justify-between font-bold" style={{ color: colors.text }}>
                  <span>Project progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full" style={{ backgroundColor: colors.borderLight }}>
                  <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.secondaryLight})` }} />
                </div>
              </div>
            </div>
          </GlassmorphismCard>
        </ScrollReveal>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <GlassmorphismCard className="p-6">
              <h2 className="mb-5 text-2xl font-black" style={{ color: colors.text }}>Milestones</h2>
              <div className="space-y-4">
                {project.milestones?.map((milestone, index) => (
                  <div key={milestone.id} className="flex gap-4 rounded-2xl p-4" style={{ backgroundColor: `${colors.primary}08`, border: `1px solid ${colors.border}` }}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-white" style={{ background: milestone.status === 'COMPLETED' ? colors.success : colors.primary }}>{index + 1}</div>
                    <div>
                      <h3 className="font-bold" style={{ color: colors.text }}>{milestone.title}</h3>
                      <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>{milestone.status.replaceAll('_', ' ')}</p>
                      {milestone.description && <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>{milestone.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="p-6">
              <h2 className="mb-5 text-2xl font-black" style={{ color: colors.text }}>Activity feed</h2>
              <div className="space-y-4">
                {project.activities?.map((activity) => (
                  <div key={activity.id} className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
                    <p className="font-semibold" style={{ color: colors.text }}>{activity.message}</p>
                    <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </GlassmorphismCard>
          </div>

          <div className="space-y-6">
            <GlassmorphismCard className="p-6">
              <h2 className="mb-5 text-2xl font-black" style={{ color: colors.text }}>Comments</h2>
              <form onSubmit={submitComment} className="mb-5 space-y-3">
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} placeholder="Send a message to the AngiSoft team..." className="w-full rounded-2xl border p-4 outline-none" style={{ borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }} />
                <button className="rounded-full px-5 py-3 font-bold text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>Send comment</button>
              </form>
              <div className="space-y-3">
                {project.comments?.map((item) => (
                  <div key={item.id} className="rounded-2xl p-4" style={{ backgroundColor: `${colors.secondary}08`, border: `1px solid ${colors.border}` }}>
                    <p style={{ color: colors.text }}>{item.body}</p>
                    <p className="mt-2 text-xs" style={{ color: colors.textMuted }}>{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="p-6">
              <h2 className="mb-5 text-2xl font-black" style={{ color: colors.text }}>Deliverables</h2>
              <div className="space-y-3">
                {project.deliverables?.length ? project.deliverables.map((deliverable) => (
                  <div key={deliverable.id} className="rounded-2xl p-4" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
                    <h3 className="font-bold" style={{ color: colors.text }}>{deliverable.title}</h3>
                    <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>{deliverable.description}</p>
                    <span className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${colors.primary}14`, color: colors.primary }}>{deliverable.status}</span>
                  </div>
                )) : <p style={{ color: colors.textSecondary }}>Deliverables shared by AngiSoft will appear here.</p>}
              </div>
            </GlassmorphismCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientProjectTracking;
