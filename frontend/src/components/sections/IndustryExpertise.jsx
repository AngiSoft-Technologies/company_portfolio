import React, { useEffect, useState } from 'react';
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
  FaRulerCombined, FaDrawPolygon,
  FaFileContract, FaCalculator, FaUserTie, FaHandshake,
  FaCalendarCheck, FaShieldAlt, FaUserCheck,
} from 'react-icons/fa';
import { apiGet } from '../../js/httpClient';
import { resolveAssetUrl } from '../../utils/constants';

const iconRegistry = {
  FaHeartbeat,
  FaUniversity,
  FaGraduationCap,
  FaHome,
  FaShoppingCart,
  FaNetworkWired,
  FaTruck,
  FaHardHat,
  FaBriefcase,
  FaMusic,
  FaStethoscope,
  FaPills,
  FaUserMd,
  FaHospital,
  FaCreditCard,
  FaChartPie,
  FaWallet,
  FaMoneyBillWave,
  FaBook,
  FaChalkboardTeacher,
  FaSchool,
  FaLaptopCode,
  FaBuilding,
  FaKey,
  FaWarehouse,
  FaClipboardList,
  FaBarcode,
  FaStore,
  FaReceipt,
  FaTags,
  FaSignal,
  FaWifi,
  FaServer,
  FaHeadset,
  FaTruckLoading,
  FaRoute,
  FaBoxes,
  FaRulerCombined,
  FaDrawPolygon,
  FaFileContract,
  FaCalculator,
  FaUserTie,
  FaHandshake,
  FaCalendarCheck,
  FaShieldAlt,
  FaUserCheck,
};

const resolveIcon = (iconName, fallback = FaBriefcase) => iconRegistry[iconName] || fallback;

const normalizeIndustry = (industry) => ({
  ...industry,
  icon: resolveIcon(industry.icon),
  bgImage: resolveAssetUrl(industry.bgImage || industry.imageUrl || '/images/services/it-consulting.jpg'),
  services: (industry.services || industry.capabilities || []).map((service) => (
    typeof service === 'string'
      ? { icon: FaHandshake, name: service }
      : { ...service, icon: resolveIcon(service.icon, FaHandshake) }
  )),
});

const IndustryExpertise = () => {
  const [content, setContent] = useState({ industries: [], moreIndustries: [] });
  const [active, setActive] = useState('');

  useEffect(() => {
    apiGet('/site/industries')
      .then((data) => {
        const industries = [
          ...(data?.industries || []),
          ...(data?.moreIndustries || []),
        ].map(normalizeIndustry);

        setContent({
          badge: data?.badge || 'Our Industry Expertise',
          title: data?.title || 'Industries We Serve',
          subtitle: data?.subtitle || '',
          industries,
        });
        if (industries[0]?.name) setActive(industries[0].name);
      })
      .catch(() => {});
  }, []);

  const industryMap = Object.fromEntries(content.industries.map((industry) => [industry.name, industry]));
  const industryNames = content.industries.map((industry) => industry.name);
  const current = industryMap[active] || null;

  return (
    <section className="angi-section angi-section-dark" id="industries">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">{content.badge || 'Our Industry Expertise'}</div>
          <h2 className="angi-section-title">
            {(content.title || 'Industries We Serve').split(' ').slice(0, -2).join(' ') || 'Industries'}{' '}
            <span className="angi-section-title-gradient">
              {(content.title || 'Industries We Serve').split(' ').slice(-2).join(' ')}
            </span>
          </h2>
          {content.subtitle && <p className="angi-section-subtitle">{content.subtitle}</p>}
        </div>

        <div className="angi-tab-group" style={{ marginBottom: '2rem' }}>
          {industryNames.map((name) => (
            <button
              key={name}
              className={`angi-tab ${active === name ? 'angi-tab-active' : ''}`}
              onClick={() => setActive(name)}
            >
              {name}
            </button>
          ))}
        </div>

        {current && (
          <IndustryPanel industry={current} columns="repeat(3, 1fr)" />
        )}
      </div>
    </section>
  );
};

const IndustryPanel = ({ industry, columns, compact = false }) => {
  const IndustryIcon = industry.icon;

  return (
    <div
      style={{
        position: 'relative', borderRadius: '1.25rem', overflow: 'hidden',
        border: '1px solid rgba(0,175,255,0.1)',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${industry.bgImage})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'brightness(0.3)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(7,20,43,0.88) 0%, rgba(7,20,43,0.7) 100%)',
      }} />

      <div style={{ position: 'relative', zIndex: 2, padding: compact ? '1.5rem' : '2rem' }}>
        {compact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.875rem', color: 'var(--primary)', background: 'rgba(8,117,255,0.1)',
            }}>
              <IndustryIcon />
            </div>
            <h3 style={{
              fontFamily: "'Sora', sans-serif", fontSize: '1.125rem', fontWeight: 700,
              color: '#fff',
            }}>
              {industry.name}
            </h3>
          </div>
        )}
        <div style={{
          display: 'grid', gridTemplateColumns: columns,
          gap: compact ? '1rem' : '1.25rem', maxWidth: compact ? 'none' : '900px', margin: '0 auto',
        }}>
          {industry.services.map((svc, i) => {
            const Icon = svc.icon;
            return (
              <div key={`${svc.name}-${i}`} style={{
                textAlign: 'center', padding: compact ? '1rem 0.5rem' : '1.5rem 1rem', cursor: 'default',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.75rem',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: compact ? '2.25rem' : '2.5rem', height: compact ? '2.25rem' : '2.5rem', borderRadius: compact ? '0.5rem' : '0.625rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.75rem', fontSize: compact ? '0.875rem' : '1rem', color: 'var(--primary)',
                  background: 'rgba(8,117,255,0.1)',
                }}>
                  <Icon />
                </div>
                <div style={{ fontSize: compact ? '0.75rem' : '0.8125rem', fontWeight: 600, color: 'rgba(245,247,250,0.9)' }}>
                  {svc.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IndustryExpertise;
