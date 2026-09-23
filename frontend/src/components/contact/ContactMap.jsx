/**
 * Renders an embedded map ONLY when a valid mapUrl exists in contact data.
 * Never inverts the Google map with CSS filters. Sensible responsive heights.
 */
export default function ContactMap({ contact }) {
    const mapUrl = contact?.mapUrl;
    if (!mapUrl || !/^https?:\/\//i.test(mapUrl)) return null;

    return (
        <section className="contact-map" aria-labelledby="contact-map-heading">
            <h2 id="contact-map-heading" className="contact-map__heading">Find Us</h2>
            <div className="contact-map__frame">
                <iframe
                    title="AngiSoft Technologies location"
                    src={mapUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                    className="contact-map__iframe"
                />
            </div>
        </section>
    );
}
