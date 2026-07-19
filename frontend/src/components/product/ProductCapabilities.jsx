import React from 'react';

// Shared capability summary — static, describes the product suite's scope.
const CAPABILITIES = [
    {
        icon: 'fa-solid fa-cash-register',
        title: 'POS & Management',
        desc: 'Stock, sales, and operations tooling for fuel stations, retail shops, and property workflows.',
    },
    {
        icon: 'fa-solid fa-chart-line',
        title: 'Analytics & Reporting',
        desc: 'Reconciliation, dashboards, and audit-friendly reporting that turns operations into insight.',
    },
    {
        icon: 'fa-solid fa-mobile-screen-button',
        title: 'Mobile & Web Apps',
        desc: 'Cross-platform Flutter/Kotlin and web experiences with hardened payment readiness.',
    },
    {
        icon: 'fa-solid fa-shield-halved',
        title: 'Secure by Design',
        desc: 'Role-based access, audit trails, and privacy-conscious data handling across the platform.',
    },
];

const ProductCapabilities = () => (
    <section className="products-cap">
        <div className="product-container">
            <div className="product-section-head">
                <h2 className="product-section-title">
                    <i className="fa-solid fa-layer-group" aria-hidden="true" /> Platform capabilities
                </h2>
                <p className="product-section-sub">
                    Every AngiSoft product is built on shared, production-grade foundations.
                </p>
            </div>
            <div className="products-cap__grid">
                {CAPABILITIES.map((c) => (
                    <article key={c.title} className="products-cap__card">
                        <span className="products-cap__icon" aria-hidden="true">
                            <i className={c.icon} />
                        </span>
                        <h3 className="products-cap__title">{c.title}</h3>
                        <p className="products-cap__desc">{c.desc}</p>
                    </article>
                ))}
            </div>
        </div>
    </section>
);

export default ProductCapabilities;
