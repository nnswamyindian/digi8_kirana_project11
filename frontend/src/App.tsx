import React, { useState, useEffect } from 'react';
import { StoreProfile, Category, Product, Customer, CartItem, Order, User, CustomerUser } from './types';
import { api } from './services/api';
import { playOrderChime, ReceiptData } from './services/hardware';
import { DEFAULT_FALLBACK_STORE, DEFAULT_FALLBACK_CATEGORIES, DEFAULT_FALLBACK_PRODUCTS } from './services/fallbackData';

// Storefront Components
import { StoreNavbar } from './components/storefront/StoreNavbar';
import { HeroBanner } from './components/storefront/HeroBanner';
import { CategoryPills } from './components/storefront/CategoryPills';
import { ProductCard } from './components/storefront/ProductCard';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { CheckoutModal } from './components/storefront/CheckoutModal';
import { OrderTrackingModal } from './components/storefront/OrderTrackingModal';
import { StoreFooter } from './components/storefront/StoreFooter';
import { CustomerAuthModal } from './components/storefront/CustomerAuthModal';
import { CustomerOrdersModal } from './components/storefront/CustomerOrdersModal';
import { StoreStateNotice, StoreNoticeType } from './components/storefront/StoreStateNotice';

// Admin Components
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardOverview } from './components/admin/DashboardOverview';
import { POSTerminal } from './components/admin/POSTerminal';
import { ProductManagement } from './components/admin/ProductManagement';
import { CategoryManagement } from './components/admin/CategoryManagement';
import { InventoryManagement } from './components/admin/InventoryManagement';
import { PurchasesManagement } from './components/admin/PurchasesManagement';
import { OrdersManagement } from './components/admin/OrdersManagement';
import { CustomersManagement } from './components/admin/CustomersManagement';
import { ReportsAnalytics } from './components/admin/ReportsAnalytics';
import { StoreSettings } from './components/admin/StoreSettings';
import { OwnerLoginModal } from './components/admin/OwnerLoginModal';
import { ThermalReceiptModal } from './components/admin/ThermalReceiptModal';
import { BarcodePrintModal } from './components/admin/BarcodePrintModal';
import { DeliveryAreaManagement } from './components/admin/DeliveryAreaManagement';
import { StaffManagement } from './components/admin/StaffManagement';
import { DeliveryBoyPortal } from './components/delivery/DeliveryBoyPortal';
import { LiveDeliveryDashboard } from './components/admin/LiveDeliveryDashboard';
import { PaymentReconciliation } from './components/admin/PaymentReconciliation';
import { PlatformAdminDashboard } from './components/admin/PlatformAdminDashboard';
import { StoreOnboardingWizard } from './components/admin/StoreOnboardingWizard';
import { LandingPage } from './components/landing/LandingPage';
import { StoreDomainManagement } from './components/admin/StoreDomainManagement';
import { StoreSubscriptionPortal } from './components/admin/StoreSubscriptionPortal';
import { StoreSupportTickets } from './components/admin/StoreSupportTickets';
import { CompanyControlCenter } from './components/admin/CompanyControlCenter';
import { PlatformProjects } from './components/admin/PlatformProjects';
import { PlatformDatabaseManagement } from './components/admin/PlatformDatabaseManagement';
import { Tenant } from './types';
import { useLanguage } from './context/LanguageContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { AlertTriangle, Sparkles, Scale, CheckCircle2, Bike } from 'lucide-react';

export const STORE_ADMIN_SLUGS = [
  'dashboard', 'pos', 'orders', 'fleet', 'payments', 'delivery-areas',
  'products', 'categories', 'inventory', 'purchases', 'customers',
  'staff', 'reports', 'domains', 'subscription', 'support', 'settings'
];

export const PLATFORM_ADMIN_SLUGS = [
  'platform-dashboard', 'platform-stores', 'platform-applications',
  'platform-subscriptions', 'platform-payments', 'platform-projects',
  'platform-reports', 'platform-domains', 'platform-users',
  'platform-database', 'platform-settings', 'platform-audit-logs',
  'platform-support', 'platform-health'
];

export const ALL_SYSTEM_SLUGS = [
  'demo', 'admin', 'platform-admin', 'store', 'delivery', 'delivery-login', 'home', 'api', 'assets', '',
  ...STORE_ADMIN_SLUGS,
  ...PLATFORM_ADMIN_SLUGS
];

