import React from 'react';
import { Link } from 'react-router-dom';
import { resolveAssetUrl } from '../../utils/constants';
import { getProductDetailPath } from '../../utils/detailPaths';
import ProductStatusBadge from './ProductStatusBadge';
import { FaArrowRight } from 'react-icons/fa';

// Card for one product in the grid. Fully data-driven: logo, status, features
// all come from the normalized product record.
const ProductCard = ({ product }) => {
    const logo = resolveAssetUrl(product.logoUrl);
    const detailPath = getProductDetailPath(product);

    return (
        <Link to={detailPath} className="product-card" aria-label={`View ${product.name}`}>
            <div className="product-card__media">
                {logo ? (
                    <img
                        src={logo}
                        alt={`${product.name} logo`}
                        className="product-card__logo"
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <span className="product-card__logo-fallback">{product.name}</span>
                )}
                <div className="product-card__status">
                    <ProductStatusBadge
                        status={product.status}
                        label={product.statusLabel}
                        className={product.statusClassName}
                    />
                </div>
            </div>

            <div className="product-card__body">
                <span className="product-card__cat">{product.categoryLabel || 'AngiSoft Product'}</span>
                <h3 className="product-card__name">{product.name}</h3>
                {product.tagline && <p className="product-card__tagline">{product.tagline}</p>}
                {product.shortDescription && <p className="product-card__desc">{product.shortDescription}</p>}

                {product.features?.length > 0 && (
                    <ul className="product-card__features">
                        {product.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="product-card__feature">
                                <i className="fa-solid fa-circle-check" aria-hidden="true" /> {f}
                            </li>
                        ))}
                    </ul>
                )}

                <span className="product-card__cta">
                    Explore product <FaArrowRight />
                </span>
            </div>
        </Link>
    );
};

export default ProductCard;
