import React, { useState, useEffect } from 'react';
import { mobileApi } from '../services/mobileApi';

export const CustomerAppScreen: React.FC = () => {
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<Array<{ product: any; qty: number }>>([]);
  const [activeTab, setActiveTab] = useState<'shop' | 'orders'>('shop');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [mobileApi.getTenantId()]);

  const loadData = async () => {
    try {
      const [s, c, p] = await Promise.all([
        mobileApi.getStoreProfile(),
        mobileApi.getCategories(),
        mobileApi.getProducts()
      ]);
      setStore(s);
      setCategories(c || []);
      setProducts(p || []);
    } catch (err) {
      console.error('Failed to load mobile store data:', err);
    }
  };

  const addToCart = (prod: any) => {
    setCart(prev => {
      const exist = prev.find(it => it.product.id === prod.id);
      if (exist) {
        return prev.map(it => it.product.id === prod.id ? { ...it, qty: it.qty + 1 } : it);
      }
      return [...prev, { product: prod, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce((sum, it) => sum + (it.qty * it.product.selling_price), 0);
  const brandColor = store?.primary_color || '#059669';

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Mobile Top Header */}
      <div style={{ background: brandColor, color: 'white', padding: '16px', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>📍 Delivering to Home</span>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{store?.name || 'Kirana Store'}</h2>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
            🛒
          </div>
        </div>

        <input
          type="text"
          placeholder="Search rice, atta, milk, dal..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '0.85rem', outline: 'none' }}
        />
      </div>

      {/* Categories Horizontal Scroller */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button style={{ padding: '6px 14px', borderRadius: '20px', background: brandColor, color: 'white', border: 'none', fontWeight: 700, fontSize: '0.8rem' }}>
          All
        </button>
        {categories.map((c: any) => (
          <button key={c.id} style={{ padding: '6px 14px', borderRadius: '20px', background: 'white', color: '#334155', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div style={{ padding: '0 16px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {products.slice(0, 12).map((p: any) => (
          <div key={p.id} style={{ background: 'white', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
            <img src={p.photo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'} alt={p.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: '4px', height: '36px', overflow: 'hidden' }}>{p.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>1 {p.unit}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>₹{p.selling_price}</div>
              <button
                onClick={() => addToCart(p)}
                style={{ background: brandColor, color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                + ADD
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: '16px', left: '16px', right: '16px', maxWidth: '408px', margin: '0 auto', background: brandColor, color: 'white', padding: '12px 18px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', zIndex: 100 }}>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{cart.length} items</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>₹{cartTotal}</div>
          </div>
          <button
            onClick={() => alert(`Proceeding to checkout with ₹${cartTotal}`)}
            style={{ background: 'white', color: brandColor, border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Checkout →
          </button>
        </div>
      )}
    </div>
  );
};
