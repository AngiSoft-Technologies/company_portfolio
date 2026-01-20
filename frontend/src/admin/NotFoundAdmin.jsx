import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundAdmin = ({ theme }) => {
  const navigate = useNavigate();
  return (
    <div className={`admin-page-container flex flex-col items-center justify-center min-h-[60vh] ${theme}`}>
      <h1 className="admin-section-title">404 - Not Found</h1>
      <div className="admin-section-card mt-4">The admin page you are looking for does not exist.</div>
      <button
        onClick={() => navigate('/admin')}
        className="px-6 py-2 rounded bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:scale-105 transition-transform"
      >
        Go to Dashboard
      </button>
    </div>
  );
};

export default NotFoundAdmin; 