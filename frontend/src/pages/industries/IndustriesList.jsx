import { useIndustries } from '../../hooks/useIndustries';
import IndustriesGrid from '../../components/industries/IndustriesGrid';
import IndustriesSkeleton from '../../components/industries/IndustriesSkeleton';
import IndustriesError from './IndustriesError';

import '../../css/industries/industries.css';

export default function IndustriesList() {
    const { industries, loading, error, refetch } = useIndustries();

    return (
        <main className="industries-page">
            <section className="industries-hero">
                <div className="industries-hero__inner">
                    <span className="industries-hero__badge">Industry Solutions</span>
                    <h1 className="industries-hero__title">
                        Software built for the way your industry actually works
                    </h1>
                    <p className="industries-hero__subtitle">
                        From healthcare and finance to logistics and manufacturing, AngiSoft delivers
                        systems tailored to real operational workflows.
                    </p>
                </div>
            </section>

            <div className="industries-container">
                {loading && <IndustriesSkeleton />}
                {!loading && error && <IndustriesError error={error} onRetry={refetch} />}
                {!loading && !error && <IndustriesGrid industries={industries} />}
            </div>
        </main>
    );
}
