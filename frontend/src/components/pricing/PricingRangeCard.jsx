import { FaCheck } from 'react-icons/fa';

// A single estimated-range card. Shows the real floor price formatted as
// "KSh 15,000" (or omit the price line entirely if no amount exists).
export default function PricingRangeCard({ range }) {
    const { category, startingLabel, description, includes = [] } = range;
    return (
        <article className="pricing-range">
            {category && <h3 className="pricing-range__category">{category}</h3>}
            {startingLabel && <div className="pricing-range__from">{startingLabel}</div>}
            {description && <p className="pricing-range__desc">{description}</p>}
            {includes.length > 0 && (
                <ul className="pricing-range__includes">
                    {includes.map((inc, i) => (
                        <li key={`${inc}-${i}`}>
                            <FaCheck aria-hidden="true" />
                            <span>{inc}</span>
                        </li>
                    ))}
                </ul>
            )}
        </article>
    );
}
