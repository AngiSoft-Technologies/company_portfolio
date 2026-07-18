import { useParams } from 'react-router-dom';
import { useIndustryDetail } from '../../hooks/useIndustryDetail';
import { useIndustries } from '../../hooks/useIndustries';

import IndustryDetailHero from '../../components/industries/IndustryDetailHero';
import IndustryCapabilities from '../../components/industries/IndustryCapabilities';
import RelatedIndustries from '../../components/industries/RelatedIndustries';
import IndustryContactCTA from '../../components/industries/IndustryContactCTA';
import IndustryDetailSkeleton from '../../components/industries/IndustryDetailSkeleton';
import IndustryDetailError from './IndustryDetailError';
import IndustryDetailNotFound from './IndustryDetailNotFound';

import '../../css/industries/industries.css';

export default function IndustryDetail() {
    const { slug } = useParams();
    const { industry, loading, error, notFound, refetch } = useIndustryDetail(slug);
    const { industries } = useIndustries();

    if (loading) return <IndustryDetailSkeleton />;
    if (notFound) return <IndustryDetailNotFound />;
    if (error && !industry) return <IndustryDetailError error={error} onRetry={refetch} />;

    return (
        <main className="industries-page">
            <IndustryDetailHero industry={industry} />
            <div className="industries-container industries-detail__flow">
                <IndustryCapabilities industry={industry} />
                <RelatedIndustries industries={industries} currentSlug={industry.slug} />
                <IndustryContactCTA industry={industry} />
            </div>
        </main>
    );
}
