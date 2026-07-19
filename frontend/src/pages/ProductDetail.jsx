import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProductDetail } from '../hooks/useProductDetail';
import ProductHero from '../components/product/ProductHero';
import ProductFeatures from '../components/product/ProductFeatures';
import ProductGallery from '../components/product/ProductGallery';
import ProductPricing from '../components/product/ProductPricing';
import ProductFaq from '../components/product/ProductFaq';
import ProductRelated from '../components/product/ProductRelated';
import ProductCta from '../components/product/ProductCta';
import ProductSkeleton from '../components/product/ProductSkeleton';
import '../css/product/product-detail.css';

// Modern, data-driven product landing page.
// All content is derived from the canonical GET /api/products/:slug response
// (normalized by useProductDetail). No hardcoded marketing copy.
const ProductDetail = () => {
    const { slug } = useParams();
    const { product, loading, error, notFound } = useProductDetail(slug);

    if (loading) {
        return <ProductSkeleton />;
    }

    if (notFound || error || !product) {
        return (
            <main className="product-detail product-detail--error">
                <div className="product-container">
                    <Link to="/products" className="product-back-link">
                        Back to products
                    </Link>
                    <h1 className="product-error__title">{error || 'Product not found'}</h1>
                    <p className="product-error__sub">
                        This product may not be published yet, or the link is incorrect.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="product-detail">
            <ProductHero product={product} />
            <ProductFeatures product={product} />
            <ProductGallery product={product} />
            <ProductPricing product={product} />
            <ProductFaq product={product} />
            <ProductRelated product={product} />
            <ProductCta product={product} />
        </main>
    );
};

export default ProductDetail;
