import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaTag, FaPlayCircle } from 'react-icons/fa';
import { PRODUCT_LOGOS } from '../../utils/brandAssets';
import { resolveAssetUrl } from '../../utils/constants';
import { getProductBookingPath } from '../../utils/booking/bookingRoutes';
import ProductStatusBadge from './ProductStatusBadge';

// Hero / landing intro: name, tagline, description, status, category, CTAs.
const ProductHero = ({ product }) => {
    const logo = resolveAssetUrl(product.logoUrl) || (product.slug ? PRODUCT_LOGOS[product.slug] : '');
    const contactHref = `/contact?product=${encodeURIComponent(product.slug)}&type=product`;

    return (
        <header className="product-hero">
            <div className="product-container">
                <nav className="product-hero__breadcrumbs" aria-label="Breadcrumb">
                    <Link to="/products" className="product-hero__back">
                        <FaArrowLeft /> Back to products
                    </Link>
                </nav>

                <div className="product-hero__inner">
                    <div className="product-hero__copy">
                        <div className="product-hero__meta-top">
                            <span className="product-hero__category">
                                <FaTag /> {product.categoryLabel || 'AngiSoft Product'}
                            </span>
                            <ProductStatusBadge status={product.status} label={product.statusLabel} className={product.statusClassName} />
                        </div>

                        <h1 className="product-hero__title">{product.name}</h1>
                        {product.tagline && <p className="product-hero__tagline">{product.tagline}</p>}
                        {product.description && <p className="product-hero__desc">{product.description}</p>}

                        <div className="product-hero__actions">
                            <Link to={getProductBookingPath(product, 'demo')} className="btn btn--primary">
                                <FaPlayCircle /> Request a demo
                            </Link>
                            {product.demoUrl && (
                                <a href={product.demoUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">
                                    Try live demo <FaPlayCircle />
                                </a>
                            )}
                            <Link to={contactHref} className="btn btn--link">Talk to us</Link>
                        </div>
                    </div>

                    <div className="product-hero__media">
                        <div className="product-hero__logo-card">
                            {logo ? (
                                <img
                                    src={logo}
                                    alt={`${product.name} logo`}
                                    className="product-hero__logo"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <span className="product-hero__logo-fallback">{product.name}</span>
                            )}
                            <ProductStatusBadge status={product.status} label={product.statusLabel} className={product.statusClassName} />
                        </div>
                        {product.bannerUrl && (
                            <img
                                src={resolveAssetUrl(product.bannerUrl)}
                                alt={`${product.name} banner`}
                                className="product-hero__banner"
                                loading="lazy"
                                decoding="async"
                            />
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default ProductHero;
