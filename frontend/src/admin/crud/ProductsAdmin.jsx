import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../../js/httpClient';
import { toast } from '../../utils/toast';
import CrudModal from '../../components/CrudModal';
import {
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaBox,
  FaGasPump, FaStore, FaHome, FaMusic, FaSearch, FaSort
} from 'react-icons/fa';

const productIcons = {
  PetroFlow: FaGasPump,
  DukaFlow: FaStore,
  KejaLink: FaHome,
  AngiTunes: FaMusic,
};

const ProductsAdmin = () => {
  const { colors } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    name: '', slug: '', tagline: '', description: '', category: '',
    logoUrl: '', bannerUrl: '', demoUrl: '', published: false, sortOrder: 0,
    features: '', pricing: '', screenshots: ''
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/products/admin');
      setProducts(data || []);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '', slug: '', tagline: '', description: '', category: '',
      logoUrl: '', bannerUrl: '', demoUrl: '', published: false, sortOrder: 0,
      features: '', pricing: '', screenshots: ''
    });
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || '',
      slug: product.slug || '',
      tagline: product.tagline || '',
      description: product.description || '',
      category: product.category || '',
      logoUrl: product.logoUrl || '',
      bannerUrl: product.bannerUrl || '',
      demoUrl: product.demoUrl || '',
      published: product.published || false,
      sortOrder: product.sortOrder || 0,
      features: product.features ? JSON.stringify(product.features, null, 2) : '',
      pricing: product.pricing ? JSON.stringify(product.pricing, null, 2) : '',
      screenshots: product.screenshots ? JSON.stringify(product.screenshots, null, 2) : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder),
        features: form.features ? JSON.parse(form.features) : null,
        pricing: form.pricing ? JSON.parse(form.pricing) : null,
        screenshots: form.screenshots ? JSON.parse(form.screenshots) : null,
      };

      if (editing) {
        await apiPut(`/products/${editing.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await apiPost('/products', payload);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiDelete(`/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const togglePublished = async (product) => {
    try {
      await apiPut(`/products/${product.id}`, { published: !product.published });
      toast.success(`Product ${product.published ? 'unpublished' : 'published'}`);
      fetchProducts();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-section-title-bar">
        <div>
          <h2 style={{ color: colors.text }}>Products Management</h2>
          <p style={{ color: colors.textSecondary }}>Manage your product ecosystem</p>
        </div>
        <button onClick={openCreate} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaPlus /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-6" style={{ position: 'relative', maxWidth: '400px' }}>
        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-login-input"
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {error && <p style={{ color: colors.error }}>{error}</p>}

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filtered.map((product) => {
          const Icon = productIcons[product.name] || FaBox;
          return (
            <div
              key={product.id}
              className="dashboard-card"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                border: `1px solid ${colors.border}`,
                background: colors.surface,
              }}
            >
              {/* Banner */}
              <div style={{
                height: '120px',
                borderRadius: '12px 12px 0 0',
                background: product.bannerUrl
                  ? `url(${product.bannerUrl}) center/cover`
                  : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                <Icon style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.8)' }} />
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: product.published ? colors.successDark : colors.warning,
                  color: '#fff',
                }}>
                  {product.published ? 'Published' : 'Draft'}
                </span>
              </div>

              {/* Content */}
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem', color: colors.text }}>{product.name}</h3>
                {product.tagline && (
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: colors.textSecondary }}>{product.tagline}</p>
                )}
                {product.category && (
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    background: `${colors.primary}15`,
                    color: colors.primary,
                    marginBottom: '0.75rem',
                  }}>
                    {product.category}
                  </span>
                )}
                <p style={{ fontSize: '0.8rem', color: colors.textMuted, margin: '0 0 1rem', lineHeight: 1.5 }}>
                  {product.description?.substring(0, 120)}...
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => openEdit(product)} style={{
                    padding: '6px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                    background: colors.backgroundTertiary, color: colors.primary, cursor: 'pointer', fontSize: '0.8rem',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
                    <FaEdit /> Edit
                  </button>
                  <button onClick={() => togglePublished(product)} style={{
                    padding: '6px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                    background: product.published ? '#FFF3E0' : '#E8F5E9',
                    color: product.published ? colors.warning : colors.successDark,
                    cursor: 'pointer', fontSize: '0.8rem',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
                    {product.published ? <FaEyeSlash /> : <FaEye />}
                    {product.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => handleDelete(product.id)} style={{
                    padding: '6px 12px', borderRadius: '8px', border: '1px solid #FFCDD2',
                    background: '#FFEBEE', color: colors.error, cursor: 'pointer', fontSize: '0.8rem',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: colors.textMuted }}>
          <FaBox style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }} />
          <p>No products found. Create your first product to get started.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CrudModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? 'Edit Product' : 'Add Product'}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="modal-label">Name *</label>
                <input name="name" value={form.name} onChange={handleChange} className="modal-input" required />
              </div>
              <div>
                <label className="modal-label">Slug *</label>
                <input name="slug" value={form.slug} onChange={handleChange} className="modal-input" required />
              </div>
            </div>
            <div>
              <label className="modal-label">Tagline</label>
              <input name="tagline" value={form.tagline} onChange={handleChange} className="modal-input" />
            </div>
            <div>
              <label className="modal-label">Description *</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="modal-input" rows={4} required style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="modal-label">Category</label>
                <input name="category" value={form.category} onChange={handleChange} className="modal-input" placeholder="e.g., SaaS, Platform" />
              </div>
              <div>
                <label className="modal-label">Sort Order</label>
                <input name="sortOrder" type="number" value={form.sortOrder} onChange={handleChange} className="modal-input" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="modal-label">Logo URL</label>
                <input name="logoUrl" value={form.logoUrl} onChange={handleChange} className="modal-input" />
              </div>
              <div>
                <label className="modal-label">Banner URL</label>
                <input name="bannerUrl" value={form.bannerUrl} onChange={handleChange} className="modal-input" />
              </div>
            </div>
            <div>
              <label className="modal-label">Demo URL</label>
              <input name="demoUrl" value={form.demoUrl} onChange={handleChange} className="modal-input" />
            </div>
            <div>
              <label className="modal-label">Features (JSON array)</label>
              <textarea name="features" value={form.features} onChange={handleChange} className="modal-input" rows={3} placeholder='["Feature 1", "Feature 2"]' style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label className="modal-label">Pricing (JSON)</label>
              <textarea name="pricing" value={form.pricing} onChange={handleChange} className="modal-input" rows={3} placeholder='{"plan": "Pro", "price": 99}' style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input name="published" type="checkbox" checked={form.published} onChange={handleChange} style={{ accentColor: colors.primary }} />
              <label style={{ color: colors.text, fontWeight: 500 }}>Published</label>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" onClick={() => setShowModal(false)} className="modal-btn modal-btn-cancel">Cancel</button>
              <button type="submit" className="modal-btn" style={{ background: colors.primary, color: '#fff' }}>
                {editing ? 'Update' : 'Create'} Product
              </button>
            </div>
          </form>
        </CrudModal>
      )}
    </div>
  );
};

export default ProductsAdmin;
