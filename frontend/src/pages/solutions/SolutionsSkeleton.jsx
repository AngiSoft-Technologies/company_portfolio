export default function SolutionsSkeleton({ count = 12 }) {
    return (
        <ul className="solutions-grid">
            {Array.from({ length: count }).map((_, i) => (
                <li key={i} className="solution-card--skeleton solution-card__wrap">
                    <div className="skeleton skeleton--image" />
                    <div className="solution-card__body">
                        <div className="skeleton skeleton--title" style={{ height: '1.2rem' }} />
                        <div className="skeleton skeleton--line" />
                        <div className="skeleton skeleton--actions" style={{ width: '8rem' }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}
