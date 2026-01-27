import * as React from 'react';
import { useNavigate } from 'react-router-dom';

const ServiceCard = ({ icon, title, description, theme, onClick, slug }) => {
    const navigate = useNavigate();
    const isDark = theme === 'dark';
    const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
    const textColor = isDark ? 'text-white' : 'text-gray-900';

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (slug) {
            navigate(`/service/${slug}`);
        }
    };

    return (
        <div
            className={`p-6 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 
                hover:shadow-xl cursor-pointer ${bgColor} ${textColor}`}
            onClick={handleClick}
        >
            <div className="flex flex-col items-center text-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                    <i className={`${icon} text-2xl text-teal-600 dark:text-teal-400`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">{description}</p>
            {slug && (
                <div className="mt-4 text-center">
                    <span className="text-teal-600 dark:text-teal-400 hover:underline text-sm font-semibold">
                        Learn More →
                    </span>
                </div>
            )}
        </div>
    );
};

export default ServiceCard;