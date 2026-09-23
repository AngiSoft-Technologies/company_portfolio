import React, { useState } from 'react';
import {
    FaPhoneAlt, FaEnvelope, FaWhatsapp, FaCheckCircle, FaArrowRight,
} from 'react-icons/fa';
import { apiPost } from '../../js/httpClient';
import contactInfo from '../../data/contactInfo';
import '../../css/ContactSection.css';

const ICONS = { phone: FaPhoneAlt, email: FaEnvelope, whatsapp: FaWhatsapp };
const COMMUNICATION_OPTIONS = ['Email', 'WhatsApp', 'Phone'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactSection = () => {
    const [form, setForm] = useState({
        name: '',
        company: '',
        email: '',
        phone: '',
        message: '',
        preferredCommunication: 'Email',
        ndaRequested: false,
    });
    const [status, setStatus] = useState('idle'); // idle | submitting | success | error
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const update = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = 'Please enter your name.';
        if (!form.email.trim()) next.email = 'Please enter your email.';
        else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
        if (!form.message.trim()) next.message = 'Please tell us about your project.';
        else if (form.message.trim().length < 10) next.message = 'Message is a bit short — add a few details.';
        if (form.phone.trim() && !/^[+0-9 ()-]{7,}$/.test(form.phone.trim()))
            next.phone = 'Enter a valid phone number.';
        return next;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status === 'submitting') return;

        const next = validate();
        if (Object.keys(next).length > 0) {
            setFieldErrors(next);
            return;
        }
        setFieldErrors({});
        setError('');
        setStatus('submitting');

        const payload = {
            name: form.name.trim(),
            company: form.company.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            message: form.message.trim(),
            preferredCommunication: form.preferredCommunication,
            ndaRequested: Boolean(form.ndaRequested),
        };

        try {
            await apiPost('/contacts', payload);
            setStatus('success');
            setForm({
                name: '', company: '', email: '', phone: '', message: '',
                preferredCommunication: 'Email', ndaRequested: false,
            });
        } catch (err) {
            setStatus('error');
            setError(
                'We could not send your message right now. Please try again, or reach us directly on WhatsApp or email.'
            );
        }
    };

    const inputId = (key) => `contact-${key}`;
    const describedBy = (key) =>
        fieldErrors[key] ? `${inputId(key)}-error` : undefined;

    return (
        <section id="contact" className="angi-contact-section">
            <div className="angi-container">
                <div className="angi-section-header">
                    <div className="angi-section-badge">Get In Touch</div>
                    <h2 className="angi-section-title">
                        Let's Build Something <span className="angi-section-title-gradient">Together</span>
                    </h2>
                    <p className="angi-section-subtitle">
                        Share your project requirements and our team will respond as soon as possible.
                    </p>
                </div>

                <div className="angi-contact-layout">
                    {/* Form */}
                    <div className="angi-contact-form-card">
                        <h3 className="angi-contact-form-title">Send us a message</h3>

                        {status === 'success' ? (
                            <div className="angi-contact-success" role="status" aria-live="polite">
                                <FaCheckCircle className="angi-contact-success-icon" aria-hidden="true" />
                                <p className="angi-contact-success-title">Message Sent!</p>
                                <p className="angi-contact-success-text">
                                    Thank you — we've received your enquiry and will get back to you soon.
                                </p>
                                <button
                                    type="button"
                                    className="angi-contact-submit angi-contact-reset"
                                    onClick={() => setStatus('idle')}
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form className="angi-contact-form" onSubmit={handleSubmit} noValidate>
                                <div className="angi-contact-form-row">
                                    <div className="angi-contact-field">
                                        <label htmlFor={inputId('name')} className="angi-contact-label">
                                            Full Name <span aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id={inputId('name')}
                                            name="name"
                                            type="text"
                                            autoComplete="name"
                                            className="angi-input"
                                            value={form.name}
                                            onChange={(e) => update('name', e.target.value)}
                                            aria-invalid={Boolean(fieldErrors.name)}
                                            aria-describedby={describedBy('name')}
                                            required
                                        />
                                        {fieldErrors.name && (
                                            <span id={`${inputId('name')}-error`} className="angi-contact-error">
                                                {fieldErrors.name}
                                            </span>
                                        )}
                                    </div>

                                    <div className="angi-contact-field">
                                        <label htmlFor={inputId('company')} className="angi-contact-label">
                                            Company
                                        </label>
                                        <input
                                            id={inputId('company')}
                                            name="company"
                                            type="text"
                                            autoComplete="organization"
                                            className="angi-input"
                                            value={form.company}
                                            onChange={(e) => update('company', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="angi-contact-form-row">
                                    <div className="angi-contact-field">
                                        <label htmlFor={inputId('email')} className="angi-contact-label">
                                            Email <span aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id={inputId('email')}
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            className="angi-input"
                                            value={form.email}
                                            onChange={(e) => update('email', e.target.value)}
                                            aria-invalid={Boolean(fieldErrors.email)}
                                            aria-describedby={describedBy('email')}
                                            required
                                        />
                                        {fieldErrors.email && (
                                            <span id={`${inputId('email')}-error`} className="angi-contact-error">
                                                {fieldErrors.email}
                                            </span>
                                        )}
                                    </div>

                                    <div className="angi-contact-field">
                                        <label htmlFor={inputId('phone')} className="angi-contact-label">
                                            Phone
                                        </label>
                                        <input
                                            id={inputId('phone')}
                                            name="phone"
                                            type="tel"
                                            autoComplete="tel"
                                            className="angi-input"
                                            value={form.phone}
                                            onChange={(e) => update('phone', e.target.value)}
                                            aria-invalid={Boolean(fieldErrors.phone)}
                                            aria-describedby={describedBy('phone')}
                                        />
                                        {fieldErrors.phone && (
                                            <span id={`${inputId('phone')}-error`} className="angi-contact-error">
                                                {fieldErrors.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="angi-contact-field">
                                    <label htmlFor={inputId('message')} className="angi-contact-label">
                                        Message <span aria-hidden="true">*</span>
                                    </label>
                                    <textarea
                                        id={inputId('message')}
                                        name="message"
                                        rows={4}
                                        className="angi-input angi-contact-textarea"
                                        value={form.message}
                                        onChange={(e) => update('message', e.target.value)}
                                        aria-invalid={Boolean(fieldErrors.message)}
                                        aria-describedby={describedBy('message')}
                                        required
                                    />
                                    {fieldErrors.message && (
                                        <span id={`${inputId('message')}-error`} className="angi-contact-error">
                                            {fieldErrors.message}
                                        </span>
                                    )}
                                </div>

                                <fieldset className="angi-contact-communication">
                                    <legend>Preferred Communication</legend>
                                    <div className="angi-contact-communication-options" role="radiogroup" aria-label="Preferred Communication">
                                        {COMMUNICATION_OPTIONS.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                role="radio"
                                                aria-checked={form.preferredCommunication === opt}
                                                className={`angi-contact-communication-button${
                                                    form.preferredCommunication === opt ? ' is-active' : ''
                                                }`}
                                                onClick={() => update('preferredCommunication', opt)}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <label className="angi-contact-nda">
                                    <input
                                        type="checkbox"
                                        name="ndaRequested"
                                        checked={form.ndaRequested}
                                        onChange={(e) => update('ndaRequested', e.target.checked)}
                                    />
                                    <span>I'd like to discuss an NDA before sharing details</span>
                                </label>

                                {status === 'error' && (
                                    <p className="angi-contact-error angi-contact-form-error" role="alert">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="angi-btn-primary angi-contact-submit"
                                    disabled={status === 'submitting'}
                                >
                                    {status === 'submitting' ? 'Sending…' : 'Send Message'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Info */}
                    <div className="angi-contact-info">
                        <h3 className="angi-contact-info-title">Contact Information</h3>
                        <p className="angi-contact-info-lead">
                            Send us a WhatsApp message for a faster response, or email us anytime.
                        </p>

                        <ul className="angi-contact-methods">
                            {contactInfo.map((method) => {
                                const Icon = ICONS[method.id];
                                return (
                                    <li key={method.id} className="angi-contact-method">
                                        <span className="angi-contact-method-icon" aria-hidden="true">
                                            {Icon && <Icon />}
                                        </span>
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

                        <div className="angi-contact-help">
                            <h4 className="angi-contact-help-title">Need help getting started?</h4>
                            <p className="angi-contact-help-text">
                                Not sure which service fits? Tell us what you're trying to achieve and we'll point you the right way.
                            </p>
                            <a
                                className="angi-contact-whatsapp"
                                href="https://wa.me/254710398690"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FaWhatsapp aria-hidden="true" /> Chat on WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ContactSection;
