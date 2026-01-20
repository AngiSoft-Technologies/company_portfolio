import * as React from 'react';

const Container = ({ theme, children }) => {
    return (
        <div
            className={`${
                theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            } rounded-md shadow-md container justify-center items-center flex flex-col space-y-4 transition-transform transform hover:scale-101 hover:shadow-xl`} 
        >
            {children}
        </div>
    );
};

export default Container;