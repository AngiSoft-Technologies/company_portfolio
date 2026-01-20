import * as React from 'react';

const SkillCard = ({ image, name, theme }) => {
    const isDark = theme === 'dark';
    const bgColor = isDark ? 'bg-gray-900' : 'bg-gray-100';
    const textColor = isDark ? 'text-white' : 'text-gray-900';

    return (
        <div className="w-[33%] md:w-[16.66%] lg:w-[11.11%] max-w-[140px]">
            <div
                className={`skill relative overflow-hidden rounded-lg shadow-lg transition-transform transform hover:scale-105 ${bgColor} flex cursor-pointer`}
            >
                {/* Image */}
                <img
                    src={image}
                    alt={name}
                    className="skill-image w-full h-full"
                />

                {/* Name Overlay */}
                <div className="skill-data-container">
                    <div className="skill-data text-sm">
                        <p className={`skill-name ${textColor} text-sm`}>
                            {name}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillCard;