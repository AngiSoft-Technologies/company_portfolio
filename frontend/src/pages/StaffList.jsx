import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { getStaffDetailPath } from '../utils/detailPaths';
import { resolveAssetUrl } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal } from '../components/modern';
import {
    FaUsers, FaLinkedin, FaTwitter, FaGithub, FaGlobe,
    FaArrowRight, FaEnvelope, FaMapMarkerAlt, FaBriefcase
} from 'react-icons/fa';

const StaffList = () => {
    const navigate = useNavigate();
    const { colors } = useTheme();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        apiGet('/staff')
            .then(setStaff)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const roleCount = new Set(staff.map(s => s.role)).size;

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">

            {/* ═══════ Cinematic Hero ═══════ */}
            <section className="relative py-32 md:py-44 overflow-hidden">
                {/* Ambient glows */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.06]"
                        style={{ background: colors.primary, top: '-25%', left: '-10%' }} />
                    <div className="absolute w-[400px] h-[400px] rounded-full blur-[140px] opacity-[0.04]"
                        style={{ background: colors.secondary, bottom: '-15%', right: '5%' }} />
                </div>
                {/* Grid texture */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${colors.primary} 1px, transparent 1px), linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)`,
                        backgroundSize: '80px 80px',
                    }} />

                <div className="relative z-10 max-w-6xl mx-auto px-4">
                    <ScrollReveal animation="fadeUp">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-[2px]" style={{ background: `linear-gradient(90deg, ${colors.primary}, transparent)` }} />
                            <span className="text-sm font-semibold uppercase tracking-[0.2em]"
                                style={{ color: colors.primary, fontFamily: 'Sora, sans-serif' }}>
                                Our People
                            </span>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-8"
                            style={{ fontFamily: 'Sora, sans-serif' }}>
                            <span style={{ color: '#fff' }}>The Minds</span><br />
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, #39FF6A)`,
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>Behind The Code</span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p className="text-lg md:text-xl max-w-2xl mb-12 leading-relaxed"
                            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
                            Our talented team of engineers, designers, and strategists is the backbone of everything we build. Get to know the people shaping African tech.
                        </p>
                    </ScrollReveal>

                    {/* Live stats */}
                    {!loading && staff.length > 0 && (
                        <ScrollReveal animation="fadeUp" delay={300}>
                            <div className="flex flex-wrap gap-6">
                                {[
                                    { value: staff.length, label: 'Team Members' },
                                    { value: roleCount, label: 'Departments' },
                                    { value: '2024', label: 'Founded' },
                                    { value: 'Nairobi', label: 'Headquarters' },
                                ].map((stat, idx) => (
                                    <div key={idx} className="px-6 py-4 rounded-2xl"
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            backdropFilter: 'blur(12px)',
                                        }}>
                                        <div className="text-2xl md:text-3xl font-bold mb-1"
                                            style={{ color: colors.primary, fontFamily: 'Sora, sans-serif' }}>
                                            {stat.value}
                                        </div>
                                        <div className="text-xs uppercase tracking-wider"
                                            style={{ color: 'rgba(255,255,255,0.4)' }}>
                                            {stat.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollReveal>
                    )}
                </div>
            </section>

            {/* ═══════ Team Grid ═══════ */}
            <section className="py-24 px-4">
                <div className="max-w-7xl mx-auto">

                    {loading && (
                        <div className="flex justify-center py-24">
                            <div className="w-12 h-12 border-2 rounded-full animate-spin"
                                style={{ borderColor: `${colors.primary}20`, borderTopColor: colors.primary }} />
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-20 rounded-2xl"
                            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
                        </div>
                    )}

                    {!loading && !error && staff.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {staff.map((member, idx) => {
                                const fullName = `${member.firstName} ${member.lastName}`;
                                const hasSocials = member.linkedinUrl || member.twitterUrl || member.githubUrl || member.websiteUrl;
                                return (
                                    <ScrollReveal key={member.id} animation="fadeUp" delay={idx * 80}>
                                        <div onClick={() => navigate(getStaffDetailPath(member))}
                                            className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2"
                                            style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                            }}>

                                            {/* Large avatar area */}
                                            <div className="relative h-64 overflow-hidden">
                                                {member.avatarUrl ? (
                                                    <img src={resolveAssetUrl(member.avatarUrl)}
                                                        alt={fullName}
                                                        loading="lazy" decoding="async"
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white"
                                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>
                                                        {member.firstName?.[0]}{member.lastName?.[0]}
                                                    </div>
                                                )}
                                                {/* Bottom gradient */}
                                                <div className="absolute inset-0"
                                                    style={{ background: 'linear-gradient(to top, rgba(7,20,43,0.95) 0%, rgba(7,20,43,0.3) 40%, transparent 70%)' }} />

                                                {/* Location badge */}
                                                {member.location && (
                                                    <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5"
                                                        style={{
                                                            background: 'rgba(0,0,0,0.5)',
                                                            backdropFilter: 'blur(12px)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            color: 'rgba(255,255,255,0.7)',
                                                        }}>
                                                        <FaMapMarkerAlt className="text-[9px]" style={{ color: colors.primary }} />
                                                        {member.location}
                                                    </div>
                                                )}

                                                {/* Name + role overlay */}
                                                <div className="absolute bottom-4 left-5 right-5">
                                                    <h3 className="text-xl font-bold mb-1"
                                                        style={{ fontFamily: 'Sora, sans-serif' }}>
                                                        {fullName}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <FaBriefcase className="text-xs" style={{ color: colors.primary }} />
                                                        <span className="text-sm capitalize" style={{ color: colors.primary }}>
                                                            {member.publicTitle || member.role?.toLowerCase().replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card body */}
                                            <div className="p-5">
                                                {/* Summary */}
                                                {(member.publicSummary || member.bio) && (
                                                    <p className="text-sm mb-4 line-clamp-2 leading-relaxed"
                                                        style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Sans, sans-serif' }}>
                                                        {member.publicSummary || member.bio}
                                                    </p>
                                                )}

                                                {/* Skills */}
                                                {member.skills && member.skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                                        {member.skills.slice(0, 4).map((skill, sIdx) => (
                                                            <span key={sIdx}
                                                                className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide"
                                                                style={{
                                                                    background: `${colors.primary}10`,
                                                                    color: colors.primary,
                                                                    border: `1px solid ${colors.primary}18`,
                                                                }}>
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {member.skills.length > 4 && (
                                                            <span className="px-2 py-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                                +{member.skills.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Specialties as secondary tags */}
                                                {member.specialties && member.specialties.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                                        {member.specialties.slice(0, 3).map((spec, sIdx) => (
                                                            <span key={sIdx}
                                                                className="px-2 py-0.5 rounded text-[10px]"
                                                                style={{
                                                                    background: 'rgba(255,255,255,0.04)',
                                                                    color: 'rgba(255,255,255,0.4)',
                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                }}>
                                                                {spec}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Footer: socials + view */}
                                                <div className="flex items-center justify-between pt-3"
                                                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {/* Social links */}
                                                    <div className="flex gap-2">
                                                        {member.linkedinUrl && (
                                                            <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                                                style={{ background: `${colors.primary}15`, color: colors.primary }}>
                                                                <FaLinkedin className="text-xs" />
                                                            </a>
                                                        )}
                                                        {member.twitterUrl && (
                                                            <a href={member.twitterUrl} target="_blank" rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                                                style={{ background: `${colors.primary}15`, color: colors.primary }}>
                                                                <FaTwitter className="text-xs" />
                                                            </a>
                                                        )}
                                                        {member.githubUrl && (
                                                            <a href={member.githubUrl} target="_blank" rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                                                style={{ background: `${colors.primary}15`, color: colors.primary }}>
                                                                <FaGithub className="text-xs" />
                                                            </a>
                                                        )}
                                                        {member.websiteUrl && (
                                                            <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                                                                style={{ background: `${colors.primary}15`, color: colors.primary }}>
                                                                <FaGlobe className="text-xs" />
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* View profile */}
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 opacity-60 group-hover:opacity-100"
                                                        style={{ color: colors.primary, fontFamily: 'Sora, sans-serif' }}>
                                                        Profile <FaArrowRight className="text-[10px] transition-transform duration-300 group-hover:translate-x-1" />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && !error && staff.length === 0 && (
                        <div className="text-center py-24 rounded-2xl"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <FaUsers className="text-5xl mx-auto mb-4 opacity-30" />
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Team profiles coming soon.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════ Join CTA ═══════ */}
            <section className="py-24 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <div className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center"
                            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}>
                            <div className="absolute inset-0 opacity-10 pointer-events-none"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                }} />
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4"
                                    style={{ fontFamily: 'Sora, sans-serif' }}>
                                    Want to Join the Team?
                                </h2>
                                <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto"
                                    style={{ fontFamily: 'DM Sans, sans-serif' }}>
                                    We're always looking for talented people. Check out our open positions or reach out directly.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <button onClick={() => navigate('/careers')}
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105"
                                        style={{ backgroundColor: '#fff', color: colors.primaryDark }}>
                                        <FaBriefcase /> View Open Roles
                                    </button>
                                    <a href="mailto:careers@angisoft.co.ke"
                                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all duration-300 hover:scale-105"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                                        <FaEnvelope /> Get in Touch
                                    </a>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default StaffList;
