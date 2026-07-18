// Pricing banner after the catalogue. Routes: View Service Pricing -> /pricing,
// Request a Custom Quote -> /book (canonical booking route).
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaTag } from 'react-icons/fa';

const ServicePricingBanner = () => (
    <section className="services-container service-pricing-banner" aria-labelledby="pricing-banner-title">
        <div className="service-pricing-banner__inner">
            <div className="service-pricing-banner__text">
                <h2 id="pricing-banner-title" className="service-pricing-banner__title">
                    Need a Quick Pricing Guide?
                </h2>
                <p className="service-pricing-banner__desc">
                    View starting prices, package guidance and the factors that affect the final
                    cost of each service — no need to open every card.
                </p>
            </div>
            <div className="service-pricing-banner__actions">
                <Link to="/pricing" className="service-pricing-banner__btn service-pricing-banner__btn--primary">
                    <FaTag aria-hidden="true" /> View Service Pricing
                </Link>
                <Link to="/book" className="service-pricing-banner__btn service-pricing-banner__btn--ghost">
                    Request a Custom Quote
                    <FaArrowRight aria-hidden="true" />
                </Link>
            </div>
        </div>
    </section>
);

export default ServicePricingBanner;
