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
import '../../css/IndustryExpertise.css';

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

// Stable slug from a name (used as React key + active tab id, not the name string).
const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Math.random().toString(36).slice(2, 8)}`;

const normalizeIndustry = (industry, index) => {
  const name = industry?.name || `Industry ${index + 1}`;
  const id = industry?.id || slugify(name);
  const services = (industry?.services || industry?.capabilities || []).map((service, i) => {
    const svc = typeof service === 'string'
      ? { icon: FaHandshake, name: service }
      : { ...service, icon: resolveIcon(service.icon, FaHandshake) };
    return { ...svc, id: svc.id || `${id}-svc-${i}` };
  });

  return {
    ...industry,
    id,
    name,
    icon: resolveIcon(industry?.icon),
    bgImage: resolveAssetUrl(
      industry?.bgImage || industry?.imageUrl || '/uploads/public/images/services/it-consulting.jpg'
    ),
    services,
  };
};

// Accept either a bare array or an object wrapping { industries, moreIndustries }.
const extractIndustries = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    return [...(data.industries || []), ...(data.moreIndustries || [])];
  }
  return [];
};

// Dedupe by stable id (keep first).
const dedupe = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const IndustryExpertise = () => {
  const [content, setContent] = useState({
    badge: '',
    title: '',
    titleHighlight: '',
    subtitle: '',
    industries: [],
  });
  const [activeId, setActiveId] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error

  useEffect(() => {
    let active = true;

    apiGet('/site/industries')
      .then((data) => {
        if (!active) return;

        const raw = extractIndustries(data)
          .map((industry, index) => normalizeIndustry(industry, index));
        const industries = dedupe(raw);

        setContent({
          badge: data?.badge || 'Our Industry Expertise',
          title: data?.title || 'Industries We Serve',
          titleHighlight: data?.titleHighlight || '',
          subtitle: data?.subtitle || '',
          industries,
        });

        if (industries.length > 0) {
          setActiveId(industries[0].id);
          setStatus('ready');
        } else {
          setStatus('empty');
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load industries:', err);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const activeIndustry =
    content.industries.find((industry) => industry.id === activeId) || null;

  const renderTitle = () => {
    const highlight = content.titleHighlight?.trim();
    if (highlight) {
      const head = content.title.replace(highlight, '').trim();
      return (
        <>
          {head ? `${head} ` : ''}
          <span className="angi-section-title-gradient">{highlight}</span>
        </>
      );
    }
    // Fall back to splitting off the last two words for gradient emphasis.
    const words = content.title.split(' ');
    const tail = words.slice(-2).join(' ');
    const head = words.slice(0, -2).join(' ');
    return (
      <>
        {head ? `${head} ` : ''}
        <span className="angi-section-title-gradient">{tail}</span>
      </>
    );
  };

  return (
    <section className="angi-industry" id="industries">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">{content.badge || 'Our Industry Expertise'}</div>
          <h2 className="angi-section-title">{renderTitle()}</h2>
          {content.subtitle && <p className="angi-section-subtitle">{content.subtitle}</p>}
        </div>

        {status === 'loading' && (
          <div className="angi-industry-state" role="status">Loading industries…</div>
        )}
        {status === 'error' && (
          <div className="angi-industry-state" role="alert">Could not load industries right now.</div>
        )}
        {status === 'empty' && (
          <div className="angi-industry-state">No industries available yet.</div>
        )}

        {status === 'ready' && content.industries.length > 0 && (
          <>
            <div className="angi-industry-tabs" role="tablist" aria-label="Industries">
              {content.industries.map((industry) => (
                <button
                  key={industry.id}
                  type="button"
                  role="tab"
                  id={`industry-tab-${industry.id}`}
                  aria-selected={activeId === industry.id}
                  aria-controls={`industry-panel-${industry.id}`}
                  className="angi-industry-tab"
                  onClick={() => setActiveId(industry.id)}
                >
                  {industry.name}
                </button>
              ))}
            </div>

            {activeIndustry && (
              <IndustryPanel key={activeIndustry.id} industry={activeIndustry} />
            )}
          </>
        )}
      </div>
    </section>
  );
};

const IndustryPanel = ({ industry }) => {
  const IndustryIcon = industry.icon;

  return (
    <div
      className="angi-industry-panel"
      role="tabpanel"
      id={`industry-panel-${industry.id}`}
      aria-labelledby={`industry-tab-${industry.id}`}
    >
      <div
        className="angi-industry-panel-background"
        aria-hidden="true"
        style={{ '--industry-background': `url(${industry.bgImage})` }}
      />
      <div className="angi-industry-panel-overlay" aria-hidden="true" />

      <div className="angi-industry-panel-content">
        <div className="angi-industry-panel-heading">
          <span className="angi-industry-panel-icon" aria-hidden="true">
            <IndustryIcon />
          </span>
          <h3 className="angi-industry-panel-title">{industry.name}</h3>
        </div>

        <ul className="angi-industry-grid">
          {industry.services.map((svc) => {
            const Icon = svc.icon;
            return (
              <li key={svc.id} className="angi-industry-card">
                <span className="angi-industry-card-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="angi-industry-card-name">{svc.name}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default IndustryExpertise;
