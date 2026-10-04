import React, { useState } from 'react';
import { Product } from '../../types';
import { Plus, Check, Scale, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, customSubtotal?: number) => void;
  onViewDetails?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetails,
}) => {
  const { language, t } = useLanguage();
  const isTe = language === 'te';

  const isLoose = Boolean(product.is_loose) || product.unit === 'KG';
  const isOutOfStock = !product.is_in_stock || product.available_stock <= 0;

  // For loose items, default to 1.000 KG or 0.500 KG; for packaged items default to 1
  const [selectedQty, setSelectedQty] = useState<number>(isLoose ? 1.000 : 1);
  const [activePreset, setActivePreset] = useState<string>(isLoose ? '1kg' : '1');
  const [isAdded, setIsAdded] = useState(false);

  // Loose presets in fractions of KG
  const loosePresets = [
    { label: isTe ? '250గ్రా' : '250g', val: 0.250 },
    { label: isTe ? '500గ్రా' : '500g', val: 0.500 },
    { label: isTe ? '1కిలో' : '1kg', val: 1.000 },
    { label: isTe ? '2కిలో' : '2kg', val: 2.000 },
  ];

  // Calculated price for the chosen quantity
  const linePrice = Math.round(selectedQty * product.selling_price * 100) / 100;

  const handlePresetClick = (preset: { label: string; val: number }) => {
    setSelectedQty(preset.val);
    setActivePreset(preset.label);
  };

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, selectedQty, linePrice);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  return (
    <div className={`product-card ${isOutOfStock ? 'opacity-75' : ''}`}>
      {/* Product Image & Badges */}
      <div className="product-media-wrapper" onClick={() => onViewDetails?.(product)}>
        <img
          src={product.photo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          className="product-img"
          loading="lazy"
        />

        <div className="product-badges">
          {product.is_bestseller ? <span className="badge badge-amber">{isTe ? '★ ప్రముఖ సరుకు' : '★ Bestseller'}</span> : null}
          {product.savings_percent && product.savings_percent > 0 ? (
            <span className="badge badge-green">{product.savings_percent}% OFF</span>
          ) : null}
          {isLoose ? (
            <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Scale size={11} /> {isTe ? 'వదులు' : 'Loose'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Product Content */}
      <div className="product-body">
        <div className="product-brand">{product.brand || (isTe ? 'నాణ్యమైన కిరాణా' : 'Fresh Mart')}</div>
        <h3 className="product-name" onClick={() => onViewDetails?.(product)} title={product.name}>
          {product.name}
        </h3>

        <div className="product-unit-tag">
          {isLoose ? `₹${product.selling_price} / KG` : `1 ${product.unit}`}
        </div>

        {/* Loose Grocery Weight Preset Stepper */}
        {isLoose && !isOutOfStock && (
          <div className="loose-weight-selector">
            <div className="loose-presets">
              {loosePresets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  className={`loose-preset-btn ${activePreset === preset.label ? 'active' : ''}`}
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="loose-custom-input">
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isTe ? 'తూకం:' : 'Custom:'}</span>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max={product.available_stock}
                value={selectedQty}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0.1;
                  setSelectedQty(val);
                  setActivePreset('custom');
                }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>KG</span>
            </div>
          </div>
        )}

        {/* Price Row */}
        <div className="price-container">
          <div>
            <span className="current-price">₹{linePrice}</span>
            {isLoose && selectedQty !== 1 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                ({selectedQty} KG @ ₹{product.selling_price}/KG)
              </span>
            )}
          </div>

          {product.mrp > product.selling_price && (
            <span className="mrp-price">
              ₹{Math.round(selectedQty * product.mrp)}
            </span>
          )}

          {product.savings_amount && product.savings_amount > 0 ? (
            <span className="savings-tag">
              {isTe ? `₹${(product.savings_amount * selectedQty).toFixed(0)} ఆదా` : `Save ₹${(product.savings_amount * selectedQty).toFixed(0)}`}
            </span>
          ) : null}
        </div>

        {/* Add to Cart / Out of Stock */}
        <div className="product-action-bar">
          {isOutOfStock ? (
            <div className="out-of-stock-banner">
              <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              {isTe ? 'స్టాక్ అయిపోయింది' : 'OUT OF STOCK'}
            </div>
          ) : (
            <button
              className={`btn btn-primary ${isAdded ? 'btn-accent' : ''}`}
              style={{ width: '100%' }}
              onClick={handleAdd}
            >
              {isAdded ? (
                <>
                  <Check size={16} /> {isTe ? 'కార్ట్‌కు చేరింది' : 'Added'} ({selectedQty} {product.unit})
                </>
              ) : (
                <>
                  <Plus size={16} /> {t.addToCart}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
