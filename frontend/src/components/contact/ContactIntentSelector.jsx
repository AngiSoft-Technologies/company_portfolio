import { ENQUIRY_TYPES, helperFor } from '../../utils/contact/contactSubjects';
import { FaCheck } from 'react-icons/fa';

/**
 * Segmented intent selector. Sets enquiryType; exposes helper text for the
 * selected type. Stable machine values are used as keys/values.
 */
export default function ContactIntentSelector({ value, onChange, id = 'intent' }) {
    const selected = ENQUIRY_TYPES.find((t) => t.value === value);

    return (
        <div className="contact-intent">
            <fieldset className="contact-intent__fieldset">
                <legend className="contact-intent__legend">What is this about?</legend>
                <div className="contact-intent__grid" role="radiogroup" aria-label="Enquiry type">
                    {ENQUIRY_TYPES.map((type) => {
                        const active = type.value === value;
                        return (
                            <button
                                key={type.value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                id={`${id}-${type.value}`}
                                className={`contact-intent__chip ${active ? 'is-active' : ''}`}
                                onClick={() => onChange(type.value)}
                            >
                                <span className="contact-intent__chip-label">{type.cardLabel}</span>
                                {active && <FaCheck className="contact-intent__check" aria-hidden="true" />}
                            </button>
                        );
                    })}
                </div>
            </fieldset>
            {selected && (
                <p className="contact-intent__helper">{helperFor(selected.value)}</p>
            )}
        </div>
    );
}
