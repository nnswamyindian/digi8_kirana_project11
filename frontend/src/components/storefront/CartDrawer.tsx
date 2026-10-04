import React from 'react';
import { CartItem, StoreProfile } from '../../types';
import { X, Trash2, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  store: StoreProfile;
  onUpdateQty: (productId: string, newQty: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  store,
  onUpdateQty,
  onRemoveItem,
  onProceedCheckout,
}) => {
  const { language, t } = useLanguage();
  const isTe = language === 'te';

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, it) => sum + it.total_price, 0);
  const isFreeDelivery = subtotal >= store.free_delivery_above;
  const deliveryCharge = isFreeDelivery || subtotal === 0 ? 0 : store.delivery_charge;
  const grandTotal = subtotal + deliveryCharge;
  const amountToFree = Math.max(0, store.free_delivery_above - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / store.free_delivery_above) * 100));

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <h2>
            <ShoppingBag size={22} color="var(--primary-700)" />
            <span>{isTe ? 'నా కిరాణా కార్ట్' : 'My Grocery Cart'}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ({items.length} {isTe ? 'వస్తువులు' : items.length === 1 ? 'item' : 'items'})
            </span>
          </h2>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Free Delivery Tracker Bar */}
        <div className="free-delivery-tracker">
          {isFreeDelivery ? (
            <p style={{ color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={16} /> <strong>{isTe ? 'అభినందనలు! మీకు ఉచిత డెలివరీ లభించింది!' : 'Congratulations! You unlocked FREE Delivery!'}</strong>
            </p>
          ) : (
            <p>
              {isTe ? (
                <>ఉచిత డెలివరీ కోసం ఇంకా <strong>₹{amountToFree.toFixed(0)}</strong> విలువైన సరుకులను జోడించండి!</>
              ) : (
                <>Add <strong>₹{amountToFree.toFixed(0)}</strong> more for <strong>FREE Home Delivery!</strong></>
              )}
            </p>
          )}
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="drawer-content">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛒</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                {isTe ? 'మీ కార్ట్ ఖాళీగా ఉంది' : 'Your cart is empty'}
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
                {isTe ? 'ఆర్డర్ చేయడానికి తాజా సరుకులను ఎంచుకోండి!' : 'Add some fresh groceries to start your order!'}
              </p>
            </div>
          ) : (
            items.map(item => {
              const isLoose = item.product.is_loose || item.unit === 'KG';
              const step = isLoose ? 0.250 : 1;

              return (
                <div key={item.product.id} className="cart-item-row">
                  <img
                    src={item.product.photo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80'}
                    alt={item.product.name}
                    className="cart-item-img"
                  />
                  <div className="cart-item-details">
                    <div className="cart-item-title">{item.product.name}</div>
                    <div className="cart-item-unit-rate">
                      ₹{item.unit_price} / {item.unit}
                    </div>
                    <div className="cart-item-total">
                      ₹{item.total_price.toFixed(2)}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="quantity-stepper">
                    <button
                      className="stepper-btn"
                      onClick={() => {
                        const newQ = item.quantity - step;
                        if (newQ <= 0) onRemoveItem(item.product.id);
                        else onUpdateQty(item.product.id, Math.round(newQ * 1000) / 1000);
                      }}
                    >
                      -
                    </button>
                    <span className="stepper-qty">
                      {isLoose ? `${item.quantity.toFixed(3)} ${item.unit}` : item.quantity}
                    </span>
                    <button
                      className="stepper-btn"
                      onClick={() => onUpdateQty(item.product.id, Math.round((item.quantity + step) * 1000) / 1000)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="btn-icon"
                    style={{ color: '#94a3b8', width: '32px', height: '32px' }}
                    onClick={() => onRemoveItem(item.product.id)}
                    title={isTe ? 'తొలగించు' : 'Remove item'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Bill Summary */}
        {items.length > 0 && (
          <div className="drawer-footer">
            <div className="bill-row">
              <span>{isTe ? 'సరుకుల ఉప మొత్తం:' : 'Item Subtotal:'}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="bill-row">
              <span>{isTe ? 'డెలివరీ ఛార్జీ:' : 'Delivery Charge:'}</span>
              {deliveryCharge === 0 ? (
                <span style={{ color: 'var(--primary-700)', fontWeight: 700 }}>{isTe ? 'ఉచితం (FREE)' : 'FREE'}</span>
              ) : (
                <span>₹{deliveryCharge.toFixed(2)}</span>
              )}
            </div>

            <div className="bill-total-row">
              <span>{isTe ? 'మొత్తం బిల్లు:' : 'Grand Total:'}</span>
              <span style={{ color: 'var(--primary-700)' }}>₹{grandTotal.toFixed(2)}</span>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', gap: '10px' }}
              onClick={onProceedCheckout}
            >
              <span>{isTe ? 'చెల్లింపునకు వెళ్లండి (CHECKOUT)' : 'PROCEED TO CHECKOUT'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
