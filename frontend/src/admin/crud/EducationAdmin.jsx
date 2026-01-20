import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import NotificationPopup from '../../modals/NotificationPopup';
import ConfirmDialog from '../../components/ConfirmDialog';

const API_URL = '/education';

const EducationAdmin = ({ theme }) => {
  const [education, setEducation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ school: '', degree: '', year: '', program: '', grades: '', description: '', startDate: '', endDate: '', currentInstitution: false });
  const [editingId, setEditingId] = useState(null);
  const [notif, setNotif] = useState({ message: '', type: 'info' });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const fetchEducation = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(API_URL);
      setEducation(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEducation(); }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = {
        ...form,
        program: form.program.split(',').map(s => s.trim()),
        grades: form.grades.split(',').map(s => s.trim()),
        description: form.description.split('\n'),
      };
      if (editingId) {
        await apiPut(`${API_URL}/${editingId}`, payload);
        setNotif({ message: 'Education updated!', type: 'success' });
      } else {
        await apiPost(API_URL, payload);
        setNotif({ message: 'Education created!', type: 'success' });
      }
      setForm({ school: '', degree: '', year: '', program: '', grades: '', description: '', startDate: '', endDate: '', currentInstitution: false });
      setEditingId(null);
      fetchEducation();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = edu => {
    setForm({
      school: edu.school,
      degree: edu.degree,
      year: edu.year,
      program: (edu.program || []).join(', '),
      grades: (edu.grades || []).join(', '),
      description: (edu.description || []).join('\n'),
      startDate: edu.startDate ? edu.startDate.substring(0, 10) : '',
      endDate: edu.endDate ? edu.endDate.substring(0, 10) : '',
      currentInstitution: !!edu.currentInstitution
    });
    setEditingId(edu._id);
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this education entry?')) return;
    setError('');
    setMessage('');
    try {
      await apiDelete(`${API_URL}/${id}`);
      setMessage('Education deleted!');
      fetchEducation();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={`admin-page-container max-w-2xl mx-auto ${theme}`}>
      <h2 className="admin-section-title">Manage Education</h2>
      <form onSubmit={handleSubmit} className="admin-section-spacing">
        <input type="text" name="school" value={form.school} onChange={handleChange} placeholder="School" className="admin-section-card" required />
        <input type="text" name="degree" value={form.degree} onChange={handleChange} placeholder="Degree" className="admin-section-card" />
        <input type="text" name="year" value={form.year} onChange={handleChange} placeholder="Year" className="admin-section-card" />
        <input type="text" name="program" value={form.program} onChange={handleChange} placeholder="Program (comma separated)" className="admin-section-card" />
        <input type="text" name="grades" value={form.grades} onChange={handleChange} placeholder="Grades (comma separated)" className="admin-section-card" />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description (one per line)" className="admin-section-card" rows={3} />
        <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="admin-section-card" />
        <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="admin-section-card" />
        <label className="block"><input type="checkbox" name="currentInstitution" checked={form.currentInstitution} onChange={handleChange} /> Current Institution</label>
        <button type="submit" className="admin-section-card admin-btn-primary">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" onClick={() => { setForm({ school: '', degree: '', year: '', program: '', grades: '', description: '', startDate: '', endDate: '', currentInstitution: false }); setEditingId(null); }} className="admin-section-card admin-btn-secondary">Cancel</button>}
      </form>
      {message && <div className="admin-section-card admin-success-msg">{message}</div>}
      {error && <div className="admin-section-card admin-error-msg">{error}</div>}
      {loading ? <p className="admin-section-card">Loading...</p> : (
        <table className="admin-section-list w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">School</th>
              <th className="p-2">Degree</th>
              <th className="p-2">Year</th>
              <th className="p-2">Program</th>
              <th className="p-2">Grades</th>
              <th className="p-2">Period</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {education.map(edu => (
              <tr key={edu._id} className="border-t">
                <td className="p-2 font-semibold">{edu.school}</td>
                <td className="p-2">{edu.degree}</td>
                <td className="p-2">{edu.year}</td>
                <td className="p-2">{(edu.program || []).join(', ')}</td>
                <td className="p-2">{(edu.grades || []).join(', ')}</td>
                <td className="p-2">{edu.startDate ? `${new Date(edu.startDate).getFullYear()} - ${edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}` : ''}</td>
                <td className="p-2">
                  <button onClick={() => handleEdit(edu)} className="admin-btn-secondary">Edit</button>
                  <button onClick={() => handleDelete(edu._id)} className="admin-btn-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EducationAdmin; 