/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import MuiThemeWrapper from '../../components/MuiThemeWrapper';
import NotificationPopup from '../../modals/NotificationPopup';
import ConfirmDialog from '../../components/ConfirmDialog';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import ChipSelector from '../../components/inputs/ChipSelector';

const API_URL = '/projects';

const columns = [
  { key: 'title', title: 'Title' },
  { key: 'description', title: 'Description' },
  { key: 'link', title: 'Link', render: (val) => val ? <a href={val} target="_blank" rel="noopener noreferrer">{val}</a> : null },
];

const techStackOptions = [
  'Frontend', 'Backend', 'Mobile', 'Git', 'Docker', 'DevOps', 'Database', 'API', 'Testing', 'Cloud', 'UI/UX', 'Security', 'Other'
];

const backendStackOptions = [
  'Node.js', 'Java', 'Spring Boot', 'Express', 'Python', 'Django', 'Flask', 'Go', 'C#', 'PHP', 'Ruby on Rails', 'Other'
];
const databaseStackOptions = [
  'MongoDB', 'MySQL', 'PostgreSQL', 'MariaDB', 'SQLite', 'Firebase', 'Redis', 'Oracle', 'SQL Server', 'Other'
];
const frontendMobileStackOptions = [
  'React', 'Vue', 'Angular', 'Svelte', 'Flutter', 'React Native', 'Next.js', 'Nuxt.js', 'HTML/CSS/JS', 'Swift', 'Kotlin', 'Other'
];

