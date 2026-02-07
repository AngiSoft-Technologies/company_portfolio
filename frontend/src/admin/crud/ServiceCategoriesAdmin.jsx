import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';

const API_URL = '/service-categories';

const columns = [
  { key: 'name', title: 'Name' },
  { key: 'slug', title: 'Slug' },
  { key: 'order', title: 'Order' },
  { key: 'published', title: 'Published', render: (val) => val ? '✓' : '✗' }
];

const ServiceCategoriesAdmin = ({ theme }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    order: 0,
    published: true
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setCategories(res.data || res || []);
    } catch (err) {
      setError('Failed to fetch categories');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      icon: '',
      order: 0,
      published: true
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row.id);
    setForm({
      name: row.name || '',
      slug: row.slug || '',
      description: row.description || '',
      icon: row.icon || '',
      order: row.order ?? 0,
      published: row.published ?? true
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const generateSlug = (value) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        order: form.order === '' ? 0 : Number(form.order)
      };
      if (editing) {
        await apiPut(`${API_URL}/${editing}`, payload);
        setMessage('Updated successfully');
      } else {
        await apiPost(API_URL, payload);
        setMessage('Added successfully');
      }
      fetchCategories();
      closeModal();
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await apiDelete(`${API_URL}/${id}`);
      fetchCategories();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  return (
    <div className={`service-categories-admin-page ${theme}`}>
      <div className="admin-section-title-bar admin-section-title">
        <span>Service Categories</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={categories}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row.id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleNameChange}
              placeholder="e.g., Custom Software"
              className="admin-section-card w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Slug</label>
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="custom-software"
              className="admin-section-card w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description shown in the CMS"
              className="admin-section-card w-full p-2 border rounded"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Icon (optional)</label>
            <input
              type="text"
              name="icon"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="e.g., FaLaptopCode"
              className="admin-section-card w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Order</label>
            <input
              type="number"
              name="order"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              className="admin-section-card w-full p-2 border rounded"
            />
          </div>

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

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="admin-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="admin-btn-primary">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
};

export default ServiceCategoriesAdmin;
