export default function SolutionDetailSkeleton() {
    return (
        <main className="solutions-page">
            <header className="solution-detail-hero">
                <div className="solutions-container">
                    <div className="skeleton skeleton--breadcrumb" />
                    <div className="solution-detail-hero__inner">
                        <div className="skeleton skeleton--title" />
                        <div className="skeleton skeleton--line" />
                        <div className="skeleton skeleton--line" />
                        <div className="skeleton skeleton--line" style={{ width: '70%' }} />
                        <div className="skeleton skeleton--actions" />
                    </div>
                </div>
            </header>
            <div className="solutions-container industries-detail__flow">
                <section>
                    <div className="skeleton skeleton--heading" />
                    <div className="solution-capabilities__grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton skeleton--feature" />
                        ))}
                    </div>
                </section>
                <section>
                    <div className="skeleton skeleton--heading" />
                    <div className="solution-related__grid">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="skeleton skeleton--image" style={{ height: '6rem' }} />
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
