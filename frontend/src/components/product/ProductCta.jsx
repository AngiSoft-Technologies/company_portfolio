import React from 'react';
import { Link } from 'react-router-dom';
import { FaPlayCircle, FaCommentDots } from 'react-icons/fa';
import { getProductBookingPath } from '../../utils/booking/bookingRoutes';

// Bottom CTA band: request a demo (booking) + talk to us (contact prefilled).
const ProductCta = ({ product }) => {
    const demoUrl = getProductBookingPath(product, 'demo');
    const enquiryUrl = `/contact?product=${encodeURIComponent(product.slug)}&type=product`;
    return (
        <section className="product-cta" aria-labelledby="product-cta-title">
            <div className="product-container">
                <div className="product-cta__inner">
                    <div className="product-cta__copy">
                        <h2 id="product-cta-title" className="product-cta__title">
                            Interested in {product.name}?
                        </h2>
                        <p className="product-cta__sub">
                            Request a guided demo or send us a quick enquiry — we'll follow up with next steps.
                        </p>
                    </div>
                    <div className="product-cta__actions">
                        <Link to={demoUrl} className="product-cta__btn product-cta__btn--primary">
                            <FaPlayCircle /> Request a demo
                        </Link>
                        <Link to={enquiryUrl} className="product-cta__btn product-cta__btn--ghost">
                            <FaCommentDots /> Talk to us
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductCta;
