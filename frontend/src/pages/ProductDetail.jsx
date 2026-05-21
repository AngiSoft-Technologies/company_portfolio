import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { PRODUCT_LOGOS } from '../utils/brandAssets';
import { resolveAssetUrl } from '../utils/constants';
import { FaArrowLeft, FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';

const ProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiGet(`/products/${slug}`)
      .then(setProduct)
      .catch(() => setError('Product not found or not published yet.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <main style={{ minHeight: '70vh', padding: '8rem 1.5rem', color: '#fff' }}>Loading product...</main>;
  }

  if (error || !product) {
    return (
      <main style={{ minHeight: '70vh', padding: '8rem 1.5rem', color: '#fff' }}>
        <Link to="/products" style={{ color: '#00AFFF' }}><FaArrowLeft /> Back to products</Link>
        <h1>{error || 'Product not found'}</h1>
      </main>
    );
  }

  const logo = resolveAssetUrl(product.logoUrl || PRODUCT_LOGOS[product.slug]);
  const features = Array.isArray(product.features) ? product.features : [];
  const faqs = Array.isArray(product.faqs) ? product.faqs : [];

  return (
    <main style={{ minHeight: '100vh', background: '#07142b', color: '#fff' }}>
      <section style={{ padding: '8rem 1.5rem 4rem', maxWidth: '1120px', margin: '0 auto' }}>
        <Link to="/products" style={{ color: '#00AFFF', textDecoration: 'none', display: 'inline-flex', gap: '0.5rem', alignItems: 'center', marginBottom: '2rem' }}>
          <FaArrowLeft /> Back to products
        </Link>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, 0.8fr)', gap: '2rem', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#00AF55', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{product.category || 'AngiSoft Product'}</p>
            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1, margin: '0 0 1rem' }}>{product.name}</h1>
            <h2 style={{ color: '#00AFFF', fontSize: '1.25rem', marginBottom: '1rem' }}>{product.tagline}</h2>
            <p style={{ color: 'rgba(245,247,250,0.74)', fontSize: '1.05rem', lineHeight: 1.8 }}>{product.description}</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
              <Link to="/booking" style={{ padding: '0.9rem 1.25rem', borderRadius: '999px', background: 'linear-gradient(135deg,#0875FF,#00AF55)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                Discuss This Product
              </Link>
              {product.demoUrl && (
                <a href={product.demoUrl} target="_blank" rel="noreferrer" style={{ padding: '0.9rem 1.25rem', borderRadius: '999px', border: '1px solid rgba(0,175,255,0.35)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
                  Demo <FaExternalLinkAlt />
                </a>
              )}
            </div>
          </div>
          <div style={{ border: '1px solid rgba(0,175,255,0.16)', borderRadius: '2rem', padding: '2rem', background: 'rgba(255,255,255,0.04)', textAlign: 'center' }}>
            {logo && <img src={logo} alt={product.name} style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'contain', marginBottom: '1.5rem' }} />}
            loading="lazy"
            decoding="async"
            <p style={{ margin: 0, color: '#00AF55', fontWeight: 800 }}>{product.status || 'DEVELOPMENT'}</p>
          </div>
        </div>
      </section>

      <section style={{ padding: '2rem 1.5rem 5rem', maxWidth: '1120px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem' }}>What it supports</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {features.map((feature) => (
            <div key={feature} style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,175,255,0.12)' }}>
              <FaCheckCircle style={{ color: '#00AF55', marginRight: '0.5rem' }} /> {feature}
            </div>
          ))}
        </div>
        {faqs.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ fontSize: '2rem' }}>Product questions</h2>
            {faqs.map((faq) => (
              <div key={faq.id} style={{ padding: '1.25rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,175,255,0.12)', marginBottom: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>{faq.question}</h3>
                <p style={{ color: 'rgba(245,247,250,0.7)', lineHeight: 1.7 }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default ProductDetail;
