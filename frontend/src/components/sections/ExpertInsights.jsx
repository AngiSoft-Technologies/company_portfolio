import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { getStaffDetailPath } from '../../utils/detailPaths';
import { ScrollReveal } from '../modern';
import { FaLinkedin, FaArrowRight } from 'react-icons/fa';

const ExpertInsights = () => {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    apiGet('/staff')
      .then((data) => {
        const active = Array.isArray(data) ? data.filter(s => s.active !== false) : [];
        setStaff(active.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const getInitials = (name) => {
    return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #0B1E3D 0%, #07142B 100%)'
          : 'linear-gradient(180deg, #EFF5FF 0%, #F8FAFF 100%)',
        color: isDark ? '#fff' : '#07142B',
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <ScrollReveal animation="fadeUp">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Insights From{' '}
              <span style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Our Experts</span>
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
            >
              Meet the minds behind our solutions — experienced professionals driving innovation across Africa.
            </p>
          </div>
        </ScrollReveal>

        {staff.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {staff.map((member, i) => {
              const detailPath = getStaffDetailPath(member);
              return (
                <ScrollReveal key={member.id || i} animation="fadeUp" delay={i * 100}>
                  <div
                    className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <div className="p-6 lg:p-8 text-center">
                      {/* Avatar */}
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                          style={{ border: `3px solid ${colors.primary}30` }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div
                          className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-xl font-bold"
                          style={{
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                            color: '#fff',
                          }}
                        >
                          {getInitials(member.name)}
                        </div>
                      )}

                      <h3
                        className="text-lg font-bold mb-1"
                        style={{ color: isDark ? '#fff' : '#1e293b' }}
                      >
                        {member.name}
                      </h3>
                      <p
                        className="text-sm font-medium mb-3"
                        style={{ color: colors.primary }}
                      >
                        {member.role}
                      </p>
                      <p
                        className="text-sm leading-relaxed mb-5 line-clamp-3"
                        style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}
                      >
                        {member.bio}
                      </p>

                      <div className="flex items-center justify-center gap-3">
                        <Link
                          to={detailPath}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                          style={{ color: colors.primary }}
                        >
                          View Profile
                          <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
                        </Link>
                        {member.linkedin && (
                          <a
                            href={member.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: colors.primary, background: `${colors.primary}10` }}
                          >
                            <FaLinkedin />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          <ScrollReveal animation="fadeUp">
            <p
              className="text-center text-sm"
              style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
            >
              Team profiles coming soon.
            </p>
          </ScrollReveal>
        )}

        <ScrollReveal animation="fadeUp" delay={300}>
          <div className="text-center mt-10">
            <Link
              to="/staff"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                color: '#fff',
                boxShadow: `0 4px 16px ${colors.primary}40`,
              }}
            >
              Meet Our Full Team
              <FaArrowRight className="text-xs" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ExpertInsights;
