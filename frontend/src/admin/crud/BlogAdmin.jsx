import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import Table from '../../components/Table';
import CrudModal from '../../components/CrudModal';
import { useTheme } from '../../contexts/ThemeContext';

const API_URL = '/blogs';

const columns = [
  { key: 'title', title: 'Title' },
  { key: 'slug', title: 'Slug' },
  { key: 'published', title: 'Published', render: (val) => val ? '✓' : '✗' },
];

const BlogAdmin = ({ theme }) => {
  const { colors } = useTheme();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    tags: '',
    published: false,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(API_URL);
      setBlogs(res.data || res || []);
    } catch (err) {
      setError('Failed to fetch blogs');
      console.error('Error fetching blogs:', err);
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({
      title: '',
      slug: '',
      content: '',
      tags: '',
      published: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditing(row.id);
    setForm({
      title: row.title || '',
      slug: row.slug || '',
      content: row.content || '',
      tags: Array.isArray(row.tags) ? row.tags.join(', ') : row.tags || '',
      published: row.published || false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({
      title: '',
      slug: '',
      content: '',
      tags: '',
      published: false,
    });
    setEditing(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!form.slug.trim()) {
      setError('Slug is required');
      return;
    }

    if (!form.content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        content: form.content,
        tags: form.tags ? form.tags.split(',').map((tag) => tag.trim()) : [],
        published: form.published,
      };

      if (editing) {
        await apiPut(`${API_URL}/${editing}`, payload);
        setMessage('Blog post updated successfully');
      } else {
        await apiPost(API_URL, payload);
        setMessage('Blog post created successfully');
      }

      fetchBlogs();
      closeModal();
    } catch (err) {
      console.error('Error saving blog:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save blog post');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;

    try {
      await apiDelete(`${API_URL}/${id}`);
      setMessage('Blog post deleted successfully');
      fetchBlogs();
    } catch (err) {
      console.error('Error deleting blog:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete blog post');
    }
  };

  return (
    <div
      style={{
        padding: '2rem',
        backgroundColor: theme?.bg || colors?.bg || '#ffffff',
        color: theme?.text || colors?.text || '#000000',
      }}
    >
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Blog Posts</h1>
        <button
          onClick={openAddModal}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: colors?.primary || '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          + New Blog Post
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : blogs.length === 0 ? (
        <p>No blog posts yet. Create one to get started!</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: theme?.cardBg || '#f9f9f9',
              borderRadius: '4px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors?.primary || '#0066cc'}` }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Title</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Slug</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold' }}>Published</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((blog, idx) => (
                <tr
                  key={blog.id}
                  style={{
                    borderBottom: '1px solid #ddd',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <td style={{ padding: '1rem' }}>{blog.title}</td>
                  <td style={{ padding: '1rem' }}>{blog.slug}</td>
                  <td style={{ padding: '1rem' }}>{blog.published ? '✓' : '✗'}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => openEditModal(blog)}
                      style={{
                        marginRight: '0.5rem',
                        padding: '0.4rem 0.8rem',
                        backgroundColor: colors?.primary || '#0066cc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(blog.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: theme?.cardBg || '#fff',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{editing ? 'Edit Blog Post' : 'New Blog Post'}</h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter blog post title"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors?.primary || '#0066cc'}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Slug *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="blog-post-slug"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors?.primary || '#0066cc'}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Content *
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Enter blog post content (Markdown supported)"
                  rows={10}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors?.primary || '#0066cc'}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="tag1, tag2, tag3"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors?.primary || '#0066cc'}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="published"
                    checked={form.published}
                    onChange={handleChange}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span>Published</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: colors?.primary || '#0066cc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogAdmin;
