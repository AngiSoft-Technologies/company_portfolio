import React from 'react';
import {
  FaBuilding, FaMobileAlt, FaChartBar, FaGlobe, FaUsers,
  FaLaptopCode, FaCogs, FaNetworkWired, FaDatabase,
  FaShieldAlt, FaBrain, FaMusic, FaMoneyBillWave, FaFileAlt,
  FaSchool,
} from 'react-icons/fa';
import '../../css/SolutionsWeDeliver.css';

const solutionCategories = [
  {
    id: 'enterprise',
    name: 'Enterprise Solutions',
    bgImage: '/uploads/public/images/services/enterprise.jpg',
    items: [
      { id: 'enterprise-applications', icon: FaBuilding, name: 'Enterprise Applications' },
      { id: 'erp-systems', icon: FaCogs, name: 'ERP Systems' },
      { id: 'crm-platforms', icon: FaUsers, name: 'CRM Platforms' },
      { id: 'hr-management', icon: FaUsers, name: 'HR Management Systems' },
      { id: 'document-management', icon: FaFileAlt, name: 'Document Management' },
      { id: 'invoicing-billing', icon: FaMoneyBillWave, name: 'Invoicing & Billing' },
    ],
  },
  {
    id: 'web-mobile',
    name: 'Web & Mobile',
    bgImage: '/uploads/public/images/services/web-mobile.jpg',
    items: [
      { id: 'web-portals', icon: FaGlobe, name: 'Web Portals' },
      { id: 'mobile-applications', icon: FaMobileAlt, name: 'Mobile Applications' },
      { id: 'saas-platforms', icon: FaLaptopCode, name: 'SaaS Platforms' },
      { id: 'progressive-web-apps', icon: FaChartBar, name: 'Progressive Web Apps' },
      { id: 'api-microservices', icon: FaDatabase, name: 'API & Microservices' },
      { id: 'ai-powered-interfaces', icon: FaBrain, name: 'AI-Powered Interfaces' },
    ],
  },
  {
    id: 'industry',
    name: 'Industry Solutions',
    bgImage: '/uploads/public/images/services/industry.jpg',
    items: [
      { id: 'isp-billing', icon: FaNetworkWired, name: 'ISP Billing & Portals' },
      { id: 'school-management', icon: FaSchool, name: 'School Management Systems' },
      { id: 'analytics-dashboards', icon: FaChartBar, name: 'Analytics Dashboards' },
      { id: 'angitunes-platform', icon: FaMusic, name: 'AngiTunes Platform' },
      { id: 'property-management', icon: FaBuilding, name: 'Property Management' },
      { id: 'security-platforms', icon: FaShieldAlt, name: 'Security Platforms' },
    ],
  },
];

const SolutionsWeDeliver = () => {
  return (
    <section className="angi-solutions" id="solutions">
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

        <div className="angi-solutions-categories">
          {solutionCategories.map((cat) => (
            <article
              key={cat.id}
              className="angi-solutions-panel"
              style={{ '--solutions-panel-image': `url(${cat.bgImage})` }}
            >
              <div className="angi-solutions-panel-background" aria-hidden="true" />
              <div className="angi-solutions-panel-overlay" aria-hidden="true" />

              <div className="angi-solutions-panel-content">
                <div className="angi-solutions-category-heading">
                  <span className="angi-solutions-category-marker" aria-hidden="true" />
                  <h3 className="angi-solutions-category-title">{cat.name}</h3>
                </div>

                <ul className="angi-solutions-grid">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id} className="angi-solutions-item">
                        <span className="angi-solutions-item-icon" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="angi-solutions-item-name">{item.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsWeDeliver;
