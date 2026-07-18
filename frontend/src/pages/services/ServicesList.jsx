// Services List page — compact, responsive service catalogue + discovery/CTA flow.
// Data layer is frozen: useServices -> useServiceSearch provide the grid, filters,
// categories and counts. This file only composes presentation.
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useServices } from '../../hooks/useServices';
import { useServiceSearch } from '../../hooks/useServiceSearch';
import { useTheme } from '../../contexts/ThemeContext';
import ScrollReveal from '../../components/modern/ScrollReveal';

import ServicesHero from '../../components/services/ServicesHero';
import ServicesToolbar from '../../components/services/ServicesToolbar';
import ServicesGrid from '../../components/services/ServicesGrid';
import ServiceCardSkeleton from '../../components/services/ServiceCardSkeleton';
import ServicesEmptyState from '../../components/services/ServicesEmptyState';
import ServicesErrorState from '../../components/services/ServicesErrorState';
import ServiceDecisionGuide from '../../components/services/ServiceDecisionGuide';
import ServiceProcessSteps from '../../components/services/ServiceProcessSteps';
import ServicePricingBanner from '../../components/services/ServicePricingBanner';
import ServiceEngagementModels from '../../components/services/ServiceEngagementModels';
import ServiceCombinationCTA from '../../components/services/ServiceCombinationCTA';
import ServicesQuickLinks from '../../components/services/ServicesQuickLinks';
import ServicesFinalCTA from '../../components/services/ServicesFinalCTA';
import ServicesWhyAngiSoft from '../../components/services/ServicesWhyAngiSoft';

import '../../css/services/services-list.css';
import '../../css/services/services-toolbar.css';
import '../../css/services/service-card.css';
import '../../css/services/service-decision-guide.css';
import '../../css/services/service-process.css';
import '../../css/services/service-pricing-banner.css';
import '../../css/services/service-cta.css';
import '../../css/services/service-responsive.css';

const HERO_IMAGE = '/uploads/public/images/Software-Development-Company.jpg';

const ServicesList = () => {
    const { colors } = useTheme();
    const { services, loading, error, refetch } = useServices();
    const { query, setQuery, category, setCategory, results, categories, isFiltering, clearFilters } =
        useServiceSearch(services);

    // Decision-guide / deep links can preselect a category: /services?category=slug
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const cat = searchParams.get('category');
        if (cat && cat !== category) setCategory(cat);
        // only react to the initial query param
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayed = isFiltering ? results : services;
    const totalCount = services.length;

    return (
        <div className="services-page" style={{ background: colors.background }}>
            <ServicesHero
                eyebrow="Our Services"
                title="Find the Right Service for Your Next Digital Need"
                subtitle="Explore AngiSoft’s software, data, technical and digital services. Compare options, review starting prices, read full details and request the support that fits your needs."
                image={HERO_IMAGE}
            />

            <div className="services-toolbar-wrap">
                <ServicesToolbar
                    query={query}
                    setQuery={setQuery}
                    category={category}
                    setCategory={(c) => {
                        setCategory(c);
                        if (c) {
                            searchParams.set('category', c);
                        } else {
                            searchParams.delete('category');
                        }
                        setSearchParams(searchParams, { replace: true });
                    }}
                    categories={categories}
                />
            </div>

            <main id="services-catalogue" className="services-container">
                {loading && (
                    <section className="services-section" aria-busy="true">
                        <div className="services-section__head">
                            <h2 className="services-section__title">Loading services…</h2>
                        </div>
                        <div className="service-catalog-grid">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <ServiceCardSkeleton key={i} />
                            ))}
                        </div>
                    </section>
                )}

                {!loading && error && (
                    <section className="services-section">
                        <ServicesErrorState message={error} onRetry={refetch} />
                    </section>
                )}

                {!loading && !error && totalCount === 0 && (
                    <section className="services-section">
                        <ServicesErrorState
                            message="No services are available yet. Please check back soon."
                            onRetry={refetch}
                        />
                    </section>
                )}

                {!loading && !error && totalCount > 0 && (
                    <>
                        <div className="services-section__head services-section__head--catalogue">
                            <h2 className="services-section__title">Services</h2>
                            <span className="services-section__count">
                                {isFiltering
                                    ? `${displayed.length} service${displayed.length === 1 ? '' : 's'} found`
                                    : `${totalCount} service${totalCount === 1 ? '' : 's'} available`}
                            </span>
                            {isFiltering && (
                                <button type="button" className="services-section__clear" onClick={clearFilters}>
                                    Clear filters
                                </button>
                            )}
                        </div>

                        {displayed.length > 0 ? (
                            <ServicesGrid services={displayed} />
                        ) : (
                            <ServicesEmptyState onClear={clearFilters} />
                        )}
                    </>
                )}
            </main>

            {!loading && !error && totalCount > 0 && (
                <>
                    <ServiceDecisionGuide />
                    <ServiceProcessSteps />
                    <ServicePricingBanner />
                    <ServiceEngagementModels />
                    <ServiceCombinationCTA />
                    <ServicesQuickLinks />
                    <ServicesWhyAngiSoft />
                    <ServicesFinalCTA />
                </>
            )}
        </div>
    );
};

export default ServicesList;
