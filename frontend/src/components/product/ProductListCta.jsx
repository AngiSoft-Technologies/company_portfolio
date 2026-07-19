import React from 'react';
import { useNavigate } from 'react-router-dom';

// Closing CTA band — routes to contact with no preset product context.
const ProductListCta = () => {
    const navigate = useNavigate();
    const goContact = () => navigate('/contact?type=product');

    return (
        <section className="products-cta">
            <div className="product-container">
                <div className="products-cta__inner">
                    <div>
                        <h2 className="products-cta__title">Want a product shaped to your operation?</h2>
                        <p className="products-cta__sub">
                            Tell us about your workflow and we'll map it to an AngiSoft product or a custom build.
                        </p>
                    </div>
                    <div className="products-cta__actions">
                        <button type="button" className="products-cta__btn products-cta__btn--primary" onClick={goContact}>
                            Talk to us <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductListCta;
