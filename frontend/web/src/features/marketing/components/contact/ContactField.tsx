// @ts-nocheck
import { forwardRef } from 'react';

/**
 * Reusable labelled field wrapper. Renders label + optional helper + children
 * (the actual input) + error. Supports an accessible error summary link.
 *
 * `aria-invalid` is always explicit: leaving it unset makes Firefox/Safari
 * announce a still-empty required field as invalid before the visitor has
 * interacted with it. The error text is only referenced by `aria-describedby`
 * while it is actually rendered; the form-level summary is the single live
 * region, so inline errors are not each given `role="alert"`.
 */
const ContactField = forwardRef(function ContactField(
    { id, label, helper, error, required, children, className = '' },
    ref
) {
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helper ? `${id}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
        <div ref={ref} className={`contact-field ${error ? 'contact-field--invalid' : ''} ${className}`}>
            {label && (
                <label htmlFor={id} className="contact-field__label">
                    {label}
                    {required && (
                        <>
                            <span className="contact-field__required" aria-hidden="true"> *</span>
                            <span className="visually-hidden"> (required)</span>
                        </>
                    )}
                </label>
            )}
            {helper && (
                <p id={helperId} className="contact-field__helper">{helper}</p>
            )}
            {children({
                id,
                'aria-invalid': error ? 'true' : 'false',
                'aria-describedby': describedBy,
            })}
            {error && (
                <p id={errorId} className="contact-field__error">{error}</p>
            )}
        </div>
    );
});

export default ContactField;
