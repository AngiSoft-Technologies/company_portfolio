/**
 * Loading skeleton for the Service Detail page. Approximates the real layout
 * (breadcrumbs, hero, quick facts, overview, feature cards) so there is no
 * large layout shift. Animations respect reduced-motion via CSS.
 */
export default function ServiceDetailSkeleton() {
    return (
        <div className="service-detail service-detail--skeleton" aria-hidden="true">
            <div className="service-container">
                <div className="skeleton skeleton--breadcrumb" />
                <div className="service-hero service-hero--skeleton">
                    <div className="service-hero__content">
                        <div className="skeleton skeleton--badge" />
                        <div className="skeleton skeleton--title" />
                        <div className="skeleton skeleton--line" />
                        <div className="skeleton skeleton--line" />
                        <div className="skeleton skeleton--actions" />
                    </div>
                    <div className="skeleton skeleton--image" />
                </div>
                <div className="service-quick-facts__grid">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div className="skeleton skeleton--fact" key={i} />
                    ))}
                </div>
                <div className="skeleton skeleton--heading" />
                <div className="skeleton skeleton--paragraph" />
                <div className="skeleton skeleton--paragraph" />
                <div className="service-detail-skeleton__features">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div className="skeleton skeleton--feature" key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}
