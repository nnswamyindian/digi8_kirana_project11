import React, { useState } from 'react';
import { Product } from '../../types';
import { X, Plus, Check, Scale, ShieldCheck, Truck } from 'lucide-react';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onAddToCart: (product: Product, quantity: number, customSubtotal?: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCart,
}) => {
  if (!isOpen) return null;

  const isLoose = product.is_loose || product.unit === 'KG';
  const isOutOfStock = !product.is_in_stock || product.available_stock <= 0;

  const [quantity, setQuantity] = useState<number>(isLoose ? 1.000 : 1);
  const [activePreset, setActivePreset] = useState<string>(isLoose ? '1kg' : '1');
  const [isAdded, setIsAdded] = useState(false);

  const loosePresets = [
    { label: '250g', val: 0.250 },
    { label: '500g', val: 0.500 },
    { label: '1kg', val: 1.000 },
    { label: '2kg', val: 2.000 },
    { label: '5kg', val: 5.000 },
  ];

  const calculatedPrice = Math.round(quantity * product.selling_price * 100) / 100;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, quantity, calculatedPrice);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="badge badge-green">{product.category_name || 'Grocery'}</span>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', alignItems: 'center' }}>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '260px', background: '#f8fafc' }}>
              <img
                src={product.photo_url}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-700)', textTransform: 'uppercase' }}>
                {product.brand}
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.25, margin: '4px 0 8px' }}>
                {product.name}
              </h2>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                {product.description || 'Premium quality pantry essential, rigorously tested for purity and authentic flavor.'}
              </p>

              {/* Price Row */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  ₹{calculatedPrice}
                </span>

                {product.mrp > product.selling_price && (
                  <span style={{ fontSize: '1.1rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                    ₹{Math.round(quantity * product.mrp)}
                  </span>
                )}

                {product.savings_percent && product.savings_percent > 0 ? (
                  <span className="badge badge-green">
                    {product.savings_percent}% OFF
                  </span>
                ) : null}
              </div>

              {/* Loose Weight Stepper */}
              {isLoose && !isOutOfStock && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                    SELECT WEIGHT:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    {loosePresets.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        className={`loose-preset-btn ${activePreset === preset.label ? 'active' : ''}`}
                        onClick={() => {
                          setQuantity(preset.val);
                          setActivePreset(preset.label);
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custom KG:</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max={product.available_stock}
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(parseFloat(e.target.value) || 0.1);
                        setActivePreset('custom');
                      }}
                      style={{ width: '80px', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              {isOutOfStock ? (
                <div className="out-of-stock-banner">OUT OF STOCK</div>
              ) : (
                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', gap: '8px' }}
                  onClick={handleAdd}
                >
                  {isAdded ? (
                    <>
                      <Check size={18} />
                      <span>Added to Cart!</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>Add {quantity} {product.unit} to Cart (₹{calculatedPrice})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
