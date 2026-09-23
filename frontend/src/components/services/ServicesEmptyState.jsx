// Empty state when search/category filters return no services.
import React from 'react';
import { FaSearch } from 'react-icons/fa';
import GlassmorphismCard from '../modern/GlassmorphismCard';

const ServicesEmptyState = ({ onClear }) => (
    <GlassmorphismCard className="p-10 text-center" blur={18}>
        <div
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-2xl"
            style={{ background: 'rgba(0,175,255,0.12)', color: '#18D8FF' }}
        >
            <FaSearch />
        </div>
        <h3 className="text-xl font-semibold" style={{ color: '#F5F7FA' }}>
            No services match your filters
        </h3>
        <p className="mt-2 text-sm" style={{ color: '#94A3B8' }}>
            Try a different category or clear your search to see everything we offer.
        </p>
        {onClear && (
            <button
                type="button"
                onClick={onClear}
                className="mt-5 rounded-full px-5 py-2 text-sm font-semibold transition"
                style={{ background: 'linear-gradient(120deg,#0875FF,#00AFFF)', color: '#fff' }}
            >
                Clear filters
            </button>
        )}
    </GlassmorphismCard>
);

export default ServicesEmptyState;
