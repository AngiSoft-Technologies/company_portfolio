import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';

const API_URL = '/services';

const columns = [
  { key: 'name', title: 'Service' },
  { key: 'description', title: 'Description' },
];

const ServicesAdmin = ({ theme }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setServices(res.data || []);
    } catch (err) {
      setError('Failed to fetch services');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row._id);
    setForm({ name: row.name, description: row.description });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ name: '', description: '' });
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
      if (editing) {
        await apiPut(`${API_URL}/${editing}`, form);
        setMessage('Updated successfully');
      } else {
        await apiPost(API_URL, form);
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
            <button className="admin-btn-danger" onClick={() => handleDelete(row._id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Service' : 'Add Service'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Service Name"
            className="admin-section-card"
            required
          />
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description (optional)"
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

export default ServicesAdmin; 