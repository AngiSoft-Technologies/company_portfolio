import React from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

const ConfirmDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    type = 'warning', // warning, danger, info
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    theme = 'light'
}) => {
    if (!isOpen) return null;

    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    const typeStyles = {
        warning: {
            icon: <FaExclamationTriangle className="text-yellow-500" />,
            button: 'bg-yellow-600 hover:bg-yellow-700'
        },
        danger: {
            icon: <FaExclamationTriangle className="text-red-500" />,
            button: 'bg-red-600 hover:bg-red-700'
        },
        info: {
            icon: <FaInfoCircle className="text-blue-500" />,
            button: 'bg-blue-600 hover:bg-blue-700'
        }
    };

    const styles = typeStyles[type] || typeStyles.warning;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${bgColor} rounded-lg p-6 max-w-md w-full mx-4 shadow-xl`}>
                <div className="flex items-start gap-4 mb-4">
                    <div className="text-3xl flex-shrink-0">
                        {styles.icon}
                    </div>
                    <div className="flex-1">
                        <h3 className={`text-xl font-bold ${textColor} mb-2`}>
                            {title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {message}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2 ${styles.button} text-white rounded-lg font-semibold`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;

