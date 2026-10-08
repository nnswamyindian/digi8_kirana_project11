import React, { useState, useEffect } from 'react';
import { Category, Product } from '../../types';
import { api } from '../../services/api';
import { Sparkles, CheckCircle2, X, AlertCircle, Package, Tag, ArrowRight } from 'lucide-react';

interface NewProductDetectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  globalProduct: any;
  categories: Category[];
  onProductCreated: (product: Product) => void;
}

export const NewProductDetectedModal: React.FC<NewProductDetectedModalProps> = ({
  isOpen,
  onClose,
  barcode,
  globalProduct,
  categories,
  onProductCreated,
}) => {
  if (!isOpen || !globalProduct) return null;

  // Find best matching category by name or subcategory
  const initialCategory = categories.find(
    c => c.name.toLowerCase() === (globalProduct.category || '').toLowerCase() ||
         c.slug.toLowerCase().includes((globalProduct.category || '').toLowerCase())
  )?.id || categories[0]?.id || '';

  const refMrp = Number(globalProduct.mrp) || 0;
  const initialSelling = refMrp > 0 ? refMrp : '';

  const [name, setName] = useState(globalProduct.name || '');
  const [brand, setBrand] = useState(globalProduct.brand || '');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [unit, setUnit] = useState(globalProduct.unit || 'PACKET');
  const [purchaseCost, setPurchaseCost] = useState<string>(refMrp > 0 ? String(Math.round(refMrp * 0.82)) : '0');
  const [mrp, setMrp] = useState<string>(refMrp > 0 ? String(refMrp) : '');
  const [sellingPrice, setSellingPrice] = useState<string>(initialSelling ? String(initialSelling) : '');
  const [gstPercent, setGstPercent] = useState<number>(5);
  const [openingStock, setOpeningStock] = useState<string>('15');
  const [minStock, setMinStock] = useState<string>('5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (globalProduct) {
      setName(globalProduct.name || '');
      setBrand(globalProduct.brand || '');
      const matched = categories.find(
        c => c.name.toLowerCase() === (globalProduct.category || '').toLowerCase()
      )?.id || categories[0]?.id || '';
      setCategoryId(matched);
      setUnit(globalProduct.unit || 'PACKET');
      const rMrp = Number(globalProduct.mrp) || 0;
      setMrp(rMrp > 0 ? String(rMrp) : '');
      setSellingPrice(rMrp > 0 ? String(rMrp) : '');
      setPurchaseCost(rMrp > 0 ? String(Math.round(rMrp * 0.82)) : '0');
      setErrorMsg('');
    }
  }, [globalProduct, categories]);

  const handleSaveAndAdd = async (e: React.FormEvent) => {
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
        category_name: selectedCat?.name || globalProduct.category || 'Grocery',
        unit,
        purchase_cost: parseFloat(purchaseCost) || 0,
        mrp: parseFloat(mrp) || sellPriceNum,
        selling_price: sellPriceNum,
        wholesale_price: sellPriceNum,
        min_selling_price: parseFloat(purchaseCost) || 0,
        gst_percent: gstPercent,
        opening_stock: parseFloat(openingStock) || 0,
        min_stock: parseFloat(minStock) || 5,
        photo_url: globalProduct.photo_url || globalProduct.image_url || '',
        description: globalProduct.description || ''
      });

      if (res.product) {
        onProductCreated(res.product);
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

  const sourceBadge = globalProduct.source === 'external_provider' 
    ? '🌐 Global Barcode Registry' 
    : '⭐ Digi8 Master Catalog';

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-card" 
        style={{ maxWidth: '580px', width: '95%', padding: '0', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
          color: 'white',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>
              <Sparkles size={20} color="#fef08a" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Product Auto-Identified!</h3>
                <span style={{
                  fontSize: '0.7rem',
                  background: 'rgba(255,255,255,0.25)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 700
                }}>
                  {sourceBadge}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                Recognized from barcode master. Set your store price & stock to add to current bill.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Product Identity Summary Card */}
        <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '14px', alignItems: 'center' }}>
          {globalProduct.photo_url || globalProduct.image_url ? (
            <img 
              src={globalProduct.photo_url || globalProduct.image_url} 
              alt={name}
              style={{ width: '56px', height: '56px', objectFit: 'contain', background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2px' }}
            />
          ) : (
            <div style={{ width: '56px', height: '56px', background: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={26} color="#64748b" />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              {brand ? `${brand} • ` : ''}{globalProduct.category || 'FMCG Grocery'}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px', color: '#334155', fontWeight: 700 }}>
                {barcode}
              </span>
              {globalProduct.pack_size && (
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                  Pack: <strong>{globalProduct.pack_size}</strong>
                </span>
              )}
              {refMrp > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>
                  MRP: ₹{refMrp.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAndAdd} style={{ padding: '16px 20px' }}>
          {errorMsg && (
            <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', fontSize: '0.8rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pricing Grid */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              💰 Store Pricing & Tax Configuration (Authoritative)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '3px' }}>
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="e.g. 140"
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
                  placeholder="Reference MRP"
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
                  placeholder="Store Cost"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  GST Tax Rate
                </label>
                <select
                  value={gstPercent}
                  onChange={(e) => setGstPercent(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    background: 'white'
                  }}
                >
                  <option value={0}>0% (Exempt / Essential)</option>
                  <option value={5}>5% (Packaged Foods, Sugar, Tea)</option>
                  <option value={12}>12% (Butter, Ghee, Cheese)</option>
                  <option value={18}>18% (Soaps, Detergents, Toothpaste)</option>
                  <option value={28}>28% (Luxury / Aerated)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Opening Stock Qty
                </label>
                <input
                  type="number"
                  step="1"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    background: 'white'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Details Row: Name, Category & Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                Store Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: 'white'
                }}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
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
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 800 }}
            >
              <CheckCircle2 size={18} />
              <span>{isSubmitting ? 'Creating Product...' : 'Save & Add to Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
