import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { PRODUCT_LOGOS } from '../utils/brandAssets';
import { apiGet } from '../js/httpClient';
import { resolveAssetUrl } from '../utils/constants';
import { getProductDetailPath } from '../utils/detailPaths';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import {
    FaRocket, FaArrowRight,
    FaCheckCircle, FaExternalLinkAlt, FaCogs, FaChartLine, FaShieldAlt,
    FaMobile, FaCloud, FaUsers
} from 'react-icons/fa';

const fallbackProducts = [
    {
        id: 'petroflow',
        name: 'PetroFlow',
        tagline: 'Complete Fuel Station Management',
        description: 'A comprehensive POS and management system designed specifically for fuel stations. Track fuel inventory, manage sales, monitor pump readings, handle staff shifts, and generate detailed financial reports in real-time.',
        logo: PRODUCT_LOGOS.petroflow,
        gradient: `linear-gradient(135deg, #0A3DFF, #00C2FF)`,
        features: ['Real-time pump monitoring', 'Inventory management', 'Sales analytics', 'Staff management'],
        category: 'POS & Management',
        status: 'Live'
    },
    {
        id: 'dukaflow',
        name: 'DukaFlow',
        tagline: 'Smart Retail Management for SMEs',
        description: 'An all-in-one POS and business management platform built for small and medium retail businesses. Manage inventory, process sales, track expenses, and access powerful insights to grow your duka or shop.',
        logo: PRODUCT_LOGOS.dukaflow,
        gradient: `linear-gradient(135deg, #8A2BE2, #0A3DFF)`,
        features: ['Barcode scanning', 'Multi-outlet support', 'Expense tracking', 'Customer loyalty'],
        category: 'POS & Management',
        status: 'Live'
    },
    {
        id: 'kejalink',
        name: 'KejaLink',
        tagline: 'Modern Property Management',
        description: 'A streamlined property management platform for landlords and property managers. Manage tenants, track rent payments, handle maintenance requests, generate statements, and communicate effortlessly.',
        logo: PRODUCT_LOGOS.kejalink,
        gradient: `linear-gradient(135deg, #39FF6A, #00C2FF)`,
        features: ['Rent collection tracking', 'Tenant portal', 'Maintenance requests', 'Financial statements'],
        category: 'Property Management',
        status: 'Live'
    },
    {
        id: 'angitunes',
        name: 'AngiTunes',
        tagline: 'Digital Entertainment Platform',
        description: 'A next-generation digital entertainment platform for music streaming, content distribution, and artist promotion. Empowering artists and delighting audiences with seamless digital experiences.',
        logo: PRODUCT_LOGOS.angitunes,
        gradient: `linear-gradient(135deg, #00C2FF, #8A2BE2)`,
        features: ['Music streaming', 'Artist profiles', 'Content distribution', 'Analytics dashboard'],
        category: 'Entertainment',
        status: 'Coming Soon'
    }
];

