import React from 'react';
import { AlertTriangle, Store, ShieldAlert, Clock, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';

export type StoreNoticeType = 'SUSPENDED' | 'STOREFRONT_DISABLED' | 'NOT_FOUND' | 'SUBSCRIPTION_EXPIRED' | 'STORE_CLOSED';

interface StoreStateNoticeProps {
  type: StoreNoticeType;
  storeName?: string;
  onGoToPlatform: () => void;
  onOpenStoreLogin?: () => void;
}

export const StoreStateNotice: React.FC<StoreStateNoticeProps> = ({
  type,
  storeName = 'This Store',
  onGoToPlatform,
  onOpenStoreLogin
}) => {
  const getNoticeContent = () => {
    switch (type) {
      case 'SUSPENDED':
        return {
          icon: <ShieldAlert size={48} color="#dc2626" />,
          title: 'Store Temporarily Unavailable',
          description: `${storeName}'s account has been temporarily suspended. If you are the store owner, please contact Digi8 Apna Kirana platform support to reactivate your services.`,
          badge: 'Account Suspended',
          badgeColor: '#fee2e2',
          badgeText: '#991b1b',
          canLogin: true
        };
      case 'STOREFRONT_DISABLED':
        return {
          icon: <Store size={48} color="#f59e0b" />,
          title: 'Online Storefront Currently Disabled',
          description: `${storeName} currently utilizes Digi8 Apna Kirana exclusively for in-store Counter POS Billing and Inventory. Online shopping for this store is not enabled at this time.`,
          badge: 'POS Only Store',
          badgeColor: '#fef3c7',
          badgeText: '#b45309',
          canLogin: true
        };
      case 'SUBSCRIPTION_EXPIRED':
        return {
          icon: <Clock size={48} color="#ea580c" />,
          title: 'Store Subscription Renewal Required',
          description: `${storeName}'s monthly SaaS subscription has ended. Store owners can log in to renew their plan instantly.`,
          badge: 'Subscription Renewal',
          badgeColor: '#ffedd5',
          badgeText: '#c2410c',
          canLogin: true
        };
      case 'STORE_CLOSED':
        return {
          icon: <Clock size={48} color="#64748b" />,
          title: 'Store Is Currently Closed',
          description: `${storeName} is currently closed outside of regular operating hours. Please visit again during store hours or browse our catalog.`,
          badge: 'Currently Closed',
          badgeColor: '#f1f5f9',
          badgeText: '#475569',
          canLogin: false
        };
      case 'NOT_FOUND':
      default:
        return {
          icon: <AlertTriangle size={48} color="#64748b" />,
          title: 'Store Not Found',
          description: 'We could not find an active Kirana or Supermarket associated with this URL or subdomain on the Digi8 Apna Kirana platform.',
          badge: '404 - Not Registered',
          badgeColor: '#f1f5f9',
          badgeText: '#475569',
          canLogin: false
        };
    }
  };

  const content = getNoticeContent();

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: '520px', width: '100%', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', padding: '36px 28px', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '1px solid #e2e8f0' }}>
          {content.icon}
        </div>

        <span style={{ display: 'inline-block', background: content.badgeColor, color: content.badgeText, padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px' }}>
          {content.badge}
        </span>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: '0 0 10px 0' }}>
          {content.title}
        </h2>

        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {content.description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {content.canLogin && onOpenStoreLogin && (
            <button
              onClick={onOpenStoreLogin}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: '8px', fontWeight: 700 }}
            >
              <span>Owner & Staff Management Login</span>
              <ArrowRight size={16} />
            </button>
          )}

          <button
            onClick={onGoToPlatform}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '11px', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
          >
            <span>Visit Digi8 Apna Kirana Platform</span>
            <ExternalLink size={15} />
          </button>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#94a3b8' }}>
          Powered by <strong>Digi8 Solutions</strong> • Retail SaaS Cloud Platform
        </div>
      </div>
    </div>
  );
};
