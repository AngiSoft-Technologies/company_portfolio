import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';

/** Breadcrumb trail: Home › Services › [Service title]. */
export default function ServiceBreadcrumbs({ service }) {
    if (!service) return null;

    return (
        <nav className="service-breadcrumbs" aria-label="Breadcrumb">
            <ol className="service-breadcrumbs__list">
                <li className="service-breadcrumbs__item">
                    <Link to="/" className="service-breadcrumbs__link">Home</Link>
                </li>
                <li className="service-breadcrumbs__sep" aria-hidden="true"><FaChevronRight /></li>
                <li className="service-breadcrumbs__item">
                    <Link to="/services" className="service-breadcrumbs__link">Services</Link>
                </li>
                <li className="service-breadcrumbs__sep" aria-hidden="true"><FaChevronRight /></li>
                <li className="service-breadcrumbs__item" aria-current="page">{service.title}</li>
            </ol>
        </nav>
    );
}
