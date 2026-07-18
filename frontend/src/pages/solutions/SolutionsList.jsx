import { useSolutions } from '../../hooks/useSolutions';
import SolutionsGrid from '../../components/solutions/SolutionsGrid';
import SolutionsSkeleton from './SolutionsSkeleton';
import SolutionsError from './SolutionsError';

import '../../css/solutions/solutions.css';

export default function SolutionsList() {
    const { solutions, loading, error, refetch } = useSolutions();

    return (
        <main className="solutions-page">
            <section className="solutions-hero">
                <div className="solutions-container">
                    <div className="solutions-hero__inner">
                        <span className="solutions-hero__badge">Solutions</span>
                        <h1 className="solutions-hero__title">Solutions we offer</h1>
                        <p className="solutions-hero__subtitle">
                            Practical systems for the work your business already does — management, sales,
                            customers, operations, and everything in between.
                        </p>
                    </div>
                </div>
            </section>

            <section className="solutions-container" style={{ marginTop: '2.5rem' }}>
                {loading ? (
                    <SolutionsSkeleton />
                ) : error ? (
                    <SolutionsError onRetry={refetch} />
                ) : (
                    <SolutionsGrid solutions={solutions} />
                )}
            </section>
        </main>
    );
}
