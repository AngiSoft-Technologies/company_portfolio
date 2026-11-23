// @ts-nocheck
import { useEffect, useRef } from 'react';

/**
 * Top-of-form error summary. Surfaces a friendly message + links to the first
 * invalid field. Never exposes raw backend errors to the user.
 *
 * This is the form's single live region: inline field errors are linked with
 * `aria-describedby` instead of each being a live region. After a failed
 * submit (`novalidate` is set on the form) focus is routed here so the heading
 * and the field links are announced in one place.
 */
export default function ContactErrorAlert({ message, fieldErrors, onFocusField }) {
    const ref = useRef(null);
    const wasHidden = useRef(true);

    const entries = Object.entries(fieldErrors || {}).filter(([, msgs]) => msgs && msgs.length);
    const visible = Boolean(message || entries.length);

    useEffect(() => {
        if (!visible) {
            wasHidden.current = true;
            return;
        }
        // Focus once per error appearance; don't yank focus back while the
        // visitor is fixing individual fields.
        if (!wasHidden.current || !ref.current) return;
        wasHidden.current = false;

        const el = ref.current;
        const prefersReducedMotion =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            // Native focus scrolls instantly — no animated motion.
            el.focus();
        } else {
            el.focus({ preventScroll: true });
            if (typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [visible, message]);

    if (!visible) return null;

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
