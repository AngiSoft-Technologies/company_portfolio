import React, { useState } from 'react';
import {
  FaHeartbeat, FaUniversity, FaGraduationCap, FaHome,
  FaShoppingCart, FaNetworkWired, FaTruck, FaHardHat,
  FaBriefcase, FaMusic,
  FaStethoscope, FaPills, FaUserMd, FaHospital,
  FaCreditCard, FaChartPie, FaWallet, FaMoneyBillWave,
  FaBook, FaChalkboardTeacher, FaSchool, FaLaptopCode,
  FaBuilding, FaKey, FaWarehouse, FaClipboardList,
  FaBarcode, FaStore, FaReceipt, FaTags,
  FaSignal, FaWifi, FaServer, FaHeadset,
  FaTruckLoading, FaRoute, FaBoxes,
  FaHammer, FaRulerCombined, FaDrawPolygon,
  FaFileContract, FaCalculator, FaUserTie, FaHandshake,
  FaCalendarCheck, FaShieldAlt,
} from 'react-icons/fa';

const industryData = {
  Healthcare: {
    icon: FaHeartbeat,
    bgImage: '/images/services/healthcare-bg.jpg',
    services: [
      { icon: FaStethoscope, name: 'EHR/EMR Systems' },
      { icon: FaUserMd, name: 'Patient Portals' },
      { icon: FaHospital, name: 'Hospital Management' },
      { icon: FaPills, name: 'Pharmacy Management' },
      { icon: FaCalendarCheck, name: 'Appointment Scheduling' },
      { icon: FaChartPie, name: 'Health Analytics' },
    ],
  },
  Finance: {
    icon: FaUniversity,
    bgImage: '/images/services/finance-bg.jpg',
    services: [
      { icon: FaCreditCard, name: 'Payment Processing' },
      { icon: FaChartPie, name: 'Financial Dashboards' },
      { icon: FaWallet, name: 'Mobile Banking' },
      { icon: FaMoneyBillWave, name: 'Loan Management' },
      { icon: FaShieldAlt, name: 'Fraud Detection' },
      { icon: FaFileContract, name: 'Compliance Reporting' },
    ],
  },
  Education: {
    icon: FaGraduationCap,
    bgImage: '/images/services/education-bg.jpg',
    services: [
      { icon: FaSchool, name: 'School Management' },
      { icon: FaLaptopCode, name: 'E-Learning Platforms' },
      { icon: FaChalkboardTeacher, name: 'Virtual Classrooms' },
      { icon: FaBook, name: 'Content Management' },
      { icon: FaChartPie, name: 'Student Analytics' },
      { icon: FaClipboardList, name: 'Examination Systems' },
    ],
  },
  'Real Estate': {
    icon: FaHome,
    bgImage: '/images/services/realestate-bg.jpg',
    services: [
      { icon: FaBuilding, name: 'Property Management' },
      { icon: FaKey, name: 'Tenant Portals' },
      { icon: FaWarehouse, name: 'Inventory Tracking' },
      { icon: FaClipboardList, name: 'Lease Management' },
      { icon: FaCalculator, name: 'Rent Collection' },
      { icon: FaDrawPolygon, name: 'Virtual Tours' },
    ],
  },
  'Retail & eCommerce': {
    icon: FaShoppingCart,
    bgImage: '/images/services/retail-bg.jpg',
    services: [
      { icon: FaBarcode, name: 'POS Systems' },
      { icon: FaStore, name: 'Online Stores' },
      { icon: FaReceipt, name: 'Inventory Management' },
      { icon: FaTags, name: 'Loyalty Programs' },
      { icon: FaChartPie, name: 'Sales Analytics' },
      { icon: FaTruckLoading, name: 'Order Fulfillment' },
    ],
  },
  Telecommunications: {
    icon: FaNetworkWired,
    bgImage: '/images/services/telecom-bg.jpg',
    services: [
      { icon: FaWifi, name: 'ISP Billing' },
      { icon: FaSignal, name: 'Network Monitoring' },
      { icon: FaServer, name: 'Infrastructure Mgmt' },
      { icon: FaHeadset, name: 'Customer Portals' },
      { icon: FaChartPie, name: 'Usage Analytics' },
      { icon: FaClipboardList, name: 'Service Provisioning' },
    ],
  },
};

