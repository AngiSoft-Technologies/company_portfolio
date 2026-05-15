import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPatch } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';

const ClientProjectsManagement = () => {
    const { colors } = useTheme();
    const [projects, setProjects] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadProjects = () => apiGet('/client-projects').then((response) => setProjects(response.projects || []));

    useEffect(() => {
        loadProjects().finally(() => setLoading(false));
    }, []);

    const updateProject = async (project, patch) => {
        const response = await apiPatch(`/client-projects/${project.id}`, patch);
        setSelected(response.project);
        await loadProjects();
    };

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: colors.background, color: colors.text }}>
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: colors.primary }}>Delivery Operations</p>
                    <h1 className="mt-2 text-4xl font-black">Client Projects</h1>
                    <p className="mt-2" style={{ color: colors.textSecondary }}>Manage live project tracking, progress, ownership, and client-facing delivery status.</p>
                </div>
                <Link to="/admin/bookings" className="rounded-full px-5 py-3 font-bold text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>Review bookings</Link>
            </div>

            {loading ? <p>Loading projects...</p> : (
                <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
                    <div className="grid gap-4">
                        {projects.map((project) => (
                            <button key={project.id} onClick={() => setSelected(project)} className="rounded-2xl border p-5 text-left transition hover:-translate-y-1" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                    <div>
                                        <h2 className="text-xl font-black">{project.title}</h2>
                                        <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>{project.client?.name || project.client?.email}</p>
                                        <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>Owner: {project.owner ? `${project.owner.firstName} ${project.owner.lastName}` : 'Unassigned'}</p>
                                    </div>
                                    <div className="min-w-[220px]">
                                        <div className="mb-2 flex justify-between text-sm font-bold">
                                            <span>{project.status}</span>
                                            <span>{project.progress}%</span>
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: colors.borderLight }}>
                                            <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` }} />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <aside className="rounded-2xl border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        {selected ? (
                            <div>
                                <h2 className="text-2xl font-black">{selected.title}</h2>
                                <p className="mt-2" style={{ color: colors.textSecondary }}>{selected.description}</p>
                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    {[25, 50, 75, 100].map((progress) => (
                                        <button key={progress} onClick={() => updateProject(selected, { progress })} className="rounded-xl px-4 py-3 font-bold text-white" style={{ backgroundColor: colors.primary }}>{progress}%</button>
                                    ))}
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {['ACTIVE', 'DELIVERED', 'COMPLETED', 'PAUSED'].map((status) => (
                                        <button key={status} onClick={() => updateProject(selected, { status })} className="rounded-xl border px-4 py-3 text-sm font-bold" style={{ borderColor: colors.border, color: colors.text }}>{status}</button>
                                    ))}
                                </div>
                                <div className="mt-6">
                                    <h3 className="font-black">Milestones</h3>
                                    <div className="mt-3 space-y-2">
                                        {selected.milestones?.map((milestone) => <div key={milestone.id} className="rounded-xl p-3 text-sm" style={{ backgroundColor: colors.backgroundSecondary }}>{milestone.title} · {milestone.status}</div>)}
                                    </div>
                                </div>
                            </div>
                        ) : <p style={{ color: colors.textSecondary }}>Select a project to manage progress and delivery state.</p>}
                    </aside>
                </div>
            )}
        </div>
    );
};

export default ClientProjectsManagement;
