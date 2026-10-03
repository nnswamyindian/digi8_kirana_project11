import React, { useState, useEffect } from 'react';
import { Category, Product } from '../../types';
import { api } from '../../services/api';
import { AlertCircle, Plus, Search, CheckCircle2, X, Barcode, Camera, Link2, Package } from 'lucide-react';

interface UnknownBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  categories: Category[];
  onProductCreatedOrAssigned: (product: Product) => void;
  onScanAgain: () => void;
}

export const UnknownBarcodeModal: React.FC<UnknownBarcodeModalProps> = ({
  isOpen,
  onClose,
  barcode,
  categories,
  onProductCreatedOrAssigned,
  onScanAgain,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'CREATE' | 'ASSIGN'>('CREATE');

  // Create Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [unit, setUnit] = useState('PACKET');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('0');
  const [gstPercent, setGstPercent] = useState<number>(5);
  const [openingStock, setOpeningStock] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Assign Existing Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProductToAssign, setSelectedProductToAssign] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setName('');
    setBrand('');
    setSellingPrice('');
    setMrp('');
    setPurchaseCost('0');
    setErrorMsg('');
    setSelectedProductToAssign(null);
    setSearchQuery('');
    setSearchResults([]);
    if (categories.length > 0) setCategoryId(categories[0].id);
  }, [isOpen, barcode, categories]);

  // Live search for existing store products to assign
  useEffect(() => {
    if (activeTab !== 'ASSIGN') return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const list = await api.searchProductsForBarcode(searchQuery);
        setSearchResults(list);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    const sellPriceNum = parseFloat(sellingPrice);
    if (isNaN(sellPriceNum) || sellPriceNum <= 0) {
      setErrorMsg('Please enter a valid store selling price.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const selectedCat = categories.find(c => c.id === categoryId);
      const res = await api.createProductFromBarcode({
        barcode,
        name: name.trim(),
        brand: brand.trim(),
        category_id: categoryId,
        category_name: selectedCat?.name || 'Grocery',
        unit,
        purchase_cost: parseFloat(purchaseCost) || 0,
        mrp: parseFloat(mrp) || sellPriceNum,
        selling_price: sellPriceNum,
        wholesale_price: sellPriceNum,
        min_selling_price: parseFloat(purchaseCost) || 0,
        gst_percent: gstPercent,
        opening_stock: parseFloat(openingStock) || 0,
        min_stock: 5,
        photo_url: '',
        description: ''
      });

      if (res.product) {
        onProductCreatedOrAssigned(res.product);
        onClose();
      } else {
        throw new Error('Product created but no product payload returned');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedProductToAssign) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.assignBarcodeToProduct(selectedProductToAssign.id, barcode);
      if (res.product) {
        onProductCreatedOrAssigned(res.product);
        onClose();
      } else {
        throw new Error('Barcode assigned but no product payload returned');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign barcode');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-card" 
        style={{ maxWidth: '580px', width: '95%', padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Barcode size={22} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Product Not Found</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Scanned Barcode:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, background: 'rgba(255,255,255,0.15)', padding: '1px 8px', borderRadius: '4px', color: '#38bdf8' }}>
                {barcode}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => setActiveTab('CREATE')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'CREATE' ? 'white' : 'transparent',
              borderBottom: activeTab === 'CREATE' ? '2px solid #16a34a' : 'none',
              fontWeight: activeTab === 'CREATE' ? 800 : 600,
              color: activeTab === 'CREATE' ? '#16a34a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <Plus size={16} />
            <span>Quick Create & Add to Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ASSIGN')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'ASSIGN' ? 'white' : 'transparent',
              borderBottom: activeTab === 'ASSIGN' ? '2px solid #2563eb' : 'none',
              fontWeight: activeTab === 'ASSIGN' ? 800 : 600,
              color: activeTab === 'ASSIGN' ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <Link2 size={16} />
            <span>Search & Link to Existing Item</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{ margin: '14px 20px 0', padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: QUICK CREATE NEW PRODUCT */}
        {activeTab === 'CREATE' && (
          <form onSubmit={handleCreateSubmit} style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                Product Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Fortune Besan 500g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Brand (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fortune"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing Section */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#166534', marginBottom: '3px' }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 55"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '2px solid #16a34a',
                      fontWeight: 900,
                      fontSize: '1rem',
                      color: '#14532d',
                      background: 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="MRP"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      background: 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cost"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      background: 'white'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: 'white'
                    }}
                  >
                    <option value="PACKET">PACKET</option>
                    <option value="PIECE">PIECE</option>
                    <option value="KG">KG</option>
                    <option value="GRAM">GRAM</option>
                    <option value="LITRE">LITRE</option>
                    <option value="ML">ML</option>
                    <option value="BOTTLE">BOTTLE</option>
                    <option value="BOX">BOX</option>
                    <option value="BAG">BAG</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    GST %
                  </label>
                  <select
                    value={gstPercent}
                    onChange={(e) => setGstPercent(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: 'white'
                    }}
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: 'white'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onScanAgain();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Camera size={14} />
                <span>Scan Another</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                >
                  <CheckCircle2 size={16} />
                  <span>{isSubmitting ? 'Saving...' : 'Save & Add to Bill'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: SEARCH & LINK TO EXISTING PRODUCT */}
        {activeTab === 'ASSIGN' && (
          <div style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 10px' }}>
              Select an existing store product to link this barcode permanently. Future scans will instantly add it to bill.
            </p>

            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                autoFocus
                placeholder="Type product name, brand or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 34px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Results List */}
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
              {isSearching ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Searching store inventory...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  {searchQuery ? 'No matching products found.' : 'Search above to find an existing store product.'}
                </div>
              ) : (
                searchResults.map(p => {
                  const isSelected = selectedProductToAssign?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProductToAssign(p)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'white',
                        borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {p.category_name} • {p.unit} • Current Barcode: {p.barcode ? <span style={{ fontFamily: 'monospace' }}>{p.barcode}</span> : <em style={{ color: '#eab308' }}>None</em>}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>₹{Number(p.selling_price).toFixed(2)}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Stock: {p.stock}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedProductToAssign && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.85rem', color: '#1e40af' }}>
                Linking barcode <strong>{barcode}</strong> to <strong>{selectedProductToAssign.name}</strong> (₹{Number(selectedProductToAssign.selling_price).toFixed(2)}).
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onScanAgain();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Camera size={14} />
                <span>Scan Another</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAssignSubmit}
                  disabled={!selectedProductToAssign || isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                >
                  <Link2 size={16} />
                  <span>{isSubmitting ? 'Linking...' : 'Assign & Add to Bill'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
