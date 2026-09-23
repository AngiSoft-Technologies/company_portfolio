import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { getProductDetailPath } from '../../utils/detailPaths';

// Related products — from product.relatedProductSlugs (real data only).
const ProductRelated = ({ product }) => {
    const slugs = Array.isArray(product.relatedProductSlugs) ? product.relatedProductSlugs : [];
    if (!slugs.length) return null;
    return (
        <section className="product-related" aria-labelledby="product-related-title">
            <div className="product-container">
                <div className="product-section-head">
                    <h2 id="product-related-title" className="product-section-title">Related products</h2>
                </div>
                <div className="product-related__grid">
                    {slugs.map((slug) => (
                        <Link key={slug} to={getProductDetailPath({ slug })} className="product-related__card">
                            <span className="product-related__name">{slug}</span>
                            <span className="product-related__cta">
                                View <FaArrowRight />
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProductRelated;
