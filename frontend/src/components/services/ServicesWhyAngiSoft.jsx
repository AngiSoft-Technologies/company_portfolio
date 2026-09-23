// "Why AngiSoft" credibility strip. Per spec, the 24/7 support claim is
// removed — only claims we can stand behind are shown.
import React from 'react';
import { FaCheckCircle, FaUsers, FaRocket, FaShieldAlt } from 'react-icons/fa';
import ScrollReveal from '../modern/ScrollReveal';

const POINTS = [
    {
        icon: FaRocket,
        title: 'Practical, production-ready builds',
        text: 'We ship systems that work for real workflows — not demos that stall after launch.',
    },
    {
        icon: FaUsers,
        title: 'Local, responsive team',
        text: 'A Kenyan team that understands your context and stays reachable through delivery and beyond.',
    },
    {
        icon: FaShieldAlt,
        title: 'Secure by default',
        text: 'Access modeling, clean schemas, and careful handling of your data and documents.',
    },
    {
        icon: FaCheckCircle,
        title: 'Clear, fixed scoping',
        text: 'You get a written scope and a transparent price before a single line of code is written.',
    },
];

const ServicesWhyAngiSoft = () => (
    <section className="services-container services-section" aria-labelledby="why-title">
        <ScrollReveal animation="fadeUp">
            <div className="services-section__head">
                <h2 id="why-title" className="services-section__title">Why AngiSoft</h2>
                <span className="services-section__count">How we work with you</span>
            </div>
        </ScrollReveal>
        <div className="services-why">
            {POINTS.map((p, i) => {
                const Icon = p.icon;
                return (
                    <ScrollReveal key={p.title} animation="fadeUp" delay={i * 80}>
                        <div className="services-why__item">
                            <span className="services-why__icon" aria-hidden="true"><Icon /></span>
                            <div className="services-why__text">
                                <h4>{p.title}</h4>
                                <p>{p.text}</p>
                            </div>
                        </div>
                    </ScrollReveal>
                );
            })}
        </div>
    </section>
);

export default ServicesWhyAngiSoft;
