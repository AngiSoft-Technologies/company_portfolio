import React, { useState } from 'react';
import { apiPost } from '../js/httpClient';
import { FaMoon, FaSun } from 'react-icons/fa';

const AdminLogin = ({ theme = 'light', toggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Use email instead of username for backend auth
      const data = await apiPost('/auth/login', { email: username, password });
      if (data.accessToken) {
        localStorage.setItem('adminToken', data.accessToken);
        window.location.href = '/admin';
      } else {
        setError('Login failed: No token received');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetMsg('');
    setError('');
    setLoading(true);
    try {
      await apiPost('/auth/forgot', { email: resetEmail });
      setResetMsg('If this email exists, a reset link will be sent.');
    } catch (err) {
      // Don't show error - security best practice (don't reveal if email exists)
      setResetMsg('If this email exists, a reset link will be sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="absolute top-4 right-4">
        <button
          className="text-3xl focus:outline-none hover:text-yellow-500 transition-colors"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>
      </div>
      <div className={`admin-login-card ${theme === 'dark' ? 'dark' : ''}`}> 
        <h2 className="text-4xl font-extrabold mb-10 text-center tracking-tight">Admin Login</h2>
        {showReset ? (
          <form onSubmit={handleReset} className="admin-login-form animate-fade-in">
            <input
              type="email"
              placeholder="Enter your admin email"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              className="admin-login-input"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="admin-login-btn"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button
              type="button"
              className="admin-login-btn bg-gray-400 hover:bg-gray-500"
              onClick={() => { setShowReset(false); setResetMsg(''); setError(''); }}
            >Back to Login</button>
            {resetMsg && <div className="mt-4 text-green-500 text-center text-lg">{resetMsg}</div>}
            {error && <div className="mt-4 text-red-500 text-center text-lg">{error}</div>}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="admin-login-form animate-fade-in">
            <input
              type="email"
              placeholder="Email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="admin-login-input"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="admin-login-input"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="admin-login-btn"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <div className="flex justify-between items-center mt-2">
              <button
                type="button"
                className="admin-login-link"
                onClick={() => { setShowReset(true); setResetMsg(''); setError(''); }}
              >
                Forgot password?
              </button>
            </div>
            {error && <div className="mt-4 text-red-500 text-center text-lg">{error}</div>}
          </form>
        )}
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.8s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
};

export default AdminLogin; 