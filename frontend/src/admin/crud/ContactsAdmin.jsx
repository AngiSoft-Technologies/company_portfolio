import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';

const API_URL = '/contacts';

const columns = [
  { key: 'name', title: 'Name' },
  { key: 'email', title: 'Email' },
  { key: 'phone', title: 'Phone' },
];

const ContactsAdmin = ({ theme }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setContacts(res.data || []);
    } catch (err) {
      setError('Failed to fetch contacts');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '' });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row._id);
    setForm({ name: row.name, email: row.email, phone: row.phone });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ name: '', email: '', phone: '' });
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
      fetchContacts();
      closeModal();
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await apiDelete(`${API_URL}/${id}`);
      fetchContacts();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  return (
    <div className={`contacts-admin-page ${theme}`}>
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage Contacts</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={contacts}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row._id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Name"
            className="admin-section-card"
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="admin-section-card"
            required
          />
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone (optional)"
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

export default ContactsAdmin; 