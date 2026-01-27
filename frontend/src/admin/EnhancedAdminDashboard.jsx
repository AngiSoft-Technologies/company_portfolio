import React, { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  FaCalendarAlt, 
  FaUsers, 
  FaProjectDiagram, 
  FaCogs, 
  FaChartLine, 
  FaArrowUp, 
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaPlus,
  FaEye,
  FaBriefcase,
  FaNewspaper,
  FaUserPlus,
  FaTasks
} from 'react-icons/fa';

const EnhancedAdminDashboard = () => {
  const navigate = useNavigate();
  const { colors, mode } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
    fetchStats();
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
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Bookings', 
      value: stats?.totalBookings || 0, 
      icon: FaCalendarAlt,
      link: '/admin/bookings',
      trend: '+12%',
      trendUp: true,
      color: colors.primary,
      bgColor: `${colors.primary}15`
    },
    { 
      title: 'Pending Reviews', 
      value: stats?.pendingBookings || 0, 
      icon: FaClock,
      link: '/admin/bookings?status=SUBMITTED',
      trend: stats?.pendingBookings > 0 ? 'Needs Attention' : 'All Clear',
      trendUp: false,
      urgent: stats?.pendingBookings > 0,
      color: '#F59E0B',
      bgColor: '#F59E0B15'
    },
    { 
      title: 'Active Services', 
      value: stats?.totalServices || 0, 
      icon: FaCogs,
      link: '/admin/services',
      color: colors.success,
      bgColor: `${colors.success}15`
    },
    { 
      title: 'Projects', 
      value: stats?.totalProjects || 0, 
      icon: FaProjectDiagram,
      link: '/admin/projects',
      color: '#8B5CF6',
      bgColor: '#8B5CF615'
    },
    { 
      title: 'Team Members', 
      value: stats?.totalStaff || 0, 
      icon: FaUsers,
      link: '/admin/staff',
      color: '#EC4899',
      bgColor: '#EC489915'
    },
    { 
      title: 'Total Clients', 
      value: stats?.totalClients || 0, 
      icon: FaUserPlus,
      link: '/admin/clients',
      color: '#06B6D4',
      bgColor: '#06B6D415'
    }
  ];

  const quickActions = [
    { label: 'New Service', icon: FaPlus, link: '/admin/services', color: colors.primary },
    { label: 'New Project', icon: FaProjectDiagram, link: '/admin/projects', color: '#8B5CF6' },
    { label: 'Add Staff', icon: FaUserPlus, link: '/admin/staff', color: '#EC4899' },
    { label: 'Write Post', icon: FaNewspaper, link: '/admin/blog', color: '#F59E0B' },
  ];

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div className="flex flex-col items-center gap-4">
          <div 
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          />
          <p style={{ color: colors.textSecondary }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-6 lg:p-8"
      style={{ backgroundColor: colors.backgroundSecondary }}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 
              className="text-2xl lg:text-3xl font-bold mb-1"
              style={{ color: colors.text }}
            >
              {greeting}, Admin 👋
            </h1>
            <p style={{ color: colors.textSecondary }}>
              Here's what's happening with your business today.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
              style={{ 
                backgroundColor: colors.surface,
                color: colors.text,
                border: `1px solid ${colors.border}`
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            
            <button
              onClick={() => navigate('/admin/bookings')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center gap-2"
              style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark || colors.primary} 100%)` }}
            >
              <FaEye />
              View Bookings
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            onClick={() => navigate(stat.link)}
            className="p-5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            style={{ 
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon size={22} style={{ color: stat.color }} />
              </div>
              {stat.trend && (
                <span 
                  className="text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1"
                  style={{ 
                    backgroundColor: stat.urgent ? '#FEF3C7' : stat.trendUp ? '#D1FAE5' : colors.backgroundTertiary || colors.backgroundSecondary,
                    color: stat.urgent ? '#D97706' : stat.trendUp ? '#059669' : colors.textSecondary
                  }}
                >
                  {stat.trendUp && <FaArrowUp size={10} />}
                  {stat.trend}
                </span>
              )}
            </div>
            <p 
              className="text-2xl font-bold mb-1"
              style={{ color: colors.text }}
            >
              {stat.value}
            </p>
            <p 
              className="text-sm"
              style={{ color: colors.textSecondary }}
            >
              {stat.title}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings - Takes 2 columns */}
        <div 
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ 
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: colors.text }}
            >
              <FaBriefcase style={{ color: colors.primary }} />
              Recent Bookings
            </h2>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="text-sm font-medium hover:underline"
              style={{ color: colors.primary }}
            >
              View All →
            </button>
          </div>
          
          {stats?.recentBookings && stats.recentBookings.length > 0 ? (
            <div className="space-y-3">
              {stats.recentBookings.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                  className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md"
                  style={{ 
                    backgroundColor: colors.backgroundSecondary,
                    border: `1px solid ${colors.borderLight || colors.border}`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p 
                        className="font-semibold truncate mb-1"
                        style={{ color: colors.text }}
                      >
                        {booking.title}
                      </p>
                      <div className="flex items-center gap-3 text-sm">
                        <span style={{ color: colors.textSecondary }}>
                          {booking.client?.name || 'Unknown Client'}
                        </span>
                        <span style={{ color: colors.textMuted || colors.textSecondary }}>•</span>
                        <span style={{ color: colors.textMuted || colors.textSecondary }}>
                          {new Date(booking.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <span 
                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-white ml-4 whitespace-nowrap"
                      style={{ 
                        backgroundColor: 
                          booking.status === 'SUBMITTED' ? '#F59E0B' :
                          booking.status === 'ACCEPTED' ? '#10B981' :
                          booking.status === 'IN_PROGRESS' ? colors.primary :
                          booking.status === 'COMPLETED' ? '#059669' :
                          booking.status === 'REJECTED' ? '#EF4444' : '#6B7280'
                      }}
                    >
                      {booking.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="py-12 text-center rounded-xl"
              style={{ backgroundColor: colors.backgroundSecondary }}
            >
              <FaCalendarAlt size={32} style={{ color: colors.textMuted || colors.textSecondary }} className="mx-auto mb-3" />
              <p style={{ color: colors.textSecondary }}>No recent bookings</p>
            </div>
          )}
        </div>

        {/* Quick Actions & Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div 
            className="rounded-2xl p-6"
            style={{ 
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`
            }}
          >
            <h2 
              className="text-lg font-bold mb-4 flex items-center gap-2"
              style={{ color: colors.text }}
            >
              <FaTasks style={{ color: colors.primary }} />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.link)}
                  className="p-4 rounded-xl text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ 
                    backgroundColor: colors.backgroundSecondary,
                    border: `1px solid ${colors.borderLight || colors.border}`
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <action.icon size={18} style={{ color: action.color }} />
                  </div>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: colors.text }}
                  >
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div 
            className="rounded-2xl p-6"
            style={{ 
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`
            }}
          >
            <h2 
              className="text-lg font-bold mb-4 flex items-center gap-2"
              style={{ color: colors.text }}
            >
              <FaChartLine style={{ color: colors.primary }} />
              System Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span style={{ color: colors.textSecondary }}>Database</span>
                </div>
                <span className="text-sm font-medium text-green-600">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span style={{ color: colors.textSecondary }}>API Server</span>
                </div>
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span style={{ color: colors.textSecondary }}>Storage</span>
                </div>
                <span className="text-sm font-medium text-green-600">Available</span>
              </div>
            </div>
          </div>

          {/* Pending Tasks */}
          <div 
            className="rounded-2xl p-6"
            style={{ 
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark || colors.primary} 100%)`
            }}
          >
            <h2 className="text-lg font-bold mb-3 text-white flex items-center gap-2">
              <FaExclamationCircle />
              Pending Tasks
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white/90">
                <span>Bookings to review</span>
                <span className="font-bold">{stats?.pendingBookings || 0}</span>
              </div>
              <div className="flex items-center justify-between text-white/90">
                <span>Draft services</span>
                <span className="font-bold">{stats?.draftServices || 0}</span>
              </div>
              <div className="flex items-center justify-between text-white/90">
                <span>Unpublished projects</span>
                <span className="font-bold">{stats?.draftProjects || 0}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/bookings?status=SUBMITTED')}
              className="w-full mt-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-all"
            >
              Review Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;

