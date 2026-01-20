import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';
import NotificationPopup from '../../modals/NotificationPopup';
import ConfirmDialog from '../../components/ConfirmDialog';

const API_URL = '/interests';

const columns = [
  { key: 'name', title: 'Interest' },
];

const InterestsAdmin = ({ theme }) => {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [message, setMessage] = useState('');
  const [notif, setNotif] = useState({ message: '', type: 'info' });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setInterests(res.data || []);
    } catch (err) {
      setError('Failed to fetch interests');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ name: '' });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row._id);
    setForm({ name: row.name });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ name: '' });
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
      fetchInterests();
      closeModal();
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    setConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    const id = confirm.id;
    setConfirm({ open: false, id: null });
    try {
      await apiDelete(`${API_URL}/${id}`);
      setNotif({ message: 'Deleted successfully', type: 'success' });
      fetchInterests();
    } catch (err) {
      setNotif({ message: 'Failed to delete', type: 'error' });
    }
  };

  return (
    <div className={`interests-admin-page ${theme}`}>
      <NotificationPopup
        type={notif.type}
        message={notif.message}
        onClose={() => setNotif({ message: '', type: 'info' })}
      />
      <ConfirmDialog
        isOpen={confirm.open}
        type="danger"
        title="Delete Interest"
        message="Are you sure you want to delete this interest? This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setConfirm({ open: false, id: null })}
        confirmText="Delete"
        cancelText="Cancel"
        theme={theme}
      />
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage Interests</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={interests}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row._id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Interest' : 'Add Interest'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Interest Name"
            className="admin-section-card"
            required
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

export default InterestsAdmin; 