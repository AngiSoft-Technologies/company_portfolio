import React from 'react';
import { FaTag, FaRegMoneyBillAlt } from 'react-icons/fa';

// Pricing — derived from product.pricingLabel / pricing (real data only).
const ProductPricing = ({ product }) => {
    if (!product.pricingLabel) return null;
    return (
        <section className="product-pricing" aria-labelledby="product-pricing-title">
            <div className="product-container">
                <div className="product-section-head">
                    <h2 id="product-pricing-title" className="product-section-title">
                        <FaTag /> Pricing
                    </h2>
                    <p className="product-section-sub">How {product.name} is priced.</p>
                </div>
                <div className="product-pricing__card">
                    <span className="product-pricing__icon"><FaRegMoneyBillAlt /></span>
                    <span className="product-pricing__amount">{product.pricingLabel}</span>
                    <p className="product-pricing__note">
                        Pricing is confirmed during your enquiry — we tailor plans to your needs.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default ProductPricing;
