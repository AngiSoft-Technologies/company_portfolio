// Category filter chips. Drives ?categories= deep-link via toggleCategory.
export default function PricingCategoryFilter({ categories = [], active = [], onToggle, onClear }) {
    if (!categories.length) return null;

    return (
        <div className="pricing-filterbar" role="group" aria-label="Filter services by category">
            <button
                type="button"
                className={`pricing-chip${active.length === 0 ? ' pricing-chip--active' : ''}`}
                onClick={onClear}
                aria-pressed={active.length === 0}
            >
                All
            </button>
            {categories.map((c) => {
                const isActive = active.includes(c.slug);
                return (
                    <button
                        type="button"
                        key={c.slug}
                        className={`pricing-chip${isActive ? ' pricing-chip--active' : ''}`}
                        aria-pressed={isActive}
                        onClick={() => onToggle(c.slug)}
                    >
                        {c.name}
                        <span className="pricing-chip__count">{c.count}</span>
                    </button>
                );
            })}
        </div>
    );
}