export const App: React.FC = () => {
  const { language, t } = useLanguage();
  // App Mode: Public SaaS Landing vs Storefront vs Admin Portal vs Delivery Boy Portal
  // Default root URL "/" loads the Mana Kirana Kottu SaaS Landing Page!
  // Track the active slug for path-based storefront routing (/:slug)
  const [storefrontSlug, setStorefrontSlug] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'landing' | 'storefront' | 'admin' | 'delivery'>(() => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/^\/|\/$/g, '');
      const search = new URLSearchParams(window.location.search);
      if (search.get('view') === 'demo' || path === 'demo') return 'storefront';
      if (STORE_ADMIN_SLUGS.includes(path) || PLATFORM_ADMIN_SLUGS.includes(path)) return 'admin';
      if (search.get('view') === 'admin' || path === 'admin' || path === 'platform-admin' || path.startsWith('admin/')) return 'admin';
      if (search.get('view') === 'delivery' || path === 'delivery' || path === 'delivery-login') return 'delivery';
      if (path === 'store' || path.startsWith('store/')) return 'admin';
      // Path-based storefront: /{slug} — single segment that's not a known system route
      if (path && !ALL_SYSTEM_SLUGS.includes(path) && !path.includes('/')) {
        return 'storefront'; // Will be hydrated in useEffect
      }
      const hostParts = window.location.hostname.split('.');
      if (hostParts.length > 2 && !['www', 'api', 'localhost', '127'].includes(hostParts[0])) {
        return 'storefront';
      }
      return 'landing';
    } catch {
      return 'landing';
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [adminTab, setAdminTab] = useState<string>(() => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/^\/|\/$/g, '');
      if (STORE_ADMIN_SLUGS.includes(path)) return path;
      if (PLATFORM_ADMIN_SLUGS.includes(path)) return path;
      if (path === 'admin' || path === 'platform-admin' || path.startsWith('admin/')) return 'platform-dashboard';
      if (path === 'store' || path.startsWith('store/')) return 'dashboard';
    } catch {}
    return 'dashboard';
  });
  // Super Admin Platform vs Store Context Isolation State
  const [platformStoreContext, setPlatformStoreContext] = useState<string | null>(null);
  const [platformTenants, setPlatformTenants] = useState<Tenant[]>([]);

  // Central Core State (Pre-hydrated with resilient defaults so site NEVER hangs on page loader)
  const [store, setStore] = useState<StoreProfile>(DEFAULT_FALLBACK_STORE);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_FALLBACK_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(DEFAULT_FALLBACK_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Customer Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Real-time Order Alerts
  const [newOrderAlertCount, setNewOrderAlertCount] = useState<number>(0);
  const [recentAlertMessage, setRecentAlertMessage] = useState<string | null>(null);

  // Storefront Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [storefrontFilter, setStorefrontFilter] = useState<'all' | 'loose' | 'offers' | 'bestsellers'>('all');

  // Modals & Navigation
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [staffLoginMode, setStaffLoginMode] = useState<'STAFF' | 'DELIVERY' | 'PLATFORM'>('STAFF');
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerOrdersOpen, setIsCustomerOrdersOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [activeReceiptData, setActiveReceiptData] = useState<ReceiptData | null>(null);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [storeNoticeState, setStoreNoticeState] = useState<StoreNoticeType | null>(null);

  // Load Initial Store Data (Resilient Hydration)
  const loadInitialData = async () => {
    try {
      const [s, c, p, cust] = await Promise.allSettled([
        api.getStore(),
        api.getCategories(),
        api.getProducts(),
        api.getCustomers(),
      ]);

      if (s.status === 'fulfilled' && s.value) {
        setStore(s.value);
        if (s.value.status === 'SUSPENDED') {
          setStoreNoticeState('SUSPENDED');
        } else if (s.value.is_storefront_enabled === 0 || (s.value as any).is_storefront_enabled === false) {
          setStoreNoticeState('STOREFRONT_DISABLED');
        } else {
          setStoreNoticeState(null);
        }
      }

      if (c.status === 'fulfilled' && Array.isArray(c.value) && c.value.length > 0) {
        setCategories(c.value);
      }
      if (p.status === 'fulfilled' && Array.isArray(p.value) && p.value.length > 0) {
        setProducts(p.value);
      }
      if (cust.status === 'fulfilled' && Array.isArray(cust.value)) {
        setCustomers(cust.value);
      }
    } catch (err) {
      console.warn('Backend server currently starting or offline, running in resilient client mode:', err);
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === 'ALL') {
      setPlatformStoreContext(null);
      setAdminTab('platform-dashboard');
      return;
    }
    api.setTenantId(tenantId);
    setCart([]);
    await loadInitialData();
  };

  const handleSelectStoreContext = async (tenantId: string) => {
    if (tenantId === 'ALL') {
      setPlatformStoreContext(null);
      setAdminTab('platform-dashboard');
      return;
    }
    setPlatformStoreContext(tenantId);
    await handleSwitchTenant(tenantId);
    setAdminTab('dashboard');
  };

  const handleExitStoreContext = () => {
    setPlatformStoreContext(null);
    setAdminTab('platform-dashboard');
  };

  // Dynamic White-label Branding Injection
  useEffect(() => {
    if (store) {
      const pColor = store.primary_color || '#16a34a';
      document.documentElement.style.setProperty('--primary-600', pColor);
      document.documentElement.style.setProperty('--primary-700', pColor);
      document.documentElement.style.setProperty('--primary-500', pColor);
      if (currentView === 'storefront') {
        document.title = `${store.name} • Mana Kirana Kottu Demo Store`;
      } else if (currentView === 'admin') {
        document.title = `${store.name} — Mana Kirana Kottu Super Admin & Store Manager`;
      } else {
        document.title = 'Mana Kirana Kottu • Complete Digital Management Platform for Kirana & Grocery Stores';
      }
    }
  }, [store, currentView]);

  // Navigate to a storefront by slug, updating the browser URL
  const navigateToStorefront = async (slug: string) => {
    try {
      await handleSwitchTenant(slug);
      setStorefrontSlug(slug);
      setCurrentView('storefront');
      window.history.pushState({ slug }, '', `/${slug}`);
    } catch (err) {
      console.warn(`Could not load storefront for slug: ${slug}`, err);
    }
  };

  // Update admin tab and sync browser address bar slug
  const handleAdminTabChange = (tab: string) => {
    setAdminTab(tab);
    try {
      const targetSlug = `/${tab}`;
      if (window.location.pathname !== targetSlug) {
        window.history.pushState({ tab, view: 'admin' }, '', targetSlug);
      }
    } catch (e) {
      console.warn('Could not update browser URL slug', e);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Listen to browser Back/Forward navigation
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/^\/|\/$/g, '');
      if (path === '' || path === 'home') {
        setCurrentView('landing');
      } else if (STORE_ADMIN_SLUGS.includes(path)) {
        setCurrentView('admin');
        setAdminTab(path);
      } else if (PLATFORM_ADMIN_SLUGS.includes(path)) {
        setCurrentView('admin');
        setAdminTab(path);
      } else if (path === 'demo' || path.startsWith('storefront')) {
        setCurrentView('storefront');
      } else if (path === 'admin' || path === 'platform-admin' || path.startsWith('admin/')) {
        setCurrentView('admin');
        setAdminTab('platform-dashboard');
        setPlatformStoreContext(null);
      } else if (path === 'store' || path.startsWith('store/')) {
        setCurrentView('admin');
        setAdminTab('dashboard');
      } else if (path === 'delivery' || path === 'delivery-login') {
        setCurrentView('delivery');
      } else if (path && !ALL_SYSTEM_SLUGS.includes(path) && !path.includes('/')) {
        // /{slug} — path-based storefront navigation
        navigateToStorefront(path);
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Check URL parameters for explicit view routing
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const storeParam = urlParams.get('store') || urlParams.get('tenant');

    const rawPath = window.location.pathname.toLowerCase().replace(/^\/|\/$/g, '');
    if (rawPath === '' || rawPath === 'home' || viewParam === 'landing') {
      setCurrentView('landing');
    } else if (STORE_ADMIN_SLUGS.includes(rawPath)) {
      setCurrentView('admin');
      setAdminTab(rawPath);
    } else if (PLATFORM_ADMIN_SLUGS.includes(rawPath)) {
      setCurrentView('admin');
      setAdminTab(rawPath);
    } else if (rawPath === 'demo' || viewParam === 'demo') {
      setCurrentView('storefront');
    } else if (rawPath === 'admin' || rawPath === 'platform-admin' || viewParam === 'platform' || viewParam === 'admin') {
      setCurrentView('admin');
      setAdminTab('platform-dashboard');
      setPlatformStoreContext(null);
    } else if (rawPath.startsWith('admin/')) {
      setCurrentView('admin');
      setAdminTab('platform-dashboard');
      setPlatformStoreContext(null);
    } else if (rawPath === 'store' || rawPath.startsWith('store/')) {
      setCurrentView('admin');
      setAdminTab('dashboard');
    } else if (rawPath === 'delivery' || rawPath === 'delivery-login' || viewParam === 'delivery') {
      setCurrentView('delivery');
    } else if (rawPath && !ALL_SYSTEM_SLUGS.includes(rawPath) && !rawPath.includes('/')) {
      // Path-based tenant storefront routing: manakiranakottu.digi8solutions.com/{slug}
      api.resolveTenant(rawPath).then(resolveRes => {
        if (resolveRes.success && resolveRes.tenant) {
          const tenantId = resolveRes.tenant.id;
          handleSwitchTenant(tenantId);
          setStorefrontSlug(rawPath);
          setCurrentView('storefront');
          // Update page title to store name
          document.title = `${resolveRes.tenant.name} — Mana Kirana Kottu`;
        } else {
          // Not a valid slug — fall back to landing
          setCurrentView('landing');
        }
      }).catch(() => {
        setCurrentView('landing');
      });
    }

    if (storeParam) {
      handleSwitchTenant(storeParam);
    }

    // Hydrate customer session
    api.getCustomerProfile().then(cust => {
      if (cust) setCustomerUser(cust);
    }).catch(() => {});

    // Hydrate staff authenticated session if JWT token exists
    api.getCurrentUser().then(async (user) => {
      if (user) {
        setCurrentUser(user);
        if (user.role === 'DELIVERY_BOY' || user.role === 'DELIVERY_AGENT') {
          if (user.tenant_id) await handleSwitchTenant(user.tenant_id);
          setCurrentView('delivery');
        } else if (user.role === 'PLATFORM_ADMIN') {
          setCurrentView('admin');
          const rawP = window.location.pathname.toLowerCase().replace(/^\/|\/$/g, '');
          if (!PLATFORM_ADMIN_SLUGS.includes(rawP) && !STORE_ADMIN_SLUGS.includes(rawP)) {
            setAdminTab('platform-dashboard');
          }
          setPlatformStoreContext(null);
          api.getPlatformTenants().then(setPlatformTenants).catch(() => {});
        } else {
          if (user.tenant_id) await handleSwitchTenant(user.tenant_id);
          setCurrentView('admin');
          const rawP = window.location.pathname.toLowerCase().replace(/^\/|\/$/g, '');
          if (!STORE_ADMIN_SLUGS.includes(rawP)) {
            setAdminTab('dashboard');
          }
        }
      }
    }).catch(() => {});

    // Subscribe to Centralized Real-time SSE Events
    const unsubscribe = api.subscribeToEvents((eventType, data) => {
      console.log(`[Real-time Event]: ${eventType}`, data);

      if (eventType === 'new_online_order') {
        playOrderChime();
        setNewOrderAlertCount(prev => prev + 1);
        setRecentAlertMessage(`🔔 New Order #${data.order_number} from ${data.customer_name} (₹${data.total_amount})`);
        setTimeout(() => setRecentAlertMessage(null), 6000);
        // Refresh products to reflect reserved stock
        api.getProducts().then(setProducts).catch(console.error);
      } else if (eventType === 'price_changed' || eventType === 'bulk_price_updated') {
        // Automatically sync updated prices across website and POS!
        api.getProducts().then(setProducts).catch(console.error);
      } else if (eventType === 'stock_updated' || eventType === 'pos_sale_completed' || eventType === 'products_updated' || eventType === 'order_updated') {
        api.getProducts().then(setProducts).catch(console.error);
      } else if (eventType === 'store_updated') {
        api.getStore().then(setStore).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cart Operations
  const handleAddToCart = (product: Product, quantity: number, customSubtotal?: number) => {
    const isLoose = product.is_loose || product.unit === 'KG';
    const unitPrice = product.selling_price;
    const lineTotal = customSubtotal !== undefined
      ? customSubtotal
      : Math.round(quantity * unitPrice * 100) / 100;

    setCart(prev => {
      const existing = prev.find(it => it.product.id === product.id);
      if (existing) {
        const newQty = isLoose ? existing.quantity + quantity : existing.quantity + 1;
        const roundedQty = Math.round(newQty * 1000) / 1000;
        return prev.map(it =>
          it.product.id === product.id
            ? {
                ...it,
                quantity: roundedQty,
                total_price: Math.round(roundedQty * unitPrice * 100) / 100
              }
            : it
        );
      } else {
        return [
          ...prev,
          {
            product,
            quantity,
            unit: product.unit,
            unit_price: unitPrice,
            total_price: lineTotal
          }
        ];
      }
    });
  };

  const handleUpdateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart(prev => prev.map(it => {
      if (it.product.id === productId) {
        const rounded = Math.round(newQty * 1000) / 1000;
        return {
          ...it,
          quantity: rounded,
          total_price: Math.round(rounded * it.unit_price * 100) / 100
        };
      }
      return it;
    }));
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart(prev => prev.filter(it => it.product.id !== productId));
  };

  // Toggle Store Status (Open / Closed)
  const handleToggleStoreStatus = async () => {
    if (!store) return;
    const nextStatus = store.store_status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await api.updateStore({ ...store, store_status: nextStatus });
      setStore(prev => prev ? { ...prev, store_status: nextStatus } : null);
    } catch (err) {
      alert('Failed to update store status: ' + err);
    }
  };

  const currentStore = store || DEFAULT_FALLBACK_STORE;

  // Phase 4 Multi-Tenant SaaS: Store Account Suspension Enforcement
  if (store.status === 'SUSPENDED' || (store.status as any) === 'suspended') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', fontFamily: 'sans-serif', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', background: '#1e293b', padding: '2.5rem', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#f87171' }}>Store Temporarily Suspended</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            <strong>{store.name}</strong> is currently suspended by platform administration.
            Please contact platform customer support or verify store subscription.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSwitchTenant('store_royal_001')}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: '#059669', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Switch to Royal Kirana (001)
            </button>
            <button
              onClick={() => {
                handleSwitchTenant('store_royal_001').then(() => {
                  setCurrentView('admin');
                  setAdminTab('platform');
                });
              }}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: '#475569', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Open Platform Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter storefront products
  const storefrontProducts = products.filter(p => {
    if (!p.is_active || !p.is_visible_online) return false;
    if (selectedCategory && p.category_id !== selectedCategory) return false;
    if (storefrontFilter === 'loose') return Boolean(p.is_loose) || p.unit === 'KG';
    if (storefrontFilter === 'offers') return Boolean(p.is_offer) || (p.savings_percent && p.savings_percent > 0);
    if (storefrontFilter === 'bestsellers') return Boolean(p.is_bestseller);
    return true;
  });

  const cartCount = cart.reduce((sum, it) => sum + (it.product.is_loose ? 1 : it.quantity), 0);
  const cartTotal = cart.reduce((sum, it) => sum + it.total_price, 0);

  return (
    <div className="app-container">
      {/* Real-time Order Alert Toast Banner */}
      {recentAlertMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #065f46, #047857)',
          color: 'white',
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 9999,
          fontWeight: 700,
          fontSize: '0.925rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideInRight 250ms ease'
        }}>
          <span>{recentAlertMessage}</span>
          <button
            onClick={() => {
              setCurrentView('admin');
              setAdminTab('orders');
              setRecentAlertMessage(null);
            }}
            className="btn btn-sm btn-accent"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            View Order
          </button>
        </div>
      )}

      {/* ====================================================
          VIEW 0: PUBLIC SAAS PLATFORM LANDING PAGE
          ==================================================== */}
      {currentView === 'landing' ? (
        <LandingPage
          onSwitchToStorefront={() => setCurrentView('storefront')}
          onOpenStoreLogin={() => {
            setStaffLoginMode('STAFF');
            setIsLoginOpen(true);
          }}
          onOpenPlatformAdminLogin={() => {
            setStaffLoginMode('PLATFORM');
            setIsLoginOpen(true);
          }}
        />
      ) : currentView === 'storefront' ? (
        <>
          {/* Demo Storefront Banner */}
          <div style={{
            background: 'linear-gradient(90deg, #1e293b, #0f172a)',
            borderBottom: '1px solid #334155',
            padding: '8px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            color: 'white',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#f59e0b', color: '#0f172a', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>
                DEMO STOREFRONT
              </span>
              <span style={{ color: '#cbd5e1' }}>
                Experiencing live customer grocery order &amp; delivery workflow on <strong>Mana Kirana Kottu</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setCurrentView('landing')}
                style={{ color: '#38bdf8', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Back to Platform Landing Page
              </button>
              <button
                onClick={() => {
                  setStaffLoginMode('PLATFORM');
                  setIsLoginOpen(true);
                }}
                style={{ background: '#0284c7', color: 'white', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Super Admin
              </button>
            </div>
          </div>

          {/* Main Navbar with Separate Logins */}
          <StoreNavbar
            store={store}
            cartCount={cartCount}
            cartTotal={cartTotal}
            customer={customerUser}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
            onOpenCustomerOrders={() => setIsCustomerOrdersOpen(true)}
            onCustomerLogout={() => {
              api.logoutCustomer();
              setCustomerUser(null);
            }}
            onOpenDeliveryLogin={() => {
              setStaffLoginMode('DELIVERY');
              setIsLoginOpen(true);
            }}
            onOpenStaffLogin={() => {
              setStaffLoginMode('STAFF');
              setIsLoginOpen(true);
            }}
            onSelectProduct={(p) => setSelectedDetailProduct(p)}
            onTrackOrder={() => setIsTrackOrderOpen(true)}
            products={products}
            currentCategory={selectedCategory}
            onSelectCategory={(catId) => setSelectedCategory(catId)}
            onSwitchTenant={handleSwitchTenant}
            onRegisterStore={() => setCurrentView('landing')}
            onGoToPlatformLanding={() => setCurrentView('landing')}
          />

          {/* Storefront Availability / Suspension / Closed Notice */}
          {storeNoticeState ? (
            <StoreStateNotice
              type={storeNoticeState}
              storeName={store.name}
              onGoToPlatform={() => setCurrentView('landing')}
              onOpenStoreLogin={() => {
                setStaffLoginMode('STAFF');
                setIsLoginOpen(true);
              }}
            />
          ) : (
            <>
              {/* Store Closed Warning Notice */}
              {store.store_status === 'CLOSED' && (
                <div style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '12px 24px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  borderBottom: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={18} />
                  <span>
                    {language === 'te' 
                      ? `దుకాణం ప్రస్తుతం కౌంటర్ బిల్లింగ్ కొరకు మూసివేయబడింది. మీరు సరుకులను పరిశీలించవచ్చు; డెలివరీ రేపు ఉదయం ${store.opening_time} గంటలకు ప్రారంభమవుతుంది.`
                      : `Store is currently closed for counter billing. You can still browse products; delivery starts tomorrow at ${store.opening_time}.`}
                  </span>
                </div>
              )}

          {/* Hero Banner */}
          <HeroBanner
            store={store}
            onShopNow={() => {
              const el = document.getElementById('catalog-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            onExploreLoose={() => {
              setStorefrontFilter('loose');
              const el = document.getElementById('catalog-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* Dynamic Categories Scroll */}
          <CategoryPills
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={(catId) => setSelectedCategory(catId)}
          />

          {/* Main Catalog Section */}
          <section id="catalog-section" className="section-wrapper">
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  {selectedCategory
                    ? categories.find(c => c.id === selectedCategory)?.name || (language === 'te' ? 'వర్గం సరుకులు' : 'Category Products')
                    : storefrontFilter === 'loose'
                    ? (language === 'te' ? 'వదులు సరుకులు & పప్పు దినుసులు (తూకం ప్రకారం)' : 'Loose Grocery & Pulses (Sold by Weight)')
                    : storefrontFilter === 'offers'
                    ? (language === 'te' ? 'ప్రత్యేక ఆఫర్లు & రాయితీలు' : 'Special Offers & Discounts')
                    : (language === 'te' ? 'అన్ని తాజా కిరాణా సరుకులు' : 'All Fresh Grocery Items')}
                </h2>
                <p className="section-subtitle">
                  {language === 'te' 
                    ? `హామీతో కూడిన తాజా స్టాక్ మరియు ఖచ్చితమైన ధరలతో ${storefrontProducts.length} సరుకులు అందుబాటులో ఉన్నాయి`
                    : `Showing ${storefrontProducts.length} items with guaranteed fresh stock and exact pricing`}
                </p>
              </div>

              {/* Quick Filter Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className={`btn-sm ${storefrontFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStorefrontFilter('all')}
                >
                  {language === 'te' ? 'అన్ని సరుకులు' : 'All Items'}
                </button>
                <button
                  className={`btn-sm ${storefrontFilter === 'loose' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStorefrontFilter('loose')}
                >
                  <Scale size={13} />
                  <span>{language === 'te' ? 'వదులు (కేజీ లెక్కన)' : 'Loose (Per KG)'}</span>
                </button>
                <button
                  className={`btn-sm ${storefrontFilter === 'offers' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStorefrontFilter('offers')}
                >
                  <Sparkles size={13} />
                  <span>{language === 'te' ? 'ఆఫర్లు' : 'Offers'}</span>
                </button>
                <button
                  className={`btn-sm ${storefrontFilter === 'bestsellers' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStorefrontFilter('bestsellers')}
                >
                  {language === 'te' ? '★ ప్రముఖమైనవి' : '★ Bestsellers'}
                </button>
              </div>
            </div>

            {/* Products Grid */}
            {storefrontProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🌾</div>
                <h3>No products found in this category</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                  Try selecting another category or clear your search filter.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '16px' }}
                  onClick={() => {
                    setSelectedCategory('');
                    setStorefrontFilter('all');
                  }}
                >
                  View All Products
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {storefrontProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onViewDetails={(p) => setSelectedDetailProduct(p)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Footer */}
          <StoreFooter
            store={store}
            onOpenOwnerLogin={() => {
              setStaffLoginMode('STAFF');
              setIsLoginOpen(true);
            }}
          />
            </>
          )}
        </>
      ) : currentView === 'delivery' ? (
        /* ====================================================
           VIEW 2: DELIVERY BOY MOBILE PORTAL
           ==================================================== */
        currentUser ? (
          <DeliveryBoyPortal
            currentUser={currentUser}
            onLogout={() => {
              api.logout();
              setCurrentUser(null);
              setCurrentView('storefront');
            }}
          />
        ) : (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
            <div style={{ maxWidth: '420px', width: '100%', background: 'white', padding: '36px 28px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Bike size={32} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Delivery Partner Portal
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
                Sign in with your registered phone number & PIN to view assigned delivery tasks, show dynamic store UPI QR codes, collect cash, and update order statuses.
              </p>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700, background: '#d97706', borderColor: '#d97706' }}
                onClick={() => {
                  setStaffLoginMode('DELIVERY');
                  setIsLoginOpen(true);
                }}
              >
                Sign In as Delivery Rider
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px', fontSize: '0.85rem' }}
                onClick={() => setCurrentView('landing')}
              >
                Back to Home
              </button>
            </div>
          </div>
        )
      ) : (
        /* ====================================================
           VIEW 3: OWNER ADMIN DASHBOARD & POS BILLING
           ==================================================== */
        <AdminLayout
          activeTab={adminTab}
          onTabChange={handleAdminTabChange}
          store={store}
          currentUser={currentUser}
          onToggleStoreStatus={handleToggleStoreStatus}
          newOrderAlertCount={newOrderAlertCount}
          onClearOrderAlerts={() => setNewOrderAlertCount(0)}
          onSwitchToStorefront={() => {
            setCurrentView('storefront');
            window.history.pushState({}, '', store.slug ? `/${store.slug}` : '/demo');
          }}
          onSwitchToLanding={() => {
            setCurrentView('landing');
            window.history.pushState({}, '', '/');
          }}
          onLogout={() => {
            api.logout();
            setCurrentUser(null);
            setPlatformStoreContext(null);
            setCurrentView('landing');
            setAdminTab('dashboard');
            window.history.pushState({}, '', '/');
          }}
          onSwitchTenant={handleSelectStoreContext}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          platformStoreContext={platformStoreContext}
          onExitStoreContext={handleExitStoreContext}
        >
          <ErrorBoundary fallbackTitle="Store Management Module Error">
          {/* ====================================================
              PLATFORM ADMIN MODULES (SUPER ADMIN / PLATFORM LEVEL)
              ==================================================== */}
          {(adminTab === 'platform-dashboard' || adminTab === 'platform') && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="overview"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-stores' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="stores"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-applications' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="applications"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-subscriptions' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="plans"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-payments' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="invoices"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-projects' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <PlatformProjects
              onBackToOverview={() => setAdminTab('platform-dashboard')}
            />
          )}

          {adminTab === 'platform-reports' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="overview"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-domains' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="domains"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-users' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="stores"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-database' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <PlatformDatabaseManagement
              tenants={platformTenants.length > 0 ? platformTenants : [{ id: store.id, name: store.name, slug: store.slug, owner_name: store.owner_name, phone: store.phone, email: store.email, plan: store.plan || 'PREMIUM', status: store.status || 'ACTIVE', created_at: (store as any).created_at || new Date().toISOString() } as any]}
            />
          )}

          {adminTab === 'platform-settings' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="overview"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-audit-logs' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="logs"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-support' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="support"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {adminTab === 'platform-health' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              initialTab="overview"
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSelectStoreContext}
            />
          )}

          {/* ====================================================
              STORE OPERATIONAL MODULES (STORE OWNER / ADMIN VIEW)
              ==================================================== */}
          {adminTab === 'dashboard' && (
            <DashboardOverview
              store={store}
              onNavigateToTab={handleAdminTabChange}
              onPrintOrderReceipt={(order) => {
                const receipt: ReceiptData = {
                  store_name: store.name,
                  store_tagline: store.tagline,
                  address: store.address,
                  phone: store.phone,
                  gstin: store.gstin,
                  invoice_no: order.invoice_number,
                  order_no: order.order_number,
                  date_time: new Date(order.created_at).toLocaleString('en-IN'),
                  cashier: 'POS System',
                  customer_name: order.customer_name,
                  customer_phone: order.customer_phone,
                  items: order.items?.map(it => ({
                    name: it.product_name,
                    qty: it.quantity,
                    unit: it.unit,
                    rate: it.unit_price,
                    amount: it.total_price,
                  })) || [],
                  subtotal: order.subtotal,
                  discount: order.discount,
                  total: order.total_amount,
                  payment_method: order.payment_method,
                  upi_id: store?.upi_id || 'apnakirana@okhdfcbank',
                };
                setActiveReceiptData(receipt);
              }}
            />
          )}

          {adminTab === 'pos' && (
            <POSTerminal
              products={products}
              categories={categories}
              customers={customers}
              store={store}
              onOpenReceipt={(data) => setActiveReceiptData(data)}
              onRefreshData={loadInitialData}
            />
          )}

          {adminTab === 'products' && (
            <ProductManagement
              categories={categories}
              onOpenBarcodeModal={(prod) => setBarcodeModalProduct(prod)}
              onRefreshProducts={loadInitialData}
            />
          )}

          {adminTab === 'categories' && (
            <CategoryManagement
              categories={categories}
              onRefreshCategories={loadInitialData}
            />
          )}

          {adminTab === 'inventory' && (
            <InventoryManagement />
          )}

          {adminTab === 'purchases' && (
            <PurchasesManagement
              products={products}
            />
          )}

          {adminTab === 'orders' && (
            <OrdersManagement
              store={store}
              currentUser={currentUser}
              onPrintOrderReceipt={(receiptData) => setActiveReceiptData(receiptData)}
            />
          )}

          {adminTab === 'fleet' && (
            <LiveDeliveryDashboard />
          )}

          {adminTab === 'payments' && (
            <PaymentReconciliation />
          )}

          {adminTab === 'delivery-areas' && (
            <DeliveryAreaManagement currentUser={currentUser} />
          )}

          {adminTab === 'staff' && (
            <StaffManagement currentUser={currentUser} />
          )}

          {adminTab === 'customers' && (
            <CustomersManagement />
          )}

          {adminTab === 'reports' && (
            <ReportsAnalytics />
          )}

          {adminTab === 'domains' && (
            <StoreDomainManagement />
          )}

          {adminTab === 'subscription' && (
            <StoreSubscriptionPortal />
          )}

          {adminTab === 'support' && (
            <StoreSupportTickets />
          )}



          {adminTab === 'settings' && (
            <StoreSettings
              store={store}
              onRefreshStore={loadInitialData}
              onOpenReceipt={(data) => setActiveReceiptData(data)}
            />
          )}
          </ErrorBoundary>
        </AdminLayout>
      )}

      {/* ====================================================
          SHARED MODALS
          ==================================================== */}
      {/* 1. Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        store={store}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onProceedCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* 2. Customer Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCart([]);
        }}
        items={cart}
        store={store}
        customer={customerUser}
        onOrderSuccess={(orderInfo) => {
          // Clear cart on successful order
          setCart([]);
          loadInitialData();
        }}
      />

      {/* 3. Owner / Staff / Rider / Platform Login Modal */}
      <OwnerLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        initialMode={staffLoginMode}
        onLoginSuccess={async (user) => {
          setCurrentUser(user);
          if (user.role === 'DELIVERY_BOY' || user.role === 'DELIVERY_AGENT') {
            if (user.tenant_id) await handleSwitchTenant(user.tenant_id);
            setCurrentView('delivery');
          } else if (user.role === 'PLATFORM_ADMIN') {
            setCurrentView('admin');
            setAdminTab('platform-dashboard');
            setPlatformStoreContext(null);
            api.getPlatformTenants().then(setPlatformTenants).catch(() => {});
          } else if (user.role === 'CASHIER') {
            if (user.tenant_id) await handleSwitchTenant(user.tenant_id);
            setCurrentView('admin');
            setAdminTab('pos');
          } else {
            if (user.tenant_id) await handleSwitchTenant(user.tenant_id);
            setCurrentView('admin');
            setAdminTab('dashboard');
          }
        }}
        onSwitchToCustomer={() => {
          setIsLoginOpen(false);
          setIsCustomerAuthOpen(true);
        }}
      />

      {/* 3B. Dedicated Customer Account Modal (Shopper Sign In / Register) */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        storeName={store?.name}
        onAuthSuccess={(cust) => {
          setCustomerUser(cust);
        }}
        onSwitchToStaff={() => {
          setIsCustomerAuthOpen(false);
          setIsLoginOpen(true);
        }}
      />

      {/* 3C. Dedicated Customer Orders & Tracking History */}
      {customerUser && (
        <CustomerOrdersModal
          isOpen={isCustomerOrdersOpen}
          onClose={() => setIsCustomerOrdersOpen(false)}
          customer={customerUser}
          onTrackOrder={(orderId) => {
            setIsTrackOrderOpen(true);
          }}
        />
      )}

      {/* 4. Live Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
      />

      {/* 5. Product Details Modal */}
      {selectedDetailProduct && (
        <ProductDetailModal
          isOpen={Boolean(selectedDetailProduct)}
          onClose={() => setSelectedDetailProduct(null)}
          product={selectedDetailProduct}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* 6. Thermal Receipt Modal (58mm/80mm ESC/POS) */}
      {activeReceiptData && (
        <ThermalReceiptModal
          isOpen={Boolean(activeReceiptData)}
          onClose={() => setActiveReceiptData(null)}
          receiptData={activeReceiptData}
          store={store}
        />
      )}

      {/* 7. Barcode Label Print Modal */}
      {barcodeModalProduct && (
        <BarcodePrintModal
          isOpen={Boolean(barcodeModalProduct)}
          onClose={() => setBarcodeModalProduct(null)}
          product={barcodeModalProduct}
        />
      )}

      {/* 8. 10-Step Interactive Store Onboarding Wizard */}
      {isOnboardingOpen && (
        <StoreOnboardingWizard
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={async (newTenantId) => {
            setIsOnboardingOpen(false);
            await handleSwitchTenant(newTenantId);
            setCurrentView('admin');
            setAdminTab('dashboard');
          }}
        />
      )}
    </div>
  );
};

export default App;
