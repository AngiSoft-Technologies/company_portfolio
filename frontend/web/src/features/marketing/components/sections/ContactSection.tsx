// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { FaPhoneAlt, FaEnvelope, FaWhatsapp, FaCheckCircle } from 'react-icons/fa';
import { apiGet, apiPost } from '@/lib/httpClient';
import '@/styles/marketing/ContactSection.css';

type ContactSettings = {
  email?: string;
  phone?: string;
  whatsapp?: string;
  companyName?: string;
};

type HomeContact = {
  title?: string;
  subtitle?: string;
  successMessage?: string;
};

const ICONS = { email: FaEnvelope, phone: FaPhoneAlt, whatsapp: FaWhatsapp };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactSection = () => {
  const [contact, setContact] = useState<ContactSettings | null>(null);
  const [copy, setCopy] = useState<HomeContact | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    preferredCommunication: 'email',
    ndaRequested: false,
  });
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<ContactSettings>('/site/contact'),
      apiGet<{ contact?: HomeContact }>('/site/home-content'),
    ])
      .then(([contactSettings, homeContent]) => {
        if (!active) return;
        setContact(contactSettings);
        setCopy(homeContent?.contact || null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const validate = () => {
    const next: Record<string, string | undefined> = {};
    if (!form.name.trim()) next.name = 'Please enter your name.';
    if (!form.email.trim()) next.email = 'Please enter your email.';
    else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.message.trim()) next.message = 'Please tell us about your project.';
    else if (form.message.trim().length < 10) next.message = 'Message is a bit short — add a few details.';
    if (form.phone.trim() && !/^[+0-9 ()-]{7,}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === 'submitting') return;

    const next = validate();
    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    setError('');
    setStatus('submitting');

    const message = form.ndaRequested
      ? `${form.message.trim()}\n\nNDA requested before detailed discussion.`
      : form.message.trim();

    try {
      await apiPost('/contact-enquiries', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        preferredResponseMethod: form.preferredCommunication,
        enquiryType: 'general',
        subject: copy?.title || 'Website enquiry',
        message,
        source: 'home-contact-section',
        sourcePath: window.location.pathname,
        formStartedAt,
      });
      setStatus('success');
      setFormStartedAt(Date.now());
      setForm({
        name: '',
        email: '',
        phone: '',
        message: '',
        preferredCommunication: 'email',
        ndaRequested: false,
      });
    } catch {
      setStatus('error');
      setError('We could not send your message right now. Please try again.');
    }
  };

  const inputId = (key: string) => `contact-${key}`;
  const describedBy = (key: string) => (fieldErrors[key] ? `${inputId(key)}-error` : undefined);

  const contactMethods = useMemo(() => {
    if (!contact) return [];
    const methods: Array<{ id: keyof typeof ICONS; label: string; value: string; href: string }> = [];
    if (contact.email) methods.push({ id: 'email', label: 'Email', value: contact.email, href: `mailto:${contact.email}` });
    if (contact.phone) methods.push({ id: 'phone', label: 'Phone', value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, '')}` });
    if (contact.whatsapp) methods.push({ id: 'whatsapp', label: 'WhatsApp', value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp}` });
    return methods;
  }, [contact]);

  return (
    <section id="contact" className="angi-contact-section">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Get In Touch</div>
          <h2 className="angi-section-title">{copy?.title || 'Contact AngiSoft'}</h2>
          <p className="angi-section-subtitle">{copy?.subtitle || ''}</p>
        </div>

        <div className="angi-contact-layout">
          <div className="angi-contact-form-card">
            <h3 className="angi-contact-form-title">Send us a message</h3>

            {status === 'success' ? (
              <div className="angi-contact-success" role="status" aria-live="polite">
                <FaCheckCircle className="angi-contact-success-icon" aria-hidden="true" />
                <p className="angi-contact-success-title">Message Sent!</p>
                <p className="angi-contact-success-text">{copy?.successMessage || 'Thank you — we have received your enquiry.'}</p>
                <button type="button" className="angi-contact-submit angi-contact-reset" onClick={() => setStatus('idle')}>
                  Send another message
                </button>
              </div>
            ) : (
              <form className="angi-contact-form" onSubmit={handleSubmit} noValidate>
                <div className="angi-contact-form-row">
                  <div className="angi-contact-field">
                    <label htmlFor={inputId('name')} className="angi-contact-label">Full Name <span aria-hidden="true">*</span></label>
                    <input
                      id={inputId('name')}
                      name="name"
                      type="text"
                      autoComplete="name"
                      className="angi-input"
                      value={form.name}
                      onChange={(event) => update('name', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={describedBy('name')}
                      required
                    />
                    {fieldErrors.name ? <span id={`${inputId('name')}-error`} className="angi-contact-error">{fieldErrors.name}</span> : null}
                  </div>

                  <div className="angi-contact-field">
                    <label htmlFor={inputId('email')} className="angi-contact-label">Email <span aria-hidden="true">*</span></label>
                    <input
                      id={inputId('email')}
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="angi-input"
                      value={form.email}
                      onChange={(event) => update('email', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={describedBy('email')}
                      required
                    />
                    {fieldErrors.email ? <span id={`${inputId('email')}-error`} className="angi-contact-error">{fieldErrors.email}</span> : null}
                  </div>
                </div>

                <div className="angi-contact-field">
                  <label htmlFor={inputId('phone')} className="angi-contact-label">Phone</label>
                  <input
                    id={inputId('phone')}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className="angi-input"
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={describedBy('phone')}
                  />
                  {fieldErrors.phone ? <span id={`${inputId('phone')}-error`} className="angi-contact-error">{fieldErrors.phone}</span> : null}
                </div>

                <div className="angi-contact-field">
                  <label htmlFor={inputId('message')} className="angi-contact-label">Message <span aria-hidden="true">*</span></label>
                  <textarea
                    id={inputId('message')}
                    name="message"
                    rows={4}
                    className="angi-input angi-contact-textarea"
                    value={form.message}
                    onChange={(event) => update('message', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.message)}
                    aria-describedby={describedBy('message')}
                    required
                  />
                  {fieldErrors.message ? <span id={`${inputId('message')}-error`} className="angi-contact-error">{fieldErrors.message}</span> : null}
                </div>

                <fieldset className="angi-contact-communication">
                  <legend>Preferred Communication</legend>
                  <div className="angi-contact-communication-options" role="radiogroup" aria-label="Preferred Communication">
                    {(['email', 'phone', 'whatsapp'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={form.preferredCommunication === option}
                        className={`angi-contact-communication-button${form.preferredCommunication === option ? ' is-active' : ''}`}
                        onClick={() => update('preferredCommunication', option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="angi-contact-nda">
                  <input
                    type="checkbox"
                    name="ndaRequested"
                    checked={form.ndaRequested}
                    onChange={(event) => update('ndaRequested', event.target.checked)}
                  />
                  <span>I'd like to discuss an NDA before sharing details</span>
                </label>

                {status === 'error' ? (
                  <p className="angi-contact-error angi-contact-form-error" role="alert">{error}</p>
                ) : null}

                <button type="submit" className="angi-btn-primary angi-contact-submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          <div className="angi-contact-info">
            <h3 className="angi-contact-info-title">{contact?.companyName || 'Contact Information'}</h3>
            <p className="angi-contact-info-lead">Send a message and the team will respond using your preferred channel.</p>

            <ul className="angi-contact-methods">
              {contactMethods.map((method) => {
                const Icon = ICONS[method.id];
                return (
                  <li key={method.id} className="angi-contact-method">
                    <span className="angi-contact-method-icon" aria-hidden="true"><Icon /></span>
                    <span className="angi-contact-method-body">
                      <span className="angi-contact-method-label">{method.label}</span>
                      <a
                        className="angi-contact-method-copy"
                        href={method.href}
                        target={method.id === 'whatsapp' ? '_blank' : undefined}
                        rel={method.id === 'whatsapp' ? 'noopener noreferrer' : undefined}
                      >
                        {method.value}
                      </a>
                    </span>
                  </li>
                );
              })}
            </ul>

            {contact?.whatsapp ? (
              <div className="angi-contact-help">
                <h4 className="angi-contact-help-title">Need help getting started?</h4>
                <p className="angi-contact-help-text">Tell us what you're trying to achieve and we'll point you the right way.</p>
                <a
                  className="angi-contact-whatsapp"
                  href={`https://wa.me/${contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaWhatsapp aria-hidden="true" /> Chat on WhatsApp
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
