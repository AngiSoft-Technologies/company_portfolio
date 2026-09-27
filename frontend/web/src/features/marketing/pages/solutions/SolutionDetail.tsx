// @ts-nocheck
import { useParams } from 'react-router-dom';
import { useSolutionDetail } from '@/hooks/marketing/useSolutionDetail';
import { useSolutions } from '@/hooks/marketing/useSolutions';

import SolutionDetailHero from '@/features/marketing/components/solutions/SolutionDetailHero';
import SolutionFeatures from '@/features/marketing/components/solutions/SolutionFeatures';
import RelatedSolutions from '@/features/marketing/components/solutions/RelatedSolutions';
import SolutionContactCTA from '@/features/marketing/components/solutions/SolutionContactCTA';
import SolutionDetailSkeleton from '@/features/marketing/components/solutions/SolutionDetailSkeleton';
import SolutionDetailError from './SolutionDetailError';
import SolutionDetailNotFound from './SolutionDetailNotFound';

import '@/styles/marketing/solutions/solutions.css';

export default function SolutionDetail() {
    const { slug } = useParams();
    const { solution, loading, error, notFound, refetch } = useSolutionDetail(slug);
    const { solutions } = useSolutions();

    if (loading) return <SolutionDetailSkeleton />;
    if (notFound) return <SolutionDetailNotFound />;
    if (error && !solution) return <SolutionDetailError error={error} onRetry={refetch} />;

    return (
        <main className="solutions-page">
            <SolutionDetailHero solution={solution} />
            <div className="solutions-container solutions-detail__flow">
                <SolutionFeatures solution={solution} />
                <RelatedSolutions solutions={solutions} currentSlug={solution.slug} />
                <SolutionContactCTA solution={solution} />
            </div>
        </main>
    );
}
