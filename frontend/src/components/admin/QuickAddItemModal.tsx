import React, { useState, useEffect, useRef } from 'react';
import { Product, Category } from '../../types';
import { PlusCircle, Search, X, Check, Package, Scale, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

export interface QuickAddItemPayload {
  product: Product;
  quantity: number;
  unit: string;
  unit_price: number;
  original_price: number;
  is_price_override?: boolean;
  is_loose?: boolean;
}

interface QuickAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: Product[];
  categories: Category[];
  onAddItem: (item: QuickAddItemPayload) => void;
  onProductCreated?: (newProduct: Product) => void;
  language?: string;
  storeId?: string;
}

const COMMON_UNITS = [
  'PACKET',
  'PIECE',
  'KG',
  'GRAM',
  'LITRE',
  'ML',
  'BOX',
  'BOTTLE',
  'DOZEN'
];

export const QuickAddItemModal: React.FC<QuickAddItemModalProps> = ({
  isOpen,
  onClose,
  catalogProducts,
  categories,
  onAddItem,
  onProductCreated,
  language = 'en',
  storeId = 'store_royal_001'
}) => {
  if (!isOpen) return null;

  const isTe = language === 'te';

  const [nameInput, setNameInput] = useState('');
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const [mrpInput, setMrpInput] = useState('');
  const [purchaseCostInput, setPurchaseCostInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState('PACKET');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [addMode, setAddMode] = useState<'SAVE_AND_BILL' | 'BILL_ONLY'>('SAVE_AND_BILL');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Suggestions state
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);

  // Focus name input on mount
  useEffect(() => {
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  }, []);

  // Filter matching catalog products as cashier types
  const matchingSuggestions = React.useMemo(() => {
    const query = nameInput.trim().toLowerCase();
    if (!query) return [];

    return catalogProducts
      .filter(p => {
        const nameMatch = p.name.toLowerCase().includes(query);
        const brandMatch = p.brand ? p.brand.toLowerCase().includes(query) : false;
        const barcodeMatch = p.barcode ? p.barcode.includes(query) : false;
        return nameMatch || brandMatch || barcodeMatch;
      })
      .slice(0, 10);
  }, [nameInput, catalogProducts]);

  // Handle selecting a suggested catalog item
  const handleSelectSuggestion = (prod: Product) => {
    setSelectedProduct(prod);
    setNameInput(prod.name);
    setUnitPriceInput(String(prod.selling_price || ''));
    setMrpInput(String(prod.mrp || ''));
    setPurchaseCostInput(String(prod.purchase_cost || ''));
    setSelectedUnit(prod.unit || 'PACKET');
    setSelectedCategory(prod.category_id || '');
    setIsSuggestionsOpen(false);

    // Focus price or quantity
    setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 50);
  };

  // Keyboard navigation for suggestions
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsOpen || matchingSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && matchingSuggestions.length > 0) {
        setIsSuggestionsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % matchingSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + matchingSuggestions.length) % matchingSuggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matchingSuggestions[highlightedIndex]) {
        handleSelectSuggestion(matchingSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSuggestionsOpen(false);
    }
  };

  const currentPrice = parseFloat(unitPriceInput) || 0;
  const currentQty = parseFloat(quantityInput) || 1;
  const lineTotal = Math.round(currentPrice * currentQty * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      alert(isTe ? 'దయచేసి సరుకు పేరు నమోదు చేయండి' : 'Please enter an item name');
      nameInputRef.current?.focus();
      return;
    }

    // Price is completely non-mandatory; if blank or invalid, smoothly default to 0
    const price = Math.max(0, parseFloat(unitPriceInput) || 0);
    const parsedMrp = Math.max(0, parseFloat(mrpInput) || price);
    const parsedCost = Math.max(0, parseFloat(purchaseCostInput) || (price > 0 ? Math.round(price * 0.8 * 100) / 100 : 0));
    const qty = Math.max(0.001, parseFloat(quantityInput) || 1);

    setIsSubmitting(true);
    try {
      let finalProduct: Product;

      if (selectedProduct && selectedProduct.name.toLowerCase() === trimmedName.toLowerCase()) {
        // Selected existing catalog product
        finalProduct = {
          ...selectedProduct,
          unit: selectedUnit,
          selling_price: price || selectedProduct.selling_price || 0,
          mrp: parsedMrp || selectedProduct.mrp || price || 0
        };
      } else {
        // New item created at billing time
        const newProdId = `prod_quick_${Date.now()}`;
        const isLoose = selectedUnit === 'KG' || selectedUnit === 'GRAM' || selectedUnit === 'LITRE' || selectedUnit === 'ML';
        const fallbackCat = selectedCategory || (isLoose ? 'cat_loose_items' : 'cat_general');

        finalProduct = {
          id: newProdId,
          store_id: storeId,
          tenant_id: storeId,
          category_id: fallbackCat,
          name: trimmedName,
          brand: 'General',
          barcode: String(Date.now()).slice(-8),
          unit: selectedUnit,
          selling_price: price,
          mrp: parsedMrp,
          purchase_cost: parsedCost,
          wholesale_price: price,
          min_selling_price: parsedCost,
          pos_price: price,
          website_price: price,
          gst_percent: 0,
          stock: 999,
          reserved_stock: 0,
          available_stock: 999,
          min_stock: 5,
          photo_url: '',
          description: trimmedName,
          is_loose: isLoose ? 1 : 0,
          is_active: 1,
          is_pos_available: 1,
          is_visible_online: 1,
          is_featured: 0,
          is_bestseller: 0,
          is_offer: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // If user chose "Save in Item List & Add to Cart", save to database catalog in background
        if (addMode === 'SAVE_AND_BILL') {
          try {
            api.createProduct({
              name: trimmedName,
              unit: selectedUnit,
              selling_price: price,
              mrp: parsedMrp,
              purchase_cost: parsedCost,
              category_id: fallbackCat,
              is_loose: finalProduct.is_loose,
              stock: 999
            }).then(res => {
              if (res && res.id) {
                finalProduct.id = res.id;
                if (onProductCreated) {
                  onProductCreated({ ...finalProduct, id: res.id });
                }
              }
            }).catch(err => {
              console.warn('[Quick Product Catalog Sync Notice]:', err);
            });
          } catch (e) {
            console.warn('[Quick Product Catalog Sync Warning]:', e);
          }
        }
      }

      const origPrice = selectedProduct ? selectedProduct.selling_price : price;
      const isOverride = price !== origPrice;

      onAddItem({
        product: finalProduct,
        quantity: qty,
        unit: selectedUnit,
        unit_price: price,
        original_price: origPrice,
        is_price_override: isOverride,
        is_loose: Boolean(finalProduct.is_loose)
      });

      onClose();
    } catch (err: any) {
      alert('Error adding item: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '12px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '94vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#10b981',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
                flexShrink: 0
              }}
            >
              <PlusCircle size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#0f172a' }}>
                {isTe ? 'కొత్త సరుకును బిల్లులో చేర్చండి' : 'Add Item While Billing'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                {isTe ? 'పేరు టైప్ చేయండి — లైవ్ సూచనలు కనిపిస్తాయి' : 'Type name for live autocomplete or add a new item'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* FLOW SELECTION: SAVE IN LIST VS JUST ADD IN CART */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isTe ? 'సరుకు చర్యను ఎంచుకోండి (Action):' : 'Item Billing Action:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {/* Option A: Save in List & Add to Cart */}
              <div
                onClick={() => setAddMode('SAVE_AND_BILL')}
                style={{
                  border: `2px solid ${addMode === 'SAVE_AND_BILL' ? '#10b981' : '#e2e8f0'}`,
                  background: addMode === 'SAVE_AND_BILL' ? '#f0fdf4' : 'white',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="addMode"
                  checked={addMode === 'SAVE_AND_BILL'}
                  onChange={() => setAddMode('SAVE_AND_BILL')}
                  style={{ marginTop: '3px', accentColor: '#10b981' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: addMode === 'SAVE_AND_BILL' ? '#065f46' : '#1e293b' }}>
                    📦 {isTe ? 'జాబితాలో భద్రపరచి కార్ట్‌లో చేర్చండి' : 'Save in Item List & Add'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                    {isTe
                      ? 'దుకాణ కేటలాగ్‌లో భద్రపరుస్తుంది — తదుపరి బిల్లింగ్‌లో ఆటో-సూచనగా వస్తుంది'
                      : 'Saves to store product list for future search + adds to this bill'}
                  </div>
                </div>
              </div>

              {/* Option B: Just Add to Cart (One-time item) */}
              <div
                onClick={() => setAddMode('BILL_ONLY')}
                style={{
                  border: `2px solid ${addMode === 'BILL_ONLY' ? '#3b82f6' : '#e2e8f0'}`,
                  background: addMode === 'BILL_ONLY' ? '#eff6ff' : 'white',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="addMode"
                  checked={addMode === 'BILL_ONLY'}
                  onChange={() => setAddMode('BILL_ONLY')}
                  style={{ marginTop: '3px', accentColor: '#3b82f6' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: addMode === 'BILL_ONLY' ? '#1e40af' : '#1e293b' }}>
                    🛒 {isTe ? 'కార్ట్‌లో మాత్రమే చేర్చండి' : 'Just Add to Cart (One-Time)'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                    {isTe
                      ? 'ఈ కస్టమర్ బిల్లులో మాత్రమే చేరుతుంది (కేటలాగ్‌లో చేర్చబడదు)'
                      : 'Adds to this customer bill only without adding to catalog'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Item Name with Instant Search Suggestions */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isTe ? 'సరుకు పేరు (Item Name)' : 'Item Name'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={nameInputRef}
                type="text"
                placeholder={isTe ? 'ఉదా: Rice, Sugar, Toor Dal...' : 'Type name (e.g., Rice, Sugar, Oil)...'}
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setIsSuggestionsOpen(true);
                  setHighlightedIndex(0);
                  if (selectedProduct && selectedProduct.name !== e.target.value) {
                    setSelectedProduct(null);
                  }
                }}
                onFocus={() => {
                  if (nameInput.trim().length > 0) {
                    setIsSuggestionsOpen(true);
                  }
                }}
                onKeyDown={handleNameKeyDown}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 38px',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  background: selectedProduct ? '#f0fdf4' : 'white',
                  borderColor: selectedProduct ? '#10b981' : '#cbd5e1'
                }}
              />
              <Search
                size={18}
                color={selectedProduct ? '#10b981' : '#94a3b8'}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              {nameInput && (
                <button
                  type="button"
                  onClick={() => {
                    setNameInput('');
                    setSelectedProduct(null);
                    setUnitPriceInput('');
                    setMrpInput('');
                    setPurchaseCostInput('');
                    setIsSuggestionsOpen(false);
                    nameInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Live Autocomplete Suggestions Dropdown */}
            {isSuggestionsOpen && matchingSuggestions.length > 0 && (
              <div
                ref={suggestionsBoxRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 20px 30px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  marginTop: '6px',
                  zIndex: 10000,
                  maxHeight: '240px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                  <span>MATCHING ITEMS ({matchingSuggestions.length})</span>
                  <span>CLICK OR ENTER</span>
                </div>
                {matchingSuggestions.map((prod, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleSelectSuggestion(prod)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isHighlighted ? '#ecfdf5' : 'white',
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {prod.is_loose ? (
                          <span style={{ fontSize: '1rem' }}>⚖️</span>
                        ) : (
                          <Package size={16} color="#64748b" />
                        )}
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                            {prod.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {prod.brand && <span>{prod.brand} •</span>}
                            <span>Stock: {prod.stock} {prod.unit}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#059669' }}>
                          ₹{prod.selling_price}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          per {prod.unit}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedProduct && (
              <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <Check size={14} /> Catalog Product Matched (Stock: {selectedProduct.stock} {selectedProduct.unit})
              </div>
            )}
          </div>

          {/* Price, Quantity & Unit Grid - Completely Non-Mandatory Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '10px' }}>
            {/* Store Selling Price (₹) - NOT MANDATORY */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                {isTe ? 'స్టోర్ అమ్మకపు ధర (₹)' : 'Store Selling Price (₹)'}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>
                  ₹
                </span>
                <input
                  ref={priceInputRef}
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={unitPriceInput}
                  onChange={(e) => setUnitPriceInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 10px 10px 24px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '1rem',
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                {isTe ? 'పరిమాణం (Qty)' : 'Quantity'}
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                placeholder="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 8px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Unit */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                {isTe ? 'కొలత (Unit)' : 'Unit'}
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 6px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  outline: 'none',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              >
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Total Summary Card */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                BILL LINE TOTAL PREVIEW
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>
                {currentQty} {selectedUnit} × ₹{currentPrice.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                ₹{lineTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Collapsible Optional Pricing Details: Printed MRP & Purchase Cost (Not Mandatory) */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 0'
              }}
            >
              <span>{showOptionalDetails ? '▼ Hide' : '▶ Show'} Optional Details (Printed MRP & Purchase Cost)</span>
            </button>

            {showOptionalDetails && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Printed MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Defaults to price"
                    value={mrpInput}
                    onChange={(e) => setMrpInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Purchase Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional cost"
                    value={purchaseCostInput}
                    onChange={(e) => setPurchaseCostInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: 'white',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">General Kirana</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: '1',
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nameInput.trim()}
              style={{
                flex: '2',
                padding: '11px',
                borderRadius: '10px',
                border: 'none',
                background: addMode === 'SAVE_AND_BILL'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.96rem',
                cursor: isSubmitting || !nameInput.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !nameInput.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: addMode === 'SAVE_AND_BILL'
                  ? '0 4px 12px rgba(16, 185, 129, 0.35)'
                  : '0 4px 12px rgba(59, 130, 246, 0.35)'
              }}
            >
              <Check size={18} />
              <span>
                {isSubmitting
                  ? 'Adding...'
                  : addMode === 'SAVE_AND_BILL'
                  ? 'Save to List & Add (Enter)'
                  : 'Add to Cart Only (Enter)'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
