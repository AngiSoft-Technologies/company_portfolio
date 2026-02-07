import React, { useEffect, useState } from 'react';
import { apiGet, apiPut, apiPost, apiDelete } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { 
    FaUser, FaEnvelope, FaPhone, FaEdit, FaSave, FaTimes,
    FaCamera, FaPlus, FaSearch, FaTrash, FaUserPlus,
    FaCheck, FaBriefcase, FaChevronDown
} from 'react-icons/fa';

const ROLES = ['ADMIN', 'MARKETING', 'DEVELOPER'];

const StaffManagement = () => {
    const { colors, mode } = useTheme();
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
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
    const [pendingDelete, setPendingDelete] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchEmployees();
    }, []);

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

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const data = await apiGet('/admin/employees', token);
            setEmployees(data || []);
            setFilteredEmployees(data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setSelectedEmployee(null);
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: 'DEVELOPER',
            bio: '',
            avatarUrl: ''
        });
        setShowModal(true);
    };

    const openEditModal = (employee) => {
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
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (selectedEmployee) {
                await apiPut(`/admin/employees/${selectedEmployee.id}`, formData, token);
                setMessage({ type: 'success', text: 'Employee updated successfully!' });
            } else {
                await apiPost('/admin/employees', formData, token);
                setMessage({ type: 'success', text: 'Employee added successfully!' });
            }
            setShowModal(false);
            fetchEmployees();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error: ' + err.message });
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            const token = localStorage.getItem('adminToken');
            await apiDelete(`/admin/employees/${pendingDelete}`, token);
            setMessage({ type: 'success', text: 'Employee removed successfully!' });
            setShowConfirm(false);
            setPendingDelete(null);
            fetchEmployees();
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
            formDataUpload.append('file', file);
            formDataUpload.append('ownerType', 'employee');
            if (selectedEmployee) formDataUpload.append('ownerId', selectedEmployee.id);
            formDataUpload.append('category', 'avatar');

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            });

            const data = await response.json();
            setFormData(prev => ({ ...prev, avatarUrl: data.url }));
        } catch (err) {
            setMessage({ type: 'error', text: 'Error uploading: ' + err.message });
        } finally {
            setUploading(false);
        }
    };

    const getRoleColor = (role) => {
        const roleColors = {
            ADMIN: '#EF4444',
            MARKETING: '#F59E0B',
            DEVELOPER: colors.primary,
        };
        return roleColors[role] || colors.textSecondary;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold mb-1">Staff Management</h1>
                    <p style={{ color: colors.textSecondary }}>
                        Manage your team members and their roles
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="px-5 py-3 rounded-xl font-semibold text-white flex items-center gap-2 transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})` }}
                >
                    <FaUserPlus /> Add Staff
                </button>
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

            {/* Search Bar */}
            <div 
                className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
                style={{ 
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`
                }}
            >
                <FaSearch style={{ color: colors.textSecondary }} />
                <input
                    type="text"
                    placeholder="Search staff by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none"
                    style={{ color: colors.text }}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ color: colors.textSecondary }}>
                        <FaTimes />
                    </button>
                )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {['Total', 'ADMIN', 'MARKETING', 'DEVELOPER'].map((stat, idx) => {
                    const count = stat === 'Total' 
                        ? employees.length 
                        : employees.filter(e => e.role === stat).length;
                    return (
                        <div 
                            key={idx}
                            className="p-4 rounded-xl text-center"
                            style={{ 
                                backgroundColor: colors.surface,
                                border: `1px solid ${colors.border}`
                            }}
                        >
                            <p className="text-2xl font-bold" style={{ color: colors.text }}>{count}</p>
                            <p className="text-sm" style={{ color: colors.textSecondary }}>{stat}</p>
                        </div>
                    );
                })}
            </div>

            {/* Employees Grid */}
            {error ? (
                <div 
                    className="p-8 rounded-xl text-center"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                >
                    {error}
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div 
                    className="p-12 rounded-xl text-center"
                    style={{ 
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`
                    }}
                >
                    <FaUser className="text-4xl mx-auto mb-4" style={{ color: colors.textSecondary }} />
                    <p style={{ color: colors.textSecondary }}>
                        {searchQuery ? 'No staff members found matching your search.' : 'No staff members added yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map((employee) => (
                        <div 
                            key={employee.id}
                            className="rounded-2xl p-6 transition-all hover:shadow-lg"
                            style={{ 
                                backgroundColor: colors.surface,
                                border: `1px solid ${colors.border}`
                            }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                {/* Avatar */}
                                {employee.avatarUrl ? (
                                    <img
                                        src={employee.avatarUrl}
                                        alt={employee.firstName}
                                        className="w-16 h-16 rounded-xl object-cover"
                                    />
                                ) : (
                                    <div 
                                        className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white"
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})` }}
                                    >
                                        {(employee.firstName?.charAt(0) || '') + (employee.lastName?.charAt(0) || '')}
                                    </div>
                                )}

                                {/* Role Badge */}
                                <span 
                                    className="px-3 py-1 rounded-full text-xs font-semibold"
                                    style={{ 
                                        backgroundColor: `${getRoleColor(employee.role)}20`,
                                        color: getRoleColor(employee.role)
                                    }}
                                >
                                    {employee.role}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold mb-1">
                                {employee.firstName} {employee.lastName}
                            </h3>
                            
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                                    <FaEnvelope size={12} />
                                    <span className="truncate">{employee.email}</span>
                                </div>
                                {employee.phone && (
                                    <div className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                                        <FaPhone size={12} />
                                        <span>{employee.phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t" style={{ borderColor: colors.border }}>
                                <button
                                    onClick={() => openEditModal(employee)}
                                    className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text
                                    }}
                                >
                                    <FaEdit /> Edit
                                </button>
                                <button
                                    onClick={() => {
                                        setPendingDelete(employee.id);
                                        setShowConfirm(true);
                                    }}
                                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-all text-red-500"
                                    style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowModal(false)}
                    />
                    <div 
                        className="relative w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                        style={{ 
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`
                        }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">
                                {selectedEmployee ? 'Edit Staff Member' : 'Add Staff Member'}
                            </h2>
                            <button 
                                onClick={() => setShowModal(false)}
                                style={{ color: colors.textSecondary }}
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        {/* Avatar Upload */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                {formData.avatarUrl ? (
                                    <img
                                        src={formData.avatarUrl}
                                        alt="Avatar"
                                        className="w-24 h-24 rounded-2xl object-cover"
                                    />
                                ) : (
                                    <div 
                                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
                                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})` }}
                                    >
                                        {(formData.firstName?.charAt(0) || 'A')}
                                    </div>
                                )}
                                <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-white text-sm" style={{ backgroundColor: colors.primary }}>
                                    <FaCamera />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl"
                                        style={{
                                            backgroundColor: colors.backgroundSecondary,
                                            color: colors.text,
                                            border: `1px solid ${colors.border}`
                                        }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl"
                                        style={{
                                            backgroundColor: colors.backgroundSecondary,
                                            color: colors.text,
                                            border: `1px solid ${colors.border}`
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                    required
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
                                    className="w-full px-4 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                >
                                    {ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>
                                    Bio
                                </label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl resize-none"
                                    style={{
                                        backgroundColor: colors.backgroundSecondary,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                                style={{ backgroundColor: colors.primary }}
                            >
                                <FaSave /> {selectedEmployee ? 'Update' : 'Add'} Staff
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 rounded-xl font-medium"
                                style={{
                                    backgroundColor: colors.backgroundSecondary,
                                    color: colors.text
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowConfirm(false)}
                    />
                    <div 
                        className="relative w-full max-w-md rounded-2xl p-6 text-center"
                        style={{ 
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`
                        }}
                    >
                        <div 
                            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}
                        >
                            <FaTrash className="text-2xl text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Delete Staff Member?</h3>
                        <p className="mb-6" style={{ color: colors.textSecondary }}>
                            This action cannot be undone. Are you sure you want to remove this team member?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-3 rounded-xl font-medium"
                                style={{
                                    backgroundColor: colors.backgroundSecondary,
                                    color: colors.text
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;
