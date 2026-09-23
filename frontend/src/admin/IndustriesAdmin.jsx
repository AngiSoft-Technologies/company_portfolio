import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from '../utils/toast';
import CrudModal from '../components/CrudModal';
import {
  FaPlus, FaEdit, FaTrash, FaIndustry, FaSearch, FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';

// Local admin request helper that surfaces status codes so callers can
// fail safe (e.g. show "no access" on 403) instead of relying on the
// centralized throwing helper. Adds the admin token from localStorage.
const adminRequest = async (method, endpoint, body = null) => {
  const token = localStorage.getItem('adminToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data: data || {} };
};

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const IndustriesAdmin = () => {
  const { colors } = useTheme();
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', icon: '', sortOrder: 0, active: true,
  });

  const fetchIndustries = async () => {
    try {
      setLoading(true);
      setError('');
      setAccessDenied(false);
      const res = await adminRequest('GET', '/industries/admin');
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAccessDenied(true);
          setIndustries([]);
        } else {
          setError('Failed to load industries');
        }
        return;
      }
      setIndustries(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load industries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIndustries(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleNameBlur = () => {
    if (!form.slug && form.name) {
      setForm((prev) => ({ ...prev, slug: slugify(form.name) }));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '', slug: '', description: '', icon: '', sortOrder: 0, active: true,
    });
    setShowModal(true);
  };

  const openEdit = (industry) => {
    setEditing(industry);
    setForm({
      name: industry.name || '',
      slug: industry.slug || '',
      description: industry.description || '',
      icon: industry.icon || '',
      sortOrder: industry.sortOrder ?? 0,
      active: industry.active ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: (form.slug.trim() || slugify(form.name)).trim(),
      description: form.description.trim(),
      icon: form.icon.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    setSaving(true);
    try {
      const res = editing
        ? await adminRequest('PUT', `/industries/admin/${editing.id}`, payload)
        : await adminRequest('POST', '/industries/admin', payload);
      if (!res.ok) {
        toast.error(res.data?.error || res.data?.message || 'Failed to save industry');
        return;
      }
      toast.success(editing ? 'Industry updated' : 'Industry created');
      setShowModal(false);
      fetchIndustries();
    } catch {
      toast.error('Failed to save industry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this industry?')) return;
    try {
      const res = await adminRequest('DELETE', `/industries/admin/${id}`);
      if (!res.ok) {
        toast.error(res.data?.error || 'Failed to delete industry');
        return;
      }
      toast.success('Industry deleted');
      fetchIndustries();
    } catch {
      toast.error('Failed to delete industry');
    }
  };

  const toggleActive = async (industry) => {
    try {
      const res = await adminRequest('PUT', `/industries/admin/${industry.id}`, {
        ...industry, active: !industry.active,
      });
      if (!res.ok) {
        toast.error('Failed to update status');
        return;
      }
      toast.success(`Industry ${industry.active ? 'deactivated' : 'activated'}`);
      fetchIndustries();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = industries.filter((i) =>
    i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="admin-page-container">
        <div style={{ textAlign: 'center', padding: '3rem', color: colors.textMuted }}>
          <FaTimesCircle style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4, color: colors.error }} />
          <h2 style={{ color: colors.text }}>You don't have access</h2>
          <p>You need ADMIN or SUPER permissions to manage industries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-section-title-bar">
        <div>
          <h2 style={{ color: colors.text }}>Industries Management</h2>
          <p style={{ color: colors.textSecondary }}>Manage industry categories for the site</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FaPlus /> Add Industry
        </button>
      </div>

      <div className="mb-6" style={{ position: 'relative', maxWidth: '400px' }}>
        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
        <input
          type="text"
          placeholder="Search industries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-login-input"
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {error && <p style={{ color: colors.error }}>{error}</p>}

      <div
        className="dashboard-card"
        style={{ border: `1px solid ${colors.border}`, background: colors.surface, overflow: 'hidden' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}`, color: colors.textSecondary }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Slug</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Icon</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Order</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Active</th>
              <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((industry) => (
              <tr key={industry.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '0.75rem 1rem', color: colors.text, fontWeight: 500 }}>{industry.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: colors.textSecondary, fontFamily: 'monospace', fontSize: '0.85rem' }}>{industry.slug}</td>
                <td style={{ padding: '0.75rem 1rem', color: colors.text, fontSize: '1.1rem' }}>{industry.icon || '—'}</td>
                <td style={{ padding: '0.75rem 1rem', color: colors.textSecondary }}>{industry.sortOrder ?? 0}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem',
                    background: industry.active ? '#E8F5E9' : '#FFEBEE',
                    color: industry.active ? colors.successDark : colors.error,
                  }}>
                    {industry.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                    <button onClick={() => toggleActive(industry)} title={industry.active ? 'Deactivate' : 'Activate'} style={{
                      padding: '6px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                      background: colors.backgroundTertiary, color: colors.text, cursor: 'pointer', fontSize: '0.8rem',
                    }}>
                      {industry.active ? <FaTimesCircle /> : <FaCheckCircle />}
                    </button>
                    <button onClick={() => openEdit(industry)} style={{
                      padding: '6px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                      background: colors.backgroundTertiary, color: colors.primary, cursor: 'pointer', fontSize: '0.8rem',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}>
                      <FaEdit /> Edit
                    </button>
                    <button onClick={() => handleDelete(industry.id)} style={{
                      padding: '6px 10px', borderRadius: '8px', border: '1px solid #FFCDD2',
                      background: '#FFEBEE', color: colors.error, cursor: 'pointer', fontSize: '0.8rem',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}>
                      <FaTrash /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: colors.textMuted }}>
          <FaIndustry style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
          <p>No industries found. Create your first industry to get started.</p>
        </div>
      )}

      {showModal && (
        <CrudModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? 'Edit Industry' : 'Add Industry'}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="modal-label">Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                onBlur={handleNameBlur}
                className="modal-input"
                required
              />
            </div>
            <div>
              <label className="modal-label">Slug (auto from name if blank)</label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                className="modal-input"
                placeholder="auto-generated"
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label className="modal-label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="modal-input"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="modal-label">Icon (emoji/text)</label>
                <input name="icon" value={form.icon} onChange={handleChange} className="modal-input" placeholder="🏭" />
              </div>
              <div>
                <label className="modal-label">Sort Order</label>
                <input name="sortOrder" type="number" value={form.sortOrder} onChange={handleChange} className="modal-input" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input name="active" type="checkbox" checked={form.active} onChange={handleChange} style={{ accentColor: colors.primary }} />
              <label style={{ color: colors.text, fontWeight: 500 }}>Active</label>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" onClick={() => setShowModal(false)} className="modal-btn modal-btn-cancel">Cancel</button>
              <button type="submit" className="modal-btn" disabled={saving} style={{ background: colors.primary, color: '#fff' }}>
                {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </CrudModal>
      )}
    </div>
  );
};

export default IndustriesAdmin;
