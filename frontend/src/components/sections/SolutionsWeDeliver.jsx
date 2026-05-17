import React from 'react';
import {
  FaBuilding, FaMobileAlt, FaChartBar, FaGlobe, FaUsers,
  FaLaptopCode, FaCogs, FaNetworkWired, FaDatabase,
  FaShieldAlt, FaBrain, FaMusic, FaMoneyBillWave, FaFileAlt,
  FaSchool,
} from 'react-icons/fa';

const solutionCategories = [
  {
    name: 'Enterprise Solutions',
    bgImage: '/images/services/enterprise.jpg',
    items: [
      { icon: FaBuilding, name: 'Enterprise Applications' },
      { icon: FaCogs, name: 'ERP Systems' },
      { icon: FaUsers, name: 'CRM Platforms' },
      { icon: FaUsers, name: 'HR Management Systems' },
      { icon: FaFileAlt, name: 'Document Management' },
      { icon: FaMoneyBillWave, name: 'Invoicing & Billing' },
    ],
  },
  {
    name: 'Web & Mobile',
    bgImage: '/images/services/web-mobile.jpg',
    items: [
      { icon: FaGlobe, name: 'Web Portals' },
      { icon: FaMobileAlt, name: 'Mobile Applications' },
      { icon: FaLaptopCode, name: 'SaaS Platforms' },
      { icon: FaChartBar, name: 'Progressive Web Apps' },
      { icon: FaDatabase, name: 'API & Microservices' },
      { icon: FaBrain, name: 'AI-Powered Interfaces' },
    ],
  },
  {
    name: 'Industry Solutions',
    bgImage: '/images/services/industry.jpg',
    items: [
      { icon: FaNetworkWired, name: 'ISP Billing & Portals' },
      { icon: FaSchool, name: 'School Management Systems' },
      { icon: FaChartBar, name: 'Analytics Dashboards' },
      { icon: FaMusic, name: 'AngiMusic Platform' },
      { icon: FaBuilding, name: 'Property Management' },
      { icon: FaShieldAlt, name: 'Security Platforms' },
    ],
  },
];

const SolutionsWeDeliver = () => {
  return (
    <section className="angi-section angi-section-gradient" id="solutions">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Solutions</div>
          <h2 className="angi-section-title">
            Solutions We <span className="angi-section-title-gradient">Deliver</span>
          </h2>
          <p className="angi-section-subtitle">
            From enterprise platforms to industry-specific systems, we build solutions that power your business.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {solutionCategories.map((cat) => (
            <div
              key={cat.name}
              style={{
                position: 'relative', borderRadius: '1.25rem', overflow: 'hidden',
                border: '1px solid rgba(0,175,255,0.1)',
              }}
            >
              {/* Background image */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${cat.bgImage})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'brightness(0.35)',
              }} />

              {/* Dark overlay gradient */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, rgba(7,20,43,0.85) 0%, rgba(7,20,43,0.6) 100%)',
              }} />

              {/* Content */}
              <div style={{ position: 'relative', zIndex: 2, padding: '2rem 2rem 1.5rem' }}>
                {/* Category heading */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem',
                }}>
                  <div style={{
                    width: '4px', height: '1.5rem', borderRadius: '2px',
                    background: 'linear-gradient(180deg, var(--primary), var(--secondary))',
                  }} />
                  <h3 style={{
                    fontFamily: "'Sora', sans-serif", fontSize: '1.25rem', fontWeight: 700,
                    color: '#fff', letterSpacing: '-0.01em',
                  }}>
                    {cat.name}
                  </h3>
                </div>

                {/* Solution cards grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem',
                }}>
                  {cat.items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={i}
                        style={{
                          textAlign: 'center', padding: '1.25rem 0.5rem', cursor: 'default',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '0.75rem',
                          transition: 'all 0.3s ease',
                          backdropFilter: 'blur(10px)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(8,117,255,0.12)';
                          e.currentTarget.style.borderColor = 'rgba(8,117,255,0.3)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{
                          width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 0.5rem', fontSize: '1rem', color: 'var(--primary)',
                          background: 'rgba(8,117,255,0.1)',
                        }}>
                          <Icon />
                        </div>
                        <div style={{
                          fontSize: '0.75rem', fontWeight: 600, color: 'rgba(245,247,250,0.9)',
                          lineHeight: 1.4,
                        }}>
                          {item.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsWeDeliver;
