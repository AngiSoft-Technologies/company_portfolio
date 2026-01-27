import * as React from 'react';

const SkillCard = ({ image, name, theme }) => {
    const isDark = theme === 'dark';
    const bgColor = isDark ? 'bg-gray-800' : 'bg-white';

    return (
        <div className={`${bgColor} p-4 rounded-xl shadow-lg flex flex-col items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-xl min-w-[100px]`}>
            <img
                src={image}
                alt={name}
                className="w-12 h-12 md:w-14 md:h-14 object-contain"
                onError={(e) => {
                    e.target.style.display = 'none';
                }}
            />
            <p className={`text-xs md:text-sm font-medium text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {name}
            </p>
        </div>
    );
};

export default SkillCard;