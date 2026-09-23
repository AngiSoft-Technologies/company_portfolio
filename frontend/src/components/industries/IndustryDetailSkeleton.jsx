export default function IndustryDetailSkeleton() {
    return (
        <main className="industries-page" aria-hidden="true">
            <div className="industry-detail-hero industry-detail-hero--skeleton">
                <div className="industries-container">
                    <div className="skeleton skeleton--breadcrumb" />
                    <div className="skeleton skeleton--title" />
                    <div className="skeleton skeleton--line" />
                    <div className="skeleton skeleton--actions" />
                </div>
            </div>
            <div className="industries-container">
                <div className="skeleton skeleton--heading" />
                <div className="industry-capabilities__grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div className="skeleton skeleton--feature" key={i} />
                    ))}
                </div>
            </div>
        </main>
    );
}
