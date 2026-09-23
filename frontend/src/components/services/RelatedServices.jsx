import { Link } from 'react-router-dom';
import { FaRegArrowAltCircleRight } from 'react-icons/fa';
import { getServiceRoute } from '../../utils/services/serviceRoutes';
import { getServicePriceLabel } from '../../utils/services/servicePricing';

/**
 * Related services chosen by relationship strength (configured ids → same
 * category → shared tags → shared audience → featured fallback). The current
 * service is always excluded. Renders compact cards, not full-width blocks.
 */
export default function RelatedServices({ services = [] }) {
    if (!Array.isArray(services) || !services.length) return null;

    return (
        <section className="service-related" aria-labelledby="service-related-heading">
            <header className="service-section-head">
                <h2 id="service-related-heading" className="service-section-title">Related Services</h2>
            </header>
            <ul className="service-related__grid">
                {services.map((s) => {
                    const priceLabel = getServicePriceLabel(s);
                    return (
                        <li className="service-related__card" key={s.slug}>
                            <Link to={getServiceRoute(s)} className="service-related__link">
                                <div className="service-related__body">
                                    <h3 className="service-related__title">{s.title}</h3>
                                    {s.shortDescription && <p className="service-related__desc">{s.shortDescription}</p>}
                                </div>
                                <div className="service-related__footer">
                                    {priceLabel && <span className="service-related__price">{priceLabel}</span>}
                                    <span className="service-related__more">
                                        View <FaRegArrowAltCircleRight aria-hidden="true" />
                                    </span>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
