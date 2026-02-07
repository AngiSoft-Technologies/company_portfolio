import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiPost } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../utils/constants';
import { 
    FaUser, FaEnvelope, FaPhone, FaEdit, FaSave, FaTimes,
    FaCamera, FaBriefcase, FaProjectDiagram, FaCalendarCheck,
    FaLock, FaKey, FaEye, FaEyeSlash, FaCheck, FaClock,
    FaStar, FaChartLine
} from 'react-icons/fa';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { colors, mode } = useTheme();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        bio: '',
        avatarUrl: '',
        username: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [myServices, setMyServices] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchProfile();
        fetchMyContent();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const data = await apiGet('/staff-dashboard/profile', token);
            setProfile(data);
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                phone: data.phone || '',
                bio: data.bio || '',
                avatarUrl: data.avatarUrl || '',
                username: data.username || ''
            });
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyContent = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const [services, projects, bookings] = await Promise.all([
                apiGet('/staff-dashboard/services', token).catch(() => []),
                apiGet('/staff-dashboard/projects', token).catch(() => []),
                apiGet('/staff-dashboard/bookings', token).catch(() => [])
            ]);
            setMyServices(services || []);
            setMyProjects(projects || []);
            setMyBookings(bookings || []);
        } catch (err) {
            console.error('Error fetching content:', err);
        }
    };

    const handleSaveProfile = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            await apiPut('/staff-dashboard/profile', formData, token);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setEditing(false);
            fetchProfile();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error: ' + err.message });
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match!' });
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            await apiPost('/staff-dashboard/profile/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, token);
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordForm(false);
        } catch (err) {
            setMessage({ type: 'error', text: 'Error: ' + err.message });
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const formDataUpload = new FormData();
            formDataUpload.append('avatar', file);

            const response = await fetch(`${API_BASE_URL}/staff-dashboard/profile/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            });

            const data = await response.json();
            setFormData(prev => ({ ...prev, avatarUrl: data.url }));
            setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Error uploading: ' + err.message });
        } finally {
            setUploading(false);
        }
    };

    const stats = [
        { label: 'Services', value: myServices.length, icon: FaBriefcase, color: colors.primary },
        { label: 'Projects', value: myProjects.length, icon: FaProjectDiagram, color: '#8B5CF6' },
        { label: 'Bookings', value: myBookings.length, icon: FaCalendarCheck, color: '#10B981' },
        { label: 'Rating', value: '4.9', icon: FaStar, color: '#F59E0B' }
    ];

    if (loading) {
        return (
            <div 
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: colors.backgroundSecondary }}
            >
                <div 
                    className="w-12 h-12 border-4 rounded-full animate-spin"
                    style={{ borderColor: `${colors.primary}30`, borderTopColor: colors.primary }}
                />
            </div>
        );
    }

    return (
        <div style={{ color: colors.text }}>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold mb-1">My Dashboard</h1>
                <p style={{ color: colors.textSecondary }}>Manage your profile and view your activity</p>
            </div>

            {/* Message */}
            {message.text && (
                <div 
                    className="mb-6 p-4 rounded-xl flex items-center justify-between"
                    style={{
                        backgroundColor: message.type === 'success' ? `${colors.success || '#10B981'}20` : 'rgba(239,68,68,0.1)',
                        color: message.type === 'success' ? (colors.success || '#10B981') : '#EF4444'
                    }}
                >
                    <span>{message.text}</span>
                    <button onClick={() => setMessage({ type: '', text: '' })}>
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, idx) => (
                    <div 
                        key={idx}
                        className="p-5 rounded-2xl"
                        style={{ 
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`
                        }}
                    >
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                            style={{ backgroundColor: `${stat.color}15` }}
                        >
                            <stat.icon size={18} style={{ color: stat.color }} />
                        </div>
                        <p className="text-2xl font-bold" style={{ color: colors.text }}>{stat.value}</p>
                        <p className="text-sm" style={{ color: colors.textSecondary }}>{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div 
                    className="lg:col-span-2 rounded-2xl p-6"
                    style={{ 
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <FaUser style={{ color: colors.primary }} />
                            My Profile
                        </h2>
                        <button
                            onClick={() => editing ? handleSaveProfile() : setEditing(true)}
                            className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
                            style={{
                                backgroundColor: editing ? colors.primary : colors.backgroundSecondary,
                                color: editing ? 'white' : colors.text
                            }}
                        >
                            {editing ? <><FaSave /> Save</> : <><FaEdit /> Edit</>}
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar */}
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                {formData.avatarUrl ? (
                                    <img
                                        src={formData.avatarUrl}
                                        alt="Avatar"
                                        className="w-32 h-32 rounded-2xl object-cover"
                                        style={{ border: `3px solid ${colors.primary}` }}
                                    />
                                ) : (
                                    <div 
                                        className="w-32 h-32 rounded-2xl flex items-center justify-center text-4xl font-bold text-white"
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})` }}
                                    >
                                        {(formData.firstName?.charAt(0) || '') + (formData.lastName?.charAt(0) || '')}
                                    </div>
                                )}
                                {editing && (
                                    <label className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-white" style={{ backgroundColor: colors.primary }}>
                                        <FaCamera />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                    </label>
                                )}
                            </div>
                            {uploading && <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>Uploading...</p>}
                        </div>

                        {/* Form Fields */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    disabled={!editing}
                                    className="w-full px-4 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: editing ? colors.backgroundSecondary : colors.background,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    disabled={!editing}
                                    className="w-full px-4 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: editing ? colors.backgroundSecondary : colors.background,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    disabled={!editing}
                                    className="w-full px-4 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: editing ? colors.backgroundSecondary : colors.background,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    disabled={!editing}
                                    className="w-full px-4 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: editing ? colors.backgroundSecondary : colors.background,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                    Bio
                                </label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    disabled={!editing}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl resize-none"
                                    style={{
                                        backgroundColor: editing ? colors.backgroundSecondary : colors.background,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Card */}
                <div 
                    className="rounded-2xl p-6"
                    style={{ 
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`
                    }}
                >
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <FaLock style={{ color: colors.primary }} />
                        Security
                    </h2>

                    {!showPasswordForm ? (
                        <button
                            onClick={() => setShowPasswordForm(true)}
                            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                            style={{
                                backgroundColor: colors.backgroundSecondary,
                                color: colors.text,
                                border: `1px solid ${colors.border}`
                            }}
                        >
                            <FaKey /> Change Password
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    placeholder="Current Password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl pr-12"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2"
                                    style={{ color: colors.textSecondary }}
                                >
                                    {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    placeholder="New Password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl pr-12"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2"
                                    style={{ color: colors.textSecondary }}
                                >
                                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl"
                                style={{
                                    backgroundColor: colors.backgroundSecondary,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`
                                }}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleChangePassword}
                                    className="flex-1 py-3 rounded-xl font-medium text-white"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    Update
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPasswordForm(false);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="px-4 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Activity Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* My Services */}
                <div 
                    className="rounded-2xl p-6"
                    style={{ 
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`
                    }}
                >
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <FaBriefcase style={{ color: colors.primary }} />
                        My Services
                    </h3>
                    {myServices.length === 0 ? (
                        <p style={{ color: colors.textSecondary }}>No services assigned yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {myServices.slice(0, 5).map((service, idx) => (
                                <div 
                                    key={idx}
                                    className="p-3 rounded-xl"
                                    style={{ backgroundColor: colors.backgroundSecondary }}
                                >
                                    <p className="font-medium">{service.name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* My Projects */}
                <div 
                    className="rounded-2xl p-6"
                    style={{ 
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`
                    }}
                >
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <FaProjectDiagram style={{ color: '#8B5CF6' }} />
                        My Projects
                    </h3>
                    {myProjects.length === 0 ? (
                        <p style={{ color: colors.textSecondary }}>No projects assigned yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {myProjects.slice(0, 5).map((project, idx) => (
                                <div 
                                    key={idx}
                                    className="p-3 rounded-xl"
                                    style={{ backgroundColor: colors.backgroundSecondary }}
                                >
                                    <p className="font-medium">{project.title}</p>
                                    <p className="text-sm" style={{ color: colors.textSecondary }}>
                                        {project.status || 'In Progress'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* My Bookings */}
                <div 
                    className="rounded-2xl p-6"
                    style={{ 
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`
                    }}
                >
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <FaCalendarCheck style={{ color: '#10B981' }} />
                        My Bookings
                    </h3>
                    {myBookings.length === 0 ? (
                        <p style={{ color: colors.textSecondary }}>No bookings assigned yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {myBookings.slice(0, 5).map((booking, idx) => (
                                <div 
                                    key={idx}
                                    className="p-3 rounded-xl"
                                    style={{ backgroundColor: colors.backgroundSecondary }}
                                >
                                    <p className="font-medium">{booking.title}</p>
                                    <div className="flex items-center gap-2 text-sm mt-1">
                                        <FaClock size={12} style={{ color: colors.textSecondary }} />
                                        <span style={{ color: colors.textSecondary }}>
                                            {new Date(booking.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;

