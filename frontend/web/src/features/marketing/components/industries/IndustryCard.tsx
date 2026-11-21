// @ts-nocheck
import { Link } from 'react-router-dom';
import { getIndustryRoute } from '@/lib/marketing/industries/industryHelpers';

/** Compact industry card used in the /industries index grid. */
export default function IndustryCard({ industry }) {
    if (!industry) return null;
    const Icon = industry.icon;
    const route = getIndustryRoute(industry.slug);

    return (
        <Link
            to={route}
            aria-label={`Explore ${industry.name}`}
            className="group block overflow-hidden rounded-(--radius-xl) border border-(--border) bg-(--card-bg) transition-all duration-(--duration-normal) ease-(--ease-standard) hover:-translate-y-1 hover:border-(--color-secondary)/50 hover:shadow-(--elevation-lg)"
        >
            <div
                className="relative flex aspect-[16/9] items-center justify-center overflow-hidden"
                style={{
                    backgroundImage: `linear-gradient(160deg, color-mix(in srgb, var(--bg-primary) 55%, transparent), color-mix(in srgb, var(--bg-primary) 78%, transparent)), url(${industry.bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {Icon && (
                    <Icon className="relative z-10 h-12 w-12 text-(--color-secondary) drop-shadow-lg transition-transform duration-500 group-hover:scale-110" />
                )}
            </div>
            <div className="p-5">
                <h3 className="text-lg font-bold text-(--text-primary) transition-colors group-hover:text-(--color-secondary)">
                    {industry.name}
                </h3>
                {industry.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-(--text-secondary)">
                        {industry.description}
                    </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-secondary)">
                    Explore solutions
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="transition-transform duration-(--duration-normal) group-hover:translate-x-1">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </div>
        </Link>
    );
}
