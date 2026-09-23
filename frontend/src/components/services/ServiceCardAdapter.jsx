// Thin adapter: render a normalized Service using the shared ModernServiceCard.
// Wrapped in a react-router Link so SPA navigation stays internal (no
// nested <a>), and mapped to the props ModernServiceCard expects.
import React from 'react';
import { Link } from 'react-router-dom';
import ModernServiceCard from '../modern/ModernServiceCard';
import { getServiceRoute } from '../../utils/services/serviceRoutes';
import { getPriceDisplay } from '../../utils/services/servicePricing';

const ServiceCardAdapter = ({ service, index = 0 }) => {
    if (!service) return null;
    const { label: priceLabel } = getPriceDisplay(service);

    return (
        <Link
            to={getServiceRoute(service)}
            aria-label={`View ${service.title}`}
            className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18D8FF] rounded-3xl"
        >
            <ModernServiceCard
                icon={service.category?.icon}
                title={service.title}
                description={service.description}
                features={service.features}
                image={service.image}
                price={priceLabel}
                index={index}
                className="h-full"
            />
        </Link>
    );
};

export default ServiceCardAdapter;
