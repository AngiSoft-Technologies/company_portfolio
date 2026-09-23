import SolutionCard from './SolutionCard';

export default function SolutionsGrid({ solutions }) {
    if (!solutions?.length) return null;
    return (
        <ul className="solutions-grid">
            {solutions.map((s) => (
                <SolutionCard key={s.id || s.slug} solution={s} />
            ))}
        </ul>
    );
}
