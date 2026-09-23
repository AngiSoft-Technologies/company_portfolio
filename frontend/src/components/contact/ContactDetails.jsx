import { FaPhoneAlt, FaWhatsapp, FaEnvelope, FaGlobe, FaMapMarkerAlt } from 'react-icons/fa';

const WHATSAPP_URL = 'https://wa.me/254710398690';

const telHref = (phone) => `tel:${phone.replace(/[^0-9+]/g, '')}`;

/**
 * Identity block: who AngiSoft is and how to reach them. Socials come from
 * the contact data; always provided as real links.
 */
export default function ContactDetails({ contact }) {
    const phone = contact?.phone || '+254710398690';
    const email = contact?.email || 'info@angisoft.co.ke';
    const whatsapp = contact?.whatsapp || '+254710398690';
    const city = contact?.city || 'Nairobi';
    const country = contact?.country || 'Kenya';
    const social = Array.isArray(contact?.social) ? contact.social : [];
    const website = 'https://angisoft.co.ke';

    const waUrl = whatsapp.startsWith('+')
        ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`
        : WHATSAPP_URL;

    return (
        <section className="contact-details" aria-labelledby="contact-details-heading">
            <div className="contact-details__panel">
                <h2 id="contact-details-heading" className="contact-details__title">AngiSoft Technologies</h2>
                <p className="contact-details__loc">
                    <FaMapMarkerAlt aria-hidden="true" /> {city}, {country}
                </p>

                <ul className="contact-details__list">
                    <li>
                        <FaPhoneAlt aria-hidden="true" />
                        <a href={telHref(phone)}>Call / SMS {phone}</a>
                    </li>
                    <li>
                        <FaWhatsapp aria-hidden="true" />
                        <a href={waUrl} target="_blank" rel="noopener noreferrer">WhatsApp {whatsapp}</a>
                    </li>
                    <li>
                        <FaEnvelope aria-hidden="true" />
                        <a href={`mailto:${email}`}>{email}</a>
                    </li>
                    <li>
                        <FaGlobe aria-hidden="true" />
                        <a href={website} target="_blank" rel="noopener noreferrer">{website}</a>
                    </li>
                </ul>

                {social.length > 0 && (
                    <div className="contact-details__socials">
                        {social.map((s) => (
                            <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer" className="contact-details__social">
                                {s.platform}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
