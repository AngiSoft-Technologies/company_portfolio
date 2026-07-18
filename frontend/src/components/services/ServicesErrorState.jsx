// Error state when the services request fails.
import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import GlassmorphismCard from '../modern/GlassmorphismCard';

const ServicesErrorState = ({ message, onRetry }) => (
    <GlassmorphismCard className="p-10 text-center" blur={18}>
        <div
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-2xl"
            style={{ background: 'rgba(239,68,68,0.14)', color: '#EF4444' }}
        >
            <FaExclamationTriangle />
        </div>
        <h3 className="text-xl font-semibold" style={{ color: '#F5F7FA' }}>
            We couldn&apos;t load our services
        </h3>
        <p className="mt-2 text-sm" style={{ color: '#94A3B8' }}>
            {message || 'Something went wrong. Please try again.'}
        </p>
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="mt-5 rounded-full px-5 py-2 text-sm font-semibold transition"
                style={{ background: 'linear-gradient(120deg,#0875FF,#00AFFF)', color: '#fff' }}
            >
                Try again
            </button>
        )}
    </GlassmorphismCard>
);

export default ServicesErrorState;
