import React from 'react';
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

const categories = [
  {
    name: 'Frontend',
    items: [
      { name: 'React', icon: FaReact, color: '#61DAFB' },
      { name: 'Vue.js', icon: SiVuedotjs, color: '#4FC08D' },
      { name: 'Angular', icon: SiAngular, color: '#DD0031' },
      { name: 'Next.js', icon: SiNextdotjs, color: '#fff' },
      { name: 'TypeScript', icon: SiTypescript, color: '#3178C6' },
      { name: 'JavaScript', icon: FaJs, color: '#F7DF1E' },
      { name: 'HTML5', icon: FaHtml5, color: '#E34F26' },
      { name: 'Tailwind CSS', icon: SiTailwindcss, color: '#06B6D4' },
    ],
  },
  {
    name: 'Backend',
    items: [
      { name: 'Node.js', icon: FaNodeJs, color: '#339933' },
      { name: 'Python', icon: FaPython, color: '#3776AB' },
      { name: 'Laravel', icon: SiLaravel, color: '#FF2D20' },
      { name: 'Django', icon: SiDjango, color: '#092E20' },
      { name: 'Spring Boot', icon: SiSpringboot, color: '#6DB33F' },
      { name: 'PHP', icon: FaPhp, color: '#777BB4' },
      { name: 'GraphQL', icon: SiGraphql, color: '#E10098' },
      { name: 'Java', icon: FaJava, color: '#007396' },
    ],
  },
  {
    name: 'Mobile Development',
    items: [
      { name: 'Flutter', icon: SiFlutter, color: '#02569B' },
      { name: 'React Native', icon: FaReact, color: '#61DAFB' },
      { name: 'Kotlin', icon: SiKotlin, color: '#7F52FF' },
      { name: 'Android', icon: FaAndroid, color: '#3DDC84' },
      { name: 'iOS', icon: FaApple, color: '#fff' },
    ],
  },
  {
    name: 'Databases',
    items: [
      { name: 'PostgreSQL', icon: SiPostgresql, color: '#4169E1' },
      { name: 'MongoDB', icon: SiMongodb, color: '#47A248' },
      { name: 'MySQL', icon: SiMysql, color: '#4479A1' },
      { name: 'Firebase', icon: SiFirebase, color: '#FFCA28' },
      { name: 'Redis', icon: SiRedis, color: '#DC382D' },
    ],
  },
  {
    name: 'Cloud & DevOps',
    items: [
      { name: 'AWS', icon: FaAws, color: '#FF9900' },
      { name: 'Docker', icon: FaDocker, color: '#2496ED' },
      { name: 'Kubernetes', icon: SiKubernetes, color: '#326CE5' },
      { name: 'Linux', icon: FaLinux, color: '#FCC624' },
      { name: 'Nginx', icon: SiNginx, color: '#009639' },
      { name: 'Terraform', icon: SiTerraform, color: '#7B42BC' },
      { name: 'Git', icon: FaGitAlt, color: '#F05032' },
    ],
  },
  {
    name: 'AI & Data',
    items: [
      { name: 'TensorFlow', icon: SiTensorflow, color: '#FF6F00' },
      { name: 'OpenAI', icon: SiOpenai, color: '#412991' },
      { name: 'Python', icon: FaPython, color: '#3776AB' },
      { name: 'Power BI', icon: FaChartBar, color: '#F2C811' },
      { name: 'Stripe', icon: SiStripe, color: '#635BFF' },
      { name: 'Azure', icon: FaMicrosoft, color: '#0078D4' },
    ],
  },
];

const TechPlatforms = () => {
  return (
    <section className="angi-section angi-section-dark" id="tech">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Technologies</div>
          <h2 className="angi-section-title">
            Technologies and Platforms <span className="angi-section-title-gradient">We Work With</span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {categories.map((cat) => (
            <div key={cat.name}>
              {/* Category heading */}
              <h3 style={{
                fontFamily: "'Sora', sans-serif", fontSize: '1.25rem', fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: '1rem',
              }}>
                {cat.name}
              </h3>

              {/* Tech tiles row */}
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
                      key={i}
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
