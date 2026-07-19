import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPut } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from '../utils/toast';
import {
    FaArrowLeft, FaSave, FaSyncAlt, FaShieldAlt, FaKey,
    FaUserTag, FaChevronDown, FaChevronRight, FaCheck,
    FaBoxOpen, FaProjectDiagram, FaCalendarCheck, FaEnvelopeOpenText, FaExclamationTriangle
} from 'react-icons/fa';

// Risk badge palette (kept consistent with dark admin theme)
const RISK_COLORS = {
    LOW: { bg: 'rgba(34,197,94,0.16)', fg: '#4ade80', label: 'Low' },
    MEDIUM: { bg: 'rgba(234,179,8,0.16)', fg: '#facc15', label: 'Medium' },
    HIGH: { bg: 'rgba(249,115,22,0.16)', fg: '#fb923c', label: 'High' },
    CRITICAL: { bg: 'rgba(239,68,68,0.18)', fg: '#f87171', label: 'Critical' }
};

// Source chip palette
const SOURCE_COLORS = {
    ROLE: { bg: 'rgba(0,175,255,0.14)', fg: '#5ab8ff' },
    PRESET: { bg: 'rgba(168,85,247,0.16)', fg: '#c084fc' },
    ASSIGNMENT: { bg: 'rgba(16,185,129,0.16)', fg: '#34d399' },
    DIRECT_GRANT: { bg: 'rgba(34,197,94,0.18)', fg: '#4ade80' },
    DENIED: { bg: 'rgba(239,68,68,0.18)', fg: '#f87171' },
    INHERIT: { bg: 'rgba(148,163,184,0.16)', fg: '#94a3b8' }
};

const SOURCE_LABELS = {
    ROLE: 'Role',
    PRESET: 'Preset',
    ASSIGNMENT: 'Assignment',
    DIRECT_GRANT: 'Direct grant',
    DENIED: 'Denied',
    INHERIT: 'Inherit'
};

const EFFECT_LABELS = { GRANT: 'Grant', DENY: 'Deny', INHERIT: 'Inherit' };

// Helper: normalize list responses that may be arrays or { key: [] }
const asArray = (res, key) =>
    Array.isArray(res) ? res : (res && Array.isArray(res[key]) ? res[key] : []);

