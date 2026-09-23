import React from 'react';
import { FaQuestionCircle } from 'react-icons/fa';

// FAQ — derived from product.faqs (real data only).
const ProductFaq = ({ product }) => {
    const faqs = Array.isArray(product.faqs) ? product.faqs : [];
    if (!faqs.length) return null;
    return (
        <section className="product-faq" aria-labelledby="product-faq-title">
            <div className="product-container">
                <div className="product-section-head">
                    <h2 id="product-faq-title" className="product-section-title">
                        <FaQuestionCircle /> Frequently asked
                    </h2>
                </div>
                <div className="product-faq__list">
                    {faqs.map((item, i) => (
                        <details key={`${item.question}-${i}`} className="product-faq__item">
                            <summary className="product-faq__q">{item.question}</summary>
                            <p className="product-faq__a">{item.answer}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProductFaq;
