import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';

const API_URL = '/testimonials';

const emptyForm = {
  name: '',
  company: '',
  role: '',
  text: '',
  rating: 5,
  imageUrl: '',
  confirmed: true,
};

const columns = [
  { key: 'name', title: 'Name' },
  { key: 'company', title: 'Company' },
  { key: 'role', title: 'Role' },
  { key: 'rating', title: 'Rating' },
  { key: 'confirmed', title: 'Confirmed', render: (val) => (val ? 'Yes' : 'No') },
  { key: 'text', title: 'Quote' },
  {
    key: 'imageUrl',
    title: 'Image',
    render: (val, row) => val ? <img src={val} alt={row.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%' }} /> : null,
  },
];

const TestimonialsAdmin = ({ theme }) => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setTestimonials(res.data || res || []);
    } catch (err) {
      setError('Failed to fetch testimonials');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row.id);
    setForm({
      name: row.name || '',
      company: row.company || '',
      role: row.role || '',
      text: row.text || '',
      rating: row.rating || 5,
      imageUrl: row.imageUrl || '',
      confirmed: row.confirmed !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setEditing(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        rating: Number(form.rating),
        imageUrl: form.imageUrl || undefined,
        company: form.company || undefined,
        role: form.role || undefined,
      };
      if (editing) {
        await apiPut(`${API_URL}/${editing}`, payload);
        setMessage('Updated successfully');
      } else {
        await apiPost(API_URL, payload);
        setMessage('Added successfully');
      }
      fetchTestimonials();
      closeModal();
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return;
    try {
      await apiDelete(`${API_URL}/${id}`);
      fetchTestimonials();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  return (
    <div className={`testimonials-admin-page ${theme}`}>
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage Testimonials</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={testimonials}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row.id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Testimonial' : 'Add Testimonial'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Customer name"
            className="admin-section-card"
            required
          />
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={handleChange}
            placeholder="Company"
            className="admin-section-card"
          />
          <input
            type="text"
            name="role"
            value={form.role}
            onChange={handleChange}
            placeholder="Role / title"
            className="admin-section-card"
          />
          <textarea
            name="text"
            value={form.text}
            onChange={handleChange}
            placeholder="Testimonial quote"
            className="admin-section-card"
            rows={4}
            required
          />
          <input
            type="number"
            name="rating"
            min="1"
            max="5"
            value={form.rating}
            onChange={handleChange}
            placeholder="Rating"
            className="admin-section-card"
          />
          <input
            type="url"
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            placeholder="Image URL (optional)"
            className="admin-section-card"
          />
          <label className="admin-section-card flex items-center gap-2">
            <input
              type="checkbox"
              name="confirmed"
              checked={form.confirmed}
              onChange={handleChange}
            />
            Show publicly
          </label>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="admin-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="admin-btn-primary">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
};

export default TestimonialsAdmin;
