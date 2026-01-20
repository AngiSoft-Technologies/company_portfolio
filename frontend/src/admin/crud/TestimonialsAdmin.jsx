import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';

const API_URL = '/testimonials';

const columns = [
  { key: 'username', title: 'Username' },
  { key: 'title', title: 'Title' },
  { key: 'message', title: 'Message', render: (val) => (Array.isArray(val) ? val.join('\n') : val) },
  { key: 'imageLink', title: 'Image', render: (val, row) => val ? <img src={val} alt={row.username} style={{width:40,height:40,objectFit:'contain'}} /> : null },
];

const TestimonialsAdmin = ({ theme }) => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', title: '', message: '', imageLink: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setTestimonials(res.data || []);
    } catch (err) {
      setError('Failed to fetch testimonials');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ username: '', title: '', message: '', imageLink: '' });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row._id);
    setForm({ username: row.username, title: row.title, message: Array.isArray(row.message) ? row.message.join('\n') : row.message, imageLink: row.imageLink || '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ username: '', title: '', message: '', imageLink: '' });
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
      const payload = { ...form, message: form.message.split('\n') };
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
            <button className="admin-btn-danger" onClick={() => handleDelete(row._id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Testimonial' : 'Add Testimonial'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Username"
            className="admin-section-card"
            required
          />
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Title"
            className="admin-section-card"
          />
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Message (one per line)"
            className="admin-section-card"
            rows={3}
            required
          />
          <input
            type="text"
            name="imageLink"
            value={form.imageLink}
            onChange={handleChange}
            placeholder="Image Link (URL, optional)"
            className="admin-section-card"
          />
          <div style={{display:'flex',gap:'1rem',justifyContent:'flex-end'}}>
            <button type="button" className="admin-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="admin-btn-primary">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </CrudModal>
    </div>
  );
};

export default TestimonialsAdmin; 