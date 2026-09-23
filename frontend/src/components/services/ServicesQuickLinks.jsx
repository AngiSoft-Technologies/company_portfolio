// Quick-access strip of destination links related to services.
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

const LINKS = [
    { label: 'Service Details', text: 'Browse complete information for each service.', to: '#services-catalogue' },
    { label: 'Pricing', text: 'View starting prices and pricing guidance.', to: '/pricing' },
    { label: 'Book a Service', text: 'Submit your requirements and preferred contact method.', to: '/book' },
    { label: 'Contact AngiSoft', text: 'Ask for help choosing the right service.', to: '/contact' },
    { label: 'Products', text: 'Explore AngiSoft-built platforms.', to: '/products' },
];

const ServicesQuickLinks = () => (
    <section className="services-container services-quicklinks" aria-labelledby="quicklinks-title">
        <h2 id="quicklinks-title" className="services-section__title">Quick Links</h2>
        <div className="services-quicklinks__grid">
            {LINKS.map(({ label, text, to }) => {
                const isAnchor = to.startsWith('#');
                return isAnchor ? (
                    <a key={label} href={to} className="services-quicklinks__card">
                        <span className="services-quicklinks__label">{label}</span>
                        <span className="services-quicklinks__text">{text}</span>
                        <FaArrowRight aria-hidden="true" className="services-quicklinks__arrow" />
                    </a>
                ) : (
                    <Link key={label} to={to} className="services-quicklinks__card">
                        <span className="services-quicklinks__label">{label}</span>
                        <span className="services-quicklinks__text">{text}</span>
                        <FaArrowRight aria-hidden="true" className="services-quicklinks__arrow" />
                    </Link>
                );
            })}
        </div>
    </section>
);

export default ServicesQuickLinks;
