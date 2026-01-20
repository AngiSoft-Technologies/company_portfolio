import * as React from 'react';
import { useNavigate } from 'react-router-dom';

const ProjectCard = ({ image, title, description, id, theme}) => {
    const navigate = useNavigate();

    const handleReadMore = () => {
        navigate(`/project/${id}`, { state: { image, title, description } });
    };

    const isDark = theme === 'dark';
    const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
    const textColor = isDark ? 'text-white' : 'text-gray-900';

    return (
        <div className={`container flex flex-col rounded-lg shadow-lg overflow-hidden transition-transform transform hover:scale-105 hover:shadow-xl ${bgColor}`}>
            {/* Image Section */}
            <div className="image-container">
                <img src={image} alt={title} className="w-full h-48 object-cover" />
            </div>

            {/* Content Section */}
            <div className="p-4">
                <h3 className={`text-lg font-semibold mb-2 ${textColor}`}>{title}</h3>
                <p className={`text-sm font-semibold mb-4 ${textColor}`}>{description}</p>
                <button
                    onClick={handleReadMore}
                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                >
                    Read More
                </button>
            </div>
        </div>
    );
};

export default ProjectCard;