import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const SectionBadge = ({ icon: Icon, text }) => {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';

    return (
        <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{
                background: isDark 
                    ? `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`
                    : `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10)`,
                border: `1px solid ${isDark ? colors.primary + '30' : colors.primary + '20'}`,
                color: colors.primary
            }}
        >
            {Icon && <Icon className="text-base" />}
            <span>{text}</span>
        </div>
    );
};

export default SectionBadge;
