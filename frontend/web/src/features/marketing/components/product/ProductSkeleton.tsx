// @ts-nocheck
import React from 'react';

// Content placeholder for product detail.
const ProductSkeleton = () => (
    <div className="product-detail product-detail--loading" aria-busy="true">
        <div className="product-container">
            <div className="product-skeleton__hero">
                <div className="product-skeleton__line product-skeleton__line--lg" />
                <div className="product-skeleton__line product-skeleton__line--md" />
                <div className="product-skeleton__line product-skeleton__line--sm" />
            </div>
            <div className="product-skeleton__grid">
                <div className="product-skeleton__block" />
                <div className="product-skeleton__block" />
                <div className="product-skeleton__block" />
            </div>
        </div>
    </div>
);

export default ProductSkeleton;
