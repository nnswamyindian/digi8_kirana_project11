import React, { useState, useEffect } from 'react';
import { Product, Category } from '../../types';
import { api } from '../../services/api';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Barcode,
  Check,
  X,
  Scale,
  Percent,
  Download,
  Upload,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  Coins,
  Tag
} from 'lucide-react';
import { BulkProductImportModal } from './BulkProductImportModal';
import { BulkPriceStockModal } from './BulkPriceStockModal';

interface ProductManagementProps {
  categories: Category[];
  onOpenBarcodeModal: (product: Product) => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  categories,
  onOpenBarcodeModal,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Inline Price Editing State
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [inlinePriceVal, setInlinePriceVal] = useState<string>('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Add/Edit Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category_id: '',
    brand: '',
    barcode: '',
    unit: 'PACKET',
    is_loose: 0,
    purchase_cost: 0,
    selling_price: 0,
    mrp: 0,
    wholesale_price: 0,
    min_selling_price: 0,
    gst_percent: 0,
    stock: 10,
    min_stock: 5,
    is_active: 1,
    is_visible_online: 1,
    is_pos_available: 1,
    is_featured: 0,
    is_bestseller: 0,
    is_offer: 0,
    photo_url: '',
    description: '',
  });

  // Bulk Price Modal State
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [bulkValue, setBulkValue] = useState<number>(5);

  // Price History Modal State
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  // Bulk Import Modal State (Phase 6)
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  // Bulk Price & Stock Update Modal State (Phase 6)
  const [isBulkPriceStockOpen, setIsBulkPriceStockOpen] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grocery_product_bulk_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download sample Excel template');
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.getProducts({
        search: search.trim() || undefined,
        category_id: selectedCat || undefined,
        low_stock: stockFilter === 'low',
        out_of_stock: stockFilter === 'out',
      });
      setProducts(res);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search, selectedCat, stockFilter]);

  // CRITICAL: Save inline edited price directly
  const handleSaveInlinePrice = async (product: Product) => {
    const newPrice = parseFloat(inlinePriceVal);
    if (isNaN(newPrice) || newPrice <= 0) {
      setEditingPriceId(null);
      return;
    }

    if (newPrice === product.selling_price) {
      setEditingPriceId(null);
      return;
    }

    setIsUpdatingPrice(true);
    try {
      await api.updateProductPrice(product.id, newPrice, Math.max(product.mrp, newPrice), 'Inline price update from product dashboard');
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, selling_price: newPrice } : p));
      setEditingPriceId(null);
    } catch (err) {
      alert('Error updating price: ' + err);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // Image Upload & Barcode States
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [barcodeWarning, setBarcodeWarning] = useState('');
  const [isCheckingBarcode, setIsCheckingBarcode] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);

  const handleGenerateBarcode = () => {
    const generated = '890' + Math.floor(1000000000 + Math.random() * 9000000000);
    setFormData(prev => ({ ...prev, barcode: generated }));
    setBarcodeWarning('');
  };

  const handleValidateBarcode = async (barcodeVal: string) => {
    if (!barcodeVal || !barcodeVal.trim()) {
      setBarcodeWarning('');
      return;
    }
    setIsCheckingBarcode(true);
    try {
      const res = await api.checkBarcode(barcodeVal.trim(), editingProduct?.id);
      if (res.exists) {
        setBarcodeWarning(`This barcode is already assigned to: ${res.product_name}. Please use another barcode.`);
      } else {
        setBarcodeWarning('');
      }
    } catch {
      setBarcodeWarning('');
    } finally {
      setIsCheckingBarcode(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setImageUploadError('Please select a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageUploadError('Image size exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const uploadRes = await api.uploadImage(base64, file.name);
          setFormData(prev => ({ ...prev, photo_url: uploadRes.url }));
        } catch (err: any) {
          console.error('[Upload Error]', err);
          setImageUploadError(err.message || 'Unable to upload image. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.onerror = () => {
        setImageUploadError('Unable to read image file. Please try again.');
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setImageUploadError('Unable to upload image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  // Open Form Modal for Create or Edit
  const handleOpenForm = (prod?: Product) => {
    setImageUploadError('');
    setBarcodeWarning('');
    setShowManualUrl(false);

    if (prod) {
      setEditingProduct(prod);
      setFormData({ ...prod });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        brand: '',
        barcode: '890' + Math.floor(1000000000 + Math.random() * 9000000000),
        unit: 'PACKET',
        is_loose: 0,
        purchase_cost: 50,
        selling_price: 65,
        mrp: 75,
        wholesale_price: 60,
        min_selling_price: 55,
        gst_percent: 0,
        stock: 25,
        min_stock: 5,
        is_active: 1,
        is_visible_online: 1,
        is_pos_available: 1,
        is_featured: 0,
        is_bestseller: 0,
        is_offer: 0,
        photo_url: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeWarning) {
      alert(barcodeWarning);
      return;
    }

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
      } else {
        await api.createProduct(formData);
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Something went wrong while saving the product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;
    try {
      await api.deleteProduct(id);
      loadProducts();
    } catch (err) {
      alert('Failed to delete product: ' + err);
    }
  };

  // Bulk Price Update Action
  const handleApplyBulkPrice = async () => {
    try {
      const res = await api.bulkPriceUpdate({
        category_id: bulkCategory || undefined,
        adjustment_type: bulkAdjustmentType,
        value: bulkValue,
        reason: `Bulk price adjust: ${bulkAdjustmentType === 'PERCENTAGE' ? `${bulkValue}%` : `₹${bulkValue}`}`,
      });
      alert(res.message);
      setIsBulkPriceOpen(false);
      loadProducts();
    } catch (err) {
      alert('Error applying bulk price update: ' + err);
    }
  };

  // View Price History Modal
  const handleViewPriceHistory = async (prod: Product) => {
    setSelectedHistoryProduct(prod);
    try {
      const full = await api.getProductById(prod.id);
      setPriceHistory((full as any).price_history || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '6px 12px', flex: 1 }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search by product name, brand, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', width: '100%', marginLeft: '8px', fontSize: '0.875rem' }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'white', fontSize: '0.85rem' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'white', fontSize: '0.85rem' }}
          >
            <option value="all">All Stock Status</option>
            <option value="low">Low Stock (≤ Reorder)</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadTemplate}
            title="Download official grocery import Excel template"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            <span>Download Sample Excel</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsBulkImportOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet size={15} color="#10b981" />
            <span>Bulk Import</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsBulkPriceStockOpen(true)}
            title="Update prices & stock for multiple products via CSV"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Tag size={15} color="#7c3aed" />
            <span>Bulk Price &amp; Stock</span>
          </button>

          <button className="btn btn-secondary btn-sm" onClick={() => setIsBulkPriceOpen(true)}>
            <Percent size={15} />
            <span>Bulk Price Update</span>
          </button>

          <button className="btn btn-primary btn-sm" onClick={() => handleOpenForm()}>
            <Plus size={16} />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Barcode</th>
              <th>Unit</th>
              <th>Cost Price</th>
              <th>Selling Price (Click to Edit)</th>
              <th>MRP</th>
              <th>Stock On Hand</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(prod => {
              const isEditing = editingPriceId === prod.id;
              const isLow = prod.stock <= prod.min_stock && prod.stock > 0;
              const isOut = prod.stock <= 0;

              return (
                <tr key={prod.id}>
                  <td>
                    <img
                      src={prod.photo_url}
                      alt={prod.name}
                      style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                    />
                  </td>
                  <td>
                    <strong>{prod.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {prod.brand} {prod.is_loose ? '• Loose Weight' : ''}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue">
                      {prod.category_name || 'General'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      {prod.barcode}
                    </span>
                  </td>
                  <td>
                    <strong>{prod.unit}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    ₹{prod.purchase_cost}
                  </td>

                  {/* CRITICAL: INLINE EDITABLE SELLING PRICE */}
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          step="1"
                          autoFocus
                          className="inline-price-input"
                          value={inlinePriceVal}
                          onChange={(e) => setInlinePriceVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlinePrice(prod);
                            if (e.key === 'Escape') setEditingPriceId(null);
                          }}
                        />
                        <button
                          className="btn-icon"
                          style={{ width: '26px', height: '26px', background: 'var(--primary-600)', color: 'white' }}
                          onClick={() => handleSaveInlinePrice(prod)}
                          title="Save price"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: '26px', height: '26px', background: '#e2e8f0', color: '#475569' }}
                          onClick={() => setEditingPriceId(null)}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="inline-price-box"
                        onClick={() => {
                          setEditingPriceId(prod.id);
                          setInlinePriceVal(String(prod.selling_price));
                        }}
                        title="Click to quickly change price"
                      >
                        <span style={{ fontSize: '1rem', color: 'var(--primary-800)' }}>₹{prod.selling_price}</span>
                        <Edit2 size={12} color="#64748b" />
                      </div>
                    )}
                  </td>

                  <td style={{ color: '#94a3b8' }}>
                    ₹{prod.mrp}
                  </td>

                  {/* Stock Level */}
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: isOut ? '#dc2626' : isLow ? '#d97706' : 'var(--text-main)'
                    }}>
                      {prod.stock} {prod.unit}
                    </span>
                    {prod.reserved_stock > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#0284c7' }}>
                        ({prod.reserved_stock} reserved)
                      </div>
                    )}
                  </td>

                  <td>
                    {isOut ? (
                      <span className="badge badge-red">Out of Stock</span>
                    ) : isLow ? (
                      <span className="badge badge-amber">Low Stock</span>
                    ) : (
                      <span className="badge badge-green">In Stock</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-icon btn-secondary"
                        onClick={() => handleOpenForm(prod)}
                        title="Edit Full Product"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-icon btn-secondary"
                        onClick={() => onOpenBarcodeModal(prod)}
                        title="Print Barcode Label"
                      >
                        <Barcode size={14} />
                      </button>
                      <button
                        className="btn-icon btn-secondary"
                        onClick={() => handleViewPriceHistory(prod)}
                        title="View Price Change History"
                      >
                        <Clock size={14} />
                      </button>
                      <button
                        className="btn-icon btn-secondary"
                        style={{ color: '#ef4444' }}
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        title="Deactivate Product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ====================================================
          MODAL: ADD / EDIT PRODUCT (SCROLLABLE & CAMERA UPLOAD)
          ==================================================== */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '720px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{editingProduct ? '✏️' : '➕'}</span>
                <h3>{editingProduct ? 'Edit Product Details' : 'Add New Kirana Product'}</h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveForm}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
            >
              <div
                className="modal-body"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y'
                }}
              >
                <div className="form-grid">
                  {/* Product Name */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. India Gate Royal Basmati Rice"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Category */}
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Brand */}
                  <div className="form-group">
                    <label>Brand / Manufacturer</label>
                    <input
                      type="text"
                      placeholder="e.g. India Gate, Tata, Aashirvaad"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>

                  {/* SKU */}
                  <div className="form-group">
                    <label>SKU (Stock Keeping Unit)</label>
                    <input
                      type="text"
                      placeholder="e.g. RICE001, OIL-SUN-1L"
                      value={formData.sku || ''}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    />
                  </div>

                  {/* Packaging / Unit */}
                  <div className="form-group">
                    <label>Packaging / Unit *</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => {
                        const u = e.target.value as any;
                        setFormData({
                          ...formData,
                          unit: u,
                          is_loose: ['KG', 'GRAM', 'LITRE', 'ML'].includes(u) ? 1 : 0
                        });
                      }}
                    >
                      <option value="PACKET">PACKET (Packaged)</option>
                      <option value="KG">KG (Kilogram - Loose)</option>
                      <option value="GRAM">GRAM (Loose)</option>
                      <option value="LITRE">LITRE (Loose)</option>
                      <option value="ML">ML (Millilitre)</option>
                      <option value="BOX">BOX (Carton)</option>
                      <option value="BOTTLE">BOTTLE</option>
                      <option value="PIECE">PIECE (Individual Item)</option>
                      <option value="DOZEN">DOZEN (12 Units)</option>
                      <option value="BAG">BAG (Sack / Bori)</option>
                      <option value="BUNDLE">BUNDLE</option>
                    </select>
                  </div>

                  {/* Barcode with Duplicate Check & Internal Generator */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ margin: 0 }}>Barcode / EAN (Tenant Scoped)</label>
                      <button
                        type="button"
                        onClick={handleGenerateBarcode}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-700)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Sparkles size={12} />
                        <span>Generate Internal</span>
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Scan or enter barcode"
                        value={formData.barcode}
                        onChange={(e) => {
                          setFormData({ ...formData, barcode: e.target.value });
                          handleValidateBarcode(e.target.value);
                        }}
                        onBlur={(e) => handleValidateBarcode(e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                    {barcodeWarning && (
                      <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', marginTop: '4px' }}>
                        ⚠️ {barcodeWarning}
                      </div>
                    )}
                  </div>

                  {/* Pricing Inputs */}
                  <div className="form-group">
                    <label>Purchase Cost (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.purchase_cost}
                      onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Printed MRP (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Store Selling Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Min. Selling Price (Floor Price ₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Optional price floor"
                      value={formData.min_selling_price || 0}
                      onChange={(e) => setFormData({ ...formData, min_selling_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Wholesale Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="B2B / bulk price"
                      value={formData.wholesale_price || 0}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>GST Rate (%)</label>
                    <select
                      value={formData.gst_percent}
                      onChange={(e) => setFormData({ ...formData, gst_percent: parseFloat(e.target.value) || 0 })}
                    >
                      <option value="0">0% (Nil / Exempted Foodgrain)</option>
                      <option value="5">5% (Edible Oils, Spices)</option>
                      <option value="12">12% (Ghee, Butter)</option>
                      <option value="18">18% (Soaps, Detergents)</option>
                      <option value="28">28% (Luxury / Aerated)</option>
                    </select>
                  </div>

                  {/* PHASE 6A: REAL-TIME MARGIN & PROFITABILITY CALCULATION CARD */}
                  {(() => {
                    const cost = Number(formData.purchase_cost) || 0;
                    const selling = Number(formData.selling_price) || 0;
                    const mrp = Number(formData.mrp) || 0;
                    const minPrice = Number(formData.min_selling_price) || 0;
                    const profit = selling - cost;
                    const marginPct = selling > 0 ? (profit / selling) * 100 : 0;
                    const markupPct = cost > 0 ? (profit / cost) * 100 : 0;
                    const savings = mrp > selling ? mrp - selling : 0;

                    const isExceedsMRP = mrp > 0 && selling > mrp;
                    const isBelowCost = cost > 0 && selling < cost;
                    const isBelowMin = minPrice > 0 && selling < minPrice;

                    return (
                      <div
                        style={{
                          gridColumn: 'span 2',
                          background: isBelowCost ? '#fff1f2' : isExceedsMRP ? '#fffbeb' : '#f8fafc',
                          border: `1px solid ${isBelowCost ? '#fecdd3' : isExceedsMRP ? '#fef3c7' : '#e2e8f0'}`,
                          borderRadius: '10px',
                          padding: '14px 16px',
                          margin: '4px 0 10px 0'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <TrendingUp size={15} color={profit >= 0 ? '#10b981' : '#ef4444'} />
                            <span>Real-Time Pricing & Profit Analysis</span>
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Customer Savings: <strong style={{ color: '#059669' }}>₹{savings.toFixed(2)}</strong>
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                          <div style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>EXPECTED PROFIT</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: profit >= 0 ? '#166534' : '#b91c1c' }}>
                              ₹{profit.toFixed(2)}
                            </div>
                          </div>

                          <div style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>PROFIT MARGIN</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: marginPct >= 15 ? '#166534' : marginPct > 0 ? '#b45309' : '#b91c1c' }}>
                              {marginPct.toFixed(2)}%
                            </div>
                          </div>

                          <div style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>COST MARKUP</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e40af' }}>
                              {markupPct.toFixed(2)}%
                            </div>
                          </div>

                          <div style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>DISCOUNT OFF MRP</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569' }}>
                              {mrp > 0 ? ((savings / mrp) * 100).toFixed(1) : 0}%
                            </div>
                          </div>
                        </div>

                        {/* Real-time Validation Warnings */}
                        {isExceedsMRP && (
                          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={14} />
                            <span>Warning: Selling price (₹{selling}) exceeds printed MRP (₹{mrp}).</span>
                          </div>
                        )}
                        {isBelowCost && (
                          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={14} />
                            <span>Critical: Selling price is below purchase cost! Sale will result in ₹{Math.abs(profit).toFixed(2)} gross loss per unit.</span>
                          </div>
                        )}
                        {isBelowMin && (
                          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={14} />
                            <span>Alert: Selling price is below the configured minimum floor price (₹{minPrice}).</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="form-group">
                    <label>Opening Stock ({formData.unit})</label>
                    <input
                      type="number"
                      step="0.05"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Minimum Reorder Stock</label>
                    <input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 5 })}
                    />
                  </div>

                  {/* ====================================================
                      PRODUCT PHOTO UPLOAD COMPONENT (SECTIONS 33-36)
                      ==================================================== */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={16} color="var(--primary-700)" />
                      <span>Product Image (Camera, Gallery, or File)</span>
                    </label>

                    {imageUploadError && (
                      <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={15} />
                        <span>{imageUploadError}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {/* Image Preview Box */}
                      <div style={{
                        width: '96px',
                        height: '96px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-light)',
                        background: '#f8fafc',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        flexShrink: 0
                      }}>
                        {formData.photo_url ? (
                          <>
                            <img
                              src={formData.photo_url}
                              alt="Product preview"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(0,0,0,0.6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '10px'
                              }}
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
                            <ImageIcon size={28} style={{ margin: '0 auto 4px', opacity: 0.6 }} />
                            <span>No Photo</span>
                          </div>
                        )}
                      </div>

                      {/* Upload Controls */}
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {/* File input: Gallery / Device */}
                          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Upload size={14} />
                            <span>Choose from Gallery</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(f);
                              }}
                            />
                          </label>

                          {/* File input: Camera Capture */}
                          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Camera size={14} />
                            <span>Take Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(f);
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => setShowManualUrl(!showManualUrl)}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {showManualUrl ? 'Hide URL' : 'Or paste URL'}
                          </button>
                        </div>

                        {isUploadingImage && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RefreshCw size={14} className="spin" />
                            <span>Uploading and optimizing image...</span>
                          </div>
                        )}

                        {showManualUrl && (
                          <input
                            type="text"
                            placeholder="https://..."
                            value={formData.photo_url || ''}
                            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                            style={{ width: '100%', marginTop: '6px', fontSize: '0.85rem' }}
                          />
                        )}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Supports JPG, JPEG, PNG, and WEBP images up to 10MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_visible_online)}
                      onChange={(e) => setFormData({ ...formData, is_visible_online: e.target.checked ? 1 : 0 })}
                    />
                    <span>Visible on Website</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_pos_available)}
                      onChange={(e) => setFormData({ ...formData, is_pos_available: e.target.checked ? 1 : 0 })}
                    />
                    <span>Available on POS</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_bestseller)}
                      onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked ? 1 : 0 })}
                    />
                    <span>Mark as Bestseller</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_loose)}
                      onChange={(e) => setFormData({ ...formData, is_loose: e.target.checked ? 1 : 0 })}
                    />
                    <span>Loose Weight Product</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploadingImage || Boolean(barcodeWarning)}
                  style={{ gap: '6px' }}
                >
                  <Check size={16} />
                  <span>{editingProduct ? 'Save Product Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: BULK PRICE UPDATE TOOL
          ==================================================== */}
      {isBulkPriceOpen && (
        <div className="modal-backdrop" onClick={() => setIsBulkPriceOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚡ Bulk Price Adjustment</h3>
              <button className="btn-icon btn-secondary" onClick={() => setIsBulkPriceOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Batch increase or decrease prices across an entire category or all items at once. Updates reflect on POS and Website automatically.
              </p>

              <div className="form-group">
                <label>Target Category</label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                >
                  <option value="">All Products</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Adjustment Mode</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${bulkAdjustmentType === 'PERCENTAGE' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setBulkAdjustmentType('PERCENTAGE')}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    className={`btn ${bulkAdjustmentType === 'FIXED' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setBulkAdjustmentType('FIXED')}
                  >
                    Fixed Amount (₹)
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Adjustment Value ({bulkAdjustmentType === 'PERCENTAGE' ? '% e.g. 5 for +5%' : '₹ e.g. 5 for +₹5/KG'})
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div style={{ padding: '12px', background: '#fef3c7', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: '#92400e' }}>
                ⚠️ Example: If a product is ₹100, adjusting by {bulkAdjustmentType === 'PERCENTAGE' ? `${bulkValue}%` : `₹${bulkValue}`} will make its new selling price <strong>₹{bulkAdjustmentType === 'PERCENTAGE' ? Math.round(100 * (1 + bulkValue / 100)) : 100 + bulkValue}</strong>.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsBulkPriceOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApplyBulkPrice}>
                Apply Price Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: PRICE HISTORY AUDIT TRAIL
          ==================================================== */}
      {selectedHistoryProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedHistoryProduct(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📜 Price History: {selectedHistoryProduct.name}</h3>
              <button className="btn-icon btn-secondary" onClick={() => setSelectedHistoryProduct(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Current Price: <strong style={{ color: 'var(--primary-700)', fontSize: '1.1rem' }}>₹{selectedHistoryProduct.selling_price}</strong>
              </div>

              {priceHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No historical changes recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {priceHistory.map(h => (
                    <div key={h.id} style={{
                      padding: '10px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          ₹{h.old_price} → <span style={{ color: 'var(--primary-700)' }}>₹{h.new_price}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {h.reason || 'Price update'} • by {h.changed_by || 'Owner'}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(h.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedHistoryProduct(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 6: BULK PRODUCT IMPORT MODAL */}
      <BulkProductImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImportSuccess={() => loadProducts()}
      />

      {/* PHASE 6: BULK PRICE & STOCK UPDATE MODAL */}
      <BulkPriceStockModal
        isOpen={isBulkPriceStockOpen}
        onClose={() => setIsBulkPriceStockOpen(false)}
        onSuccess={() => loadProducts()}
      />
    </div>
  );
};
