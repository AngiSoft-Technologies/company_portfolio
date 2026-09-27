// @ts-nocheck
import React from 'react';
import GlassmorphismCard from '../modern/GlassmorphismCard';
import { VisualState } from '@angisoft/ui';

const ServicesEmptyState = ({ onClear }) => (
    <GlassmorphismCard className="p-10 text-center" blur={18}>
        <VisualState variant="unavailable" onRetry={onClear} />
    </GlassmorphismCard>
);

export default ServicesEmptyState;
