// "Not sure which service?" decision guide. Three common visitor paths, each
// with example services and a CTA that jumps to the catalogue or a category
// filter. Uses plain anchors + buttons; category filtering is delegated to
// the toolbar via the deep-link anchor (#services-catalogue).
import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaPuzzlePiece, FaWrench, FaPenNib } from 'react-icons/fa';

const PATHS = [
    {
        icon: FaPuzzlePiece,
        title: 'I need something built',
        examples: 'Website · Mobile app · Custom system · Database',
        cta: 'Explore Development Services',
        to: '/services?category=software-development',
    },
    {
        icon: FaWrench,
        title: 'I need something fixed or improved',
        examples: 'Code debugging · System upgrades · Feature additions · Technical troubleshooting',
        cta: 'Explore Support Services',
        to: '/services?category=technical-support',
    },
    {
        icon: FaPenNib,
        title: 'I need digital or professional assistance',
        examples: 'Data analysis · Document editing · Graphic design · Online applications',
        cta: 'Explore Digital Services',
        to: '/services?category=digital-and-creative-services',
    },
];

const ServiceDecisionGuide = () => (
    <section className="services-container service-decision" aria-labelledby="decision-title">
        <div className="services-section__head">
            <h2 id="decision-title" className="services-section__title">
                Not Sure Which Service You Need?
            </h2>
            <span className="services-section__count">We’ll help you choose the right fit</span>
        </div>
        <div className="service-decision__grid">
            {PATHS.map(({ icon: Icon, title, examples, cta, to }) => (
                <div key={title} className="service-decision__card">
                    <span className="service-decision__icon" aria-hidden="true"><Icon /></span>
                    <h3 className="service-decision__card-title">{title}</h3>
                    <p className="service-decision__examples">{examples}</p>
                    <Link to={to} className="service-decision__cta">
                        {cta}
                        <FaArrowRight aria-hidden="true" />
                    </Link>
                </div>
            ))}
        </div>
    </section>
);

export default ServiceDecisionGuide;
