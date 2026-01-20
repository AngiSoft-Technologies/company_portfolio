import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';
import NotificationPopup from '../../modals/NotificationPopup';
import ConfirmDialog from '../../components/ConfirmDialog';

const API_URL = '/social_media_handles';

const columns = [
  { key: 'platform', title: 'Platform' },
  { key: 'url', title: 'URL', render: (val) => val ? <a href={val} target="_blank" rel="noopener noreferrer">{val}</a> : null },
];

const SocialMediaAdmin = ({ theme }) => {
  const [handles, setHandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ platform: '', url: '' });
  const [message, setMessage] = useState('');
  const [notif, setNotif] = useState({ message: '', type: 'info' });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    fetchHandles();
  }, []);

  const fetchHandles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setHandles(res.data || []);
    } catch (err) {
      setError('Failed to fetch handles');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ platform: '', url: '' });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row._id);
    setForm({ platform: row.platform, url: row.url });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ platform: '', url: '' });
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
      fetchHandles();
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
      fetchHandles();
    } catch (err) {
      setNotif({ message: 'Failed to delete', type: 'error' });
    }
  };

  return (
    <div className={`socialmedia-admin-page ${theme}`}>
      <NotificationPopup
        type={notif.type}
        message={notif.message}
        onClose={() => setNotif({ message: '', type: 'info' })}
      />
      <ConfirmDialog
        isOpen={confirm.open}
        type="danger"
        title="Delete Social Media Handle"
        message="Are you sure you want to delete this social media handle? This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setConfirm({ open: false, id: null })}
        confirmText="Delete"
        cancelText="Cancel"
        theme={theme}
      />
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage Social Media Handles</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={handles}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row._id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Handle' : 'Add Handle'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="platform"
            value={form.platform}
            onChange={handleChange}
            placeholder="Platform"
            className="admin-section-card"
            required
          />
          <input
            type="text"
            name="url"
            value={form.url}
            onChange={handleChange}
            placeholder="URL"
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

export default SocialMediaAdmin; 