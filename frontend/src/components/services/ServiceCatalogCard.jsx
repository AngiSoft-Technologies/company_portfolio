// Compact service catalogue card — the core unit of the responsive catalogue.
// Per spec: icon -> category -> title -> clamped description -> audience -> price -> two actions.
// The card is an <article> (NOT a single <Link>) because it exposes TWO destinations:
//   View Details -> /services/:slug   (Service Details page)
//   Request Service -> /book?service=slug   (canonical booking route)
// This avoids nested interactive elements while meeting the "two actions per card" rule.
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { getServiceRoute, getServiceBookingPath } from '../../utils/services/serviceRoutes';

const DEFAULT_DESC =
    'Professional AngiSoft service built around practical workflows and clear delivery.';

const ServiceCatalogCard = ({ service }) => {
    if (!service) return null;

    const Icon = service.category?.icon;
    const title = service.title || 'Service';
    const categoryName = service.category?.name;
    const description = service.shortDescription || service.description || DEFAULT_DESC;
    const audience = service.targetAudience;
    const price = service.priceLabel || 'Custom Quote';

    return (
        <article className="service-catalog-card" aria-label={title}>
            <div className="service-catalog-card__header">
                <span className="service-catalog-card__icon" aria-hidden="true">
                    {Icon ? <Icon /> : <FaArrowRight />}
                </span>
                {categoryName && (
                    <span className="service-catalog-card__category">{categoryName}</span>
                )}
            </div>

            <h3 className="service-catalog-card__title">{title}</h3>

            <p className="service-catalog-card__description">{description}</p>

            {audience && (
                <p className="service-catalog-card__audience">
                    <span className="service-catalog-card__audience-label">Best for:</span>{' '}
                    {audience}
                </p>
            )}

            <div className="service-catalog-card__pricing">{price}</div>

            <div className="service-catalog-card__actions">
                <Link
                    to={getServiceRoute(service)}
                    className="service-catalog-card__details"
                    aria-label={`View details for ${title}`}
                >
                    View Details
                </Link>
                <Link
                    to={getServiceBookingPath(service)}
                    className="service-catalog-card__book"
                    aria-label={`Request ${title}`}
                >
                    Request
                    <FaArrowRight aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
};

export default ServiceCatalogCard;
