import React from 'react';
import { resolveAssetUrl } from '../../utils/constants';

// Screenshot / gallery — derived from product.screenshots (real data only).
const ProductGallery = ({ product }) => {
    const shots = Array.isArray(product.screenshots) ? product.screenshots : [];
    if (!shots.length) return null;
    return (
        <section className="product-gallery" aria-label="Product screenshots">
            <div className="product-container">
                <div className="product-section-head">
                    <h2 className="product-section-title">A look inside</h2>
                    <p className="product-section-sub">Screens from {product.name}.</p>
                </div>
                <div className="product-gallery__grid">
                    {shots.map((src, i) => (
                        <figure key={`${src}-${i}`} className="product-gallery__item">
                            <img
                                src={resolveAssetUrl(src)}
                                alt={`${product.name} screenshot ${i + 1}`}
                                loading="lazy"
                                decoding="async"
                            />
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProductGallery;
