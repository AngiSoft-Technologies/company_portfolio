// Final conversion CTA. Primary: Book a Service -> /book. Secondary: /contact.
// Tertiary: /pricing. Stacks full-width on phones (CSS).
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaCommentDots, FaTag } from 'react-icons/fa';

const ServicesFinalCTA = () => (
    <section className="services-container services-final-cta" aria-labelledby="final-cta-title">
        <h2 id="final-cta-title" className="services-final-cta__title">Ready to Get the Right Service?</h2>
        <p className="services-final-cta__text">
            Choose a service, review its details or share your requirements and let AngiSoft help
            you decide the best next step.
        </p>
        <div className="services-final-cta__actions">
            <Link to="/book" className="services-final-cta__btn services-final-cta__btn--primary">
                Book a Service
                <FaArrowRight aria-hidden="true" />
            </Link>
            <Link to="/contact" className="services-final-cta__btn services-final-cta__btn--ghost">
                <FaCommentDots aria-hidden="true" /> Contact AngiSoft
            </Link>
            <Link to="/pricing" className="services-final-cta__link">
                <FaTag aria-hidden="true" /> View Pricing
            </Link>
        </div>
    </section>
);

export default ServicesFinalCTA;
