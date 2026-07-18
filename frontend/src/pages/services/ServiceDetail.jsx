import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useServiceDetail } from '../../hooks/useServiceDetail';
import { useServices } from '../../hooks/useServices';
import { getRelatedServices } from '../../utils/services/relatedServices';

import ServiceBreadcrumbs from '../../components/services/ServiceBreadcrumbs';
import ServiceDetailHero from '../../components/services/ServiceDetailHero';
import ServiceQuickFacts from '../../components/services/ServiceQuickFacts';
import ServiceOverview from '../../components/services/ServiceOverview';
import ServiceOutcome from '../../components/services/ServiceOutcome';
import ServiceFeatureList from '../../components/services/ServiceFeatureList';
import ServiceDeliverables from '../../components/services/ServiceDeliverables';
import ServiceAudience from '../../components/services/ServiceAudience';
import ServiceProcess from '../../components/services/ServiceProcess';
import ServiceTimeline from '../../components/services/ServiceTimeline';
import ServicePricingBlock from '../../components/services/ServicePricingBlock';
import ServiceGallery from '../../components/services/ServiceGallery';
import ServiceFaqs from '../../components/services/ServiceFaqs';
import RelatedServices from '../../components/services/RelatedServices';
import ServiceContactCTA from '../../components/services/ServiceContactCTA';
import ServiceDetailSkeleton from '../../components/services/ServiceDetailSkeleton';
import ServiceDetailError from '../../components/services/ServiceDetailError';
import ServiceDetailNotFound from '../../components/services/ServiceDetailNotFound';

import '../../css/services/service-detail.css';
import '../../css/services/service-content.css';
import '../../css/services/service-pricing.css';
import '../../css/services/service-gallery.css';
import '../../css/services/service-related.css';
import '../../css/services/service-cta.css';
import '../../css/services/service-responsive.css';

export default function ServiceDetail() {
    const { slug } = useParams();

    const { service, loading, error, notFound, refetch } = useServiceDetail(slug);
    const { services } = useServices();

    const relatedServices = useMemo(
        () => getRelatedServices({ service, services, limit: 4 }),
        [service, services],
    );

    if (loading) {
        return <ServiceDetailSkeleton />;
    }

    if (notFound) {
        return <ServiceDetailNotFound />;
    }

    if (error && !service) {
        return <ServiceDetailError error={error} onRetry={refetch} />;
    }

    const hasGallery = Array.isArray(service.images) && service.images.length > 0;
    const hasPricing = Boolean(
        service.priceFrom != null || service.pricingType || service.pricingNote || (service.pricingFactors?.length),
    );

    return (
        <main className="service-detail">
            <div className="service-container">
                <ServiceBreadcrumbs service={service} />
            </div>

            <ServiceDetailHero service={service} />

            <div className="service-container service-detail__flow">
                <ServiceQuickFacts service={service} />

                <ServiceOverview service={service} />

                <ServiceOutcome outcomes={service.outcomes} />

                <ServiceFeatureList features={service.features} title="What’s Included" />

                <ServiceDeliverables deliverables={service.deliverables} />

                <ServiceAudience audience={service.targetAudience} />

                <ServiceProcess process={service.process} />

                <ServiceTimeline timeline={service.timeline} />

                {hasPricing && <ServicePricingBlock service={service} />}

                {hasGallery && <ServiceGallery images={service.images} title={service.title} />}

                <ServiceFaqs faqs={service.faqs} />

                <RelatedServices services={relatedServices} />

                <ServiceContactCTA service={service} />
            </div>
        </main>
    );
}