const moreIndustries = [
  {
    name: 'Logistics',
    icon: FaTruck,
    bgImage: '/images/services/telecom-bg.jpg',
    services: [
      { icon: FaRoute, name: 'Route Optimization' },
      { icon: FaBoxes, name: 'Warehouse Management' },
      { icon: FaTruckLoading, name: 'Fleet Tracking' },
      { icon: FaClipboardList, name: 'Order Management' },
    ],
  },
  {
    name: 'Construction',
    icon: FaHardHat,
    bgImage: '/images/services/enterprise.jpg',
    services: [
      { icon: FaRulerCombined, name: 'Project Tracking' },
      { icon: FaDrawPolygon, name: 'BIM Integration' },
      { icon: FaClipboardList, name: 'Safety Management' },
      { icon: FaCalculator, name: 'Cost Estimation' },
    ],
  },
  {
    name: 'Professional Services',
    icon: FaBriefcase,
    bgImage: '/images/services/it-consulting.jpg',
    services: [
      { icon: FaUserTie, name: 'CRM Systems' },
      { icon: FaFileContract, name: 'Contract Management' },
      { icon: FaCalculator, name: 'Billing & Invoicing' },
      { icon: FaHandshake, name: 'Client Portals' },
    ],
  },
  {
    name: 'Entertainment & Music',
    icon: FaMusic,
    bgImage: '/images/services/ai-automation.jpg',
    services: [
      { icon: FaMusic, name: 'Distribution Platforms' },
      { icon: FaChartPie, name: 'Royalty Tracking' },
      { icon: FaLaptopCode, name: 'Streaming Systems' },
      { icon: FaClipboardList, name: 'Rights Management' },
    ],
  },
];

const allIndustryNames = [...Object.keys(industryData), 'More industries'];

const IndustryExpertise = () => {
  const [active, setActive] = useState('Healthcare');

  const isRegular = industryData[active];
  const current = isRegular ? industryData[active] : null;

  return (
    <section className="angi-section angi-section-dark" id="industries">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Our Industry Expertise</div>
          <h2 className="angi-section-title">
            Industries <span className="angi-section-title-gradient">We Serve</span>
          </h2>
        </div>

        {/* Industry Tabs */}
        <div className="angi-tab-group" style={{ marginBottom: '2rem' }}>
          {allIndustryNames.map((name) => (
            <button
              key={name}
              className={`angi-tab ${active === name ? 'angi-tab-active' : ''}`}
              onClick={() => setActive(name)}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Regular Industry View with background image */}
        {isRegular && current && (
          <div
            style={{
              position: 'relative', borderRadius: '1.25rem', overflow: 'hidden',
              border: '1px solid rgba(0,175,255,0.1)',
            }}
          >
            {/* Background image */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${current.bgImage})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'brightness(0.3)',
            }} />
            {/* Overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(7,20,43,0.88) 0%, rgba(7,20,43,0.7) 100%)',
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2, padding: '2rem' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.25rem', maxWidth: '900px', margin: '0 auto',
              }}>
                {current.services.map((svc, i) => {
                  const Icon = svc.icon;
                  return (
                    <div key={i} style={{
                      textAlign: 'center', padding: '1.5rem 1rem', cursor: 'default',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '0.75rem',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
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
                        margin: '0 auto 0.75rem', fontSize: '1rem', color: 'var(--primary)',
                        background: 'rgba(8,117,255,0.1)',
                      }}>
                        <Icon />
                      </div>
                      <div style={{
                        fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(245,247,250,0.9)',
                      }}>
                        {svc.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* More Industries View */}
        {!isRegular && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {moreIndustries.map((ind) => (
              <div
                key={ind.name}
                style={{
                  position: 'relative', borderRadius: '1.25rem', overflow: 'hidden',
                  border: '1px solid rgba(0,175,255,0.1)',
                }}
              >
                {/* Background image */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(${ind.bgImage})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  filter: 'brightness(0.3)',
                }} />
                {/* Overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, rgba(7,20,43,0.88) 0%, rgba(7,20,43,0.7) 100%)',
                }} />

                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2, padding: '1.5rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
                  }}>
                    <div style={{
                      width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.875rem', color: 'var(--primary)', background: 'rgba(8,117,255,0.1)',
                    }}>
                      <ind.icon />
                    </div>
                    <h3 style={{
                      fontFamily: "'Sora', sans-serif", fontSize: '1.125rem', fontWeight: 700,
                      color: '#fff',
                    }}>
                      {ind.name}
                    </h3>
                  </div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
                  }}>
                    {ind.services.map((svc, i) => {
                      const Icon = svc.icon;
                      return (
                        <div key={i} style={{
                          textAlign: 'center', padding: '1rem 0.5rem',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '0.75rem', backdropFilter: 'blur(10px)',
                        }}>
                          <div style={{
                            width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 0.5rem', fontSize: '0.875rem', color: 'var(--primary)',
                            background: 'rgba(8,117,255,0.1)',
                          }}>
                            <Icon />
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(245,247,250,0.9)' }}>
                            {svc.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default IndustryExpertise;
