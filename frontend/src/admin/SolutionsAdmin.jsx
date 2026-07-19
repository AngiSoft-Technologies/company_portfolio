import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from '../utils/toast';
import CrudModal from '../components/CrudModal';
import {
  FaPlus, FaEdit, FaTrash, FaLightbulb, FaSearch, FaCheckCircle, FaTimesCircle
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

const SolutionsAdmin = () => {
  const { colors } = useTheme();
  const [solutions, setSolutions] = useState([]);
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

  const fetchSolutions = async () => {
    try {
      setLoading(true);
      setError('');
      setAccessDenied(false);
      const res = await adminRequest('GET', '/solutions/admin');
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAccessDenied(true);
          setSolutions([]);
        } else {
          setError('Failed to load solutions');
        }
        return;
      }
      setSolutions(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load solutions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSolutions(); }, []);

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

  const openEdit = (solution) => {
    setEditing(solution);
    setForm({
      name: solution.name || '',
      slug: solution.slug || '',
      description: solution.description || '',
      icon: solution.icon || '',
      sortOrder: solution.sortOrder ?? 0,
      active: solution.active ?? true,
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
        ? await adminRequest('PUT', `/solutions/admin/${editing.id}`, payload)
        : await adminRequest('POST', '/solutions/admin', payload);
      if (!res.ok) {
        toast.error(res.data?.error || res.data?.message || 'Failed to save solution');
        return;
      }
      toast.success(editing ? 'Solution updated' : 'Solution created');
      setShowModal(false);
      fetchSolutions();
    } catch {
      toast.error('Failed to save solution');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this solution?')) return;
    try {
      const res = await adminRequest('DELETE', `/solutions/admin/${id}`);
      if (!res.ok) {
        toast.error(res.data?.error || 'Failed to delete solution');
        return;
      }
      toast.success('Solution deleted');
      fetchSolutions();
    } catch {
      toast.error('Failed to delete solution');
    }
  };

  const toggleActive = async (solution) => {
    try {
      const res = await adminRequest('PUT', `/solutions/admin/${solution.id}`, {
        ...solution, active: !solution.active,
      });
      if (!res.ok) {
        toast.error('Failed to update status');
        return;
      }
      toast.success(`Solution ${solution.active ? 'deactivated' : 'activated'}`);
      fetchSolutions();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = solutions.filter((s) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.slug?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <p>You need ADMIN or SUPER permissions to manage solutions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-section-title-bar">
        <div>
          <h2 style={{ color: colors.text }}>Solutions Management</h2>
          <p style={{ color: colors.textSecondary }}>Manage solution categories for the site</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FaPlus /> Add Solution
        </button>
      </div>

      <div className="mb-6" style={{ position: 'relative', maxWidth: '400px' }}>
        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
        <input
          type="text"
          placeholder="Search solutions..."
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
            {filtered.map((solution) => (
              <tr key={solution.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '0.75rem 1rem', color: colors.text, fontWeight: 500 }}>{solution.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: colors.textSecondary, fontFamily: 'monospace', fontSize: '0.85rem' }}>{solution.slug}</td>
                <td style={{ padding: '0.75rem 1rem', color: colors.text, fontSize: '1.1rem' }}>{solution.icon || '—'}</td>
                <td style={{ padding: '0.75rem 1rem', color: colors.textSecondary }}>{solution.sortOrder ?? 0}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem',
                    background: solution.active ? '#E8F5E9' : '#FFEBEE',
                    color: solution.active ? colors.successDark : colors.error,
                  }}>
                    {solution.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                    <button onClick={() => toggleActive(solution)} title={solution.active ? 'Deactivate' : 'Activate'} style={{
                      padding: '6px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                      background: colors.backgroundTertiary, color: colors.text, cursor: 'pointer', fontSize: '0.8rem',
                    }}>
                      {solution.active ? <FaTimesCircle /> : <FaCheckCircle />}
                    </button>
                    <button onClick={() => openEdit(solution)} style={{
                      padding: '6px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                      background: colors.backgroundTertiary, color: colors.primary, cursor: 'pointer', fontSize: '0.8rem',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}>
                      <FaEdit /> Edit
                    </button>
                    <button onClick={() => handleDelete(solution.id)} style={{
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
          <FaLightbulb style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
          <p>No solutions found. Create your first solution to get started.</p>
        </div>
      )}

      {showModal && (
        <CrudModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? 'Edit Solution' : 'Add Solution'}
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
                <input name="icon" value={form.icon} onChange={handleChange} className="modal-input" placeholder="💡" />
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

export default SolutionsAdmin;
