// @ts-nocheck
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaClock, FaBuilding } from 'react-icons/fa';

const telHref = (phone) => `tel:${String(phone).replace(/[^0-9+]/g, '')}`;

/**
 * Structured office/location cards from GET /api/offices.
 * Renders nothing when no published offices exist — the legacy
 * ContactDetails block remains the fallback.
 */
export default function ContactOffices({ offices = [] }) {
    if (!offices.length) return null;

    return (
        <section className="contact-offices" aria-labelledby="contact-offices-heading">
            <h2 id="contact-offices-heading" className="contact-offices__heading">Our Offices</h2>
            <div className="contact-offices__grid">
                {offices.map((o) => {
                    const location = [o.addressLine, o.city, o.country].filter(Boolean).join(', ');
                    const hours = Array.isArray(o.hours) ? o.hours : [];
                    return (
                        <article className="contact-office" key={o.id || o.slug}>
                            <h3 className="contact-office__name">
                                {o.isHeadquarters && <FaBuilding aria-hidden="true" className="contact-office__hq" />}
                                {o.name}
                            </h3>
                            {location && (
                                <p className="contact-office__line">
                                    <FaMapMarkerAlt aria-hidden="true" /> {location}
                                </p>
                            )}
                            {o.phone && (
                                <p className="contact-office__line">
                                    <FaPhoneAlt aria-hidden="true" /> <a href={telHref(o.phone)}>{o.phone}</a>
                                </p>
                            )}
                            {o.email && (
                                <p className="contact-office__line">
                                    <FaEnvelope aria-hidden="true" /> <a href={`mailto:${o.email}`}>{o.email}</a>
                                </p>
                            )}
                            {hours.length > 0 && (
                                <ul className="contact-office__hours">
                                    {hours.map((h, i) => (
                                        <li key={i}>
                                            <FaClock aria-hidden="true" />
                                            <span>{[h.days, h.hours].filter(Boolean).join(': ')}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {o.mapUrl && /^https?:\/\//i.test(o.mapUrl) && (
                                <a className="contact-office__map" href={o.mapUrl} target="_blank" rel="noopener noreferrer">
                                    View on map
                                </a>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
