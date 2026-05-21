import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiPost, apiDelete } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL, resolveAssetUrl } from '../utils/constants';
import {
    FaUser, FaEdit, FaSave, FaTimes, FaCamera, FaBriefcase,
    FaProjectDiagram, FaCalendarCheck, FaLock, FaKey, FaEye,
    FaEyeSlash, FaStar, FaNewspaper, FaGlobe, FaFileUpload,
    FaTrash, FaExternalLinkAlt
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
    const [myServices, setMyServices] = useState([]);
    const [myProjects, setMyProjects] = useState([]);
    const [myPosts, setMyPosts] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [myClientProjects, setMyClientProjects] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [documentForm, setDocumentForm] = useState({ label: '', documentType: 'cv', isPublic: true });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchProfile();
        fetchMyContent();
        fetchDocuments();
    }, []);

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

    const fetchMyContent = async () => {
        const [services, projects, posts, bookings, clientProjects] = await Promise.all([
            apiGet('/staff-dashboard/services').catch(() => []),
            apiGet('/staff-dashboard/projects').catch(() => []),
            apiGet('/staff-dashboard/posts').catch(() => []),
            apiGet('/staff-dashboard/bookings').catch(() => []),
            apiGet('/client-projects?assignedToMe=true').catch(() => ({ projects: [] })),
        ]);
        setMyServices(services || []);
        setMyProjects(projects || []);
        setMyPosts(posts || []);
        setMyBookings(bookings || []);
        setMyClientProjects(clientProjects.projects || []);
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

    const stats = [
        { label: 'Services', value: myServices.length, icon: FaBriefcase, color: colors.primary },
        { label: 'Projects', value: myProjects.length, icon: FaProjectDiagram, color: '#8B5CF6' },
        { label: 'Blog Posts', value: myPosts.length, icon: FaNewspaper, color: '#F59E0B' },
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
                {stats.map((stat) => <StatCard key={stat.label} stat={stat} colors={colors} />)}
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
                <ContentList title="My Active Client Projects" icon={FaProjectDiagram} items={myClientProjects} colors={colors} empty="No client projects assigned yet." renderMeta={(item) => `${item.status} · ${item.progress || 0}%`} />
                <ContentList title="My Services" icon={FaBriefcase} items={myServices} colors={colors} empty="No services assigned yet." renderMeta={(item) => item.published ? 'Published' : 'Draft'} />
                <ContentList title="My Projects" icon={FaProjectDiagram} items={myProjects} colors={colors} empty="No projects assigned yet." renderMeta={(item) => item.published ? 'Published' : 'Draft'} />
                <ContentList title="My Blog Posts" icon={FaNewspaper} items={myPosts} colors={colors} empty="No posts yet." renderMeta={(item) => item.published ? 'Published' : 'Draft'} />
                <ContentList title="My Bookings" icon={FaCalendarCheck} items={myBookings} colors={colors} empty="No bookings assigned yet." renderMeta={(item) => item.status || new Date(item.createdAt).toLocaleDateString()} />
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

const ContentList = ({ title, icon: Icon, items, colors, empty, renderMeta }) => (
    <section className="rounded-2xl p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Icon style={{ color: colors.primary }} /> {title}</h3>
        {items.length === 0 ? <p style={{ color: colors.textSecondary }}>{empty}</p> : <div className="space-y-3">{items.slice(0, 5).map((item) => <div key={item.id} className="p-3 rounded-xl" style={{ backgroundColor: colors.backgroundSecondary }}><p className="font-medium">{item.title}</p><p className="text-sm" style={{ color: colors.textSecondary }}>{renderMeta(item)}</p></div>)}</div>}
    </section>
);

export default StaffDashboard;
