import React, { useState, useEffect, useRef } from 'react';
import { 
  Pizza, 
  Search, 
  Plus, 
  Edit2, 
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Upload,
  ArrowRight,
  MinusCircle,
  Link,
  ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';

export default function HomeFoodCategoriesList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', image: '', isActive: true, displayOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Manage Foods Drawer State
  const [manageFoodsCategory, setManageFoodsCategory] = useState(null);
  const [linkedFoods, setLinkedFoods] = useState([]);
  const [unassignedFoods, setUnassignedFoods] = useState([]);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  
  // Action confirmations
  const [movingFood, setMovingFood] = useState(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'delete'|'remove'|'unassign', item: any, title: string, message: string, onConfirm: function }
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', text: string }

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const showNotification = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getHomeFoodCategories();
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const loadFoodsForCategory = async (catId) => {
    try {
      setLoadingFoods(true);
      const [foodsData, unassignedData] = await Promise.all([
        api.getHomeFoodCategoryFoods(catId),
        api.getUnassignedFoods()
      ]);
      setLinkedFoods(foodsData || []);
      setUnassignedFoods(unassignedData || []);
    } catch (err) {
      showNotification(err.message || 'Failed to load linked foods', 'error');
    } finally {
      setLoadingFoods(false);
    }
  };

  const handleManageFoods = (category) => {
    setManageFoodsCategory(category);
    loadFoodsForCategory(category.id);
  };

  const handleCloseDrawer = () => {
    setManageFoodsCategory(null);
    setLinkedFoods([]);
    setUnassignedFoods([]);
    setMovingFood(null);
    setTargetCategoryId('');
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        image: category.image || '',
        isActive: category.isActive,
        displayOrder: category.displayOrder || 0
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', image: '', isActive: true, displayOrder: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image must be smaller than 5MB.', 'error');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showNotification('Only JPEG, PNG, and WebP images are allowed.', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      const res = await api.uploadHomeFoodCategoryImage(file);
      if (res && res.url) {
        setFormData(prev => ({ ...prev, image: res.url }));
        showNotification('Image uploaded successfully');
      } else {
        showNotification('Upload failed: Invalid response from server', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('Category Name is required', 'error');
      return;
    }
    if (!formData.image) {
      showNotification('Category Image is required', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingCategory) {
        await api.updateHomeFoodCategory(editingCategory.id, formData);
        showNotification('Category updated successfully');
      } else {
        await api.createHomeFoodCategory(formData);
        showNotification('Category created successfully');
      }
      handleCloseModal();
      fetchCategories();
    } catch (err) {
      showNotification(err.message || 'Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (category) => {
    setConfirmModal({
      type: 'toggle',
      title: `${category.isActive ? 'Disable' : 'Enable'} Category`,
      message: `Are you sure you want to ${category.isActive ? 'disable' : 'enable'} ${category.name}?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.updateHomeFoodCategory(category.id, { isActive: !category.isActive });
          showNotification('Category status updated successfully');
          fetchCategories();
        } catch (err) {
          showNotification(err.message || 'Failed to update category status', 'error');
          setLoading(false);
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  // Reassignment & mapping helpers
  const handleRemoveFoodFromCategory = (food) => {
    setConfirmModal({
      type: 'unassign',
      title: 'Remove Food from Category',
      message: `Are you sure you want to remove "${food.name}" from "${manageFoodsCategory.name}"? This will not delete the food, only its home avatar mapping.`,
      onConfirm: async () => {
        try {
          await api.updateFoodHomeFoodCategory(food.id, null);
          showNotification(`Removed "${food.name}" from ${manageFoodsCategory.name}`);
          loadFoodsForCategory(manageFoodsCategory.id);
          fetchCategories();
        } catch (err) {
          showNotification(err.message || 'Failed to remove food', 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleAssignFoodToCategory = async (food) => {
    try {
      await api.updateFoodHomeFoodCategory(food.id, manageFoodsCategory.id);
      showNotification(`Assigned "${food.name}" to ${manageFoodsCategory.name}`);
      loadFoodsForCategory(manageFoodsCategory.id);
      fetchCategories();
    } catch (err) {
      showNotification(err.message || 'Failed to assign food', 'error');
    }
  };

  const handleMoveFood = (food) => {
    setMovingFood(food);
    setTargetCategoryId('');
  };

  const executeMoveFood = async () => {
    if (!targetCategoryId) return;
    const targetCat = categories.find(c => c.id === Number(targetCategoryId));
    if (!targetCat) return;

    try {
      await api.updateFoodHomeFoodCategory(movingFood.id, targetCat.id);
      showNotification(`Moved "${movingFood.name}" to ${targetCat.name}`);
      setMovingFood(null);
      setTargetCategoryId('');
      loadFoodsForCategory(manageFoodsCategory.id);
      fetchCategories();
    } catch (err) {
      showNotification(err.message || 'Failed to move food', 'error');
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <RefreshCw className="spin" size={32} color="var(--primary)" />
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', position: 'relative' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: notification.type === 'error' ? '#EF4444' : '#10B981',
          color: '#fff',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
          zIndex: 9999,
          fontWeight: '600'
        }}>
          {notification.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem', color: 'var(--text-main)' }}>
            <Pizza size={28} color="var(--primary)" />
            Home Food Categories
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Manage platform-level food categories for the mobile home screen avatars.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #F87171', color: '#B91C1C', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {/* Tools */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.95rem',
              background: 'var(--bg-card)'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-subtle)', width: '80px' }}>Image</th>
              <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-subtle)' }}>Name</th>
              <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-subtle)' }}>Food Items</th>
              <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-subtle)' }}>Display Order</th>
              <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-subtle)' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-subtle)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No categories found.
                </td>
              </tr>
            ) : (
              filteredCategories.map(cat => (
                <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={20} color="var(--text-muted)" />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>{cat.name}</td>
                  <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    {cat.foodCount === 1 ? '1 Food' : `${cat.foodCount || 0} Foods`}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{cat.displayOrder}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '999px', 
                      fontSize: '0.75rem', 
                      fontWeight: '700',
                      background: cat.isActive ? '#DCFCE7' : '#F3F4F6',
                      color: cat.isActive ? '#166534' : '#4B5563'
                    }}>
                      {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleManageFoods(cat)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--primary)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.85rem',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Link size={14} />
                        Manage Foods
                      </button>
                      <button 
                        onClick={() => handleOpenModal(cat)}
                        style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Edit Category"
                      >
                        <Edit2 size={16} color="var(--text-main)" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(cat)}
                        style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={cat.isActive ? 'Disable' : 'Enable'}
                      >
                        {cat.isActive ? <X size={16} color="#DC2626" /> : <Check size={16} color="#16A34A" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - Add / Edit Category */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '500px', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>Category Name *</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.95rem' }}
                    placeholder="e.g. Biryani"
                  />
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>Category Image *</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  
                  {formData.image ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                      <img 
                        src={formData.image} 
                        alt="Preview" 
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', border: '1px solid var(--border-color)' }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-card)',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => !uploadingImage && fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        background: 'var(--bg-main)',
                        cursor: uploadingImage ? 'not-allowed' : 'pointer',
                        color: 'var(--text-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {uploadingImage ? (
                        <>
                          <RefreshCw className="spin" size={24} color="var(--primary)" />
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Uploading image...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={24} style={{ color: 'var(--text-subtle)' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Click to upload image</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPEG, PNG, WebP (max. 5MB)</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>Display Order</span>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value, 10) || 0})}
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.95rem' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Active Status</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  style={{ flex: 1, padding: '0.875rem', background: '#F3F4F6', color: '#4B5563', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving || uploadingImage}
                  style={{ flex: 1, padding: '0.875rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: (saving || uploadingImage) ? 'not-allowed' : 'pointer', opacity: (saving || uploadingImage) ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer - Manage Foods */}
      {manageFoodsCategory && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '850px',
          background: 'var(--bg-card)',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          zIndex: 900,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s ease-in-out',
        }}>
          {/* Drawer Header */}
          <div style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-muted)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {manageFoodsCategory.image ? (
                <img src={manageFoodsCategory.image} alt={manageFoodsCategory.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pizza size={20} color="#475569" />
                </div>
              )}
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Manage Mapped Foods: <span style={{ color: 'var(--primary)' }}>{manageFoodsCategory.name}</span>
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {linkedFoods.length === 1 ? '1 linked food item' : `${linkedFoods.length} linked food items`}
                </p>
              </div>
            </div>
            <button 
              onClick={handleCloseDrawer} 
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.5rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                hover: { background: '#EDF2F7' }
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Drawer Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* LINKED FOODS SECTION */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: '700' }}>
                  Currently Linked Foods ({linkedFoods.length})
                </h3>
                <div style={{ position: 'relative', width: '250px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search linked foods..."
                    value={foodSearchQuery}
                    onChange={(e) => setFoodSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.75rem 0.4rem 2rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {loadingFoods ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <RefreshCw className="spin" size={24} color="var(--primary)" />
                </div>
              ) : linkedFoods.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
                  No foods currently mapped to this category.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem' }}>Food</th>
                        <th style={{ padding: '0.75rem' }}>Restaurant</th>
                        <th style={{ padding: '0.75rem' }}>Price</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedFoods
                        .filter(f => f.name.toLowerCase().includes(foodSearchQuery.toLowerCase()))
                        .map(food => (
                          <tr key={food.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <img src={food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'} alt={food.name} style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                                <div>
                                  <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{food.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{food.category?.name || 'Menu Specials'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem', color: 'var(--text-main)' }}>{food.hotel?.name}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ fontWeight: '600' }}>₹{Number(food.price)}</span>
                              {food.offerPrice && <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginLeft: '0.35rem', fontSize: '0.75rem' }}>₹{Number(food.offerPrice)}</span>}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span style={{ 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '999px', 
                                fontSize: '0.7rem', 
                                fontWeight: '700',
                                background: food.isAvailable && food.isActive ? '#DCFCE7' : '#FEE2E2',
                                color: food.isAvailable && food.isActive ? '#166534' : '#991B1B'
                              }}>
                                {food.isAvailable && food.isActive ? 'AVAILABLE' : 'UNAVAILABLE'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {movingFood?.id === food.id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <select
                                      value={targetCategoryId}
                                      onChange={(e) => setTargetCategoryId(e.target.value)}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.8rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)'
                                      }}
                                    >
                                      <option value="">Move to...</option>
                                      {categories
                                        .filter(c => c.id !== manageFoodsCategory.id && c.isActive)
                                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                      }
                                    </select>
                                    <button onClick={executeMoveFood} disabled={!targetCategoryId} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Go</button>
                                    <button onClick={() => setMovingFood(null)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Cancel</button>
                                  </div>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleMoveFood(food)}
                                      style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    >
                                      <ArrowRight size={12} />
                                      Move
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveFoodFromCategory(food)}
                                      style={{ background: 'transparent', border: '1px solid #FCA5A5', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '600', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    >
                                      <MinusCircle size={12} />
                                      Remove
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* UNASSIGNED FOODS SECTION */}
            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '2rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: '700' }}>
                Unassigned Foods ({unassignedFoods.length})
                <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  (Foods with no platform Home category mapping)
                </span>
              </h3>

              {loadingFoods ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <RefreshCw className="spin" size={24} color="var(--primary)" />
                </div>
              ) : unassignedFoods.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
                  No unassigned foods found in the database.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxHeight: '350px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ padding: '0.75rem' }}>Food</th>
                        <th style={{ padding: '0.75rem' }}>Restaurant</th>
                        <th style={{ padding: '0.75rem', fontWeight: '600' }}>Price</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedFoods.map(food => (
                        <tr key={food.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <img src={food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'} alt={food.name} style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                              <div>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{food.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{food.category?.name || 'Menu Specials'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-main)' }}>{food.hotel?.name}</td>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>₹{Number(food.price)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleAssignFoodToCategory(food)}
                              style={{
                                background: 'var(--primary)',
                                color: '#fff',
                                border: 'none',
                                padding: '0.35rem 0.8rem',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <Plus size={12} />
                              Assign to {manageFoodsCategory.name}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1010, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '450px', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', color: confirmModal.isBlock ? '#B91C1C' : '#9a3412' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>{confirmModal.title}</h3>
            </div>
            <div style={{ padding: '1.5rem 2rem', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              {confirmModal.message}
            </div>
            <div style={{ padding: '1.5rem 2rem', background: 'var(--bg-main)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {confirmModal.isBlock ? (
                <button 
                  onClick={() => setConfirmModal(null)}
                  style={{ padding: '0.6rem 1.5rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer' }}
                >
                  OK
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setConfirmModal(null)}
                    style={{ padding: '0.6rem 1.25rem', background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    style={{ 
                      padding: '0.6rem 1.25rem', 
                      background: confirmModal.type === 'delete' ? '#EF4444' : 'var(--primary)', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 'var(--radius-md)', 
                      fontWeight: '600', 
                      cursor: 'pointer' 
                    }}
                  >
                    Confirm
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
