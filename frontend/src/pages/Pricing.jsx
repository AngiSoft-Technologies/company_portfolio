import { usePricing } from '../hooks/usePricing';
import { usePricingFilters } from '../hooks/usePricingFilters';

import PricingHero from '../components/pricing/PricingHero';
import PricingIntro from '../components/pricing/PricingIntro';
import PricingFactors from '../components/pricing/PricingFactors';
import PricingRanges from '../components/pricing/PricingRanges';
import PricingEngagementModels from '../components/pricing/PricingEngagementModels';
import PricingProcess from '../components/pricing/PricingProcess';
import PricingFaqs from '../components/pricing/PricingFaqs';
import PricingServiceGrid from '../components/pricing/PricingServiceGrid';
import PricingCta from '../components/pricing/PricingCta';
import PricingSkeleton from '../components/pricing/PricingSkeleton';
import PricingError from '../components/pricing/PricingError';
import PricingEmptyState from '../components/pricing/PricingEmptyState';

import '../css/pricing/pricing.css';
import '../css/pricing/pricing-hero.css';
import '../css/pricing/pricing-intro.css';
import '../css/pricing/pricing-factors.css';
import '../css/pricing/pricing-ranges.css';
import '../css/pricing/pricing-engagement.css';
import '../css/pricing/pricing-process.css';
import '../css/pricing/pricing-faqs.css';
import '../css/pricing/pricing-service-card.css';

export default function Pricing() {
    const { content, services, loading, error, refetch, hasContent, hasServiceData } = usePricing();
    const filters = usePricingFilters(services);

    if (loading) return <PricingSkeleton />;
    if (error) return <PricingError error={error} onRetry={refetch} />;
    if (!hasContent && !hasServiceData) return <PricingEmptyState />;

    return (
        <main className="pricing-page">
            <PricingHero content={content} />

            <PricingIntro content={content} />

            <PricingFactors
                title="What shapes your quote"
                subtitle="Every project is scoped around these factors. They decide whether work is a quick build or an ongoing system."
                factors={content?.pricingFactors}
            />

            <PricingRanges
                title="Estimated price ranges"
                subtitle="Real starting points by type of work. Final quotes depend on scope, integrations, and timelines."
                ranges={content?.estimatedRanges}
            />

            <PricingEngagementModels
                title="Engagement models"
                subtitle="Pick the way of working that fits the moment."
                models={content?.engagementModels}
            />

            <PricingProcess
                title="How it works"
                subtitle="From first message to delivered system."
                steps={content?.process}
            />

            <PricingServiceGrid
                title="Services & starting prices"
                subtitle="Priced services show a real starting figure; others are scoped on request."
                services={filters.visibleServices}
                categories={filters.categories}
                activeCategories={filters.activeCategories}
                deepLinkSlug={filters.deepLinkSlug}
                onToggleCategory={filters.toggleCategory}
                onClearAll={filters.clearAll}
            />

            <PricingFaqs
                title="Pricing questions"
                subtitle="The things clients ask before they book."
                faqs={content?.faq}
            />

            <PricingCta cta={content?.cta} />
        </main>
    );
}
