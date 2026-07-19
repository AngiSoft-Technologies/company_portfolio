import React from 'react';

// Loading skeleton for the product list grid.
const ProductsSkeleton = ({ count = 4 }) => (
    <div className="product-skeleton__grid" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="product-skeleton__card">
                <div className="product-skeleton__media" />
                <div className="product-skeleton__body">
                    <div className="product-skeleton__line product-skeleton__line--lg" />
                    <div className="product-skeleton__line product-skeleton__line--md" />
                    <div className="product-skeleton__block" />
                </div>
            </div>
        ))}
    </div>
);

export default ProductsSkeleton;
