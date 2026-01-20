import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';

const API_URL = '/qoutes';

const columns = [
  { key: 'title', title: 'Title' },
  { key: 'description', title: 'Description' },
  { key: 'createdBy', title: 'Created By' },
];

const QuotesAdmin = ({ theme }) => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', createdBy: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setQuotes(res.data || []);
    } catch (err) {
      setError('Failed to fetch quotes');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ title: '', description: '', createdBy: '' });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row._id);
    setForm({ title: row.title, description: row.description, createdBy: row.createdBy });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ title: '', description: '', createdBy: '' });
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
      fetchQuotes();
      closeModal();
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quote?')) return;
    try {
      await apiDelete(`${API_URL}/${id}`);
      fetchQuotes();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  return (
    <div className={`quotes-admin-page ${theme}`}>
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage Quotes</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={quotes}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row._id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Quote' : 'Add Quote'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Quote Title"
            className="admin-section-card"
            required
          />
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
            className="admin-section-card"
          />
          <input
            type="text"
            name="createdBy"
            value={form.createdBy}
            onChange={handleChange}
            placeholder="Created By"
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

export default QuotesAdmin; 