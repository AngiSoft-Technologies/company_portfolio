// Skeleton placeholder shown while the services list is loading.
import React from 'react';

const ServiceCardSkeleton = () => (
    <div className="service-card-skeleton" aria-hidden="true">
        <div className="service-card-skeleton__media" />
        <div className="service-card-skeleton__body">
            <div className="sk-line short" />
            <div className="sk-line mid" />
            <div className="sk-line" />
            <div className="sk-line short" />
        </div>
    </div>
);

export default ServiceCardSkeleton;
