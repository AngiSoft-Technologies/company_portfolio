import * as React from 'react';
import { useNavigate } from 'react-router-dom';

const ProjectCard = ({ image, title, description, id, theme}) => {
    const navigate = useNavigate();

    const handleReadMore = () => {
        navigate(`/project/${id}`, { state: { image, title, description } });
    };

    const isDark = theme === 'dark';
    const bgColor = isDark ? 'bg-gray-800' : 'bg-white';

    return (
        <div 
            className={`rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${bgColor} cursor-pointer group`}
            onClick={handleReadMore}
        >
            {/* Image Section */}
            <div className="relative overflow-hidden h-52">
                <img 
                    src={image} 
                    alt={title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    onError={(e) => {
                        e.target.src = '/images/project-placeholder.png';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Content Section */}
            <div className="p-5">
                <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white line-clamp-1">
                    {title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {description}
                </p>
                <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-semibold text-sm group-hover:gap-2 transition-all">
                    View Details
                    <i className="fas fa-arrow-right"></i>
                </span>
            </div>
        </div>
    );
};

export default ProjectCard;