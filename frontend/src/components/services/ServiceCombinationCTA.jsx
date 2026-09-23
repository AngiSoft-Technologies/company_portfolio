// "Need a Combination of Services?" — cross-service guidance + CTA.
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

const COMBOS = [
    'Website + database + hosting setup',
    'Mobile app + API + admin dashboard',
    'Data analysis + report editing + presentation',
    'Custom system + installation + staff training',
    'Branding + posters + website',
];

const ServiceCombinationCTA = () => (
    <section className="services-container service-combination" aria-labelledby="combo-title">
        <h2 id="combo-title" className="services-section__title">Need a Combination of Services?</h2>
        <p className="service-combination__text">
            Many projects combine several services. Tell us your goal and we’ll propose a package
            that fits, with a single scope and transparent quote.
        </p>
        <ul className="service-combination__list">
            {COMBOS.map((c) => (
                <li key={c} className="service-combination__item">{c}</li>
            ))}
        </ul>
        <Link to="/contact" className="service-combination__cta">
            Discuss a Custom Service Package
            <FaArrowRight aria-hidden="true" />
        </Link>
    </section>
);

export default ServiceCombinationCTA;
