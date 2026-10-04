import React, { useState } from 'react';
import { Category } from '../../types';
import { api } from '../../services/api';
import { Plus, Edit2, Trash2, X, Tags, Sparkles } from 'lucide-react';

interface CategoryManagementProps {
  categories: Category[];
  onRefreshCategories: () => void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  onRefreshCategories,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🛍️');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);

  const emojiList = ['🌾', '🥣', '🍞', '🧂', '🫒', '🌶️', '🥜', '☕', '🍪', '🥛', '🧼', '🧴', '🍎', '🥦', '🍫', '🧃', '🛍️'];

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
      setIcon(cat.icon || '🛍️');
      setImageUrl(cat.image_url || '');
      setSortOrder(cat.sort_order || 1);
    } else {
      setEditingCategory(null);
      setName('');
      setIcon('🛍️');
      setImageUrl('');
      setSortOrder(categories.length + 1);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, { name: name.trim(), icon, image_url: imageUrl, sort_order: sortOrder });
      } else {
        await api.createCategory({ name: name.trim(), icon, image_url: imageUrl, sort_order: sortOrder });
      }
      setIsModalOpen(false);
      onRefreshCategories();
    } catch (err) {
      alert('Failed to save category: ' + err);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!window.confirm(`Delete category "${catName}"? Products in this category will become unassigned.`)) return;
    try {
      await api.deleteCategory(id);
      onRefreshCategories();
    } catch (err) {
      alert('Failed to delete category: ' + err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Store Categories</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Organize products into categories displayed across the website and POS terminal.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()}>
          <Plus size={16} />
          <span>+ Add Category</span>
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Icon</th>
              <th>Category Name</th>
              <th>Slug / URL</th>
              <th>Assigned Products</th>
              <th>Display Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ fontSize: '1.6rem' }}>
                  {cat.icon || '🛍️'}
                </td>
                <td>
                  <strong>{cat.name}</strong>
                </td>
                <td>
                  <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    /category/{cat.slug}
                  </code>
                </td>
                <td>
                  <span className="badge badge-green">
                    {cat.product_count !== undefined ? `${cat.product_count} products` : 'Active'}
                  </span>
                </td>
                <td>
                  #{cat.sort_order}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn-icon btn-secondary"
                      onClick={() => handleOpenModal(cat)}
                      title="Edit Category"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn-icon btn-secondary"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleDelete(cat.id, cat.name)}
                      title="Delete Category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? '✏️ Edit Category' : '➕ Add Category'}</h3>
              <button className="btn-icon btn-secondary" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Category Icon Emoji</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {emojiList.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setIcon(e)}
                        style={{
                          fontSize: '1.3rem',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: icon === e ? 'var(--primary-100)' : '#f1f5f9',
                          border: icon === e ? '1.5px solid var(--primary-600)' : '1px solid transparent'
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rice & Grains"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Display Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="form-group">
                  <label>Category Banner Image URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
