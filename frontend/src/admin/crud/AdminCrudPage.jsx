import React, { useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';
import NestedEditor from './NestedEditor';

const isNestedType = (type) => type === 'object' || type === 'list';

const fieldDefaults = (fields) => fields.reduce((acc, field) => {
  if (isNestedType(field.type)) acc[field.name] = field.defaultValue ?? (field.type === 'list' ? [] : {});
  else acc[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
  return acc;
}, {});

const normalizeValue = (field, value) => {
  if (field.type === 'number') return value === '' ? null : Number(value);
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'json') return value ? JSON.parse(value) : undefined;
  if (field.type === 'array') return typeof value === 'string' ? value.split('\n').map((item) => item.trim()).filter(Boolean) : value;
  if (field.type === 'datetime-local') return value ? new Date(value).toISOString() : null;
  // object/list are kept as live JS objects/arrays held in form state.
  if (isNestedType(field.type)) return value;
  return value === '' && field.nullable ? null : value;
};

const formatValue = (field, value) => {
  if (field.type === 'json') return value ? JSON.stringify(value, null, 2) : '';
  if (field.type === 'array') return Array.isArray(value) ? value.join('\n') : '';
  if (field.type === 'datetime-local') return value ? new Date(value).toISOString().slice(0, 16) : '';
  if (isNestedType(field.type)) return value ?? field.defaultValue ?? (field.type === 'list' ? [] : {});
  return value ?? field.defaultValue ?? (field.type === 'checkbox' ? false : '');
};

const AdminCrudPage = ({ title, description, endpoint, adminEndpoint, columns, fields, createLabel = 'Add' }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const defaults = useMemo(() => fieldDefaults(fields), [fields]);
  const [form, setForm] = useState(defaults);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(adminEndpoint || endpoint);
      setItems(data.data || data || []);
    } catch (err) {
      setError(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(defaults);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm(fields.reduce((acc, field) => {
      acc[field.name] = formatValue(field, row[field.name]);
      return acc;
    }, {}));
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = fields.reduce((acc, field) => {
        acc[field.name] = normalizeValue(field, form[field.name]);
        return acc;
      }, {});
      if (editing) {
        await apiPut(`${endpoint}/${editing.id}`, payload);
        setMessage('Updated successfully');
      } else {
        await apiPost(endpoint, payload);
        setMessage('Created successfully');
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.title || row.name || row.label || 'this item'}?`)) return;
    try {
      await apiDelete(`${endpoint}/${row.id}`);
      setMessage('Deleted successfully');
      fetchItems();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-section-title-bar admin-section-title">
        <div>
          <span>{title}</span>
          {description && <p className="text-sm opacity-70 mt-1">{description}</p>}
        </div>
        <button className="admin-btn-primary" onClick={openCreate}>{createLabel}</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEdit(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => remove(row)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${title}` : createLabel}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {fields.map((field) => (
            <div key={field.name}>
              {field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.name])}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.checked })}
                  />
                  {field.label}
                </label>
              ) : isNestedType(field.type) ? (
                <NestedEditor
                  schema={field.schema ? (typeof field.schema === 'function' ? field.schema(editing) : field.schema) : { type: 'object', fields: [] }}
                  value={form[field.name]}
                  onChange={(next) => setForm({ ...form, [field.name]: next })}
                />
              ) : field.type === 'textarea' || field.type === 'json' || field.type === 'array' ? (
                <>
                  <label className="block text-sm font-semibold mb-1">{field.label}</label>
                  <textarea
                    value={form[field.name] ?? ''}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    className="admin-section-card w-full p-2 border rounded"
                    rows={field.rows || 4}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </>
              ) : field.type === 'select' ? (
                <>
                  <label className="block text-sm font-semibold mb-1">{field.label}</label>
                  <select
                    value={form[field.name] ?? ''}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    className="admin-section-card w-full p-2 border rounded"
                    required={field.required}
                  >
                    {(field.options || []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="block text-sm font-semibold mb-1">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    value={form[field.name] ?? ''}
                    onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    className="admin-section-card w-full p-2 border rounded"
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="admin-btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="admin-btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
};

export default AdminCrudPage;
