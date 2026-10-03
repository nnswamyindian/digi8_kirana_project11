import React, { useState, useEffect } from 'react';
import { StoreProfile, Category, Product, Customer, CartItem, Order, User, CustomerUser } from './types';
import { api } from './services/api';
import { playOrderChime, ReceiptData } from './services/hardware';

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

import { AlertTriangle, Sparkles, Scale, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  // App Mode: Public SaaS Landing vs Storefront vs Admin Portal vs Delivery Boy Portal
  const [currentView, setCurrentView] = useState<'storefront' | 'admin' | 'delivery' | 'landing'>('storefront');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [adminTab, setAdminTab] = useState<string>('dashboard');

  // Central Core State
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  // Load Initial Store Data
  const loadInitialData = async () => {
    try {
      const [s, c, p, cust] = await Promise.all([
        api.getStore(),
        api.getCategories(),
        api.getProducts(),
        api.getCustomers(),
      ]);
      setStore(s);
      setCategories(c);
      setProducts(p);
      setCustomers(cust);

      // Verify store availability
      if (s.status === 'SUSPENDED') {
        setStoreNoticeState('SUSPENDED');
      } else if (s.is_storefront_enabled === 0 || (s as any).is_storefront_enabled === false) {
        setStoreNoticeState('STOREFRONT_DISABLED');
      } else {
        setStoreNoticeState(null);
      }
    } catch (err) {
      console.error('Failed to load store data:', err);
      setStoreNoticeState('NOT_FOUND');
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    api.setTenantId(tenantId);
    setCart([]);
    await loadInitialData();
  };

  // Dynamic White-label Branding Injection
  useEffect(() => {
    if (store) {
      const pColor = store.primary_color || '#16a34a';
      document.documentElement.style.setProperty('--primary-600', pColor);
      document.documentElement.style.setProperty('--primary-700', pColor);
      document.documentElement.style.setProperty('--primary-500', pColor);
      document.title = `${store.name} — Digi8 Apna Kirana`;
    }
  }, [store]);

  useEffect(() => {
    loadInitialData();

    // Check URL parameters for explicit view routing
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const storeParam = urlParams.get('store') || urlParams.get('tenant');

    if (viewParam === 'landing') {
      setCurrentView('landing');
    } else if (viewParam === 'admin' || viewParam === 'manage') {
      setCurrentView('admin');
    } else if (viewParam === 'platform' || viewParam === 'superadmin') {
      setCurrentView('admin');
      setAdminTab('platform');
    } else if (viewParam === 'delivery') {
      setCurrentView('delivery');
    }

    // Path-based routing: /platform-admin, /store-login, /manage, /delivery, or /:storeSlug
    const rawPath = window.location.pathname.replace(/^\/|\/$/g, '');
    if (rawPath === 'platform-admin') {
      setCurrentView('admin');
      setAdminTab('platform');
    } else if (rawPath === 'store-login' || rawPath === 'manage') {
      setCurrentView('admin');
    } else if (rawPath === 'delivery' || rawPath === 'delivery-login') {
      setCurrentView('delivery');
    } else if (rawPath && !['api', 'assets', 'store'].includes(rawPath)) {
      api.resolveTenant(rawPath).then(res => {
        if (res.success && res.tenant) {
          handleSwitchTenant(res.tenant.id);
        }
      }).catch(() => {});
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
          setAdminTab('platform');
        } else {
          if (user.tenant_id) await handleSwitchTenant(user.tenant_id);
          setCurrentView('admin');
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
      } else if (eventType === 'stock_updated' || eventType === 'pos_sale_completed') {
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

  if (!store) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛒</div>
          <h2>Loading Kirana Store Central System...</h2>
        </div>
      </div>
    );
  }

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
                    Store is currently closed for counter billing. You can still browse products; delivery starts tomorrow at {store.opening_time}.
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
                    ? categories.find(c => c.id === selectedCategory)?.name || 'Category Products'
                    : storefrontFilter === 'loose'
                    ? 'Loose Grocery & Pulses (Sold by Weight)'
                    : storefrontFilter === 'offers'
                    ? 'Special Offers & Discounts'
                    : 'All Fresh Grocery Items'}
                </h2>
                <p className="section-subtitle">
                  Showing {storefrontProducts.length} items with guaranteed fresh stock and exact pricing
                </p>
              </div>

              {/* Quick Filter Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className={`btn-sm ${storefrontFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStorefrontFilter('all')}
                >
                  All Items
                </button>
                <button
                  className={`btn-sm ${storefrontFilter === 'loose' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStorefrontFilter('loose')}
                >
                  <Scale size={13} />
                  <span>Loose (Per KG)</span>
                </button>
                <button
                  className={`btn-sm ${storefrontFilter === 'offers' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStorefrontFilter('offers')}
                >
                  <Sparkles size={13} />
                  <span>Offers</span>
                </button>
                <button
                  className={`btn-sm ${storefrontFilter === 'bestsellers' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStorefrontFilter('bestsellers')}
                >
                  ★ Bestsellers
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
      ) : currentView === 'delivery' && currentUser ? (
        /* ====================================================
           VIEW 2: DELIVERY BOY MOBILE PORTAL
           ==================================================== */
        <DeliveryBoyPortal
          currentUser={currentUser}
          onLogout={() => {
            api.logout();
            setCurrentUser(null);
            setCurrentView('storefront');
          }}
        />
      ) : (
        /* ====================================================
           VIEW 3: OWNER ADMIN DASHBOARD & POS BILLING
           ==================================================== */
        <AdminLayout
          activeTab={adminTab}
          onTabChange={(tab) => setAdminTab(tab)}
          store={store}
          currentUser={currentUser}
          onToggleStoreStatus={handleToggleStoreStatus}
          newOrderAlertCount={newOrderAlertCount}
          onClearOrderAlerts={() => setNewOrderAlertCount(0)}
          onSwitchToStorefront={() => setCurrentView('storefront')}
          onSwitchToLanding={() => setCurrentView('landing')}
          onLogout={() => {
            api.logout();
            setCurrentUser(null);
            setCurrentView('storefront');
            setAdminTab('dashboard');
          }}
          onSwitchTenant={handleSwitchTenant}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
        >
          {adminTab === 'dashboard' && (
            <DashboardOverview
              store={store}
              onNavigateToTab={(tab) => setAdminTab(tab)}
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

          {adminTab === 'platform' && currentUser?.role === 'PLATFORM_ADMIN' && (
            <CompanyControlCenter
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
              onSelectTenant={handleSwitchTenant}
            />
          )}

          {adminTab === 'settings' && (
            <StoreSettings
              store={store}
              onRefreshStore={loadInitialData}
              onOpenReceipt={(data) => setActiveReceiptData(data)}
            />
          )}
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
            setAdminTab('platform');
          } else {
            if (user.tenant_id) await handleSwitchTenant(user.tenant_id);
            setCurrentView('admin');
            setAdminTab('dashboard');
          }
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