const StaffAccess = () => {
    const { id } = useParams();
    const { colors } = useTheme();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [forbidden, setForbidden] = useState(false);
    const [data, setData] = useState(null); // server payload

    // Draft state
    const [identity, setIdentity] = useState({ departmentId: '', positionId: '', seniorityLevel: '', publicTitle: '' });
    const [presetId, setPresetId] = useState('');
    const [presetAppliedKeys, setPresetAppliedKeys] = useState([]); // keys marked as PRESET source
    const [controls, setControls] = useState({}); // key -> 'INHERIT' | 'GRANT' | 'DENY'
    const [expandedGroups, setExpandedGroups] = useState({});

    // Assignment lists (fetched separately)
    const [products, setProducts] = useState([]);
    const [projects, setProjects] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [enquiries, setEnquiries] = useState([]);
    const [enquiriesUnavailable, setEnquiriesUnavailable] = useState(false);
    const [assignments, setAssignments] = useState({ products: [], projects: [], bookings: [], enquiries: [] });

    const fetchAccess = async () => {
        setLoading(true);
        setError(null);
        setForbidden(false);
        try {
            const res = await apiGet(`/admin/staff/${id}/access`);
            setData(res);

            const emp = res.employee || {};
            setIdentity({
                departmentId: emp.departmentId || '',
                positionId: emp.positionId || '',
                seniorityLevel: emp.seniorityLevel || '',
                publicTitle: emp.publicTitle || (emp.position && emp.position.displayTitleTemplate) || ''
            });

            // Initialize per-permission controls from current effective source
            const initial = {};
            const effMap = {};
            (res.effective?.permissions || []).forEach((p) => { effMap[p.key] = p; });
            (res.current?.direct || []).forEach((d) => { effMap[d.key] = { ...(effMap[d.key] || {}), direct: d }; });
            (res.catalogs || []).forEach((group) => {
                (group.permissions || []).forEach((perm) => {
                    const eff = effMap[perm.key];
                    let sel = 'INHERIT';
                    if (eff && eff.direct && eff.direct.effect === 'DENY') sel = 'DENY';
                    else if (eff && eff.direct && eff.direct.effect === 'GRANT') sel = 'GRANT';
                    initial[perm.key] = sel;
                });
            });
            setControls(initial);

            const curAssign = res.current?.assignments || {};
            setAssignments({
                products: (curAssign.products || []).map((p) => p.id || p),
                projects: (curAssign.projects || []).map((p) => p.id || p),
                bookings: (curAssign.bookings || []).map((b) => b.id || b),
                enquiries: (curAssign.enquiries || []).map((e) => e.id || e)
            });
        } catch (e) {
            if (e && e.status === 403) {
                setForbidden(true);
            } else {
                setError(e?.message || 'Failed to load staff access data.');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchLists = async () => {
        try {
            const [prodRes, projRes, bookRes] = await Promise.all([
                apiGet('/products/admin').catch(() => []),
                apiGet('/client-projects').catch(() => ({ projects: [] })),
                apiGet('/bookings/admin').catch(() => [])
            ]);
            setProducts(asArray(prodRes, 'products'));
            setProjects(asArray(projRes, 'projects'));
            setBookings(asArray(bookRes, 'bookings'));

            // Enquiries admin list endpoint is not provided by the backend; degrade gracefully.
            const enqRes = await apiGet('/contact-enquiries/admin').catch(() => null);
            if (enqRes) {
                setEnquiries(asArray(enqRes, 'enquiries'));
            } else {
                setEnquiriesUnavailable(true);
                setEnquiries([]);
            }
        } catch {
            // Non-fatal: leave lists empty
            setEnquiriesUnavailable(true);
        }
    };

    useEffect(() => {
        fetchAccess();
        fetchLists();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Derived structures
    const departments = useMemo(() => (data?.departments || []), [data]);
    const positions = useMemo(() => (data?.positions || []), [data]);
    const presets = useMemo(() => (data?.presets || []), [data]);
    const catalogs = useMemo(() => (data?.catalogs || []), [data]);

    const positionsForDept = useMemo(() => {
        if (!identity.departmentId) return positions;
        return positions.filter((p) => p.departmentId === identity.departmentId);
    }, [positions, identity.departmentId]);

    const selectedPosition = useMemo(
        () => positions.find((p) => p.id === identity.positionId),
        [positions, identity.positionId]
    );

    const seniorityOptions = useMemo(
        () => (selectedPosition?.seniorityLevels || []),
        [selectedPosition]
    );

    // Effective preview: server-computed (re-derive locally as best-effort)
    const effectivePreview = useMemo(() => {
        const effMap = {};
        (data?.effective?.permissions || []).forEach((p) => { effMap[p.key] = { ...p }; });

        // Apply local control overrides (Inherit keeps server effective; Grant/Deny override)
        (data?.catalogs || []).forEach((group) => {
            (group.permissions || []).forEach((perm) => {
                const sel = controls[perm.key] || 'INHERIT';
                if (sel === 'GRANT') {
                    effMap[perm.key] = { key: perm.key, effect: 'GRANT', source: 'DIRECT_GRANT' };
                } else if (sel === 'DENY') {
                    effMap[perm.key] = { key: perm.key, effect: 'DENY', source: 'DENIED' };
                }
            });
        });

        // Build ordered list matching catalog order
        const out = [];
        (data?.catalogs || []).forEach((group) => {
            (group.permissions || []).forEach((perm) => {
                out.push({ ...perm, ...(effMap[perm.key] || { effect: 'INHERIT', source: 'INHERIT' }) });
            });
        });
        return out;
    }, [data, controls]);

    const applyPreset = () => {
        const preset = presets.find((p) => p.id === presetId);
        if (!preset) return;
        const keys = preset.permissionKeys || [];
        setPresetAppliedKeys(keys);
        // Load preset keys as GRANT (PRESET source). Non-preset keys revert to INHERIT unless directly set.
        setControls((prev) => {
            const next = { ...prev };
            (data?.catalogs || []).forEach((group) => {
                (group.permissions || []).forEach((perm) => {
                    next[perm.key] = keys.includes(perm.key) ? 'GRANT' : (prev[perm.key] === 'DENY' ? 'DENY' : 'INHERIT');
                });
            });
            return next;
        });
        toast.info(`Preset "${preset.name}" applied (not yet saved).`);
    };

    const setControl = (key, value) => {
        setControls((prev) => ({ ...prev, [key]: value }));
        if (value !== 'GRANT') {
            setPresetAppliedKeys((prev) => prev.filter((k) => k !== key));
        }
    };

    const toggleGroup = (groupName) => {
        setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const toggleAssignment = (kind, valueId) => {
        setAssignments((prev) => {
            const arr = prev[kind] || [];
            const exists = arr.includes(valueId);
            return { ...prev, [kind]: exists ? arr.filter((x) => x !== valueId) : [...arr, valueId] };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const directPermissions = Object.entries(controls)
                .filter(([, v]) => v === 'GRANT' || v === 'DENY')
                .map(([key, v]) => ({ key, effect: v }));

            await apiPut(`/admin/staff/${id}/access`, {
                identity: {
                    departmentId: identity.departmentId || null,
                    positionId: identity.positionId || null,
                    seniorityLevel: identity.seniorityLevel || null,
                    publicTitle: identity.publicTitle
                },
                directPermissions,
                assignmentScopes: {
                    products: assignments.products,
                    projects: assignments.projects,
                    bookings: assignments.bookings,
                    enquiries: assignments.enquiries
                }
            });
            toast.success('Access settings saved.');
            setPresetAppliedKeys([]);
            await fetchAccess();
        } catch (e) {
            if (e && e.status === 403) {
                setForbidden(true);
                toast.error('You do not have permission to manage this staff member’s access.');
            } else {
                toast.error(e?.message || 'Failed to save access settings.');
            }
        } finally {
            setSaving(false);
        }
    };

    // ---- Render helpers ----
    const riskBadge = (risk) => {
        const c = RISK_COLORS[risk] || RISK_COLORS.LOW;
        return (
            <span style={{
                backgroundColor: c.bg, color: c.fg, fontSize: '0.7rem', fontWeight: 600,
                padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.02em'
            }}>{c.label}</span>
        );
    };

    const sourceChip = (source) => {
        const c = SOURCE_COLORS[source] || SOURCE_COLORS.INHERIT;
        return (
            <span style={{
                backgroundColor: c.bg, color: c.fg, fontSize: '0.68rem', fontWeight: 600,
                padding: '2px 8px', borderRadius: '999px'
            }}>{SOURCE_LABELS[source] || source}</span>
        );
    };

    const card = {
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '24px'
    };

    const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px', display: 'block' };
    const inputStyle = {
        width: '100%', backgroundColor: colors.backgroundSecondary, color: colors.text,
        border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '10px 12px', fontSize: '0.9rem'
    };

    if (loading) {
        return (
            <div style={{ padding: '32px' }}>
                <div style={{ ...card, minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: colors.textSecondary }}>Loading access configuration…</div>
                </div>
            </div>
        );
    }

    if (forbidden) {
        return (
            <div style={{ padding: '32px' }}>
                <div style={{ ...card, textAlign: 'center' }}>
                    <FaExclamationTriangle size={32} style={{ color: '#f87171', marginBottom: '12px' }} />
                    <h2 style={{ color: colors.text, marginBottom: '8px' }}>Access restricted</h2>
                    <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
                        You do not have permission to manage this staff member’s access.
                    </p>
                    <Link to="/admin/staff" style={{ color: colors.brandCyan || colors.secondary }}>
                        ← Back to Staff Management
                    </Link>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '32px' }}>
                <div style={{ ...card, textAlign: 'center' }}>
                    <p style={{ color: '#f87171', marginBottom: '16px' }}>{error}</p>
                    <button onClick={fetchAccess} className="flex items-center gap-2"
                        style={{ ...inputStyle, display: 'inline-flex', cursor: 'pointer', color: colors.text }}>
                        <FaSyncAlt /> Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const empName = `${(data.employee?.firstName) || ''} ${(data.employee?.lastName) || ''}`.trim() || 'Staff';

    return (
        <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: '24px' }}>
                <div>
                    <Link to="/admin/staff" style={{ color: colors.textSecondary, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <FaArrowLeft size={12} /> Staff Management
                    </Link>
                    <h1 style={{ color: colors.text, fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaKey /> Manage Access — {empName}
                    </h1>
                    <p style={{ color: colors.textSecondary, fontSize: '0.85rem', marginTop: '4px' }}>
                        Role: {data.employee?.role || '—'} · {data.employee?.email || ''}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2"
                    style={{
                        ...inputStyle, cursor: saving ? 'not-allowed' : 'pointer', display: 'inline-flex',
                        backgroundColor: colors.brandCyan || colors.secondary, color: '#fff', fontWeight: 600,
                        opacity: saving ? 0.7 : 1, width: 'auto', padding: '10px 18px'
                    }}
                >
                    <FaSave /> {saving ? 'Saving…' : 'Save Access'}
                </button>
            </div>

            {/* Professional identity */}
            <section style={{ ...card, marginBottom: '24px' }}>
                <h2 style={{ color: colors.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaUserTag /> Professional Identity
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label style={labelStyle}>Department</label>
                        <select style={inputStyle} value={identity.departmentId}
                            onChange={(e) => setIdentity((p) => ({ ...p, departmentId: e.target.value, positionId: '' }))}>
                            <option value="">Select department…</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Position</label>
                        <select style={inputStyle} value={identity.positionId} disabled={!identity.departmentId}
                            onChange={(e) => setIdentity((p) => ({ ...p, positionId: e.target.value, seniorityLevel: '' }))}>
                            <option value="">{identity.departmentId ? 'Select position…' : 'Select department first'}</option>
                            {positionsForDept.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Seniority</label>
                        <select style={inputStyle} value={identity.seniorityLevel} disabled={!seniorityOptions.length}
                            onChange={(e) => setIdentity((p) => ({ ...p, seniorityLevel: e.target.value }))}>
                            <option value="">{seniorityOptions.length ? 'Select seniority…' : 'No seniority levels'}</option>
                            {seniorityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Public display title</label>
                        <input style={inputStyle} value={identity.publicTitle}
                            placeholder={selectedPosition?.displayTitleTemplate || 'e.g. Senior Software Engineer'}
                            onChange={(e) => setIdentity((p) => ({ ...p, publicTitle: e.target.value }))} />
                    </div>
                </div>
            </section>

            {/* Permission preset */}
            <section style={{ ...card, marginBottom: '24px' }}>
                <h2 style={{ color: colors.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaShieldAlt /> Permission Preset
                </h2>
                <div className="flex items-end gap-3 flex-wrap">
                    <div style={{ flex: '1 1 240px' }}>
                        <label style={labelStyle}>Preset</label>
                        <select style={inputStyle} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                            <option value="">Select a preset…</option>
                            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <button onClick={applyPreset} disabled={!presetId}
                        className="flex items-center gap-2"
                        style={{
                            ...inputStyle, cursor: presetId ? 'pointer' : 'not-allowed', display: 'inline-flex',
                            width: 'auto', backgroundColor: colors.backgroundSecondary, color: colors.text,
                            opacity: presetId ? 1 : 0.6, padding: '10px 16px'
                        }}>
                        <FaCheck /> Apply preset
                    </button>
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '0.78rem', marginTop: '8px' }}>
                    Applying a preset does not auto-save. It loads the preset’s permissions as GRANT (marked “Preset” source) until you save.
                </p>
            </section>

            {/* Granular permissions */}
            <section style={{ ...card, marginBottom: '24px' }}>
                <h2 style={{ color: colors.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaKey /> Granular Permissions
                </h2>
                {catalogs.length === 0 && (
                    <p style={{ color: colors.textSecondary }}>No permission catalogue available.</p>
                )}
                {catalogs.map((group) => {
                    const isOpen = expandedGroups[group.group] !== false; // default open
                    return (
                        <div key={group.group} style={{ marginBottom: '12px', border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                            <button onClick={() => toggleGroup(group.group)}
                                className="flex items-center justify-between w-full"
                                style={{
                                    backgroundColor: colors.backgroundSecondary, color: colors.text,
                                    padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600
                                }}>
                                <span className="flex items-center gap-2">
                                    {isOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                                    {group.group}
                                </span>
                                <span style={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                                    {(group.permissions || []).length} permission(s)
                                </span>
                            </button>
                            {isOpen && (
                                <div style={{ padding: '8px 16px 12px' }}>
                                    {(group.permissions || []).map((perm) => {
                                        const sel = controls[perm.key] || 'INHERIT';
                                        const eff = (data.effective?.permissions || []).find((p) => p.key === perm.key);
                                        const curDirect = (data.current?.direct || []).find((p) => p.key === perm.key);
                                        let source = eff?.source || 'INHERIT';
                                        if (sel === 'GRANT' && !curDirect) source = 'PRESET';
                                        if (sel === 'GRANT' || sel === 'DENY') {
                                            if (presetAppliedKeys.includes(perm.key) && !curDirect) source = 'PRESET';
                                            else if (curDirect) source = sel === 'DENY' ? 'DENIED' : 'DIRECT_GRANT';
                                        }
                                        return (
                                            <div key={perm.key}
                                                style={{
                                                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
                                                    padding: '12px 0', borderBottom: `1px solid ${colors.border}`
                                                }}>
                                                <div style={{ flex: '1 1 280px' }}>
                                                    <div className="flex items-center gap-2" style={{ marginBottom: '2px' }}>
                                                        <span style={{ color: colors.text, fontWeight: 600, fontSize: '0.9rem' }}>{perm.display}</span>
                                                        {riskBadge(perm.risk)}
                                                    </div>
                                                    <div style={{ color: colors.textSecondary, fontSize: '0.78rem' }}>{perm.description}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {['INHERIT', 'GRANT', 'DENY'].map((opt) => (
                                                        <button key={opt} onClick={() => setControl(perm.key, opt)}
                                                            style={{
                                                                padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                                                                cursor: 'pointer', border: `1px solid ${colors.border}`,
                                                                backgroundColor: sel === opt ? (opt === 'DENY' ? 'rgba(239,68,68,0.25)' : opt === 'GRANT' ? 'rgba(34,197,94,0.25)' : colors.brandCyan || colors.secondary) : colors.backgroundSecondary,
                                                                color: sel === opt ? '#fff' : colors.text
                                                            }}>
                                                            {EFFECT_LABELS[opt]}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div>{sourceChip(source)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </section>

            {/* Record assignments */}
            <section style={{ ...card, marginBottom: '24px' }}>
                <h2 style={{ color: colors.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Record Assignments</h2>

                <AssignmentBlock
                    icon={<FaBoxOpen />} title="Products" items={products} selected={assignments.products}
                    getId={(p) => p.id} getLabel={(p) => p.name || p.title || p.id}
                    onToggle={(pid) => toggleAssignment('products', pid)} colors={colors} inputStyle={inputStyle} labelStyle={labelStyle}
                />

                <AssignmentBlock
                    icon={<FaProjectDiagram />} title="Projects" items={projects} selected={assignments.projects}
                    getId={(p) => p.id} getLabel={(p) => p.title || p.name || p.id}
                    onToggle={(pid) => toggleAssignment('projects', pid)} colors={colors} inputStyle={inputStyle} labelStyle={labelStyle}
                />

                <AssignmentBlock
                    icon={<FaCalendarCheck />} title="Bookings" items={bookings} selected={assignments.bookings}
                    getId={(b) => b.id}
                    getLabel={(b) => `#${(b.reference || b.id || '').toString().slice(0, 8)} · ${b.client?.name || b.clientName || b.eventType || 'Booking'}`}
                    onToggle={(bid) => toggleAssignment('bookings', bid)} colors={colors} inputStyle={inputStyle} labelStyle={labelStyle}
                />

                <AssignmentBlock
                    icon={<FaEnvelopeOpenText />} title="Enquiries" items={enquiries} selected={assignments.enquiries}
                    getId={(e) => e.id} getLabel={(e) => `${e.name || e.subject || 'Enquiry'} ${(e.email) ? `· ${e.email}` : ''}`}
                    onToggle={(eid) => toggleAssignment('enquiries', eid)} colors={colors} inputStyle={inputStyle} labelStyle={labelStyle}
                    unavailable={enquiriesUnavailable}
                    unavailableNote="No admin enquiries endpoint is available from the backend yet. This assignment list will populate once the API is wired."
                />
            </section>

            {/* Effective access preview */}
            <section style={{ ...card, marginBottom: '24px' }}>
                <h2 style={{ color: colors.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaShieldAlt /> Effective Access Preview
                </h2>
                <p style={{ color: colors.textSecondary, fontSize: '0.78rem', marginBottom: '14px' }}>
                    Computed from server effective state, updated locally as you toggle. DENY is struck-through red, GRANT green, ASSIGNMENT blue.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {effectivePreview.map((perm) => {
                        const eff = perm.effect || 'INHERIT';
                        const strike = eff === 'DENY';
                        const color = eff === 'DENY' ? '#f87171' : eff === 'GRANT' ? '#4ade80' : colors.textSecondary;
                        return (
                            <div key={perm.key} className="flex items-center gap-3 flex-wrap"
                                style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: colors.backgroundSecondary }}>
                                <span style={{ color, textDecoration: strike ? 'line-through' : 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                                    {perm.display}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: colors.textSecondary }}>{perm.key}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color, fontWeight: 600 }}>
                                    {eff}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

const AssignmentBlock = ({ icon, title, items, selected, getId, getLabel, onToggle, colors, inputStyle, labelStyle, unavailable, unavailableNote }) => (
    <div style={{ marginBottom: '18px' }}>
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', color: colors.text }}>
            {icon} {title}
        </label>
        {unavailable ? (
            <div style={{ ...inputStyle, color: colors.textSecondary, fontSize: '0.82rem' }}>
                {unavailableNote}
            </div>
        ) : items.length === 0 ? (
            <div style={{ ...inputStyle, color: colors.textSecondary, fontSize: '0.82rem' }}>Loading {title.toLowerCase()}…</div>
        ) : (
            <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                    const iid = getId(item);
                    const isSel = selected.includes(iid);
                    return (
                        <button key={iid} onClick={() => onToggle(iid)}
                            className="flex items-center gap-2"
                            style={{
                                padding: '8px 14px', borderRadius: '999px', fontSize: '0.8rem', cursor: 'pointer',
                                border: `1px solid ${isSel ? (colors.brandCyan || colors.secondary) : colors.border}`,
                                backgroundColor: isSel ? (colors.brandCyan || colors.secondary) : colors.backgroundSecondary,
                                color: isSel ? '#fff' : colors.text
                            }}>
                            {isSel && <FaCheck size={11} />} {getLabel(item)}
                        </button>
                    );
                })}
            </div>
        )}
    </div>
);

export default StaffAccess;
