/**
 * "About this service" — full description, with scope presented under a clear
 * label (never an unexplained second paragraph) and an optional notes block.
 */
export default function ServiceOverview({ service }) {
    if (!service) return null;

    const { description, scope } = service;
    if (!description && !scope) return null;

    return (
        <section className="service-overview" aria-labelledby="service-overview-heading">
            <header className="service-section-head">
                <h2 id="service-overview-heading" className="service-section-title">About This Service</h2>
            </header>

            <div className="service-overview__body">
                {description && <p className="service-overview__lead">{description}</p>}

                {scope && (
                    <div className="service-overview__scope">
                        <h3 className="service-overview__subtitle">Typical Scope</h3>
                        <p>{scope}</p>
                    </div>
                )}
            </div>
        </section>
    );
}
