// Compact responsive catalogue grid. Tailwind handles the responsive columns;
// CSS (service-card.css) owns the card internals. Tailwind grid per spec:
//   grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6
import React from 'react';
import ServiceCatalogCard from './ServiceCatalogCard';

const ServicesGrid = ({ services = [] }) => {
    if (!services.length) return null;
    return (
        <div className="service-catalog-grid">
            {services.map((service) => (
                <div key={service.id || service.slug} className="service-catalog-grid__cell">
                    <ServiceCatalogCard service={service} />
                </div>
            ))}
        </div>
    );
};

export default ServicesGrid;
