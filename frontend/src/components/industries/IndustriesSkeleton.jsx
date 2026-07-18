export default function IndustriesSkeleton({ count = 8 }) {
    return (
        <ul className="industries-grid" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <li key={i}>
                    <div className="industry-card industry-card--skeleton">
                        <div className="skeleton skeleton--image" />
                        <div className="industry-card__body">
                            <div className="skeleton skeleton--title" />
                            <div className="skeleton skeleton--line" />
                            <div className="skeleton skeleton--line" />
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
