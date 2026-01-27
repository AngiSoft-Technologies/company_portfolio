import * as React from 'react';

const Container = ({ theme, children, className = '' }) => {
    return (
        <div
            className={`${
                theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            } rounded-2xl shadow-lg p-6 md:p-8 transition-all duration-300 hover:shadow-xl ${className}`} 
        >
            {children}
        </div>
    );
};

export default Container;