const Products = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [hoveredCard, setHoveredCard] = useState(null);
    const [products, setProducts] = useState(fallbackProducts);
    const [pageCopy, setPageCopy] = useState(null);

    useEffect(() => {
        Promise.all([
            apiGet('/products').catch(() => null),
            apiGet('/site/products-page').catch(() => null),
        ]).then(([productData, copy]) => {
            if (Array.isArray(productData) && productData.length) {
                setProducts(productData.map((product) => ({
                    ...product,
                    logo: product.bannerUrl || product.logoUrl || product.logo,
                    color: product.color || 'from-blue-500 to-cyan-500',
                    features: Array.isArray(product.features) ? product.features : [],
                    status: product.status || 'DEVELOPMENT',
                })));
            }
            setPageCopy(copy);
        });
    }, []);

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section */}
            <ParallaxSection speed={0.25} treatment="image" backgroundImage="/images/Posters%20%26%20Campaigns/AngiSoft%20Campaign%20Banner.png" className="relative py-32 overflow-hidden">
                <div className="absolute inset-0 angi-spotlight" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
                    <ScrollReveal animation="fadeUp">
                        <span
                            className="inline-block px-6 py-2 rounded-full text-sm font-semibold mb-6"
                            style={{
                                backgroundColor: `${colors.primary}20`,
                                color: colors.primary,
                                border: `1px solid ${colors.primary}40`
                            }}
                        >
                            <FaCogs className="inline mr-2" />
                            Our Products
                        </span>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            {pageCopy?.titlePrefix || 'Purpose-Built'}
                            <span style={{
                                background: `linear-gradient(135deg, ${colors.primary}, #39FF6A)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                            {pageCopy?.titleHighlight || 'Software'}
                            </span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p
                            className="text-lg md:text-xl max-w-3xl mx-auto mb-10"
                            style={{ color: 'rgba(255,255,255,0.72)' }}
                        >
                            {pageCopy?.subtitle || 'Scalable SaaS products and platform directions shaped by real AngiSoft service work, local business needs, and digital empowerment goals.'}
                        </p>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={300}>
                        <div className="flex flex-wrap justify-center gap-4">
                            {['POS Systems', 'Property Management', 'Entertainment', 'Analytics'].map((badge, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        color: '#fff',
                                    }}
                                >
                                    <FaCheckCircle style={{ color: colors.primary }} />
                                    <span className="text-sm font-medium">{badge}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </div>
            </ParallaxSection>

            {/* Products Grid */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {products.map((product, idx) => {
                            const detailPath = getProductDetailPath(product);

                            return (
                            <ScrollReveal key={product.id} animation="fadeUp" delay={idx * 150}>
                                <div
                                    className="group relative h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-500"
                                    style={{
                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                        transform: hoveredCard === idx ? 'translateY(-8px)' : 'translateY(0)',
                                        boxShadow: hoveredCard === idx
                                            ? `0 25px 50px -12px ${colors.primary}30`
                                            : '0 4px 6px -1px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={() => setHoveredCard(idx)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    onClick={() => navigate(detailPath)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            navigate(detailPath);
                                        }
                                    }}
                                    role="link"
                                    tabIndex={0}
                                >
                                    {/* Product logo header */}
                                    <div className="relative h-44 overflow-hidden">
                                        <img
                                            src={resolveAssetUrl(product.logo || product.logoUrl || product.bannerUrl)}
                                            alt={`${product.name} logo`}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>

                                    <div className="p-8">
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <h3
                                                    className="text-2xl font-bold transition-colors duration-300"
                                                    style={{ color: hoveredCard === idx ? colors.primary : colors.text }}
                                                >
                                                    {product.name}
                                                </h3>
                                                <span
                                                    className="text-sm font-medium"
                                                    style={{ color: colors.textSecondary }}
                                                >
                                                    {product.category}
                                                </span>
                                            </div>
                                            <span
                                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                                style={{
                                                    backgroundColor: product.status === 'Live'
                                                        ? `${colors.success}20`
                                                        : `${colors.warning}20`,
                                                    color: product.status === 'Live'
                                                        ? colors.success
                                                        : colors.warning
                                                }}
                                            >
                                                {product.status}
                                            </span>
                                        </div>

                                        <p
                                            className="text-lg font-medium mb-3"
                                            style={{ color: colors.primary }}
                                        >
                                            {product.tagline}
                                        </p>

                                        <p
                                            className="mb-6 leading-relaxed"
                                            style={{ color: colors.textSecondary }}
                                        >
                                            {product.description}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            {product.features.map((feature, fIdx) => (
                                                <div
                                                    key={fIdx}
                                                    className="flex items-center gap-2"
                                                >
                                                    <FaCheckCircle
                                                        className="text-sm flex-shrink-0"
                                                        style={{ color: colors.success }}
                                                    />
                                                    <span
                                                        className="text-sm"
                                                        style={{ color: colors.textSecondary }}
                                                    >
                                                        {feature}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div
                                            className="flex items-center gap-2 font-semibold transition-all duration-300"
                                            style={{
                                                color: colors.primary,
                                                transform: hoveredCard === idx ? 'translateX(10px)' : 'translateX(0)'
                                            }}
                                        >
                                            <span>Learn More</span>
                                            <FaArrowRight className="transition-transform duration-300" />
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Product Capabilities Section */}
            <section
                className="py-20 px-4"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}10 0%, ${colors.secondary}10 100%)`
                }}
            >
                <div className="max-w-7xl mx-auto">
                    <ScrollReveal animation="fadeUp">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                <span style={{ color: colors.text }}>Built With </span>
                                <span style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Modern Tech
                                </span>
                            </h2>
                            <p
                                className="text-xl max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                Every product is built on a foundation of modern technology and best practices
                            </p>
                        </div>
                    </ScrollReveal>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: FaMobile,
                                title: 'Cross-Platform',
                                description: 'Access your business tools from any device. Our products work seamlessly on desktop, tablet, and mobile.'
                            },
                            {
                                icon: FaCloud,
                                title: 'Cloud-Native',
                                description: 'Built on scalable cloud infrastructure with automatic backups, 99.9% uptime, and enterprise-grade security.'
                            },
                            {
                                icon: FaChartLine,
                                title: 'Real-Time Analytics',
                                description: 'Make data-driven decisions with powerful dashboards, custom reports, and real-time business intelligence.'
                            }
                        ].map((item, idx) => (
                            <ScrollReveal key={idx} animation="fadeUp" delay={idx * 150}>
                                <GlassmorphismCard className="text-center p-8 h-full">
                                    <div
                                        className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                        style={{
                                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                        }}
                                    >
                                        <item.icon className="text-3xl text-white" />
                                    </div>
                                    <h3
                                        className="text-xl font-bold mb-4"
                                        style={{ color: colors.text }}
                                    >
                                        {item.title}
                                    </h3>
                                    <p style={{ color: colors.textSecondary }}>
                                        {item.description}
                                    </p>
                                </GlassmorphismCard>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Custom Solutions CTA */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <ScrollReveal animation="scaleUp">
                        <GlassmorphismCard className="p-12 text-center">
                            <div
                                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`
                                }}
                            >
                                <FaCogs className="text-3xl text-white" />
                            </div>
                            <h2
                                className="text-3xl md:text-4xl font-bold mb-6"
                                style={{ color: colors.text }}
                            >
                                Need a Custom Solution?
                            </h2>
                            <p
                                className="text-xl mb-8 max-w-2xl mx-auto"
                                style={{ color: colors.textSecondary }}
                            >
                                Don't see what you need? We build bespoke software tailored to your specific business requirements. From concept to deployment, our team has you covered.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    onClick={() => navigate('/book')}
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                                        color: 'white'
                                    }}
                                >
                                    <FaRocket />
                                    Request a Quote
                                </button>
                                <button
                                    onClick={() => navigate('/services')}
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 hover:scale-105"
                                    style={{
                                        backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        color: colors.text,
                                        border: `2px solid ${colors.primary}`
                                    }}
                                >
                                    <FaExternalLinkAlt />
                                    View Services
                                </button>
                            </div>
                        </GlassmorphismCard>
                    </ScrollReveal>
                </div>
            </section>
        </div>
    );
};

export default Products;
