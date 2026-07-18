export default function IndustryCapabilities({ industry }) {
    const services = industry?.services || [];
    if (!services.length) return null;

    return (
        <section className="industry-capabilities" aria-labelledby="industry-capabilities-heading">
            <header className="industry-section-head">
                <h2 id="industry-capabilities-heading" className="industry-section-title">
                    What we build for {industry.name}
                </h2>
                <p className="industry-section-sub">
                    Capabilities and systems we deliver for this sector.
                </p>
            </header>

            <ul className="industry-capabilities__grid">
                {services.map((svc, i) => {
                    const Icon = svc.icon;
                    return (
                        <li className="industry-capabilities__item" key={svc.id || `${industry.slug}-${i}`}>
                            {Icon && <Icon className="industry-capabilities__icon" />}
                            <span className="industry-capabilities__name">{svc.name}</span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
