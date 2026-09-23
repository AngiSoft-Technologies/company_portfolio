import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiPost, apiDelete } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL, resolveAssetUrl } from '../utils/constants';
import {
    FaUser, FaEdit, FaSave, FaTimes, FaCamera, FaBriefcase,
    FaProjectDiagram, FaCalendarCheck, FaLock, FaKey, FaEye,
    FaEyeSlash, FaStar, FaNewspaper, FaGlobe, FaFileUpload,
    FaTrash, FaExternalLinkAlt, FaBox, FaCommentDots, FaImage,
    FaClipboardList, FaPenNib, FaCheckCircle, FaChartBar
} from 'react-icons/fa';

const emptyForm = {
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    avatarUrl: '',
    username: '',
    publicTitle: '',
    publicSummary: '',
    location: '',
    websiteUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
    githubUrl: '',
    skills: '',
    specialties: '',
    publicEmail: '',
    publicPhone: '',
    profilePublished: true,
};

const arrayToText = (value) => Array.isArray(value) ? value.join(', ') : value || '';
const textToArray = (value) => value.split(',').map(item => item.trim()).filter(Boolean);

const StaffDashboard = () => {
    const navigate = useNavigate();
    const { colors } = useTheme();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [permissions, setPermissions] = useState([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [myProducts, setMyProducts] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [myPosts, setMyPosts] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [documentForm, setDocumentForm] = useState({ label: '', documentType: 'cv', isPublic: true });
    const [message, setMessage] = useState({ type: '', text: '' });

    const allowed = (key) => isSuperAdmin || permissions.includes(key);

    useEffect(() => {
        fetchProfile();
        fetchPermissions();
        fetchDocuments();
    }, []);

    const fetchPermissions = async () => {
        try {
            const data = await apiGet('/staff-dashboard/permissions');
            setPermissions(data.permissions || []);
            setIsSuperAdmin(!!data.isSuperAdmin);
        } catch (err) {
            setMessage({ type: 'error', text: 'Could not load permissions: ' + err.message });
        }
    };

    // Parallel fetch of assigned-record counts from staff-scoped endpoints.
    // Failures (e.g. 403 because permission not actually held) are tolerated:
    // the widget falls back to an empty state rather than crashing.
    const fetchAssignedRecords = useCallback(async () => {
        const safe = async (path) => {
            try {
                const data = await apiGet(path);
                return Array.isArray(data) ? data : [];
            } catch {
                return [];
            }
        };
        const allowedNow = (key) => isSuperAdmin || permissions.includes(key);
        const [products, projects, posts, bookings] = await Promise.all([
            allowedNow('products.view_assigned') ? safe('/products/staff') : Promise.resolve([]),
            allowedNow('projects.view_assigned') ? safe('/projects/staff') : Promise.resolve([]),
            allowedNow('publications.create') ? safe('/staff-blogs/my') : Promise.resolve([]),
            allowedNow('bookings.view_assigned') ? safe('/staff-dashboard/bookings') : Promise.resolve([]),
        ]);
        setMyProducts(products);
        setMyProjects(projects);
        setMyPosts(posts);
        setMyBookings(bookings);
    }, [permissions, isSuperAdmin]);

    // Recompute widgets whenever permissions or assigned-record data change.
    useEffect(() => {
        if (permissions.length === 0 && !isSuperAdmin) return;
        fetchAssignedRecords();
    }, [permissions, isSuperAdmin, fetchAssignedRecords]);

    const fetchProfile = async () => {
        try {
            const data = await apiGet('/staff-dashboard/profile');
            setProfile(data);
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                phone: data.phone || '',
                bio: data.bio || '',
                avatarUrl: data.avatarUrl || '',
                username: data.username || '',
                publicTitle: data.publicTitle || '',
                publicSummary: data.publicSummary || '',
                location: data.location || '',
                websiteUrl: data.websiteUrl || '',
                linkedinUrl: data.linkedinUrl || '',
                twitterUrl: data.twitterUrl || '',
                githubUrl: data.githubUrl || '',
                skills: arrayToText(data.skills),
                specialties: arrayToText(data.specialties),
                publicEmail: data.publicEmail || '',
                publicPhone: data.publicPhone || '',
                profilePublished: data.profilePublished !== false,
            });
        } catch (err) {
            setMessage({ type: 'error', text: 'Could not load profile: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    // Build the dashboard widget projection from effective permissions AND
    // assigned-record counts. Every widget is derived from `allowed(key)` plus
    // the actual data returned by the staff-scoped endpoints above — never from
    // `if role === 'STAFF'`. Empty-state rule: if a permission is present but no
    // assigned records exist, we still render a card with a "No X assigned yet"
    // message. We never fabricate a global list.
    const buildWidgets = () => {
        const list = [];
        const draftPosts = myPosts.filter((p) => !p.published);
        const publishedPosts = myPosts.filter((p) => p.published);

        // Profile — always available to STAFF (profile.update_own).
        if (allowed('profile.update_own')) {
            const completed = profile ? [
                profile.firstName, profile.lastName, profile.phone, profile.bio,
                profile.publicTitle, profile.avatarUrl,
            ].filter(Boolean).length : 0;
            list.push({
                key: 'profile',
                title: 'Profile Completion',
                icon: <FaUser />,
                accent: colors.primary,
                summary: `${completed}/6 core fields complete`,
                empty: completed < 6,
                emptyText: 'Complete your public profile',
                link: `/admin/staff/${profile?.id}`,
                cta: 'Edit Profile',
            });
        }

        // Assigned products — products.view_assigned.
        if (allowed('products.view_assigned')) {
            list.push({
                key: 'products',
                title: 'My Products',
                icon: <FaBox />,
                accent: colors.primary,
                summary: myProducts.length
                    ? `${myProducts.length} product${myProducts.length > 1 ? 's' : ''} assigned`
                    : 'No products assigned yet',
                items: myProducts,
                empty: myProducts.length === 0,
                emptyText: 'No products assigned yet',
                link: '/admin/products',
                cta: 'View Products',
            });
        }

        // Assigned projects — projects.view_assigned.
        if (allowed('projects.view_assigned')) {
            list.push({
                key: 'projects',
                title: 'My Projects',
                icon: <FaProjectDiagram />,
                accent: colors.primary,
                summary: myProjects.length
                    ? `${myProjects.length} project${myProjects.length > 1 ? 's' : ''} assigned`
                    : 'No projects assigned yet',
                items: myProjects,
                empty: myProjects.length === 0,
                emptyText: 'No projects assigned yet',
                link: '/admin/projects',
                cta: 'View Projects',
            });
        }

        // Publications — publications.create (own drafts + create link).
        if (allowed('publications.create')) {
            list.push({
                key: 'publications',
                title: 'My Drafts',
                icon: <FaNewspaper />,
                accent: colors.primary,
                summary: draftPosts.length
                    ? `${draftPosts.length} draft${draftPosts.length > 1 ? 's' : ''}, ${publishedPosts.length} published`
                    : 'No drafts yet',
                items: draftPosts,
                empty: draftPosts.length === 0,
                emptyText: 'No drafts yet — create your first publication',
                link: '/admin/staff-blogs',
                cta: 'Create Publication',
            });
        }

        // Assigned bookings — bookings.view_assigned.
        if (allowed('bookings.view_assigned')) {
            list.push({
                key: 'bookings',
                title: 'Assigned Bookings',
                icon: <FaCalendarCheck />,
                accent: colors.primary,
                summary: myBookings.length
                    ? `${myBookings.length} booking${myBookings.length > 1 ? 's' : ''} assigned`
                    : 'No bookings assigned yet',
                items: myBookings,
                empty: myBookings.length === 0,
                emptyText: 'No bookings assigned yet',
                link: '/admin/bookings',
                cta: 'View Bookings',
            });
        }

        // Customer messages — bookings.message_customer (only with assigned bookings).
        if (allowed('bookings.message_customer') && myBookings.length) {
            const unread = myBookings.filter((b) => (b.messages || []).some((m) => !m.read && m.sender !== 'STAFF')).length;
            list.push({
                key: 'messages',
                title: 'Customer Messages',
                icon: <FaCommentDots />,
                accent: colors.primary,
                summary: unread ? `${unread} unread message${unread > 1 ? 's' : ''}` : 'No new messages',
                items: myBookings.filter((b) => (b.messages || []).length),
                empty: unread === 0,
                emptyText: 'No customer messages yet',
                link: '/admin/bookings',
                cta: 'Open Messages',
            });
        }

        // Media library — media.upload.
        if (allowed('media.upload')) {
            list.push({
                key: 'media',
                title: 'Media Library',
                icon: <FaImage />,
                accent: colors.primary,
                summary: 'Upload and manage media',
                link: '/admin/media',
                cta: 'Open Media',
            });
        }

        // Admin summary — analytics.view_dashboard (ADMIN only).
        if (allowed('analytics.view_dashboard') && (isSuperAdmin || profile?.systemRole === 'ADMIN' || profile?.role === 'ADMIN')) {
            list.push({
                key: 'admin',
                title: 'Admin Summary',
                icon: <FaChartBar />,
                accent: colors.primary,
                summary: 'Platform-wide analytics',
                link: '/admin/analytics',
                cta: 'View Dashboard',
            });
        }

        return list;
    };

    const fetchDocuments = async () => {
        const data = await apiGet('/staff-dashboard/profile/documents').catch(() => []);
        setDocuments(data || []);
    };

    const handleSaveProfile = async () => {
        try {
            const payload = {
                ...formData,
                skills: textToArray(formData.skills),
                specialties: textToArray(formData.specialties),
            };
            const updated = await apiPut('/staff-dashboard/profile', payload);
            setProfile(updated);
            setMessage({ type: 'success', text: 'Public profile updated successfully.' });
            setEditing(false);
            fetchProfile();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error: ' + err.message });
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        try {
            await apiPost('/staff-dashboard/profile/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            setMessage({ type: 'success', text: 'Password changed successfully.' });
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
                headers: { Authorization: `Bearer ${token}` },
                body: formDataUpload,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Avatar upload failed');
            setFormData(prev => ({ ...prev, avatarUrl: data.url }));
            setMessage({ type: 'success', text: 'Avatar uploaded successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Error uploading avatar: ' + err.message });
        } finally {
            setUploading(false);
        }
    };

    const handleDocumentUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const payload = new FormData();
            payload.append('document', file);
            payload.append('label', documentForm.label || file.name);
            payload.append('documentType', documentForm.documentType);
            payload.append('isPublic', String(documentForm.isPublic));
            const response = await fetch(`${API_BASE_URL}/staff-dashboard/profile/documents`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: payload,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Document upload failed');
            setDocumentForm({ label: '', documentType: 'cv', isPublic: true });
            setMessage({ type: 'success', text: 'Document uploaded successfully.' });
            fetchDocuments();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error uploading document: ' + err.message });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (id) => {
        if (!window.confirm('Delete this document?')) return;
        try {
            await apiDelete(`/staff-dashboard/profile/documents/${id}`);
            fetchDocuments();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error deleting document: ' + err.message });
        }
    };

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const publicPath = `/staff/${profile?.username || profile?.id}`;
    const widgets = buildWidgets();
    const summaryStats = [
        { label: 'Products', value: myProducts.length, icon: FaBox, color: colors.primary },
        { label: 'Projects', value: myProjects.length, icon: FaProjectDiagram, color: '#8B5CF6' },
        { label: 'Drafts', value: myPosts.filter((p) => !p.published).length, icon: FaNewspaper, color: '#F59E0B' },
        { label: 'Bookings', value: myBookings.length, icon: FaCalendarCheck, color: '#10B981' },
    ];

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.backgroundSecondary }}><div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: `${colors.primary}30`, borderTopColor: colors.primary }} /></div>;
    }

    return (
        <div style={{ color: colors.text }}>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold mb-1">My Dashboard</h1>
                    <p style={{ color: colors.textSecondary }}>Manage your public profile, content, and staff activity</p>
                </div>
                <button onClick={() => navigate(publicPath)} className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all w-fit" style={{ backgroundColor: colors.primary, color: 'white' }}>
                    <FaExternalLinkAlt /> View Public Profile
                </button>
            </div>

            {message.text && (
                <div className="mb-6 p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: message.type === 'success' ? `${colors.success || '#10B981'}20` : 'rgba(239,68,68,0.1)', color: message.type === 'success' ? (colors.success || '#10B981') : '#EF4444' }}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage({ type: '', text: '' })}><FaTimes /></button>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {summaryStats.map((stat) => <StatCard key={stat.label} stat={stat} colors={colors} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 rounded-2xl p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2"><FaUser style={{ color: colors.primary }} /> Public Profile</h2>
                        <button onClick={() => editing ? handleSaveProfile() : setEditing(true)} className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all" style={{ backgroundColor: editing ? colors.primary : colors.backgroundSecondary, color: editing ? 'white' : colors.text }}>
                            {editing ? <><FaSave /> Save</> : <><FaEdit /> Edit</>}
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                {formData.avatarUrl ? <img src={resolveAssetUrl(formData.avatarUrl)} alt="Avatar" className="w-32 h-32 rounded-2xl object-cover" style={{ border: `3px solid ${colors.primary}` }} /> : <div className="w-32 h-32 rounded-2xl flex items-center justify-center text-4xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})` }}>{(formData.firstName?.charAt(0) || '') + (formData.lastName?.charAt(0) || '')}</div>}
                                loading="lazy"
                                decoding="async"
                                {editing && <label className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-white" style={{ backgroundColor: colors.primary }}><FaCamera /><input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} /></label>}
                            </div>
                            {uploading && <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>Uploading...</p>}
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="First Name" value={formData.firstName} disabled={!editing} onChange={(v) => updateField('firstName', v)} colors={colors} />
                            <Field label="Last Name" value={formData.lastName} disabled={!editing} onChange={(v) => updateField('lastName', v)} colors={colors} />
                            <Field label="Username / public URL" value={formData.username} disabled={!editing} onChange={(v) => updateField('username', v)} colors={colors} />
                            <Field label="Internal Phone" value={formData.phone} disabled={!editing} onChange={(v) => updateField('phone', v)} colors={colors} />
                            <Field label="Public Title" value={formData.publicTitle} disabled={!editing} onChange={(v) => updateField('publicTitle', v)} colors={colors} />
                            <Field label="Location" value={formData.location} disabled={!editing} onChange={(v) => updateField('location', v)} colors={colors} />
                            <Field label="Public Email" value={formData.publicEmail} disabled={!editing} onChange={(v) => updateField('publicEmail', v)} colors={colors} />
                            <Field label="Public Phone" value={formData.publicPhone} disabled={!editing} onChange={(v) => updateField('publicPhone', v)} colors={colors} />
                            <Field label="Website URL" value={formData.websiteUrl} disabled={!editing} onChange={(v) => updateField('websiteUrl', v)} colors={colors} />
                            <Field label="LinkedIn URL" value={formData.linkedinUrl} disabled={!editing} onChange={(v) => updateField('linkedinUrl', v)} colors={colors} />
                            <Field label="Twitter/X URL" value={formData.twitterUrl} disabled={!editing} onChange={(v) => updateField('twitterUrl', v)} colors={colors} />
                            <Field label="GitHub URL" value={formData.githubUrl} disabled={!editing} onChange={(v) => updateField('githubUrl', v)} colors={colors} />
                            <Field label="Skills (comma-separated)" value={formData.skills} disabled={!editing} onChange={(v) => updateField('skills', v)} colors={colors} />
                            <Field label="Specialties (comma-separated)" value={formData.specialties} disabled={!editing} onChange={(v) => updateField('specialties', v)} colors={colors} />
                            <TextArea label="Public Summary" value={formData.publicSummary} disabled={!editing} onChange={(v) => updateField('publicSummary', v)} colors={colors} />
                            <TextArea label="Bio" value={formData.bio} disabled={!editing} onChange={(v) => updateField('bio', v)} colors={colors} />
                            <label className="md:col-span-2 flex items-center gap-3 text-sm" style={{ color: colors.text }}>
                                <input type="checkbox" checked={formData.profilePublished} disabled={!editing} onChange={(e) => updateField('profilePublished', e.target.checked)} />
                                Publish my profile on the public staff page
                            </label>
                        </div>
                    </div>
                </section>

                <SecurityCard colors={colors} passwordData={passwordData} setPasswordData={setPasswordData} showPasswordForm={showPasswordForm} setShowPasswordForm={setShowPasswordForm} showCurrentPassword={showCurrentPassword} setShowCurrentPassword={setShowCurrentPassword} showNewPassword={showNewPassword} setShowNewPassword={setShowNewPassword} handleChangePassword={handleChangePassword} />
            </div>

            <section className="rounded-2xl p-6 mt-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><FaFileUpload style={{ color: colors.primary }} /> Resume / Public Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <Field label="Document label" value={documentForm.label} disabled={false} onChange={(v) => setDocumentForm(prev => ({ ...prev, label: v }))} colors={colors} />
                    <Field label="Document type" value={documentForm.documentType} disabled={false} onChange={(v) => setDocumentForm(prev => ({ ...prev, documentType: v }))} colors={colors} />
                    <label className="flex items-center gap-3 text-sm pt-7" style={{ color: colors.text }}><input type="checkbox" checked={documentForm.isPublic} onChange={(e) => setDocumentForm(prev => ({ ...prev, isPublic: e.target.checked }))} /> Show publicly</label>
                    <label className="px-4 py-3 rounded-xl text-center cursor-pointer font-medium mt-6" style={{ backgroundColor: colors.primary, color: 'white' }}>
                        Upload File
                        <input type="file" className="hidden" onChange={handleDocumentUpload} disabled={uploading} />
                    </label>
                </div>
                <div className="space-y-3">
                    {documents.map((doc) => <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: colors.backgroundSecondary }}><span>{doc.metadata?.label || doc.filename} {doc.metadata?.public ? '(public)' : '(private)'}</span><button onClick={() => handleDeleteDocument(doc.id)} style={{ color: '#EF4444' }}><FaTrash /></button></div>)}
                    {documents.length === 0 && <p style={{ color: colors.textSecondary }}>No documents uploaded yet.</p>}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
                {widgets.map((w) => (
                    <WidgetCard key={w.key} widget={w} colors={colors} />
                ))}
                {widgets.length === 0 && (
                    <div className="lg:col-span-4 p-6 rounded-2xl" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
                        <p style={{ color: colors.textSecondary }}>No dashboard widgets are available for your current access level.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ stat, colors }) => (
    <div className="p-5 rounded-2xl" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${stat.color}15` }}><stat.icon size={18} style={{ color: stat.color }} /></div>
        <p className="text-2xl font-bold" style={{ color: colors.text }}>{stat.value}</p>
        <p className="text-sm" style={{ color: colors.textSecondary }}>{stat.label}</p>
    </div>
);

const Field = ({ label, value, disabled, onChange, colors }) => (
    <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>{label}</label>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: disabled ? colors.background : colors.backgroundSecondary, color: colors.text, border: `1px solid ${colors.border}` }} />
    </div>
);

const TextArea = ({ label, value, disabled, onChange, colors }) => (
    <div className="md:col-span-2">
        <label className="text-sm font-medium mb-2 block" style={{ color: colors.textSecondary }}>{label}</label>
        <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} className="w-full px-4 py-3 rounded-xl resize-none" style={{ backgroundColor: disabled ? colors.background : colors.backgroundSecondary, color: colors.text, border: `1px solid ${colors.border}` }} />
    </div>
);

const SecurityCard = ({ colors, passwordData, setPasswordData, showPasswordForm, setShowPasswordForm, showCurrentPassword, setShowCurrentPassword, showNewPassword, setShowNewPassword, handleChangePassword }) => (
    <section className="rounded-2xl p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-6"><FaLock style={{ color: colors.primary }} /> Security</h2>
        {!showPasswordForm ? <button onClick={() => setShowPasswordForm(true)} className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all" style={{ backgroundColor: colors.backgroundSecondary, color: colors.text, border: `1px solid ${colors.border}` }}><FaKey /> Change Password</button> : <div className="space-y-4">
            <PasswordField value={passwordData.currentPassword} onChange={(value) => setPasswordData({ ...passwordData, currentPassword: value })} placeholder="Current Password" visible={showCurrentPassword} setVisible={setShowCurrentPassword} colors={colors} />
            <PasswordField value={passwordData.newPassword} onChange={(value) => setPasswordData({ ...passwordData, newPassword: value })} placeholder="New Password" visible={showNewPassword} setVisible={setShowNewPassword} colors={colors} />
            <input type="password" placeholder="Confirm Password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl" style={{ backgroundColor: colors.backgroundSecondary, color: colors.text, border: `1px solid ${colors.border}` }} />
            <div className="flex gap-2"><button onClick={handleChangePassword} className="flex-1 py-3 rounded-xl font-medium text-white" style={{ backgroundColor: colors.primary }}>Update</button><button onClick={() => setShowPasswordForm(false)} className="px-4 py-3 rounded-xl" style={{ backgroundColor: colors.backgroundSecondary, color: colors.text }}>Cancel</button></div>
        </div>}
    </section>
);

const PasswordField = ({ value, onChange, placeholder, visible, setVisible, colors }) => (
    <div className="relative">
        <input type={visible ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 rounded-xl pr-12" style={{ backgroundColor: colors.backgroundSecondary, color: colors.text, border: `1px solid ${colors.border}` }} />
        <button type="button" onClick={() => setVisible(!visible)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }}>{visible ? <FaEyeSlash /> : <FaEye />}</button>
    </div>
);

const WidgetCard = ({ widget, colors }) => {
    const items = widget.items || [];
    return (
        <section className="rounded-2xl p-6 flex flex-col" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold flex items-center gap-2"><span style={{ color: colors.primary }}>{widget.icon}</span> {widget.title}</h3>
                {widget.link && (
                    <button onClick={() => window.location.assign(widget.link)} className="text-sm font-medium flex items-center gap-1" style={{ color: colors.primary }}>
                        {widget.cta} <FaExternalLinkAlt size={12} />
                    </button>
                )}
            </div>
            <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>{widget.summary}</p>
            {/* Empty-state rule: permission present but zero assigned records. */}
            {widget.empty ? (
                <p className="text-sm py-3 px-3 rounded-xl mt-1" style={{ backgroundColor: colors.backgroundSecondary, color: colors.textSecondary }}>{widget.emptyText}</p>
            ) : items.length ? (
                <div className="space-y-2 mt-1">
                    {items.slice(0, 5).map((item) => (
                        <div key={item.id} className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: colors.backgroundSecondary }}>
                            <span className="font-medium truncate">{item.name || item.title || item.slug}</span>
                            {item.status && <span className="text-sm" style={{ color: colors.textSecondary }}>{item.status}</span>}
                        </div>
                    ))}
                </div>
            ) : null}
        </section>
    );
};

export default StaffDashboard;
