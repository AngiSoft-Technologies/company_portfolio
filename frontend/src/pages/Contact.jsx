import { useCallback, useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useContactPage } from '../hooks/useContactPage';
import { useContactEntryContext } from '../hooks/useContactEntryContext';
import { useContactForm } from '../hooks/useContactForm';
import { useContactSubmission } from '../hooks/useContactSubmission';

import ContactHero from '../components/contact/ContactHero';
import ContactIntentSelector from '../components/contact/ContactIntentSelector';
import ContactMethods from '../components/contact/ContactMethods';
import ContactContextCard from '../components/contact/ContactContextCard';
import ContactForm from '../components/contact/ContactForm';
import ContactDetails from '../components/contact/ContactDetails';
import ContactMap from '../components/contact/ContactMap';
import ContactResponseGuide from '../components/contact/ContactResponseGuide';
import ContactFaqs from '../components/contact/ContactFaqs';
import ContactFinalCTA from '../components/contact/ContactFinalCTA';
import ContactSuccess from '../components/contact/ContactSuccess';

import '../css/contact/contact-page.css';
import '../css/contact/contact-hero.css';
import '../css/contact/contact-methods.css';
import '../css/contact/contact-form.css';
import '../css/contact/contact-context.css';
import '../css/contact/contact-details.css';
import '../css/contact/contact-map.css';
import '../css/contact/contact-success.css';
import '../css/contact/contact-responsive.css';

export default function Contact() {
    const { colors, mode } = useTheme();
    const { contact, loading } = useContactPage();
    const entryContext = useContactEntryContext();

    const [context, setContext] = useState(entryContext);
    useEffect(() => {
        setContext(entryContext);
    }, [entryContext]);

    const form = useContactForm({ context });
    const { submit, loading: submitting, result, error, fieldErrors, success } = useContactSubmission(context);

    const styleVars = {
        '--contact-primary': colors.primary,
        '--contact-secondary': colors.secondary,
        '--contact-background': colors.background,
        '--contact-surface': colors.surface || colors.background,
        '--contact-text': colors.text,
        '--contact-muted': colors.textMuted || colors.textSecondary,
        '--contact-border': colors.border,
        '--contact-danger': colors.danger || colors.error,
        '--contact-success': colors.success,
    };

    const handleSubmit = useCallback(async (values, startedAt) => {
        const { valid } = form.validateAll();
        if (!valid) return;
        const res = await submit(values, startedAt);
        if (res && res.ok) {
            // success handled via `success` state; form is intentionally NOT reset.
        }
    }, [form, submit]);

    const handleFocusField = useCallback((name) => {
        if (form.firstInvalidRef) form.firstInvalidRef.current = name;
        const el = document.querySelector(`[name="${name}"]`);
        if (el) el.focus();
    }, [form]);

    const removeContext = useCallback(() => {
        setContext({ enquiryType: '', serviceSlug: '', productSlug: '', bookingReference: '', subject: '', source: '' });
        form.setField('enquiryType', '');
        form.setField('serviceSlug', '');
        form.setField('productSlug', '');
        form.setField('bookingReference', '');
        form.setField('subject', '');
    }, [form]);

    const changeContext = useCallback(() => {
        const el = document.getElementById('contact-workspace');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('intent-service')?.focus();
    }, []);

    const viewDetails = useCallback(() => {
        if (context?.serviceSlug) window.location.href = `/services/${context.serviceSlug}`;
        else if (context?.productSlug) window.location.href = `/products/${context.productSlug}`;
    }, [context]);

    const themeClass = mode === 'dark' ? 'is-dark' : 'is-light';

    return (
        <main className={`contact-page ${themeClass}`} style={styleVars}>
            <ContactHero />

            <ContactIntentSelector
                value={form.values.enquiryType}
                onChange={(type) => {
                    form.setField('enquiryType', type);
                    if (!form.values.subject) {
                        form.setField('subject', defaultSubjectInline(type));
                    }
                }}
            />

            <ContactMethods contact={contact} />

            <section id="contact-workspace" className="contact-workspace" aria-labelledby="contact-workspace-heading">
                <h2 id="contact-workspace-heading" className="visually-hidden">Send your enquiry</h2>
                <div className="contact-workspace__grid">
                    <div className="contact-workspace__form">
                        {success && result ? (
                            <ContactSuccess result={result} name={form.values.name} entryContext={context} />
                        ) : (
                            <ContactForm
                                form={form}
                                entryContext={context}
                                fieldErrors={fieldErrors}
                                submitError={error}
                                submitting={submitting}
                                onSubmit={handleSubmit}
                                onFocusField={handleFocusField}
                            />
                        )}
                    </div>
                    <aside className="contact-workspace__side">
                        <ContactContextCard
                            context={context}
                            onRemove={removeContext}
                            onChange={changeContext}
                            onViewDetails={context?.serviceSlug || context?.productSlug ? viewDetails : undefined}
                        />
                        {loading && <p className="contact-workspace__note">Loading contact details…</p>}
                    </aside>
                </div>
            </section>

            <ContactDetails contact={contact} />
            <ContactResponseGuide />
            <ContactMap contact={contact} />
            <ContactFaqs />
            <ContactFinalCTA />
        </main>
    );
}

function defaultSubjectInline(type) {
    const map = {
        service: 'Enquiry about a service',
        product: 'Enquiry about a product',
        pricing: 'Pricing & quote request',
        support: 'Support request',
        partnership: 'Partnership enquiry',
        careers: 'Careers enquiry',
        general: 'General enquiry',
    };
    return map[type] || map.general;
}
