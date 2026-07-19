import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from '../utils/toast';
import {
  FaTags, FaEdit, FaSearch, FaTimesCircle, FaSave
} from 'react-icons/fa';

// Local admin request helper that surfaces status codes so callers can
// fail safe. Adds the admin token from localStorage.
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

// Pretty-print a pricing value (object/array/string) for display.
const prettyPricing = (pricing) => {
  if (pricing === null || pricing === undefined) return '—';
  if (typeof pricing === 'string') {
    if (!pricing.trim()) return '—';
    try {
      return JSON.stringify(JSON.parse(pricing), null, 2);
    } catch {
      return pricing;
    }
  }
  try {
    return JSON.stringify(pricing, null, 2);
  } catch {
    return String(pricing);
  }
};

const PricingAdmin = () => {
  const { colors } = useTheme();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState(null); // service being edited
  const [draft, setDraft] = useState('');
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError('');
      setAccessDenied(false);
      const res = await adminRequest('GET', '/services/admin/pricing');
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAccessDenied(true);
          setServices([]);
        } else {
          setError('Failed to load services');
        }
        return;
      }
      setServices(res.data?.data || res.data || []);
    } catch {
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const openEdit = (service) => {
    setEditing(service);
    setDraft(prettyPricing(service.pricing).replace('—', ''));
    setParseError('');
  };

  const closeEdit = () => {
    setEditing(null);
    setDraft('');
    setParseError('');
  };

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    if (parseError) setParseError('');
  };

  const handleSave = async () => {
    let parsed;
    const trimmed = draft.trim();
    if (trimmed === '') {
      parsed = null;
    } else {
      try {
        const candidate = JSON.parse(trimmed);
        // Pricing must be an object or array per the schema (Json field).
        if (typeof candidate !== 'object' || candidate === null) {
          setParseError('Pricing must be a JSON object or array.');
          return;
        }
        parsed = candidate;
      } catch (parseErr) {
        setParseError(`Invalid JSON: ${parseErr.message}`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await adminRequest('PUT', `/services/${editing.id}/pricing`, { pricing: parsed });
      if (!res.ok) {
        toast.error(res.data?.error || res.data?.message || 'Failed to save pricing');
        return;
      }
      toast.success('Pricing updated');
      setEditing(null);
      fetchServices();
    } catch {
      toast.error('Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const filtered = services.filter((s) =>
    s.title?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <p>You need permission to manage service pricing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-section-title-bar">
        <div>
          <h2 style={{ color: colors.text }}>Service Pricing</h2>
          <p style={{ color: colors.textSecondary }}>Edit pricing JSON for each service</p>
        </div>
      </div>

      <div className="mb-6" style={{ position: 'relative', maxWidth: '400px' }}>
        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
        <input
          type="text"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-login-input"
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {error && <p style={{ color: colors.error }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {filtered.map((service) => (
          <div
            key={service.id}
            className="dashboard-card"
            style={{
              flexDirection: 'column',
              alignItems: 'stretch',
              border: `1px solid ${colors.border}`,
              background: colors.surface,
            }}
          >
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: colors.text }}>{service.title}</h3>
                <button onClick={() => openEdit(service)} style={{
                  padding: '6px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                  background: colors.backgroundTertiary, color: colors.primary, cursor: 'pointer', fontSize: '0.8rem',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                }}>
                  <FaEdit /> Edit Pricing
                </button>
              </div>
              <div>
                <span style={{
                  display: 'inline-block', fontSize: '0.7rem', textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: colors.textSecondary, marginBottom: '0.4rem',
                }}>
                  Current Pricing
                </span>
                <pre style={{
                  margin: 0, padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem',
                  background: colors.backgroundSecondary, color: colors.text,
                  border: `1px solid ${colors.border}`, overflow: 'auto', maxHeight: '180px',
                  fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {prettyPricing(service.pricing)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: colors.textMuted }}>
          <FaTags style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
          <p>No services found.</p>
        </div>
      )}

      {/* Edit panel */}
      {editing && (
        <div
          onClick={closeEdit}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '640px', borderRadius: '16px', padding: '1.5rem',
              background: colors.surface, border: `1px solid ${colors.border}`,
              display: 'flex', flexDirection: 'column', gap: '1rem',
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: colors.text }}>Edit Pricing — {editing.title}</h3>
              <button onClick={closeEdit} style={{
                background: 'transparent', border: 'none', color: colors.textSecondary,
                cursor: 'pointer', fontSize: '1.1rem',
              }}>
                <FaTimesCircle />
              </button>
            </div>

            <div>
              <label className="modal-label">Pricing JSON</label>
              <textarea
                value={draft}
                onChange={handleDraftChange}
                rows={12}
                className="modal-input"
                placeholder={'{\n  "currency": "KES",\n  "plans": []\n}'}
                style={{
                  resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem',
                  borderColor: parseError ? colors.error : colors.border,
                }}
              />
              {parseError && (
                <p style={{ color: colors.error, fontSize: '0.8rem', marginTop: '0.35rem' }}>{parseError}</p>
              )}
              <p style={{ color: colors.textSecondary, fontSize: '0.75rem', marginTop: '0.35rem' }}>
                Enter a JSON object or array. Leave empty to clear pricing.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeEdit} className="modal-btn modal-btn-cancel">Cancel</button>
              <button
                type="button"
                onClick={handleSave}
                className="modal-btn"
                disabled={saving}
                style={{ background: colors.primary, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FaSave /> {saving ? 'Saving...' : 'Save Pricing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingAdmin;
