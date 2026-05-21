import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { resolveAssetUrl } from '../utils/constants';
import { getBlogDetailPath, getProjectDetailPath, getServiceDetailPath } from '../utils/detailPaths';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import {
    FaArrowLeft, FaLinkedin, FaTwitter, FaGithub, FaEnvelope,
    FaArrowRight, FaBriefcase, FaNewspaper, FaCode, FaUserTie,
    FaStar, FaGlobe, FaMapMarkerAlt, FaPhone, FaFileDownload,
    FaProjectDiagram
} from 'react-icons/fa';

const StaffDetail = () => {
    const { usernameOrId } = useParams();
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStaff = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiGet(`/staff/${usernameOrId}`);
                setStaff(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (usernameOrId) fetchStaff();
    }, [usernameOrId]);

    if (loading) {
        return (
            <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: `${colors.primary}30`, borderTopColor: colors.primary }} />
            </div>
        );
    }

    if (error || !staff) {
        return (
            <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen flex items-center justify-center p-8">
                <GlassmorphismCard className="p-12 text-center max-w-lg">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: colors.text }}>{error || 'Team member not found'}</h2>
                    <button
                        onClick={() => navigate('/staff')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: 'white' }}
                    >
                        <FaArrowLeft /> Back to Team
                    </button>
                </GlassmorphismCard>
            </div>
        );
    }

    const fullName = `${staff.firstName} ${staff.lastName}`;
    const roleLabel = staff.publicTitle || staff.role?.replace('_', ' ');
    const socialLinks = [
        { icon: FaLinkedin, url: staff.linkedinUrl, label: 'LinkedIn' },
        { icon: FaTwitter, url: staff.twitterUrl, label: 'Twitter / X' },
        { icon: FaGithub, url: staff.githubUrl, label: 'GitHub' },
        { icon: FaGlobe, url: staff.websiteUrl, label: 'Website' },
    ].filter(link => link.url);

    const infoLinks = [
        staff.publicEmail && { icon: FaEnvelope, label: staff.publicEmail, href: `mailto:${staff.publicEmail}` },
        staff.publicPhone && { icon: FaPhone, label: staff.publicPhone, href: `tel:${staff.publicPhone}` },
        staff.location && { icon: FaMapMarkerAlt, label: staff.location },
    ].filter(Boolean);

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            <ParallaxSection speed={0.12} treatment="resume" className="relative py-24 overflow-hidden">
                <div className="absolute inset-0 angi-technical-grid-soft opacity-15" />
                <div className="relative z-10 max-w-7xl mx-auto px-4">
                    <ScrollReveal animation="fadeUp">
                        <button onClick={() => navigate('/staff')} className="inline-flex items-center gap-2 mb-8 text-sm font-medium transition-colors hover:opacity-80" style={{ color: colors.primary }}>
                            <FaArrowLeft /> Back to Team
                        </button>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                        <ScrollReveal animation="fadeUp">
                            <GlassmorphismCard className="p-8 text-center sticky top-24">
                                <div className="relative inline-block mb-6">
                                    {staff.avatarUrl ? (
                                        <img src={resolveAssetUrl(staff.avatarUrl)} alt={fullName} loading="lazy" decoding="async" className="w-40 h-40 rounded-full object-cover mx-auto" style={{ border: `4px solid ${colors.primary}` }} />
                                    ) : (
                                        <div className="w-40 h-40 rounded-full flex items-center justify-center text-white text-5xl font-bold mx-auto" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                                            {staff.firstName?.[0]}{staff.lastName?.[0]}
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full border-4" style={{ backgroundColor: '#22c55e', borderColor: mode === 'dark' ? '#1f2937' : 'white' }} />
                                </div>

                                <h1 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>{fullName}</h1>
                                {roleLabel && (
                                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-semibold mb-4" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                                        <FaUserTie /> {roleLabel}
                                    </div>
                                )}
                                {staff.publicSummary && <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>{staff.publicSummary}</p>}

                                {socialLinks.length > 0 && (
                                    <div className="flex justify-center gap-3 mb-6">
                                        {socialLinks.map((link) => (
                                            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }} title={link.label}>
                                                <link.icon />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {infoLinks.length > 0 && (
                                    <div className="space-y-3 text-left mb-6">
                                        {infoLinks.map((item) => {
                                            const content = <><item.icon style={{ color: colors.primary }} /><span>{item.label}</span></>;
                                            return item.href ? (
                                                <a key={item.label} href={item.href} className="flex items-center gap-3 text-sm hover:opacity-80" style={{ color: colors.textSecondary }}>{content}</a>
                                            ) : (
                                                <div key={item.label} className="flex items-center gap-3 text-sm" style={{ color: colors.textSecondary }}>{content}</div>
                                            );
                                        })}
                                    </div>
                                )}
                            </GlassmorphismCard>
                        </ScrollReveal>

                        <div className="lg:col-span-2 space-y-8">
                            <ScrollReveal animation="fadeUp" delay={100}>
                                <GlassmorphismCard className="p-8">
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: colors.text }}><FaStar style={{ color: colors.primary }} /> About</h2>
                                    <p className="text-lg leading-relaxed whitespace-pre-line" style={{ color: colors.textSecondary }}>{staff.bio || 'No bio available.'}</p>
                                </GlassmorphismCard>
                            </ScrollReveal>

                            {staff.skills?.length > 0 && (
                                <ScrollReveal animation="fadeUp" delay={150}>
                                    <GlassmorphismCard className="p-8">
                                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: colors.text }}><FaCode style={{ color: colors.primary }} /> Skills</h2>
                                        <div className="flex flex-wrap gap-3">
                                            {staff.skills.map((skill) => <span key={skill} className="px-4 py-2 rounded-full text-sm font-medium" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>{skill}</span>)}
                                        </div>
                                    </GlassmorphismCard>
                                </ScrollReveal>
                            )}

                            {staff.specialties?.length > 0 && (
                                <ScrollReveal animation="fadeUp" delay={180}>
                                    <GlassmorphismCard className="p-8">
                                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: colors.text }}><FaBriefcase style={{ color: colors.primary }} /> Specialties</h2>
                                        <div className="flex flex-wrap gap-3">
                                            {staff.specialties.map((item) => <span key={item} className="px-4 py-2 rounded-full text-sm font-medium" style={{ backgroundColor: `${colors.secondary}20`, color: colors.secondary }}>{item}</span>)}
                                        </div>
                                    </GlassmorphismCard>
                                </ScrollReveal>
                            )}

                            {staff.services?.length > 0 && (
                                <ContentGrid title="Services" icon={FaBriefcase} items={staff.services} colors={colors} mode={mode} onOpen={(service) => navigate(getServiceDetailPath(service))} />
                            )}

                            {staff.projects?.length > 0 && (
                                <ContentGrid title="Projects" icon={FaProjectDiagram} items={staff.projects} colors={colors} mode={mode} onOpen={(project) => navigate(getProjectDetailPath(project))} />
                            )}

                            {staff.posts?.length > 0 && (
                                <ScrollReveal animation="fadeUp" delay={250}>
                                    <div>
                                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: colors.text }}><FaNewspaper style={{ color: colors.primary }} /> Recent Articles</h2>
                                        <div className="space-y-4">
                                            {staff.posts.map((post) => (
                                                <div key={post.id} onClick={() => navigate(getBlogDetailPath(post))} className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-lg" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}><FaNewspaper style={{ color: colors.primary }} /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold truncate" style={{ color: colors.text }}>{post.title}</h3>
                                                        <p className="text-sm" style={{ color: colors.textSecondary }}>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <FaArrowRight style={{ color: colors.primary }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </ScrollReveal>
                            )}

                            {staff.documents?.length > 0 && (
                                <ScrollReveal animation="fadeUp" delay={300}>
                                    <GlassmorphismCard className="p-8">
                                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: colors.text }}><FaFileDownload style={{ color: colors.primary }} /> Public Documents</h2>
                                        <div className="space-y-3">
                                            {staff.documents.map((doc) => (
                                                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-xl transition-all hover:opacity-80" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', color: colors.text }}>
                                                    <span>{doc.metadata?.label || doc.filename}</span>
                                                    <FaFileDownload style={{ color: colors.primary }} />
                                                </a>
                                            ))}
                                        </div>
                                    </GlassmorphismCard>
                                </ScrollReveal>
                            )}
                        </div>
                    </div>
                </div>
            </ParallaxSection>
        </div>
    );
};

const ContentGrid = ({ title, icon, items, colors, mode, onOpen }) => {
    const GridIcon = icon;

    return (
    <ScrollReveal animation="fadeUp" delay={200}>
        <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: colors.text }}><GridIcon style={{ color: colors.primary }} /> {title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                    <div key={item.id} onClick={() => onOpen(item)} className="p-6 rounded-2xl cursor-pointer transition-all hover:shadow-lg" style={{ backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                        <h3 className="font-bold mb-2" style={{ color: colors.text }}>{item.title}</h3>
                        <p className="text-sm line-clamp-2" style={{ color: colors.textSecondary }}>{item.description}</p>
                    </div>
                ))}
            </div>
        </div>
    </ScrollReveal>
    );
};

export default StaffDetail;
