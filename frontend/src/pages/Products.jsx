import React, { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProducts } from '../hooks/useProducts';
import ProductsHero from '../components/product/ProductsHero';
import ProductCard from '../components/product/ProductCard';
import ProductCapabilities from '../components/product/ProductCapabilities';
import ProductListCta from '../components/product/ProductListCta';
import ProductsSkeleton from '../components/product/ProductsSkeleton';
import '../css/product/product-list.css';

// Data-driven product listing. Mirrors the Product Detail architecture:
// content is derived entirely from GET /api/products (normalized by
// useProducts). No hardcoded marketing copy.
const Products = () => {
    const { mode } = useTheme();
    const { products, loading, error, refetch } = useProducts();

    const themeClass = mode === 'dark' ? 'is-dark' : 'is-light';

    const stateClass = useMemo(() => {
        if (loading) return 'product-list--loading';
        if (error || (!loading && products.length === 0)) return 'product-list--empty';
        return '';
    }, [loading, error, products.length]);

    return (
        <main className={`product-list ${themeClass} ${stateClass}`}>
            <ProductsHero />

            <section className="products-grid-section">
                <div className="product-container">
                    {loading ? (
                        <ProductsSkeleton count={4} />
                    ) : error ? (
                        <div className="product-list__state" role="alert">
                            <h1>Something went wrong</h1>
                            <p>{error}</p>
                            <button type="button" className="product-list__retry" onClick={refetch}>
                                Try again
                            </button>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="product-list__state">
                            <h1>No products yet</h1>
                            <p>Products will appear here once they are published.</p>
                        </div>
                    ) : (
                        <div className="products-grid">
                            {products.map((product) => (
                                <ProductCard key={product.id || product.slug} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {!loading && !error && products.length > 0 && (
                <>
                    <ProductCapabilities />
                    <ProductListCta />
                </>
            )}
        </main>
    );
};

export default Products;
