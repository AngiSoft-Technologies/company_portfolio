// @ts-nocheck
import React from 'react';
import GlassmorphismCard from '../modern/GlassmorphismCard';
import { VisualState } from '@angisoft/ui';

const ServicesErrorState = ({ onRetry }) => (
    <GlassmorphismCard className="p-10 text-center" blur={18}>
        <VisualState variant="error" onRetry={onRetry} />
    </GlassmorphismCard>
);

export default ServicesErrorState;
