/**
 * "Who this service is for" — target audience, shown in detail here
 * (the quick-facts strip only shows a short summary).
 * Supports a string, an array of strings, or structured records.
 */
export default function ServiceAudience({ audience }) {
    if (!audience) return null;

    let items = [];
    if (typeof audience === 'string') {
        items = audience.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(audience)) {
        items = audience
            .map((a) => (typeof a === 'string' ? a : a?.label || a?.title || a?.name || ''))
            .filter(Boolean);
    } else if (typeof audience === 'object') {
        items = Object.values(audience).filter((v) => typeof v === 'string');
    }

    if (!items.length) return null;

    return (
        <section className="service-audience" aria-labelledby="service-audience-heading">
            <header className="service-section-head">
                <h2 id="service-audience-heading" className="service-section-title">Who This Service Is For</h2>
            </header>
            <ul className="service-audience__list">
                {items.map((item, i) => (
                    <li className="service-audience__pill" key={i}>{item}</li>
                ))}
            </ul>
        </section>
    );
}
