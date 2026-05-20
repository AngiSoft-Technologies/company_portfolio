import React, { useEffect, useState } from 'react';
import {
  FaReact, FaNodeJs, FaPython, FaJava, FaPhp,
  FaDocker, FaAws, FaLinux, FaHtml5, FaJs,
  FaGitAlt, FaAndroid, FaApple, FaMicrosoft, FaDatabase,
  FaChartBar,
} from 'react-icons/fa';

import {
  SiTypescript, SiTailwindcss, SiNextdotjs, SiLaravel,
  SiDjango, SiSpringboot, SiFlutter, SiKotlin,
  SiPostgresql, SiMongodb, SiFirebase, SiRedis,
  SiKubernetes, SiTerraform, SiMysql, SiNginx,
  SiVuedotjs, SiGraphql, SiTensorflow,
  SiStripe, SiOpenai, SiAngular,
} from 'react-icons/si';
import { apiGet } from '../../js/httpClient';

const iconRegistry = {
  FaReact,
  FaNodeJs,
  FaPython,
  FaJava,
  FaPhp,
  FaDocker,
  FaAws,
  FaLinux,
  FaHtml5,
  FaJs,
  FaGitAlt,
  FaAndroid,
  FaApple,
  FaMicrosoft,
  FaDatabase,
  FaChartBar,
  SiTypescript,
  SiTailwindcss,
  SiNextdotjs,
  SiLaravel,
  SiDjango,
  SiSpringboot,
  SiFlutter,
  SiKotlin,
  SiPostgresql,
  SiMongodb,
  SiFirebase,
  SiRedis,
  SiKubernetes,
  SiTerraform,
  SiMysql,
  SiNginx,
  SiVuedotjs,
  SiGraphql,
  SiTensorflow,
  SiStripe,
  SiOpenai,
  SiAngular,
};

const resolveIcon = (iconName) => iconRegistry[iconName] || FaDatabase;

const TechPlatforms = () => {
  const [cms, setCms] = useState(null);
  const categories = (cms?.categories || cms?.groups || []).map((group) => ({
    name: group.name || group.title,
    items: (group.items || []).map((item) => (
      typeof item === 'string'
        ? { name: item, icon: FaDatabase, color: '#00AFFF' }
        : { ...item, icon: resolveIcon(item.icon), color: item.color || '#00AFFF' }
    )),
  }));

  useEffect(() => {
    apiGet('/site/tech-platforms').then(setCms).catch(() => {});
  }, []);

  return (
    <section className="angi-section angi-section-dark" id="tech">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">{cms?.badge || 'Technologies'}</div>
          <h2 className="angi-section-title">
            {cms?.title || 'Technologies and Platforms'} <span className="angi-section-title-gradient">We Work With</span>
          </h2>
          {cms?.subtitle && <p className="angi-section-subtitle">{cms.subtitle}</p>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '1024px', margin: '0 auto' }}>
          {categories.map((cat) => (
            <div key={cat.name}>
              <h3 style={{
                fontFamily: "'Sora', sans-serif", fontSize: '1.25rem', fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: '1rem',
              }}>
                {cat.name}
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(cat.items.length, 8)}, 1fr)`,
                gap: '0.75rem',
                maxWidth: cat.items.length <= 5 ? '600px' : '960px',
              }}>
                {cat.items.map((tech, i) => {
                  const Icon = tech.icon;
                  return (
                    <div
                      key={`${tech.name}-${i}`}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                        padding: '1rem 0.5rem', borderRadius: '0.75rem',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.3s ease', cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.borderColor = `${tech.color}30`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Icon style={{ fontSize: '1.5rem', color: tech.color, flexShrink: 0 }} />
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(245,247,250,0.75)',
                        textAlign: 'center', lineHeight: 1.3,
                      }}>
                        {tech.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechPlatforms;
