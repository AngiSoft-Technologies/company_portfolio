// Service engagement models AngiSoft actually offers.
import React from 'react';
import { FaBolt, FaProjectDiagram, FaLifeRing, FaKey } from 'react-icons/fa';

const MODELS = [
    {
        icon: FaBolt,
        title: 'One-Time Tasks',
        text: 'Suitable for debugging, document work, installation, design or focused technical support.',
    },
    {
        icon: FaProjectDiagram,
        title: 'Custom Projects',
        text: 'Suitable for websites, mobile applications, databases and management systems.',
    },
    {
        icon: FaLifeRing,
        title: 'Ongoing Support',
        text: 'Suitable for maintenance, updates, reporting and continuous technical assistance.',
    },
    {
        icon: FaKey,
        title: 'Product Access',
        text: 'Suitable for AngiSoft products that may be used, leased or subscribed to when available.',
    },
];

const ServiceEngagementModels = () => (
    <section className="services-container service-models" aria-labelledby="models-title">
        <div className="services-section__head">
            <h2 id="models-title" className="services-section__title">How We Offer Services</h2>
            <span className="services-section__count">Pick the engagement that fits your need</span>
        </div>
        <div className="service-models__grid">
            {MODELS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="service-models__item">
                    <span className="service-models__icon" aria-hidden="true"><Icon /></span>
                    <h3 className="service-models__title">{title}</h3>
                    <p className="service-models__text">{text}</p>
                </div>
            ))}
        </div>
    </section>
);

export default ServiceEngagementModels;
