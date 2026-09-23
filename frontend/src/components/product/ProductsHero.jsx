import React from 'react';

const CAPABILITY_BADGES = ['POS Systems', 'Property Management', 'Entertainment', 'Analytics'];

// Product list landing hero — data-driven copy with sensible defaults.
const ProductsHero = ({ copy }) => {
    const titlePrefix = copy?.titlePrefix || 'Purpose-Built';
    const titleHighlight = copy?.titleHighlight || 'Software';
    const subtitle =
        copy?.subtitle ||
        'Scalable SaaS products and platform directions shaped by real AngiSoft service work, local business needs, and digital empowerment goals.';

    return (
        <section className="products-hero">
            <div className="product-container">
                <div className="products-hero__inner">
                    <span className="products-hero__eyebrow">
                        <i className="fa-solid fa-cogs" aria-hidden="true" /> Our Products
                    </span>
                    <h1 className="products-hero__title">
                        {titlePrefix} <span>{titleHighlight}</span>
                    </h1>
                    <p className="products-hero__sub">{subtitle}</p>
                    <div className="products-hero__badges">
                        {CAPABILITY_BADGES.map((badge) => (
                            <span key={badge} className="products-hero__badge">
                                <i className="fa-solid fa-circle-check" aria-hidden="true" /> {badge}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductsHero;