const ProjectsAdmin = ({ theme }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    techStack: [],
    backendStack: [],
    databaseStack: [],
    frontendMobileStack: [],
    stackExplanation: '',
    githubLink: '',
    liveDemo: '',
    image: '',
    startDate: null,
    endDate: null,
  });
  const [message, setMessage] = useState('');
  const [notif, setNotif] = useState({ message: '', type: 'info' });
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [formStep, setFormStep] = useState(0);
  const totalSteps = 3;
  const nextStep = () => setFormStep((s) => Math.min(s + 1, totalSteps - 1));
  const prevStep = () => setFormStep((s) => Math.max(s - 1, 0));
  const resetFormStep = () => setFormStep(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

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
    setForm({
      title: '',
      description: '',
      techStack: [],
      backendStack: [],
      databaseStack: [],
      frontendMobileStack: [],
      stackExplanation: '',
      githubLink: '',
      liveDemo: '',
      image: '',
      startDate: null,
      endDate: null,
    });
    resetFormStep();
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row.id);
    setForm({
      title: row.title || '',
      description: row.description || '',
      techStack: row.techStack || [],
      backendStack: row.backendStack || [],
      databaseStack: row.databaseStack || [],
      frontendMobileStack: row.frontendMobileStack || [],
      stackExplanation: row.stackExplanation || '',
      githubLink: row.githubLink || '',
      liveDemo: row.liveDemo || '',
      image: row.image || '',
      startDate: row.startDate ? new Date(row.startDate) : null,
      endDate: row.endDate ? new Date(row.endDate) : null,
    });
    resetFormStep();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetFormStep();
    setForm({
      title: '',
      description: '',
      techStack: [],
      backendStack: [],
      databaseStack: [],
      frontendMobileStack: [],
      stackExplanation: '',
      githubLink: '',
      liveDemo: '',
      image: '',
      startDate: null,
      endDate: null,
    });
    setEditing(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDateChange = (field) => (date) => {
    setForm({ ...form, [field]: date });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    const payload = {
      ...form,
      startDate: form.startDate ? form.startDate.toISOString() : null,
      endDate: form.endDate ? form.endDate.toISOString() : null,
    };
    try {
      if (editing) {
        await apiPut(`${API_URL}/${editing}`, payload);
        setMessage('Updated successfully');
      } else {
        await apiPost(API_URL, payload);
        setMessage('Added successfully');
      }
      fetchProjects();
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
      fetchProjects();
    } catch (err) {
      setNotif({ message: 'Failed to delete', type: 'error' });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const token = localStorage.getItem('adminToken');
      const data = await apiUpload('/upload/image', file, token);
      setForm((prev) => ({ ...prev, image: data.url }));
    } catch (err) {
      setUploadError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`projects-admin-page ${theme}`}>
      <NotificationPopup
        type={notif.type}
        message={notif.message}
        onClose={() => setNotif({ message: '', type: 'info' })}
      />
      <ConfirmDialog
        isOpen={confirm.open}
        type="danger"
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={confirmDelete}
        onClose={() => setConfirm({ open: false, id: null })}
        confirmText="Delete"
        cancelText="Cancel"
        theme={theme}
      />
      <div className="admin-section-title-bar admin-section-title">
        <span>Manage Projects</span>
        <button className="admin-btn-primary" onClick={openAddModal}>Add</button>
      </div>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      <Table
        columns={columns}
        data={projects}
        loading={loading}
        error={error}
        actions={(row) => (
          <>
            <button className="admin-btn-secondary" onClick={() => openEditModal(row)}>Edit</button>
            <button className="admin-btn-danger" onClick={() => handleDelete(row.id)}>Delete</button>
          </>
        )}
      />
      <CrudModal open={modalOpen} width={900} onClose={closeModal} title={editing ? 'Edit Project' : 'Add Project'}>
        <MuiThemeWrapper>
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={3}>
              {formStep === 0 && (
                <>
                  <TextField
                    label="Project Title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <ChipSelector
                    label="Tech Stack (general/legacy)"
                    placeholder="Skill (ex: Project Management)"
                    options={techStackOptions}
                    selected={form.techStack}
                    onChange={val => setForm(f => ({ ...f, techStack: val }))}
                    suggestionTitle="Suggested based on your profile"
                    theme={theme}
                  />
                </>
              )}
              {formStep === 1 && (
                <>
                  <ChipSelector
                    label="Backend Stack"
                    placeholder="Skill (ex: Node.js)"
                    options={backendStackOptions}
                    selected={form.backendStack}
                    onChange={val => setForm(f => ({ ...f, backendStack: val }))}
                    suggestionTitle="Suggested based on your profile"
                    theme={theme}
                  />
                  <ChipSelector
                    label="Database Stack"
                    placeholder="Skill (ex: MongoDB)"
                    options={databaseStackOptions}
                    selected={form.databaseStack}
                    onChange={val => setForm(f => ({ ...f, databaseStack: val }))}
                    suggestionTitle="Suggested based on your profile"
                    theme={theme}
                  />
                  <ChipSelector
                    label="Frontend/Mobile Stack"
                    placeholder="Skill (ex: React)"
                    options={frontendMobileStackOptions}
                    selected={form.frontendMobileStack}
                    onChange={val => setForm(f => ({ ...f, frontendMobileStack: val }))}
                    suggestionTitle="Suggested based on your profile"
                    theme={theme}
                  />
                  <TextField
                    label="Why did you choose this stack?"
                    name="stackExplanation"
                    value={form.stackExplanation}
                    onChange={handleChange}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                </>
              )}
              {formStep === 2 && (
                <>
                  <Box display="flex" gap={2}>
                    <TextField
                      label="GitHub Link"
                      name="githubLink"
                      value={form.githubLink}
                      onChange={handleChange}
                      type="url"
                      fullWidth
                    />
                    <TextField
                      label="Live Demo Link"
                      name="liveDemo"
                      value={form.liveDemo}
                      onChange={handleChange}
                      type="url"
                      fullWidth
                    />
                  </Box>
                  <div>
                    <label className="block mb-1 font-medium">Project Image</label>
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    {uploading && <span className="text-blue-500 ml-2">Uploading...</span>}
                    {uploadError && <span className="text-red-500 ml-2">{uploadError}</span>}
                    {form.image && (
                      <div className="mt-2">
                        <img src={form.image} alt="Project" style={{ maxWidth: 180, maxHeight: 120, borderRadius: 8 }} />
                        <div className="text-xs text-gray-500">{form.image}</div>
                      </div>
                    )}
                  </div>
                  <Box display="flex" gap={2}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Start Date"
                        value={form.startDate}
                        onChange={handleDateChange('startDate')}
                        renderInput={(params) => <TextField {...params} required fullWidth />}
                      />
                    </LocalizationProvider>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="End Date"
                        value={form.endDate}
                        onChange={handleDateChange('endDate')}
                        renderInput={(params) => <TextField {...params} required fullWidth />}
                      />
                    </LocalizationProvider>
                  </Box>
                </>
              )}
              <Box display="flex" gap={2} justifyContent="flex-end" mt={2}>
                {formStep > 0 && (
                  <Button variant="outlined" color="secondary" onClick={prevStep} type="button">Back</Button>
                )}
                {formStep < totalSteps - 1 && (
                  <Button variant="contained" color="primary" onClick={nextStep} type="button">Next</Button>
                )}
                {formStep === totalSteps - 1 && (
                  <Button variant="contained" color="primary" type="submit">{editing ? 'Update' : 'Add'}</Button>
                )}
                <Button variant="outlined" color="secondary" onClick={closeModal} type="button">Cancel</Button>
              </Box>
            </Box>
          </form>
        </MuiThemeWrapper>
      </CrudModal>
    </div>
  );
};

export default ProjectsAdmin; 
