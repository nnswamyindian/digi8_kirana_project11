import React, { useState, useRef, useEffect } from 'react';
import { StoreProfile, Product, CustomerUser } from '../../types';
import { ShoppingCart, Search, User, Clock, Phone, MapPin, Sparkles, CheckCircle2, Bike, Lock, LogOut, Package, ChevronDown, Shield, Languages } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface StoreNavbarProps {
  store: StoreProfile;
  cartCount: number;
  cartTotal: number;
  customer?: CustomerUser | null;
  onOpenCart: () => void;
  onOpenCustomerAuth: () => void;
  onOpenCustomerOrders: () => void;
  onCustomerLogout: () => void;
  onOpenDeliveryLogin: () => void;
  onOpenStaffLogin: () => void;
  onSelectProduct: (product: Product) => void;
  onTrackOrder: () => void;
  products: Product[];
  currentCategory?: string;
  onSelectCategory?: (catId: string) => void;
  onSwitchTenant?: (tenantId: string) => void;
  onRegisterStore?: () => void;
  onGoToPlatformLanding?: () => void;
}

export const StoreNavbar: React.FC<StoreNavbarProps> = ({
  store,
  cartCount,
  cartTotal,
  customer,
  onOpenCart,
  onOpenCustomerAuth,
  onOpenCustomerOrders,
  onCustomerLogout,
  onOpenDeliveryLogin,
  onOpenStaffLogin,
  onSelectProduct,
  onTrackOrder,
  products,
  onSwitchTenant,
  onRegisterStore,
  onGoToPlatformLanding
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isOpen = store.store_status === 'OPEN';

  // Filter products for search autocomplete
  const searchResults = searchQuery.trim() === ''
    ? []
    : products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery)
      ).slice(0, 6);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header>
      {/* Top Announcement Bar */}
      <div className="top-announcement" style={{ background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
        <div className="announcement-center">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOpen ? '#4ade80' : '#f87171',
              boxShadow: isOpen ? '0 0 8px #4ade80' : 'none'
            }} />
            {isOpen 
              ? (language === 'te' ? `ఇప్పుడు తెరిచి ఉంది (${store.opening_time} - ${store.closing_time})` : `Open Now (${store.opening_time} - ${store.closing_time})`)
              : (language === 'te' ? 'దుకాణం ప్రస్తుతం మూసివేయబడింది' : 'Store Currently Closed')}
          </span>
          <span>•</span>
          <span>🚀 {language === 'te' ? `₹${store.free_delivery_above} పైబడి ఆర్డర్లపై ఉచిత హోమ్ డెలివరీ!` : `Free Home Delivery on orders above ₹${store.free_delivery_above}!`}</span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={13} /> {store.phone}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onGoToPlatformLanding && (
            <button
              onClick={onGoToPlatformLanding}
              style={{
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: 'rgba(56, 189, 248, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                cursor: 'pointer'
              }}
            >
              🌐 {t.appName}
            </button>
          )}

          {onRegisterStore && (
            <button
              onClick={onRegisterStore}
              style={{
                color: '#86efac',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer'
              }}
            >
              ✨ {t.navRegisterStore}
            </button>
          )}

          <button
            onClick={onTrackOrder}
            style={{ color: '#fef08a', fontSize: '0.775rem', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t.trackOrder}
          </button>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <nav className="main-navbar">
        <div className="nav-inner">
          {/* Logo & Store Branding */}
          <div className="brand-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="brand-logo-icon">
              🛒
            </div>
            <div className="brand-text">
              <h1>{store.name}</h1>
              <span>{store.tagline || (language === 'te' ? 'సూపర్ మార్కెట్ & కిరాణా' : 'Supermarket & Kirana')}</span>
            </div>
          </div>

          {/* Real-time Dynamic Search Bar */}
          <div className="search-container" ref={searchRef}>
            <div className="search-input-wrapper">
              <Search size={18} color="#64748b" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, padding: '0 6px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Instant Search Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    className="search-item"
                    onClick={() => {
                      onSelectProduct(p);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <img src={p.photo_url} alt={p.name} className="search-item-img" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.brand} • {p.unit}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                        ₹{p.selling_price}
                      </div>
                      {p.mrp > p.selling_price && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                          ₹{p.mrp}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions: Cart, Language Toggle, Customer Auth, Delivery Login, Staff Login */}
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              title={language === 'te' ? 'Switch to English' : 'తెలుగులోకి మార్చండి'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Languages size={14} color="#16a34a" />
              <span>{language === 'te' ? 'English' : 'తెలుగు'}</span>
            </button>

            {/* Cart Trigger */}
            <button className="cart-btn" onClick={onOpenCart}>
              <ShoppingCart size={19} />
              <span>{t.cart}</span>
              {cartCount > 0 && (
                <span className="cart-count-badge">
                  {cartCount}
                </span>
              )}
              {cartTotal > 0 && (
                <span style={{ fontSize: '0.85rem', fontWeight: 800, marginLeft: '2px' }}>
                  • ₹{cartTotal.toFixed(0)}
                </span>
              )}
            </button>

            {/* 1. Customer Account / Login */}
            {customer ? (
              <div style={{ position: 'relative' }} ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--primary-600, #16a34a)',
                    background: '#f0fdf4',
                    color: '#15803d',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <User size={15} />
                  <span>{customer.name.split(' ')[0]}</span>
                  <ChevronDown size={14} />
                </button>

                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 6px)',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      minWidth: '170px',
                      padding: '6px',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setIsUserMenuOpen(false); onOpenCustomerOrders(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', textAlign: 'left', width: '100%', fontSize: '0.82rem', color: '#334155', cursor: 'pointer', borderRadius: '6px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <Package size={15} color="#16a34a" />
                      <span>{t.myOrders}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsUserMenuOpen(false); onCustomerLogout(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'none', textAlign: 'left', width: '100%', fontSize: '0.82rem', color: '#dc2626', cursor: 'pointer', borderRadius: '6px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <LogOut size={15} />
                      <span>{t.signOut}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onOpenCustomerAuth}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'white',
                  borderColor: '#cbd5e1',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: '7px 11px',
                  borderRadius: '8px'
                }}
                title={t.customerLogin}
              >
                <User size={15} color="#64748b" />
                <span>{t.customerLogin}</span>
              </button>
            )}

            {/* 2. Delivery Partner Login */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenDeliveryLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#f8fafc',
                borderColor: '#cbd5e1',
                color: '#475569',
                fontSize: '0.8rem',
                padding: '7px 10px',
                borderRadius: '8px'
              }}
              title={t.riderLogin}
            >
              <Bike size={15} color="#059669" />
              <span>{t.riderLogin}</span>
            </button>

            {/* 3. Store Staff / POS Login */}
            <button
              className="login-btn"
              onClick={onOpenStaffLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                padding: '7px 12px',
                borderRadius: '8px'
              }}
              title={t.staffLogin}
            >
              <Lock size={14} />
              <span>{t.staffLogin}</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};
