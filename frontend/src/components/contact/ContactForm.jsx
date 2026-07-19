import { useRef, useImperativeHandle, forwardRef } from 'react';
import ContactField from './ContactField';
import ContactErrorAlert from './ContactErrorAlert';
import ContactIntentSelector from './ContactIntentSelector';
import { ENQUIRY_TYPES } from '../../utils/contact/contactSubjects';

const RESPONSE_METHODS = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'whatsapp', label: 'WhatsApp' },
];

/**
 * Grouped, accessible enquiry form. Controlled by parent useContactForm state.
 * Calls `onSubmit(values, startedAt)` — does NOT fake success. Parent owns the
 * success/error state so the form is never cleared on error.
 */
const ContactForm = forwardRef(function ContactForm(
    {
        form,
        fieldErrors,
        submitError,
        submitting,
        onSubmit,
        onFocusField,
    },
    ref
) {
    const { values, errors, setField, markTouched, getFormStartedAt } = form;
    const fieldRefs = useRef({});

    // Register field refs so we can focus the first invalid one.
    const registerRef = (name) => (el) => {
        if (el) fieldRefs.current[name] = el;
    };

    const focusField = (name) => {
        const el = fieldRefs.current[name];
        if (el && typeof el.focus === 'function') el.focus();
    };

    useImperativeHandle(ref, () => ({
        focusField,
    }));

    const combinedError = (name) => (fieldErrors && fieldErrors[name] ? fieldErrors[name][0] : (errors[name] ? errors[name][0] : undefined));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(values, getFormStartedAt());
    };

    const showServiceProduct =
        values.enquiryType === 'service' || values.enquiryType === 'product' || values.enquiryType === '';

    const subjectHelper = `Required. ${values.enquiryType ? `Tip: mention the ${values.enquiryType}.` : ''}`;

    return (
        <form className="contact-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            <ContactErrorAlert message={submitError} fieldErrors={fieldErrors} onFocusField={onFocusField} />

            <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={values.company}
                onChange={(e) => setField('company', e.target.value)}
                className="contact-form__honeypot"
                aria-hidden="true"
                placeholder="Leave this empty"
            />

            <ContactIntentSelector
                value={values.enquiryType}
                onChange={(type) => {
                    setField('enquiryType', type);
                    if (!values.subject) setField('subject', '');
                }}
            />

            <fieldset className="contact-form__section">
                <legend className="contact-form__legend">Your Details</legend>

                <ContactField id="name" label="Full name" required error={combinedError('name')}>
                    {(props) => (
                        <input
                            {...props}
                            ref={registerRef('name')}
                            type="text"
                            name="name"
                            autoComplete="name"
                            className="contact-form__input"
                            value={values.name}
                            onChange={(e) => setField('name', e.target.value)}
                            onBlur={() => markTouched('name')}
                        />
                    )}
                </ContactField>

                <div className="contact-form__row">
                    <ContactField id="email" label="Email" required error={combinedError('email')}>
                        {(props) => (
                            <input
                                {...props}
                                ref={registerRef('email')}
                                type="email"
                                name="email"
                                autoComplete="email"
                                inputMode="email"
                                className="contact-form__input"
                                value={values.email}
                                onChange={(e) => setField('email', e.target.value)}
                                onBlur={() => markTouched('email')}
                            />
                        )}
                    </ContactField>

                    <ContactField id="phone" label="Phone (optional)" error={combinedError('phone')} helper="Required if you pick Phone or WhatsApp as your preferred response.">
                        {(props) => (
                            <input
                                {...props}
                                ref={registerRef('phone')}
                                type="tel"
                                name="phone"
                                autoComplete="tel"
                                inputMode="tel"
                                className="contact-form__input"
                                value={values.phone}
                                onChange={(e) => setField('phone', e.target.value)}
                                onBlur={() => markTouched('phone')}
                            />
                        )}
                    </ContactField>
                </div>

                <ContactField id="preferredResponseMethod" label="Preferred response method">
                    {(props) => (
                        <div {...props} className="contact-form__radios">
                            {RESPONSE_METHODS.map((m) => (
                                <label key={m.value} className={`contact-form__radio ${values.preferredResponseMethod === m.value ? 'is-active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="preferredResponseMethod"
                                        value={m.value}
                                        checked={values.preferredResponseMethod === m.value}
                                        onChange={() => setField('preferredResponseMethod', m.value)}
                                    />
                                    {m.label}
                                </label>
                            ))}
                        </div>
                    )}
                </ContactField>
            </fieldset>

            <fieldset className="contact-form__section">
                <legend className="contact-form__legend">Your Enquiry</legend>

                <ContactField id="subject" label="Subject" required error={combinedError('subject')} helper={subjectHelper}>
                    {(props) => (
                        <input
                            {...props}
                            ref={registerRef('subject')}
                            type="text"
                            name="subject"
                            className="contact-form__input"
                            value={values.subject}
                            onChange={(e) => setField('subject', e.target.value)}
                            onBlur={() => markTouched('subject')}
                        />
                    )}
                </ContactField>

                {showServiceProduct && (
                    <div className="contact-form__row">
                        <ContactField id="serviceSlug" label="Related service (optional)">
                            {(props) => (
                                <input
                                    {...props}
                                    ref={registerRef('serviceSlug')}
                                    type="text"
                                    name="serviceSlug"
                                    className="contact-form__input"
                                    placeholder="e.g. web-development"
                                    value={values.serviceSlug}
                                    onChange={(e) => setField('serviceSlug', e.target.value)}
                                />
                            )}
                        </ContactField>
                        <ContactField id="productSlug" label="Related product (optional)">
                            {(props) => (
                                <input
                                    {...props}
                                    ref={registerRef('productSlug')}
                                    type="text"
                                    name="productSlug"
                                    className="contact-form__input"
                                    placeholder="e.g. kejalink"
                                    value={values.productSlug}
                                    onChange={(e) => setField('productSlug', e.target.value)}
                                />
                            )}
                        </ContactField>
                    </div>
                )}

                <ContactField id="message" label="Message" required error={combinedError('message')} helper="At least 10 characters. Share what you need and any context.">
                    {(props) => (
                        <textarea
                            {...props}
                            ref={registerRef('message')}
                            name="message"
                            rows={6}
                            className="contact-form__textarea"
                            value={values.message}
                            onChange={(e) => setField('message', e.target.value)}
                            onBlur={() => markTouched('message')}
                        />
                    )}
                </ContactField>
            </fieldset>

            <fieldset className="contact-form__section">
                <legend className="contact-form__legend">Additional Context</legend>

                <div className="contact-form__row">
                    <ContactField id="bookingReference" label="Booking reference (optional)" error={combinedError('bookingReference')} helper="If you are following up on a booking.">
                        {(props) => (
                            <input
                                {...props}
                                ref={registerRef('bookingReference')}
                                type="text"
                                name="bookingReference"
                                className="contact-form__input"
                                placeholder="ANG-..."
                                value={values.bookingReference}
                                onChange={(e) => setField('bookingReference', e.target.value)}
                            />
                        )}
                    </ContactField>
                    <ContactField id="preferredContactTime" label="Preferred contact time (optional)">
                        {(props) => (
                            <input
                                {...props}
                                ref={registerRef('preferredContactTime')}
                                type="text"
                                name="preferredContactTime"
                                className="contact-form__input"
                                placeholder="e.g. Weekday afternoons"
                                value={values.preferredContactTime}
                                onChange={(e) => setField('preferredContactTime', e.target.value)}
                            />
                        )}
                    </ContactField>
                </div>

                <ContactField id="organisation" label="Organisation (optional)">
                    {(props) => (
                        <input
                            {...props}
                            ref={registerRef('organisation')}
                            type="text"
                            name="organisation"
                            autoComplete="organization"
                            className="contact-form__input"
                            value={values.organisation}
                            onChange={(e) => setField('organisation', e.target.value)}
                        />
                    )}
                </ContactField>
            </fieldset>

            <button
                type="submit"
                className="btn btn--primary contact-form__submit"
                disabled={submitting}
            >
                {submitting ? 'Sending…' : 'Submit Enquiry'}
            </button>
        </form>
    );
});

export default ContactForm;
