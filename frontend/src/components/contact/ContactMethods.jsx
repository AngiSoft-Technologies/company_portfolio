import { FaWhatsapp, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const WHATSAPP_URL = 'https://wa.me/254710398690';

const telHref = (phone) => `tel:${phone.replace(/[^0-9+]/g, '')}`;

/**
 * Direct contact method cards driven by /site/contact data, with verified
 * fallbacks so the page is never empty. Each card has a real action link.
 */
export default function ContactMethods({ contact }) {
    const phone = contact?.phone || '+254710398690';
    const email = contact?.email || 'info@angisoft.co.ke';
    const whatsapp = contact?.whatsapp || '+254710398690';
    const city = contact?.city || 'Nairobi';
    const country = contact?.country || 'Kenya';

    const waUrl = whatsapp.startsWith('+')
        ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`
        : WHATSAPP_URL;

    const methods = [
        {
            key: 'whatsapp',
            icon: <FaWhatsapp aria-hidden="true" />,
            name: 'WhatsApp',
            value: whatsapp,
            guidance: 'Message us for a quick reply.',
            href: waUrl,
            label: 'Chat on WhatsApp',
        },
        {
            key: 'phone',
            icon: <FaPhoneAlt aria-hidden="true" />,
            name: 'Call / SMS',
            value: phone,
            guidance: 'Speak with our team directly.',
            href: telHref(phone),
            label: `Call ${phone}`,
        },
        {
            key: 'email',
            icon: <FaEnvelope aria-hidden="true" />,
            name: 'Email',
            value: email,
            guidance: 'Send the details and we will respond.',
            href: `mailto:${email}`,
            label: `Email ${email}`,
        },
        {
            key: 'location',
            icon: <FaMapMarkerAlt aria-hidden="true" />,
            name: 'Location',
            value: `${city}, ${country}`,
            guidance: 'Based in Nairobi, Kenya.',
            href: null,
            label: null,
        },
    ];

    return (
        <section className="contact-methods" aria-labelledby="contact-methods-heading">
            <h2 id="contact-methods-heading" className="contact-methods__heading">Reach Us Directly</h2>
            <div className="contact-methods__grid">
                {methods.map((m) => (
                    <div className="contact-method" key={m.key}>
                        <span className="contact-method__icon" aria-hidden="true">{m.icon}</span>
                        <div className="contact-method__body">
                            <span className="contact-method__name">{m.name}</span>
                            <span className="contact-method__value">{m.value}</span>
                            <span className="contact-method__guidance">{m.guidance}</span>
                            {m.href && (
                                <a href={m.href} className="contact-method__action" target={m.key === 'whatsapp' || m.key === 'email' ? '_blank' : undefined} rel="noopener noreferrer">
                                    {m.label}
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
