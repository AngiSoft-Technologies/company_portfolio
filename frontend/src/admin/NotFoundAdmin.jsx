import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { FaHome, FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';

const NotFoundAdmin = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();

    return (
        <div 
            className="min-h-[60vh] flex items-center justify-center p-6"
            style={{ color: colors.text }}
        >
            <div className="text-center">
                {/* 404 Icon */}
                <div 
                    className="w-24 h-24 mx-auto mb-8 rounded-2xl flex items-center justify-center"
                    style={{ 
                        background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primary}10)`
                    }}
                >
                    <FaExclamationTriangle 
                        className="text-4xl"
                        style={{ color: colors.primary }}
                    />
                </div>

                {/* 404 Text */}
                <h1 
                    className="text-7xl font-black mb-4"
                    style={{ 
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}
                >
                    404
                </h1>

                <h2 className="text-2xl font-bold mb-4">
                    Page Not Found
                </h2>

                <p 
                    className="max-w-md mx-auto mb-8"
                    style={{ color: colors.textSecondary }}
                >
                    The admin page you're looking for doesn't exist or has been moved.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                        style={{
                            backgroundColor: colors.backgroundSecondary,
                            color: colors.text,
                            border: `1px solid ${colors.border}`
                        }}
                    >
                        <FaArrowLeft /> Go Back
                    </button>
                    <button
                        onClick={() => navigate('/admin')}
                        className="px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
                        style={{ 
                            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`
                        }}
                    >
                        <FaHome /> Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFoundAdmin;
