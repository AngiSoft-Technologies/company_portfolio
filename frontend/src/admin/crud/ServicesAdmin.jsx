import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';

const API_URL = '/services';

const DEFAULT_CATEGORIES = [
  'Custom Software',
  'Automation & Debugging',
  'Data Analysis',
  'Cyber Services',
  'Government Services',
  'Advertising',
  'Internet Services',
  'Entertainment Services',
  'General'
];

const columns = [
  { key: 'title', title: 'Service' },
  { key: 'category', title: 'Category', render: (_val, row) => row.categoryRef?.name || row.category || 'General' },
  { key: 'description', title: 'Description' },
];

const ServicesAdmin = ({ theme }) => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ 
    title: '', 
    slug: '',
    description: '', 
    category: 'General',
    categoryId: '',
    priceFrom: '',
    targetAudience: '',
    scope: '',
    published: false
  });
  const [message, setMessage] = useState('');

  const categoryOptions = categories.length
    ? [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : DEFAULT_CATEGORIES.map((name) => ({ id: name, name }));

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setServices(res.data || res || []);
    } catch (err) {
      setError('Failed to fetch services');
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await apiGet('/service-categories');
      setCategories(res.data || res || []);
    } catch (err) {
      setCategories([]);
    }
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ 
      title: '', 
      slug: '',
      description: '', 
      category: 'General',
      categoryId: '',
      priceFrom: '',
      targetAudience: '',
      scope: '',
      published: false
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row.id);
    setForm({ 
      title: row.title || '', 
      slug: row.slug || '',
      description: row.description || '', 
      category: row.categoryRef?.name || row.category || 'General',
      categoryId: row.categoryId || row.categoryRef?.id || '',
      priceFrom: row.priceFrom || '',
      targetAudience: row.targetAudience || '',
      scope: row.scope || '',
      published: row.published || false
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ 
      title: '', 
      slug: '',
      description: '', 
      category: 'General',
      categoryId: '',
      priceFrom: '',
      targetAudience: '',
      scope: '',
      published: false
    });
    setEditing(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        priceFrom: form.priceFrom === '' ? undefined : Number(form.priceFrom),
        categoryId: form.categoryId || undefined
      };
      if (editing) {
        await apiPut(`${API_URL}/${editing}`, payload);
        setMessage('Updated successfully');
      } else {
        await apiPost(API_URL, payload);
        setMessage('Added successfully');
      }
      fetchServices();
      closeModal();
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await apiDelete(`${API_URL}/${id}`);
      fetchServices();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  // Auto-generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm({ 
      ...form, 
      title,
      slug: form.slug === '' || form.slug === generateSlug(form.title) ? generateSlug(title) : form.slug
    });
  };

  return (
    <div className={`services-admin-page ${theme}`}>
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage Services</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={services}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row.id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Service' : 'Add Service'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-1">Service Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleTitleChange}
              placeholder="e.g., Web Application Development"
              className="admin-section-card w-full p-2 border rounded"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-semibold mb-1">Slug (auto-generated)</label>
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="web-app-development"
              className="admin-section-card w-full p-2 border rounded"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold mb-1">Category *</label>
            <select
              name="category"
              value={form.category}
              onChange={(e) => {
                const selected = e.target.value;
                const matched = categories.find((cat) => cat.name === selected);
                setForm({ ...form, category: selected, categoryId: matched?.id || '' });
              }}
              className="admin-section-card w-full p-2 border rounded"
            >
              {categoryOptions.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-1">Description *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Detailed service description..."
              className="admin-section-card w-full p-2 border rounded"
              rows="4"
              required
            />
          </div>

          {/* Price From */}
          <div>
            <label className="block text-sm font-semibold mb-1">Price From ($)</label>
            <input
              type="number"
              name="priceFrom"
              value={form.priceFrom}
              onChange={(e) => setForm({ ...form, priceFrom: e.target.value })}
              placeholder="2000"
              className="admin-section-card w-full p-2 border rounded"
              step="0.01"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-semibold mb-1">Target Audience</label>
            <input
              type="text"
              name="targetAudience"
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              placeholder="e.g., Startups, Businesses, Enterprises"
              className="admin-section-card w-full p-2 border rounded"
            />
          </div>

          {/* Scope/Duration */}
          <div>
            <label className="block text-sm font-semibold mb-1">Typical Scope/Duration</label>
            <input
              type="text"
              name="scope"
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              placeholder="e.g., 2-12 weeks"
              className="admin-section-card w-full p-2 border rounded"
            />
          </div>

          {/* Published */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="published"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              id="published"
            />
            <label htmlFor="published" className="text-sm">Published</label>
          </div>

          {/* Buttons */}
          <div style={{display:'flex',gap:'1rem',justifyContent:'flex-end',marginTop:'1rem'}}>
            <button type="button" className="admin-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="admin-btn-primary">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
};

export default ServicesAdmin; 
