import IndustryCard from './IndustryCard';

/** Grid of industry cards. Renders nothing if the list is empty. */
export default function IndustriesGrid({ industries = [] }) {
    if (!industries.length) return null;

    return (
        <ul className="industries-grid">
            {industries.map((industry) => (
                <li key={industry.slug || industry.id}>
                    <IndustryCard industry={industry} />
                </li>
            ))}
        </ul>
    );
}
