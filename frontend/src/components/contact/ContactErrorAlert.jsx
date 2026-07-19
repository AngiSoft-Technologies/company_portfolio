import { useEffect, useRef } from 'react';

/**
 * Top-of-form error summary. Surfaces a friendly message + links to the first
 * invalid field. Never exposes raw backend errors to the user.
 */
export default function ContactErrorAlert({ message, fieldErrors, onFocusField }) {
    const ref = useRef(null);

    useEffect(() => {
        if (message && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [message]);

    if (!message && (!fieldErrors || Object.keys(fieldErrors).length === 0)) return null;

    const entries = Object.entries(fieldErrors || {}).filter(([, msgs]) => msgs && msgs.length);

    return (
        <div
            ref={ref}
            className="contact-error-alert"
            role="alert"
            aria-labelledby="contact-error-heading"
            tabIndex={-1}
        >
            <h3 id="contact-error-heading" className="contact-error-alert__title">
                We couldn't send your enquiry yet
            </h3>
            {message && <p className="contact-error-alert__msg">{message}</p>}
            {entries.length > 0 && (
                <ul className="contact-error-alert__list">
                    {entries.map(([field, msgs]) => (
                        <li key={field}>
                            <button
                                type="button"
                                className="contact-error-alert__link"
                                onClick={() => onFocusField && onFocusField(field)}
                            >
                                {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}: {msgs[0]}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
