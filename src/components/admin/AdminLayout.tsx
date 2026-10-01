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
  LifeBuoy
} from 'lucide-react';
import { Tenant } from '../../types';

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
  children,
}) => {
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

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'pos', label: 'POS Billing', icon: CreditCard, highlight: true },
    { key: 'orders', label: 'Orders', icon: ShoppingCart, badge: newOrderAlertCount > 0 ? newOrderAlertCount : undefined },
    { key: 'fleet', label: 'Live Fleet Radar', icon: Navigation },
    { key: 'payments', label: 'Payments & Handover', icon: Banknote },
    { key: 'delivery-areas', label: 'Delivery Areas', icon: MapPin },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'categories', label: 'Categories', icon: Tags },
    { key: 'inventory', label: 'Inventory', icon: Warehouse },
    { key: 'purchases', label: 'Purchases & Stock', icon: Truck },
    { key: 'customers', label: 'Customers & Khata', icon: Users },
    { key: 'staff', label: 'Staff & Roles', icon: ShieldCheck },
    { key: 'reports', label: 'Reports & Analytics', icon: FileText },
    { key: 'domains', label: 'Custom Domain', icon: Globe },
    { key: 'subscription', label: 'Plan & Billing', icon: Zap },
    { key: 'support', label: 'Help & Support', icon: LifeBuoy },
    ...(isPlatformAdmin ? [{ key: 'platform', label: 'Company Control Center', icon: Building2, highlight: true }] : []),
    { key: 'settings', label: 'Settings & Hardware', icon: Settings },
  ];

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div style={{
            width: '38px',
            height: '38px',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            🏪
          </div>
          <div className="brand-text">
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              {store.name}
            </h2>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Owner Command Center</span>
          </div>
        </div>

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
              <span>SaaS Platform Portal</span>
            </button>
          )}

          <button
            onClick={onSwitchToStorefront}
            className="btn btn-secondary"
            style={{ width: '100%', marginBottom: '8px', color: 'white', borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', fontSize: '0.825rem' }}
          >
            <ExternalLink size={14} />
            <span>Store Customer View</span>
          </button>

          <button
            onClick={onLogout}
            className="btn btn-secondary"
            style={{ width: '100%', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)', background: 'transparent', fontSize: '0.825rem' }}
          >
            <LogOut size={14} />
            <span>Logout</span>
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
        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {navItems.find(n => n.key === activeTab)?.label}
            </h2>

            {/* Store Open / Closed Switch */}
            <button
              onClick={onToggleStoreStatus}
              className={`btn btn-sm ${isOpen ? 'btn-primary' : 'btn-danger'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '5px 12px' }}
            >
              <Power size={13} />
              <span>{isOpen ? 'STORE: OPEN (ONLINE)' : 'STORE: CLOSED'}</span>
            </button>

            {/* Multi-Tenant Store Switcher (ONLY FOR PLATFORM ADMIN) */}
            {isPlatformAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tenant:</span>
                <select
                  value={store.id}
                  onChange={(e) => {
                    if (onSwitchTenant) onSwitchTenant(e.target.value);
                  }}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '180px'
                  }}
                >
                  {tenantsList.length > 0 ? (
                    tenantsList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.slug})
                      </option>
                    ))
                  ) : (
                    <option value={store.id}>{store.name}</option>
                  )}
                </select>

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
                  MY STORE
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <span>{newOrderAlertCount} New Online Order{newOrderAlertCount > 1 ? 's' : ''}!</span>
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
                      <strong style={{ fontSize: '0.875rem' }}>System Alerts & Activity</strong>
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
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', maxHeight: '380px', padding: '8px' }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                        <Bell size={24} style={{ opacity: 0.3, marginBottom: '6px' }} />
                        <div style={{ fontSize: '0.85rem' }}>No recent notifications</div>
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

            {/* Launch POS terminal directly */}
            {activeTab !== 'pos' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onTabChange('pos')}
              >
                <CreditCard size={15} />
                <span>Quick POS Billing</span>
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
