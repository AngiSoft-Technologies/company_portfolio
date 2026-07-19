import React from 'react';
import { FaCheckCircle, FaLightbulb } from 'react-icons/fa';

// Capabilities — derived from product.features (real data only).
const ProductFeatures = ({ product }) => {
    const features = Array.isArray(product.features) ? product.features : [];
    if (!features.length) return null;

    return (
        <section className="product-features" aria-labelledby="product-features-title">
            <div className="product-container">
                <div className="product-section-head">
                    <h2 id="product-features-title" className="product-section-title">
                        <FaLightbulb /> What it does
                    </h2>
                    <p className="product-section-sub">Core capabilities included with {product.name}.</p>
                </div>
                <ul className="product-features__grid">
                    {features.map((feature, i) => (
                        <li key={`${feature}-${i}`} className="product-features__item">
                            <span className="product-features__icon"><FaCheckCircle /></span>
                            <span className="product-features__text">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default ProductFeatures;
