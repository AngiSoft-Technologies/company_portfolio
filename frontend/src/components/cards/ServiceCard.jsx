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
            className={`container  rounded-lg shadow-lg transition-transform transform hover:scale-105 
                hover:shadow-xl cursor-pointer ${bgColor} ${textColor} flex-col justify-center items-center`}
            onClick={handleClick}
        >
            <div className="flex flex-col justify-center items-center gap-4 mb-4">
                <span className="text-4xl"><i class={icon}></i></span>
                <h3 className="text-xl font-semibold">{title}</h3>
            </div>
            <p className="text-sm">{description}</p>
            {slug && (
                <button className="mt-4 text-teal-600 dark:text-teal-400 hover:underline text-sm font-semibold">
                    Learn More →
                </button>
            )}
        </div>
    );
};

export default ServiceCard;