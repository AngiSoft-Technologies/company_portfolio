import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AngiSoftLogo from '../brand/AngiSoftLogo';
import AngiSoftFooterWave from '../brand/AngiSoftFooterWave';
import { apiGet, apiPost } from '../../js/httpClient';
import {
  FaLinkedinIn, FaTwitter, FaFacebookF, FaInstagram, FaGithub,
  FaEnvelope, FaPhone, FaWhatsapp, FaMapMarkerAlt,
  FaHeart, FaLock, FaPaperPlane
} from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [footerData, setFooterData] = useState(null);
  const [nlEmail, setNlEmail] = useState('');
  const [nlStatus, setNlStatus] = useState('');
  const [nlMessage, setNlMessage] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet('/site/contact').catch(() => null),
      apiGet('/site/footer').catch(() => null),
    ]).then(([contact, footer]) => setFooterData({ contact, footer }));
  }, []);

  const contactData = footerData?.contact;
  const footer = footerData?.footer || {};

  const handleSubscribe = async () => {
    if (!nlEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nlEmail)) {
      setNlStatus('error'); setNlMessage('Please enter a valid email.');
      return;
    }
    setNlStatus('loading');
    try {
      const res = await apiPost('/newsletter/subscribe', { email: nlEmail });
      setNlStatus('success'); setNlMessage(res?.message || 'Thanks! Check your email.');
      setNlEmail('');
    } catch (err) {
      setNlStatus('error'); setNlMessage(err?.message || 'Something went wrong.');
    }
  };

  const columns = footer.columns || [
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Our Team', href: '/staff' },
        { label: 'Careers', href: '/careers' },
        { label: 'Blog', href: '/blog' },
      ],
    },
    {
      title: 'Services',
      links: [
        { label: 'Custom Software', href: '/service/custom-software-development' },
        { label: 'Data Analysis', href: '/service/data-analysis-dashboards' },
        { label: 'Cyber Services', href: '/service/cyber-document-services' },
        { label: 'Government Services', href: '/service/kra-sha-applications' },
        { label: 'Advertising', href: '/service/advertising-brand-promotion' },
        { label: 'Internet Services', href: '/service/internet-services' },
      ],
    },
    {
      title: 'Industries',
      links: [
        { label: 'Healthcare', href: '/industry/healthcare' },
        { label: 'Finance', href: '/industry/finance' },
        { label: 'Education', href: '/industry/education' },
        { label: 'Real Estate', href: '/industry/real-estate' },
        { label: 'Retail & eCommerce', href: '/industry/retail-ecommerce' },
        { label: 'Transport & Logistics', href: '/industry/transport-logistics' },
      ],
    },
    {
      title: 'Solutions',
      links: [
        { label: 'POS Systems', href: '/solution/pos-systems' },
        { label: 'Management Systems', href: '/solution/management-systems' },
        { label: 'Mobile Apps', href: '/solution/mobile-apps' },
        { label: 'Data Dashboards', href: '/solution/data-dashboards' },
        { label: 'Web Platforms', href: '/solution/web-platforms' },
      ],
    },
    {
      title: 'Technologies',
      links: [
        { label: 'React.js', href: '/technology/react' },
        { label: 'Flutter & Kotlin', href: '/technology/flutter' },
        { label: 'Python', href: '/technology/python' },
        { label: 'Tailwind CSS', href: '/technology/tailwind-css' },
        { label: 'Bash & Shell', href: '/technology/bash-shell' },
      ],
    },
  ];

  const socialLinks = [
    { icon: FaFacebookF, href: 'https://facebook.com/angisoft', label: 'Facebook' },
    { icon: FaTwitter, href: 'https://twitter.com/angisoft', label: 'Twitter' },
    { icon: FaLinkedinIn, href: 'https://linkedin.com/company/angisoft', label: 'LinkedIn' },
    { icon: FaInstagram, href: 'https://instagram.com/angisoft', label: 'Instagram' },
    { icon: FaGithub, href: 'https://github.com/angisoft', label: 'GitHub' },
  ];

  const contacts = [
    { icon: FaEnvelope, label: contactData?.email || 'info@angisoft.co.ke', href: `mailto:${contactData?.email || 'info@angisoft.co.ke'}` },
    { icon: FaPhone, label: contactData?.phone || '+254 710 398 690', href: `tel:${(contactData?.phone || '+254710398690').replace(/\s/g, '')}` },
    { icon: FaWhatsapp, label: 'WhatsApp', href: 'https://wa.me/254710398690' },
    { icon: FaMapMarkerAlt, label: contactData?.address?.city ? `${contactData.address.city}, ${contactData.address.country}` : 'Nairobi, Kenya', href: '/contact' },
  ];

  return (
    <AngiSoftFooterWave>
      <div className="angi-container" style={{ position: 'relative', zIndex: 20 }}>
        {/* TOP: 6 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2rem', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(0,175,255,0.12)' }}>
          {/* Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem' }}>
              <div style={{ width: '7rem', filter: 'drop-shadow(0 0 12px rgba(0,175,255,0.25))' }}>
                <AngiSoftLogo size="sm" />
              </div>
            </Link>
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: 'rgba(245,247,250,0.6)', marginBottom: '1rem' }}>
              {footer.description || 'AngiSoft Technologies is a Kenyan-rooted technology ecosystem growing from practical grassroots support into scalable software products and digital empowerment solutions.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {socialLinks.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="angi-card" style={{ width: '2.25rem', height: '2.25rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', color: 'var(--secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>
                  <s.icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <div className="angi-footer-heading">{col.title}</div>
              {col.links.map((link) => (
                <Link key={link.label} to={link.href} className="angi-footer-link">{link.label}</Link>
              ))}
            </div>
          ))}
        </div>

        {/* MIDDLE: Contact + Newsletter */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '2rem 0', borderBottom: '1px solid rgba(0,175,255,0.12)' }}>
          <div>
            <div className="angi-footer-heading">Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {contacts.map((item) => (
                <a key={item.label} href={item.href} className="angi-footer-link" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <item.icon style={{ color: 'var(--secondary)', flexShrink: 0 }} /> {item.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="angi-footer-heading">Newsletter</div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(245,247,250,0.55)', marginBottom: '1rem' }}>
              Get the latest insights on software development, AI, and digital transformation.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email" value={nlEmail} onChange={(e) => setNlEmail(e.target.value)}
                placeholder="Your email address"
                className="angi-input" style={{ flex: 1, marginBottom: 0 }}
              />
              <button onClick={handleSubscribe}
                style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaPaperPlane />
              </button>
            </div>
            {nlMessage && <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: nlStatus === 'success' ? 'var(--success)' : 'var(--primary)' }}>{nlMessage}</p>}
          </div>
        </div>

        {/* BOTTOM */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', fontSize: '0.8125rem', color: 'rgba(245,247,250,0.4)' }}>
          <div>&copy; {currentYear} AngiSoft Technologies. All rights reserved.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              Built with <FaHeart style={{ color: 'var(--secondary)', fontSize: '0.625rem' }} /> in Kenya
            </span>
            <span style={{ color: 'rgba(245,247,250,0.15)' }}>|</span>
            <Link to="/admin/login" className="angi-footer-link" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'rgba(245,247,250,0.5)' }}>
              <FaLock style={{ fontSize: '0.625rem' }} /> Staff Login
            </Link>
          </div>
        </div>
      </div>
    </AngiSoftFooterWave>
  );
};

export default Footer;
