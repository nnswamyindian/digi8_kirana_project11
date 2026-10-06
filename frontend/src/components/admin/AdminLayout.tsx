import React, { useState, useEffect } from 'react';
import { StoreProfile, User, NotificationEvent } from '../../types';
import { api } from '../../services/api';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Warehouse,
  Truck,
  Users,
  FileText,
  Settings,
  Store,
  CreditCard,
  Bell,
  ExternalLink,
  LogOut,
  Power,
  MapPin,
  ShieldCheck,
  UserCheck,
  Navigation,
  Banknote,
  Radio,
  X,
  Building2,
  Sparkles,
  Globe,
  Zap,
  LifeBuoy,
  Languages,
  Database,
  TrendingUp,
  Menu
} from 'lucide-react';
import { Tenant } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  store: StoreProfile;
  currentUser?: User | null;
  onToggleStoreStatus: () => void;
  newOrderAlertCount: number;
  onClearOrderAlerts: () => void;
  onSwitchToStorefront: () => void;
  onSwitchToLanding?: () => void;
  onLogout: () => void;
  onSwitchTenant?: (tenantId: string) => void;
  onOpenOnboarding?: () => void;
  platformStoreContext?: string | null;
  onExitStoreContext?: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onTabChange,
  store,
  currentUser,
  onToggleStoreStatus,
  newOrderAlertCount,
  onClearOrderAlerts,
  onSwitchToStorefront,
  onSwitchToLanding,
  onLogout,
  onSwitchTenant,
  onOpenOnboarding,
  platformStoreContext,
  onExitStoreContext,
  children,
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const isOpen = store.store_status === 'OPEN';

  // Multi-Tenant List State
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);

  const fetchNotifications = async () => {
    try {
      const [list, count] = await Promise.all([
        api.getNotifications(20),
        api.getUnreadNotificationCount(),
      ]);
      setNotifications(list);
      setUnreadNotifCount(count);
    } catch (e) {
      // Non-critical background fetch
    }
  };

  const isPlatformAdmin = currentUser?.role === 'PLATFORM_ADMIN';
  // Context determination: Super Admin is only in store context if an explicit store is selected
  const isStoreContext = !isPlatformAdmin || Boolean(platformStoreContext);

  useEffect(() => {
    fetchNotifications();
    if (isPlatformAdmin) {
      api.getPlatformTenants().then(setTenantsList).catch(() => { });
    }

    const unsub = api.subscribeToEvents((type) => {
      if (['notification_received', 'new_online_order', 'delivery_cash_collected', 'order_status_updated'].includes(type)) {
        fetchNotifications();
      }
    });
    return unsub;
  }, [isPlatformAdmin]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadNotifCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  interface NavItem {
    key: string;
    label: string;
    icon: any;
    highlight?: boolean;
    badge?: number | string;
  }

  // 1. SUPER ADMIN / PLATFORM ADMIN SIDEBAR MODULES (Platform Level)
  const platformNavItems: NavItem[] = [
    { key: 'platform-dashboard', label: t.platformDashboard, icon: LayoutDashboard },
    { key: 'platform-stores', label: t.platformStores, icon: Building2 },
    { key: 'platform-applications', label: t.platformApplications, icon: FileText },
    { key: 'platform-subscriptions', label: t.platformSubscriptions, icon: Zap },
    { key: 'platform-payments', label: t.platformPayments, icon: Banknote },
    { key: 'platform-projects', label: t.platformProjects, icon: Sparkles },
    { key: 'platform-reports', label: t.platformReports, icon: TrendingUp },
    { key: 'platform-domains', label: t.platformDomains, icon: Globe },
    { key: 'platform-users', label: t.platformUsers, icon: Users },
    { key: 'platform-database', label: t.platformDatabase, icon: Database, highlight: true },
    { key: 'platform-settings', label: t.platformSettings, icon: Settings },
    { key: 'platform-audit-logs', label: t.platformAuditLogs, icon: ShieldCheck },
    { key: 'platform-support', label: t.platformSupport, icon: LifeBuoy },
    { key: 'platform-health', label: t.platformSystemStatus, icon: Radio },
  ];

  // 2. STORE OWNER / OPERATIONAL SIDEBAR MODULES (Store Level)
  const storeNavItems: NavItem[] = [
    { key: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { key: 'pos', label: t.posBilling, icon: CreditCard, highlight: true },
    { key: 'orders', label: t.orders, icon: ShoppingCart, badge: newOrderAlertCount > 0 ? newOrderAlertCount : undefined },
    { key: 'fleet', label: t.liveFleet, icon: Navigation },
    { key: 'payments', label: t.payments, icon: Banknote },
    { key: 'delivery-areas', label: t.deliveryAreas, icon: MapPin },
    { key: 'products', label: t.productsMenu, icon: Package },
    { key: 'categories', label: t.categories, icon: Tags },
    { key: 'inventory', label: t.inventoryMenu, icon: Warehouse },
    { key: 'purchases', label: t.purchasesMenu, icon: Truck },
    { key: 'customers', label: t.customersMenu, icon: Users },
    { key: 'staff', label: t.staffMenu, icon: ShieldCheck },
    { key: 'reports', label: t.reportsMenu, icon: FileText },
    { key: 'domains', label: t.customDomainMenu, icon: Globe },
    { key: 'subscription', label: t.planBillingMenu, icon: Zap },
    { key: 'support', label: t.helpSupportMenu, icon: LifeBuoy },
    { key: 'settings', label: t.settingsMenu, icon: Settings },
  ];

  // Filter store navigation items strictly based on division role
  const filteredStoreNavItems = storeNavItems.filter(item => {
    if (currentUser?.role === 'CASHIER') {
      return ['pos', 'orders', 'customers'].includes(item.key);
    }
    if (currentUser?.role === 'STOCK_MANAGER' || currentUser?.role === 'SUB_ADMIN') {
      return !['staff', 'subscription', 'settings'].includes(item.key);
    }
    return true;
  });

  // Choose the navigation strictly based on active context
  const navItems = isStoreContext ? filteredStoreNavItems : platformNavItems;

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        {/* Sidebar Brand Header */}
        <div className="sidebar-brand">
          <div style={{
            width: '40px',
            height: '40px',
            background: !isStoreContext
              ? 'linear-gradient(135deg, #0284c7, #0369a1)'
              : isPlatformAdmin
              ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
              : 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: !isStoreContext ? '1.35rem' : '1.25rem',
            boxShadow: !isStoreContext ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none'
          }}>
            {!isStoreContext ? '🏢' : '🏪'}
          </div>
          <div className="brand-text">
            <h2 style={{ fontSize: !isStoreContext ? '1.05rem' : '1rem', fontWeight: 900, color: 'white', lineHeight: 1.2, letterSpacing: !isStoreContext ? '-0.3px' : 'normal' }}>
              {!isStoreContext ? 'MANA KIRANA KOTTU' : store.name}
            </h2>
            <span style={{ fontSize: '0.68rem', color: !isStoreContext ? '#38bdf8' : isPlatformAdmin ? '#93c5fd' : '#94a3b8', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {!isStoreContext 
                ? t.platformAdmin 
                : isPlatformAdmin 
                ? t.adminViewStore 
                : (language === 'te' ? 'యజమాని కంట్రోల్ సెంటర్' : 'Owner Command Center')}
            </span>
          </div>
        </div>

        {/* Super Admin Store Context Exit Button inside Sidebar */}
        {isPlatformAdmin && isStoreContext && (
          <div style={{ padding: '0 12px 10px' }}>
            <button
              onClick={onExitStoreContext}
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.18)',
                border: '1px solid rgba(59, 130, 246, 0.45)',
                color: '#bfdbfe',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = 'white'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)'; e.currentTarget.style.color = '#bfdbfe'; }}
            >
              <span>⬅</span>
              <span>{t.exitStoreView}</span>
            </button>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <div
                key={item.key}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={item.highlight && !isActive ? { border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7' } : {}}
                onClick={() => {
                  onTabChange(item.key);
                  if (item.key === 'orders') onClearOrderAlerts();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="sidebar-badge">{item.badge}</span>
                ) : null}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {isPlatformAdmin && onSwitchToLanding && (
            <button
              onClick={onSwitchToLanding}
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: '8px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.08)', fontSize: '0.825rem', fontWeight: 700 }}
            >
              <Globe size={14} />
              <span>{language === 'te' ? 'ప్లాట్‌ఫారమ్ పోర్టల్' : 'SaaS Platform Portal'}</span>
            </button>
          )}

          <button
            onClick={onSwitchToStorefront}
            className="btn btn-secondary"
            style={{ width: '100%', marginBottom: '8px', color: 'white', borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', fontSize: '0.825rem' }}
          >
            <ExternalLink size={14} />
            <span>{language === 'te' ? 'కస్టమర్ ఆన్‌లైన్ స్టోర్' : 'Store Customer View'}</span>
          </button>

          <button
            onClick={onLogout}
            className="btn btn-secondary"
            style={{ width: '100%', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)', background: 'transparent', fontSize: '0.825rem' }}
          >
            <LogOut size={14} />
            <span>{t.logout}</span>
          </button>

          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.7rem', color: '#64748b' }}>
            Designed by{' '}
            <a
              href="https://digi8solutions.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#94a3b8', fontWeight: 600, textDecoration: 'none' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#38bdf8')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              Digi8Solutions
            </a>
          </div>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="admin-main">
        {/* Prominent Admin Store View Alert Banner */}
        {isPlatformAdmin && isStoreContext && (
          <div style={{
            background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)',
            color: 'white',
            padding: '9px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderBottom: '2px solid #3b82f6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: '#fbbf24',
                color: '#0f172a',
                fontSize: '0.68rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.5px'
              }}>
                🛡️ ADMIN VIEW
              </span>
              <span>
                {language === 'te' 
                  ? `మీరు ప్రస్తుతం "${store.name}" (${store.slug}) దుకాణపు ఆపరేషనల్ మోడ్‌లో ఉన్నారు` 
                  : `Admin Mode: Currently inspecting operational modules for "${store.name}" (${store.slug})`}
              </span>
            </div>
            <button
              onClick={onExitStoreContext}
              style={{
                background: 'white',
                color: '#1e3a8a',
                fontWeight: 800,
                fontSize: '0.78rem',
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            >
              <X size={14} />
              <span>{t.exitStoreView}</span>
            </button>
          </div>
        )}

        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {navItems.find(n => n.key === activeTab)?.label || (!isStoreContext ? t.platformDashboard : t.dashboard)}
            </h2>

            {/* Store Open / Closed Switch (Only in Store Context) */}
            {isStoreContext && (
              <button
                onClick={onToggleStoreStatus}
                className={`btn btn-sm ${isOpen ? 'btn-primary' : 'btn-danger'}`}
                style={{ borderRadius: 'var(--radius-full)', padding: '5px 12px' }}
              >
                <Power size={13} />
                <span>
                  {isOpen 
                    ? (language === 'te' ? 'షాప్: ఓపెన్ (ఆన్‌లైన్)' : 'STORE: OPEN (ONLINE)')
                    : (language === 'te' ? 'షాప్: మూసివేయబడింది' : 'STORE: CLOSED')}
                </span>
              </button>
            )}

            {/* Multi-Tenant Store Context Switcher (ONLY FOR PLATFORM ADMIN) */}
            {isPlatformAdmin ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isStoreContext ? '#eff6ff' : '#f8fafc',
                padding: '4px 10px',
                borderRadius: '8px',
                border: isStoreContext ? '1.5px solid #3b82f6' : '1px solid #cbd5e1'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isStoreContext ? '#1d4ed8' : '#64748b', textTransform: 'uppercase' }}>
                  {t.storeContext}:
                </span>
                <select
                  value={platformStoreContext || 'ALL'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ALL') {
                      if (onExitStoreContext) onExitStoreContext();
                    } else {
                      if (onSwitchTenant) onSwitchTenant(val);
                    }
                  }}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '220px'
                  }}
                >
                  <option value="ALL">{t.allStoresPlatformMode}</option>
                  {tenantsList.map(t => (
                    <option key={t.id} value={t.id}>
                      🏪 {t.name} ({t.slug})
                    </option>
                  ))}
                </select>

                {isStoreContext && onExitStoreContext && (
                  <button
                    type="button"
                    onClick={onExitStoreContext}
                    title={t.exitStoreView}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Exit
                  </button>
                )}

                {onOpenOnboarding && (
                  <button
                    type="button"
                    onClick={onOpenOnboarding}
                    title="Register new store (10-Step Wizard)"
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#059669',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Sparkles size={11} />
                    + Store
                  </button>
                )}
              </div>
            ) : (
              /* Regular Store Owner & Staff: Clean, verified store badge with NO switcher */
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(5, 150, 105, 0.08)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
                <Store size={14} color="var(--primary-700)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-800)' }}>
                  {store.name}
                </span>
                <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.5px' }}>
                  {language === 'te' ? 'నా దుకాణం' : 'MY STORE'}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <Languages size={15} color="#16a34a" />
              <span>{language === 'te' ? 'English' : 'తెలుగు'}</span>
            </button>

            {/* Online Order Chime Alert Pill */}
            {newOrderAlertCount > 0 && (
              <button
                className="btn btn-accent btn-sm"
                onClick={() => {
                  onTabChange('orders');
                  onClearOrderAlerts();
                }}
                style={{ animation: 'pulse 1.5s infinite' }}
              >
                <Bell size={15} />
                <span>
                  {language === 'te' 
                    ? `${newOrderAlertCount} కొత్త ఆన్‌లైన్ ఆర్డర్లు వచ్చాయి!` 
                    : `${newOrderAlertCount} New Online Order${newOrderAlertCount > 1 ? 's' : ''}!`}
                </span>
              </button>
            )}

            {/* Notification Bell with Badge */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsNotifDrawerOpen(prev => !prev)}
                title="System Notifications"
                style={{
                  position: 'relative',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: isNotifDrawerOpen ? 'var(--bg-subtle)' : 'white'
                }}
              >
                <Bell size={16} />
                {unreadNotifCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white'
                  }}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Drawer */}
              {isNotifDrawerOpen && (
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  right: 0,
                  width: '360px',
                  maxHeight: '480px',
                  background: 'white',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid var(--border-light)',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease'
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Radio size={14} color="#059669" />
                      <strong style={{ fontSize: '0.875rem' }}>
                        {language === 'te' ? 'సిస్టమ్ అలర్ట్‌లు & కార్యకలాపాలు' : 'System Alerts & Activity'}
                      </strong>
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-600)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {language === 'te' ? 'అన్నీ చదివినట్లు గుర్తించు' : 'Mark all read'}
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', maxHeight: '380px', padding: '8px' }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                        <Bell size={24} style={{ opacity: 0.3, marginBottom: '6px' }} />
                        <div style={{ fontSize: '0.85rem' }}>
                          {language === 'te' ? 'తాజా నోటిఫికేషన్‌లు ఏవీ లేవు' : 'No recent notifications'}
                        </div>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: n.is_read ? 'white' : '#f0fdf4',
                            border: n.is_read ? '1px solid #f1f5f9' : '1px solid #bbf7d0',
                            marginBottom: '6px',
                            fontSize: '0.825rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ color: 'var(--text-main)' }}>{n.title}</strong>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ color: '#475569', lineHeight: 1.4, fontSize: '0.8rem' }}>
                            {n.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Launch POS terminal directly (Only in Store Context) */}
            {isStoreContext && activeTab !== 'pos' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onTabChange('pos')}
              >
                <CreditCard size={15} />
                <span>{language === 'te' ? 'త్వరిత POS బిల్లింగ్' : 'Quick POS Billing'}</span>
              </button>
            )}

            {/* Current Logged-in Staff Badge */}
            {currentUser && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-subtle)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-light)',
                fontSize: '0.8rem'
              }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{currentUser.name}</span>
                <span className={`badge ${currentUser.role === 'OWNER' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};
