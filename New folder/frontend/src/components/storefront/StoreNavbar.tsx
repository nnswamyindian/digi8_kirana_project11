import React, { useState, useRef, useEffect } from 'react';
import { StoreProfile, Product, CustomerUser } from '../../types';
import {
  ShoppingCart,
  Search,
  User,
  Phone,
  Sparkles,
  Bike,
  Lock,
  LogOut,
  Package,
  ChevronDown,
  Languages,
  Menu,
  X,
  Store,
  Globe
} from 'lucide-react';
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
  onRegisterStore,
  onGoToPlatformLanding
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
    <header style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Top Announcement Bar */}
      <div className="top-announcement" style={{ background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
        <div className="announcement-center">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOpen ? '#10b981' : '#ef4444',
              boxShadow: isOpen ? '0 0 8px #10b981' : 'none'
            }} />
            {isOpen 
              ? (language === 'te' ? `ఇప్పుడు తెరిచి ఉంది (${store.opening_time} - ${store.closing_time})` : `Open Now (${store.opening_time} - ${store.closing_time})`)
              : (language === 'te' ? 'దుకాణం ప్రస్తుతం మూసివేయబడింది' : 'Store Currently Closed')}
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={13} color="#38bdf8" />
            {language === 'te' ? `₹${store.free_delivery_above} పైబడి ఆర్డర్లపై ఉచిత హోమ్ డెలివరీ!` : `Free Home Delivery on orders above ₹${store.free_delivery_above}!`}
          </span>
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
                padding: '3px 9px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Globe size={12} />
              <span>{t.appName}</span>
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
                padding: '3px 9px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Sparkles size={12} />
              <span>{t.navRegisterStore}</span>
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
      <nav className="main-navbar" style={{ background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0' }}>
        <div className="nav-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', gap: '16px' }}>
          {/* Logo & Store Branding */}
          <div className="brand-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div className="brand-logo-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary-600, #059669), var(--primary-800, #065f46))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={22} />
            </div>
            <div className="brand-text">
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{store.name}</h1>
              <span style={{ fontSize: '0.72rem', color: 'var(--primary-600, #059669)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {store.tagline || (language === 'te' ? 'సూపర్ మార్కెట్ & కిరాణా' : 'Supermarket & Kirana')}
              </span>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="search-container" ref={searchRef} style={{ flex: 1, maxWidth: '520px', position: 'relative' }}>
            <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '9999px', padding: '6px 14px', border: '1px solid #e2e8f0' }}>
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
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '4px 10px', fontSize: '0.9rem', color: '#0f172a' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Instant Search Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="search-dropdown" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 12px 28px rgba(0,0,0,0.12)', zIndex: 60, maxHeight: '380px', overflowY: 'auto' }}>
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    className="search-item"
                    onClick={() => {
                      onSelectProduct(p);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      setIsMobileSearchOpen(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}
                  >
                    <img src={p.photo_url} alt={p.name} className="search-item-img" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {p.brand} • {p.unit}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#059669' }}>
                        ₹{p.selling_price}
                      </div>
                      {p.mrp > p.selling_price && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                          ₹{p.mrp}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions: Desktop Buttons */}
          <div className="nav-actions desktop-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <button className="cart-btn" onClick={onOpenCart} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'var(--primary-600, #059669)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              <ShoppingCart size={18} />
              <span>{t.cart}</span>
              {cartCount > 0 && (
                <span className="cart-count-badge" style={{ background: '#f59e0b', color: '#0f172a', fontWeight: 800, fontSize: '0.72rem', padding: '2px 7px', borderRadius: '9999px' }}>
                  {cartCount}
                </span>
              )}
              {cartTotal > 0 && (
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  • ₹{cartTotal.toFixed(0)}
                </span>
              )}
            </button>

            {/* Customer Account / Login */}
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
                      zIndex: 60,
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

            {/* Delivery Partner Login */}
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

            {/* Store Staff / POS Login */}
            <button
              className="login-btn"
              onClick={onOpenStaffLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                padding: '7px 12px',
                borderRadius: '8px',
                background: '#0f172a',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title={t.staffLogin}
            >
              <Lock size={14} />
              <span>{t.staffLogin}</span>
            </button>
          </div>

          {/* Mobile Right Quick Bar: Search Toggle + Cart Icon + Hamburger */}
          <div className="mobile-nav-controls" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              aria-label="Search products"
              style={{ padding: '8px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Search size={18} />
            </button>

            <button
              onClick={onOpenCart}
              aria-label="View Cart"
              style={{ position: 'relative', padding: '8px 12px', background: 'var(--primary-600, #059669)', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span style={{ background: '#f59e0b', color: '#0f172a', fontSize: '0.72rem', fontWeight: 800, padding: '1px 6px', borderRadius: '9999px' }}>
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
              style={{ padding: '8px', background: '#0f172a', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Full-Width Search Input (toggled) */}
        {isMobileSearchOpen && (
          <div style={{ padding: '8px 16px 12px', background: 'white', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '9999px', padding: '6px 14px', border: '1px solid #cbd5e1' }}>
              <Search size={17} color="#64748b" />
              <input
                type="text"
                autoFocus
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', padding: '4px 8px', fontSize: '0.9rem', color: '#0f172a' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ display: 'flex', alignItems: 'center', border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Mobile Search Results */}
            {searchResults.length > 0 && (
              <div style={{ marginTop: '8px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', maxHeight: '260px', overflowY: 'auto' }}>
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProduct(p);
                      setIsMobileSearchOpen(false);
                      setSearchQuery('');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                  >
                    <img src={p.photo_url} alt={p.name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>₹{p.selling_price} • {p.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile Slide-Over Navigation Menu */}
        {isMobileMenuOpen && (
          <div style={{ background: '#0f172a', color: 'white', padding: '16px 20px', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {isOpen ? 'Store Open' : 'Store Closed'} ({store.opening_time} - {store.closing_time})
              </span>
              <button
                onClick={toggleLanguage}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <Languages size={13} color="#10b981" />
                <span>{language === 'te' ? 'English' : 'తెలుగు'}</span>
              </button>
            </div>

            {customer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                  Hello, {customer.name}
                </div>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenCustomerOrders(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#1e293b', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                >
                  <Package size={16} color="#10b981" />
                  <span>{t.myOrders}</span>
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onCustomerLogout(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                >
                  <LogOut size={16} />
                  <span>{t.signOut}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenCustomerAuth(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <User size={16} color="#38bdf8" />
                <span>{t.customerLogin}</span>
              </button>
            )}

            <button
              onClick={() => { setIsMobileMenuOpen(false); onTrackOrder(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: '#fef08a', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <Package size={16} />
              <span>{t.trackOrder}</span>
            </button>

            <button
              onClick={() => { setIsMobileMenuOpen(false); onOpenDeliveryLogin(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#86efac', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <Bike size={16} color="#10b981" />
              <span>{t.riderLogin}</span>
            </button>

            <button
              onClick={() => { setIsMobileMenuOpen(false); onOpenStaffLogin(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'linear-gradient(135deg, var(--primary-600, #059669), var(--primary-700, #047857))', border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <Lock size={16} />
              <span>{t.staffLogin}</span>
            </button>

            {onRegisterStore && (
              <button
                onClick={() => { setIsMobileMenuOpen(false); onRegisterStore(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <Sparkles size={15} />
                <span>{t.navRegisterStore}</span>
              </button>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};
