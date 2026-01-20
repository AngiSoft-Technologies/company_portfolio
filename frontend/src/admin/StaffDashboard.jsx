import React, { useEffect, useState } from 'react';
import { apiGet, apiPut, apiPost } from '../js/httpClient';
import { useNavigate } from 'react-router-dom';

const StaffDashboard = ({ theme }) => {
    const navigate = useNavigate();
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
    const [myServices, setMyServices] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [uploading, setUploading] = useState(false);

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
            alert('Profile updated successfully!');
            setEditing(false);
            fetchProfile();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('New passwords do not match!');
            return;
        }

        try {
            const token = localStorage.getItem('adminToken');
            await apiPost('/staff-dashboard/profile/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, token);
            alert('Password changed successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/staff-dashboard/profile/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            setFormData(prev => ({ ...prev, avatarUrl: data.url }));
            alert('Avatar uploaded successfully!');
        } catch (err) {
            alert('Error uploading: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const cardBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

    if (loading) {
        return <div className={`p-8 ${bgColor} min-h-screen`}><p>Loading...</p></div>;
    }

    return (
        <div className={`p-8 ${bgColor} min-h-screen`}>
            <h1 className="text-4xl font-bold mb-8 ${textColor}">My Dashboard</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Profile Card */}
                    <div className={`${cardBg} rounded-lg p-6`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold ${textColor}">My Profile</h2>
                            <button
                                onClick={() => setEditing(!editing)}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                {editing ? 'Cancel' : 'Edit Profile'}
                            </button>
                        </div>

                        {editing ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-2 font-semibold">Profile Picture</label>
                                    <div className="flex items-center gap-4">
                                        {formData.avatarUrl ? (
                                            <img
                                                src={formData.avatarUrl}
                                                alt="Avatar"
                                                className="w-24 h-24 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                                                No Image
                                            </div>
                                        )}
                                        <div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                disabled={uploading}
                                                className="hidden"
                                                id="avatar-upload"
                                            />
                                            <label
                                                htmlFor="avatar-upload"
                                                className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700"
                                            >
                                                {uploading ? 'Uploading...' : 'Upload'}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block mb-2 font-semibold">First Name</label>
                                        <input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full p-2 border rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-semibold">Last Name</label>
                                        <input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className="w-full p-2 border rounded"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 font-semibold">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-semibold">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full p-2 border rounded"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-semibold">Bio</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        rows={4}
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>

                                <button
                                    onClick={handleSaveProfile}
                                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-4 mb-4">
                                    {profile?.avatarUrl ? (
                                        <img
                                            src={profile.avatarUrl}
                                            alt={`${profile.firstName} ${profile.lastName}`}
                                            className="w-24 h-24 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-2xl font-bold">
                                            {profile?.firstName[0]}{profile?.lastName[0]}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-2xl font-bold ${textColor}">
                                            {profile?.firstName} {profile?.lastName}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400">{profile?.email}</p>
                                        <p className="text-sm text-gray-500 capitalize">{profile?.role?.toLowerCase()}</p>
                                    </div>
                                </div>
                                {profile?.bio && (
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{profile.bio}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Change Password */}
                    <div className={`${cardBg} rounded-lg p-6`}>
                        <h2 className="text-2xl font-bold mb-4 ${textColor}">Change Password</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-2 font-semibold">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block mb-2 font-semibold">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block mb-2 font-semibold">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <button
                                onClick={handleChangePassword}
                                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Sidebar */}
                <div className="space-y-6">
                    <div className={`${cardBg} rounded-lg p-6`}>
                        <h3 className="text-xl font-bold mb-4 ${textColor}">My Content</h3>
                        <div className="space-y-4">
                            <div onClick={() => navigate('/admin/services')} className="cursor-pointer p-4 bg-blue-600 rounded hover:bg-blue-700">
                                <p className="text-2xl font-bold text-white">{myServices.length}</p>
                                <p className="text-white">My Services</p>
                            </div>
                            <div onClick={() => navigate('/admin/projects')} className="cursor-pointer p-4 bg-purple-600 rounded hover:bg-purple-700">
                                <p className="text-2xl font-bold text-white">{myProjects.length}</p>
                                <p className="text-white">My Projects</p>
                            </div>
                            <div onClick={() => navigate('/admin/bookings')} className="cursor-pointer p-4 bg-green-600 rounded hover:bg-green-700">
                                <p className="text-2xl font-bold text-white">{myBookings.length}</p>
                                <p className="text-white">Assigned Bookings</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;

