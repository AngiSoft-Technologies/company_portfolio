// @ts-nocheck
// Compact service catalogue card — the core unit of the responsive catalogue.
// Per spec: icon -> category -> title -> clamped description -> audience -> price -> actions.
// The card is an <article> (NOT a single <Link>) because it exposes multiple destinations:
//   View Details -> /services/:slug   (Service Details page)
//   Ask / Request  -> contact + booking routes
// This avoids nested interactive elements while meeting the "multiple actions per card" rule.
// Styling: Tailwind utilities bound to the global theme vars + shared ui primitives.
import React from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { getServiceRoute, getServiceBookingPath } from '@/lib/marketing/services/serviceRoutes';
import { getServiceContactPath } from '@/lib/marketing/contact/contactRoutes';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import { Badge, Button } from '@/components/ui';

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
    const coverImage = service.images?.[0] ? resolveAssetUrl(service.images[0]) : null;

    return (
        <article
            className="group flex h-full flex-col overflow-hidden rounded-(--radius-xl) border border-(--border) bg-(--card-bg) transition-all duration-(--duration-normal) ease-(--ease-standard) hover:-translate-y-1 hover:border-(--color-secondary)/50 hover:shadow-(--elevation-lg)"
            aria-label={title}
        >
            {coverImage ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-(--surface)">
                    <img
                        src={coverImage}
                        alt={title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {categoryName && (
                        <Badge tone="brand" className="absolute left-3 top-3 z-10">
                            {categoryName}
                        </Badge>
                    )}
                </div>
            ) : null}
            <div className="flex flex-1 flex-col p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
                <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--radius-lg) bg-(--color-secondary)/12 text-(--color-secondary) transition-colors group-hover:bg-(--color-secondary)/20"
                    aria-hidden="true"
                >
                    {Icon ? <Icon /> : <FaArrowRight />}
                </span>
                {coverImage ? null : categoryName && <Badge>{categoryName}</Badge>}
            </div>

            <h3 className="text-lg font-bold text-(--text-primary) transition-colors group-hover:text-(--color-secondary)">
                {title}
            </h3>

            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
                {description}
            </p>

            {audience && (
                <p className="mt-3 text-xs leading-relaxed text-(--text-muted)">
                    <span className="font-semibold text-(--text-secondary)">Best for:</span>{' '}
                    {audience}
                </p>
            )}

            <div className="mt-4 text-sm font-bold text-(--color-primary)">{price}</div>

            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <Button
                    to={getServiceRoute(service)}
                    variant="secondary"
                    size="sm"
                    aria-label={`View details for ${title}`}
                >
                    View Details
                </Button>
                <Button
                    to={getServiceContactPath(service)}
                    variant="ghost"
                    size="sm"
                    aria-label={`Ask about ${title}`}
                >
                    Ask
                </Button>
                <Button
                    to={getServiceBookingPath(service)}
                    variant="primary"
                    size="sm"
                    aria-label={`Request ${title}`}
                    className="ml-auto"
                >
                    Request
                    <FaArrowRight aria-hidden="true" />
                </Button>
            </div>
            </div>
        </article>
    );
};

export default ServiceCatalogCard;
