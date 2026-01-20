/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';
import NotificationPopup from '../../modals/NotificationPopup';
import ConfirmDialog from '../../components/ConfirmDialog';

const API_URL = '/about';

const columns = [
  { key: 'title', title: 'Title' },
  { key: 'description', title: 'Description', render: (val) => (Array.isArray(val) ? val.join('\n') : val) },
];

const AboutAdmin = ({ theme }) => {
  const [aboutList, setAboutList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [notif, setNotif] = useState({ message: '', type: 'info' });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  useEffect(() => {
    fetchAbout();
  }, []);

  const fetchAbout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setAboutList(res || []);
    } catch (err) {
      setError('Failed to fetch about data');
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({ title: '', description: '' });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row._id);
    setForm({ title: row.title, description: Array.isArray(row.description) ? row.description.join('\n') : row.description });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ title: '', description: '' });
    setEditing(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotif({ message: '', type: 'info' });
    setError('');
    try {
      if (editing) {
        await apiPut(`${API_URL}/${editing}`, { ...form, description: form.description.split('\n') });
        setNotif({ message: 'Updated successfully', type: 'success' });
      } else {
        await apiPost(API_URL, { ...form, description: form.description.split('\n') });
        setNotif({ message: 'Added successfully', type: 'success' });
      }
      fetchAbout();
      closeModal();
    } catch (err) {
      setNotif({ message: 'Failed to save', type: 'error' });
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
      fetchAbout();
    } catch (err) {
      setNotif({ message: 'Failed to delete', type: 'error' });
    }
  };

  return (
    <div className={`about-admin-page ${theme}`}>
      <NotificationPopup
        type={notif.type}
        message={notif.message}
        onClose={() => setNotif({ message: '', type: 'info' })}
      />
      <ConfirmDialog
        isOpen={confirm.open}
        type="danger"
        title="Delete About Item"
        message="Are you sure you want to delete this about item? This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setConfirm({ open: false, id: null })}
        confirmText="Delete"
        cancelText="Cancel"
        theme={theme}
      />
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage About Section</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      <Table
        columns={columns}
        data={aboutList}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row._id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} width={700} title={editing ? 'Edit About' : 'Add About'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Title"
            className="admin-section-card"
            required
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description (one per line)"
            className="admin-section-card"
            rows={10}
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

export default AboutAdmin; 