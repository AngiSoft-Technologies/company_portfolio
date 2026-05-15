import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';
import NotificationPopup from '../../modals/NotificationPopup';
import PromptModal from '../../modals/PromptModal';

const API_URL = '/projects';

const emptyForm = {
  title: '',
  slug: '',
  description: '',
  type: '',
  images: '',
  demoUrl: '',
  repoUrl: '',
  techStack: '',
  published: false,
};

const columns = [
  { key: 'title', title: 'Title' },
  { key: 'slug', title: 'Slug' },
  { key: 'type', title: 'Type' },
  { key: 'published', title: 'Published', render: (value) => (value ? 'Yes' : 'No') },
  { key: 'techStack', title: 'Tech Stack', render: (value) => Array.isArray(value) ? value.join(', ') : '' },
];

const toSlug = (value) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const toCommaString = (value) => Array.isArray(value) ? value.join(', ') : value || '';
const toArray = (value) => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const ProjectsAdmin = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [notif, setNotif] = useState({ message: '', type: 'info' });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setProjects(res.data || res || []);
    } catch (err) {
      setError('Failed to fetch projects');
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
      title: row.title || '',
      slug: row.slug || '',
      description: row.description || '',
      type: row.type || '',
      images: toCommaString(row.images),
      demoUrl: row.demoUrl || '',
      repoUrl: row.repoUrl || '',
      techStack: toCommaString(row.techStack),
      published: row.published === true,
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
    setForm((current) => {
      const next = { ...current, [name]: type === 'checkbox' ? checked : value };
      if (name === 'title' && !current.slug) {
        next.slug = toSlug(value);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotif({ message: '', type: 'info' });
    try {
      const payload = {
        title: form.title,
        slug: form.slug || toSlug(form.title),
        description: form.description,
        type: form.type,
        images: toArray(form.images),
        demoUrl: form.demoUrl || undefined,
        repoUrl: form.repoUrl || undefined,
        techStack: toArray(form.techStack),
        published: form.published,
      };

      if (editing) {
        await apiPut(`${API_URL}/${editing}`, payload);
        setNotif({ message: 'Updated successfully', type: 'success' });
      } else {
        await apiPost(API_URL, payload);
        setNotif({ message: 'Added successfully', type: 'success' });
      }
      closeModal();
      fetchProjects();
    } catch (err) {
      setNotif({ message: err.response?.data?.error || err.message || 'Failed to save', type: 'error' });
    }
  };

  const confirmDelete = (id) => setDeleteId(id);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiDelete(`${API_URL}/${deleteId}`);
      setNotif({ message: 'Deleted successfully', type: 'success' });
      fetchProjects();
    } catch (err) {
      setNotif({ message: 'Failed to delete', type: 'error' });
    }
    setDeleteId(null);
  };

  return (
    <div className="projects-admin-page">
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage Projects</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add Project</button>
      </div>
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={projects}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => confirmDelete(row.id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Project' : 'Add Project'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input name="title" value={form.title} onChange={handleChange} placeholder="Project title" className="admin-section-card" required />
          <input name="slug" value={form.slug} onChange={handleChange} placeholder="project-slug" className="admin-section-card" required />
          <input name="type" value={form.type} onChange={handleChange} placeholder="Project type" className="admin-section-card" required />
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="admin-section-card" rows={5} required />
          <input name="images" value={form.images} onChange={handleChange} placeholder="Image URLs, comma-separated" className="admin-section-card" />
          <input type="url" name="demoUrl" value={form.demoUrl} onChange={handleChange} placeholder="Demo URL" className="admin-section-card" />
          <input type="url" name="repoUrl" value={form.repoUrl} onChange={handleChange} placeholder="Repository URL" className="admin-section-card" />
          <input name="techStack" value={form.techStack} onChange={handleChange} placeholder="Tech stack, comma-separated" className="admin-section-card" />
          <label className="admin-section-card flex items-center gap-2">
            <input type="checkbox" name="published" checked={form.published} onChange={handleChange} />
            Show publicly
          </label>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="admin-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="admin-btn-primary">{editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </CrudModal>
      <NotificationPopup
        message={notif.message}
        type={notif.type}
        onClose={() => setNotif({ message: '', type: 'info' })}
      />
      <PromptModal
        open={!!deleteId}
        type="danger"
        message="Delete this project?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default ProjectsAdmin;
