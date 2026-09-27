import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AngiSoftLogo from '../brand/AngiSoftLogo';
import AngiSoftFooterWave from '../brand/AngiSoftFooterWave';
import { apiGet, apiPost } from '@/lib/httpClient';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import {
  FaLinkedinIn, FaXTwitter, FaFacebookF, FaInstagram, FaGithub,
  FaEnvelope, FaPhone, FaWhatsapp, FaLocationDot, FaLock, FaPaperPlane,
} from 'react-icons/fa6';

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };
type FooterSettings = {
  columns?: FooterColumn[];
  description?: string;
  copyright?: string;
  legalLinks?: FooterLink[];
  newsletter?: { enabled?: boolean; title?: string; description?: string };
};
type ContactSettings = {
  companyName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: { city?: string; country?: string };
  social?: Record<string, string>;
};

const socialIcons: Record<string, typeof FaFacebookF> = {
  facebook: FaFacebookF,
  twitter: FaXTwitter,
  x: FaXTwitter,
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
  github: FaGithub,
};

const Footer = () => {
  const [branding, setBranding] = useState<{ logo?: string; siteName?: string } | null>(null);
  const [footer, setFooter] = useState<FooterSettings | null>(null);
  const [contact, setContact] = useState<ContactSettings | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<FooterSettings>('/site/footer'),
      apiGet<ContactSettings>('/site/contact'),
      apiGet<{ logo?: string; siteName?: string }>('/site/branding'),
    ])
      .then(([footerSettings, contactSettings, brandingSettings]) => {
        if (!active) return;
        setFooter(footerSettings);
        setContact(contactSettings);
        setBranding(brandingSettings);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const subscribe = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email.');
      return;
    }
    setStatus('loading');
    try {
      const result = await apiPost<{ message?: string }>('/newsletter/subscribe', { email });
      setStatus('success');
      setMessage(result?.message || 'Subscription received.');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message || 'Subscription failed.');
    }
  };

  const contactMethods = [
    contact?.email ? { id: 'email', icon: FaEnvelope, label: 'Email', value: contact.email, href: `mailto:${contact.email}` } : null,
    contact?.phone ? { id: 'phone', icon: FaPhone, label: 'Phone', value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` } : null,
    contact?.whatsapp ? { id: 'whatsapp', icon: FaWhatsapp, label: 'WhatsApp', value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp}` } : null,
    contact?.address?.city ? {
      id: 'address',
      icon: FaLocationDot,
      label: 'Location',
      value: `${contact.address.city}${contact.address.country ? `, ${contact.address.country}` : ''}`,
      href: '/contact',
    } : null,
  ].filter(Boolean) as Array<{ id: string; icon: typeof FaEnvelope; label: string; value: string; href: string }>;

  const socialLinks = Object.entries(contact?.social || {})
    .map(([name, href]) => ({ name, href, icon: socialIcons[name] }))
    .filter((item): item is { name: string; href: string; icon: typeof FaFacebookF } => Boolean(item.icon && item.href));

  const copyright = (footer?.copyright || '').replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="angi-footer-shell">
      <div className="angi-container angi-footer-shell__container">
      <div className="angi-grid-footer" style={{ paddingBottom: '2.5rem', paddingTop: '3rem' }}>
        <div className="angi-footer-brand">
          <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem' }}>
            <div style={{ width: '15rem' }}>
              <AngiSoftLogo size="md" src={branding?.logo ? resolveAssetUrl(branding.logo) : undefined} />
            </div>
          </Link>
          {footer?.description ? (
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: 'var(--footer-ink-soft)', marginBottom: '1rem' }}>
              {footer.description}
            </p>
          ) : null}
        </div>

        {(footer?.columns || []).map((column) => (
          <div key={column.title}>
            <div className="angi-footer-heading">{column.title}</div>
            {column.links.map((link) => (
              <Link key={`${column.title}-${link.label}`} to={link.href} className="angi-footer-link">{link.label}</Link>
            ))}
          </div>
        ))}

        {contactMethods.length > 0 ? (
          <div>
            <div className="angi-footer-heading">Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {contactMethods.map((item) => (
                <a key={item.id} href={item.href} className="angi-footer-link" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <item.icon style={{ color: 'var(--footer-ink-strong)', flexShrink: 0 }} /> {item.value}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="angi-grid-footer-bottom" style={{ padding: '2rem 0' }}>
        <div>
          <div className="angi-footer-heading">Social Handles</div>
          {socialLinks.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              {socialLinks.map((item) => (
                <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.name}
                  className="angi-card" style={{ width: '2.25rem', height: '2.25rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', color: 'var(--footer-ink-strong)', fontSize: '0.875rem', textDecoration: 'none', background: 'var(--footer-surface-2)', border: '1px solid var(--footer-hairline)' }}>
                  <item.icon />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {footer?.newsletter?.enabled !== false ? (
          <div>
            <div className="angi-footer-heading">{footer?.newsletter?.title || 'Newsletter'}</div>
            {footer?.newsletter?.description ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--footer-ink-soft)', marginBottom: '1rem' }}>{footer.newsletter.description}</p>
            ) : null}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
                className="angi-input"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <button type="button" onClick={subscribe} disabled={status === 'loading'}
                style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', flexShrink: 0, background: 'var(--color-primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaPaperPlane />
              </button>
            </div>
            {message ? (
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: status === 'success' ? 'var(--color-success-dark)' : 'var(--footer-ink-soft)' }}>{message}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      </div>

      <AngiSoftFooterWave>
        <div className="angi-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.5rem', fontSize: '0.8125rem', color: 'rgba(245,247,250,0.4)' }}>
          <div>{copyright}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {(footer?.legalLinks || []).map((link) => (
              <Link key={link.href} to={link.href} className="angi-footer-link">{link.label}</Link>
            ))}
            <a href="https://admin.angisoft.co.ke/login" className="angi-footer-link" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--footer-ink-soft)' }}>
              <FaLock style={{ fontSize: '0.625rem' }} /> Staff Login
            </a>
          </div>
        </div>
      </AngiSoftFooterWave>
    </footer>
  );
};

export default Footer;
