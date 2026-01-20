import React, { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from '../utils/toast';

const EnhancedAdminDashboard = ({ theme }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, all

    useEffect(() => {
        fetchStats();
        // Refresh stats every 5 minutes
        const interval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [timeRange]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const data = await apiGet('/admin/dashboard/stats', token);
            setStats(data);
        } catch (err) {
            setError(err.message);
            toast.error('Failed to load dashboard statistics');
        } finally {
            setLoading(false);
        }
    };

    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const cardBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    if (loading) {
        return (
            <div className={`p-8 ${bgColor} min-h-screen flex items-center justify-center`}>
                <LoadingSpinner size="xl" />
            </div>
        );
    }

    const statCards = [
        { 
            title: 'Total Bookings', 
            value: stats?.totalBookings || 0, 
            color: 'bg-blue-500', 
            icon: '📋', 
            link: '/admin/bookings',
            trend: '+12%'
        },
        { 
            title: 'Pending Reviews', 
            value: stats?.pendingBookings || 0, 
            color: 'bg-yellow-500', 
            icon: '⏳', 
            link: '/admin/bookings?status=SUBMITTED',
            trend: stats?.pendingBookings > 0 ? 'Action Required' : 'All Clear'
        },
        { 
            title: 'Published Services', 
            value: stats?.totalServices || 0, 
            color: 'bg-green-500', 
            icon: '🛠️', 
            link: '/admin/services'
        },
        { 
            title: 'Published Projects', 
            value: stats?.totalProjects || 0, 
            color: 'bg-purple-500', 
            icon: '💼', 
            link: '/admin/projects'
        },
        { 
            title: 'Team Members', 
            value: stats?.totalStaff || 0, 
            color: 'bg-indigo-500', 
            icon: '👥', 
            link: '/admin/staff'
        },
        { 
            title: 'Total Clients', 
            value: stats?.totalClients || 0, 
            color: 'bg-pink-500', 
            icon: '👤', 
            link: '/admin/clients'
        }
    ];

    return (
        <div className={`p-8 ${bgColor} min-h-screen`}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold ${textColor}">Admin Dashboard</h1>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-4 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                </select>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {statCards.map((stat, idx) => (
                    <div
                        key={idx}
                        onClick={() => navigate(stat.link)}
                        className={`${cardBg} rounded-lg p-6 cursor-pointer transform transition-all hover:scale-105 hover:shadow-lg`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.color} w-16 h-16 rounded-full flex items-center justify-center text-3xl`}>
                                {stat.icon}
                            </div>
                            {stat.trend && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                    stat.trend.includes('+') ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                    stat.trend.includes('Action') ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    {stat.trend}
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{stat.title}</p>
                            <p className={`text-3xl font-bold ${textColor}`}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Bookings */}
            {stats?.recentBookings && stats.recentBookings.length > 0 && (
                <div className={`${cardBg} rounded-lg p-6 mb-8`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold ${textColor}">Recent Bookings</h2>
                        <button
                            onClick={() => navigate('/admin/bookings')}
                            className="text-teal-600 dark:text-teal-400 hover:underline"
                        >
                            View All →
                        </button>
                    </div>
                    <div className="space-y-4">
                        {stats.recentBookings.map((booking) => (
                            <div
                                key={booking.id}
                                onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                                className="p-4 bg-gray-600 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="font-semibold text-white mb-1">{booking.title}</p>
                                        <p className="text-sm text-gray-300">
                                            {booking.client?.name} • {booking.client?.email}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(booking.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <div className="text-right ml-4">
                                        <span className={`px-3 py-1 rounded-full text-sm text-white ${
                                            booking.status === 'SUBMITTED' ? 'bg-yellow-500' :
                                            booking.status === 'ACCEPTED' ? 'bg-green-500' :
                                            booking.status === 'REJECTED' ? 'bg-red-500' : 'bg-gray-500'
                                        }`}>
                                            {booking.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className={`${cardBg} rounded-lg p-6`}>
                <h2 className="text-2xl font-bold mb-4 ${textColor}">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => navigate('/admin/services')}
                        className="p-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <span>🛠️</span>
                        <span>Manage Services</span>
                    </button>
                    <button
                        onClick={() => navigate('/admin/projects')}
                        className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <span>💼</span>
                        <span>Manage Projects</span>
                    </button>
                    <button
                        onClick={() => navigate('/admin/staff')}
                        className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <span>👥</span>
                        <span>Manage Staff</span>
                    </button>
                    <button
                        onClick={() => navigate('/admin/bookings')}
                        className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <span>📋</span>
                        <span>Review Bookings</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnhancedAdminDashboard;

