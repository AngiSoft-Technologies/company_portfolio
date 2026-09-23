// Compact interior Hero for the Services list. Per spec: reduced height so
// users reach the catalogue quickly; badge + heading + subtitle + clear CTAs.
// No nested interactive elements: CTAs are sibling <a>/Link, not wrapped links.
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaTag, FaCommentDots } from 'react-icons/fa';
import { resolveAssetUrl } from '../../utils/constants';

const ServicesHero = ({
    eyebrow = 'Our Services',
    title = 'Find the Right Service for Your Next Digital Need',
    subtitle = 'Explore AngiSoft’s software, data, technical and digital services. Compare options, review starting prices, read full details and request the support that fits your needs.',
    image,
}) => {
    const bg = image ? resolveAssetUrl(image) : null;
    return (
        <header
            className="services-hero"
            style={bg ? { backgroundImage: `url(${bg})` } : undefined}
        >
            <div className="services-hero__inner">
                <span className="services-hero__eyebrow">{eyebrow}</span>
                <h1 className="services-hero__title">{title}</h1>
                <p className="services-hero__subtitle">{subtitle}</p>
                <div className="services-hero__cta">
                    <a href="#services-catalogue" className="services-hero__btn services-hero__btn--primary">
                        Browse Services
                        <FaArrowRight aria-hidden="true" />
                    </a>
                    <Link to="/pricing" className="services-hero__btn services-hero__btn--ghost">
                        <FaTag aria-hidden="true" /> View Pricing
                    </Link>
                    <Link to="/contact" className="services-hero__link">
                        <FaCommentDots aria-hidden="true" /> Not sure what you need? Talk to AngiSoft
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default ServicesHero;
