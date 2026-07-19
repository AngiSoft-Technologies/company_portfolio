import { forwardRef } from 'react';

/**
 * Reusable labelled field wrapper. Renders label + optional helper + children
 * (the actual input) + error. Supports an accessible error summary link.
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
                    {required && <span className="contact-field__required" aria-hidden="true"> *</span>}
                </label>
            )}
            {helper && (
                <p id={helperId} className="contact-field__helper">{helper}</p>
            )}
            {children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
            {error && (
                <p id={errorId} className="contact-field__error" role="alert">{error}</p>
            )}
        </div>
    );
});

export default ContactField;
