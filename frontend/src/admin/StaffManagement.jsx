import React, { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../js/httpClient';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../utils/toast';

const StaffManagement = ({ theme }) => {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'DEVELOPER',
        bio: '',
        avatarUrl: ''
    });
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const data = await apiGet('/admin/employees', token);
            setEmployees(data || []);
            setFilteredEmployees(data || []);
        } catch (err) {
            setError(err.message);
            toast.error('Failed to load staff: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Search filter
    useEffect(() => {
        if (!searchQuery) {
            setFilteredEmployees(employees);
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = employees.filter(emp =>
            emp.firstName?.toLowerCase().includes(query) ||
            emp.lastName?.toLowerCase().includes(query) ||
            emp.email?.toLowerCase().includes(query) ||
            emp.role?.toLowerCase().includes(query)
        );
        setFilteredEmployees(filtered);
    }, [searchQuery, employees]);

    const handleEdit = (employee) => {
        setSelectedEmployee(employee);
        setFormData({
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            email: employee.email || '',
            phone: employee.phone || '',
            role: employee.role || 'DEVELOPER',
            bio: employee.bio || '',
            avatarUrl: employee.avatarUrl || ''
        });
        setEditing(true);
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            await apiPut(`/admin/employees/${selectedEmployee.id}`, formData, token);
            toast.success('Employee updated successfully!');
            setEditing(false);
            setSelectedEmployee(null);
            fetchEmployees();
        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    const handleSaveClick = () => {
        setPendingAction(() => handleSave);
        setShowConfirm(true);
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('ownerType', 'employee');
            formData.append('ownerId', selectedEmployee.id);
            formData.append('category', 'avatar');

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/admin/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            setFormData(prev => ({ ...prev, avatarUrl: data.url }));
            toast.success('Avatar uploaded successfully!');
        } catch (err) {
            toast.error('Error uploading: ' + err.message);
        } finally {
            setUploading(false);
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

    return (
        <div className={`p-8 ${bgColor} min-h-screen`}>
            <h1 className="text-4xl font-bold mb-8 ${textColor}">Staff Management</h1>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* Search Bar */}
            <div className="mb-6">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search staff by name, email, or role..."
                    className="max-w-md"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Employee List */}
                <div>
                    <h2 className="text-2xl font-bold mb-4 ${textColor}">
                        All Staff Members ({filteredEmployees.length})
                    </h2>
                    <div className="space-y-4">
                        {filteredEmployees.length === 0 ? (
                            <div className={`${cardBg} rounded-lg p-8 text-center`}>
                                <p className="text-gray-500">No staff members found</p>
                            </div>
                        ) : (
                            filteredEmployees.map((emp) => (
                            <div
                                key={emp.id}
                                className={`${cardBg} rounded-lg p-4 cursor-pointer hover:shadow-lg`}
                                onClick={() => handleEdit(emp)}
                            >
                                <div className="flex items-center gap-4">
                                    {emp.avatarUrl ? (
                                        <img
                                            src={emp.avatarUrl}
                                            alt={`${emp.firstName} ${emp.lastName}`}
                                            className="w-16 h-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-xl font-bold">
                                            {emp.firstName[0]}{emp.lastName[0]}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-bold ${textColor}">
                                            {emp.firstName} {emp.lastName}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{emp.email}</p>
                                        <p className="text-xs text-gray-500 capitalize">{emp.role.toLowerCase()}</p>
                                    </div>
                                </div>
                            </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Edit Form */}
                {editing && selectedEmployee && (
                    <div className={`${cardBg} rounded-lg p-6`}>
                        <h2 className="text-2xl font-bold mb-4 ${textColor}">Edit Staff Member</h2>
                        <div className="space-y-4">
                            {/* Avatar Upload */}
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
                                            {uploading ? 'Uploading...' : 'Upload Avatar'}
                                        </label>
                                    </div>
                                </div>
                            </div>

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

                            <div>
                                <label className="block mb-2 font-semibold">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-2 border rounded"
                                />
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
                                <label className="block mb-2 font-semibold">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="DEVELOPER">Developer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block mb-2 font-semibold">Bio</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    rows={4}
                                    placeholder="Staff member bio..."
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleSaveClick}
                                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setSelectedEmployee(null);
                                    }}
                                    className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={showConfirm}
                onClose={() => {
                    setShowConfirm(false);
                    setPendingAction(null);
                }}
                onConfirm={() => {
                    if (pendingAction) pendingAction();
                }}
                title="Confirm Changes"
                message="Are you sure you want to save these changes?"
                type="info"
                theme={theme}
            />
        </div>
    );
};

export default StaffManagement;

