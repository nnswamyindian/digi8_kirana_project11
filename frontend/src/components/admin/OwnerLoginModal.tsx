import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import {
  X,
  Lock,
  Phone,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Bike,
  CreditCard,
  Building2,
  Globe,
  Eye,
  EyeOff,
  ShoppingBag,
  Sparkles,
  Store
} from 'lucide-react';

export type LoginDivision = 'OWNER' | 'CASHIER' | 'MANAGER' | 'DELIVERY' | 'PLATFORM';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialMode?: 'STAFF' | 'DELIVERY' | 'PLATFORM' | 'CASHIER' | 'OWNER' | 'MANAGER';
  onSwitchToCustomer?: () => void;
}

interface DivisionConfig {
  id: LoginDivision;
  label: string;
  badge: string;
  icon: React.ElementType;
  accentColor: string;
  lightBg: string;
  borderColor: string;
  title: string;
  description: string;
  defaultPhone: string;
  defaultPin: string;
  demoStores?: { name: string; phone: string; pin: string; roleLabel: string }[];
}

const DIVISIONS: DivisionConfig[] = [
  {
    id: 'OWNER',
    label: 'Store Owner',
    badge: 'Merchant Admin',
    icon: Store,
    accentColor: '#15803d',
    lightBg: '#f0fdf4',
    borderColor: '#bbf7d0',
    title: 'Store Owner Command Center',
    description: 'Full store administration, sales revenue analytics, inventory management, store settings, and staff permissions.',
    defaultPhone: '9876543210',
    defaultPin: '1234',
    demoStores: [
      { name: '👑 Apna Kirana (Owner)', phone: '9876543210', pin: '1234', roleLabel: 'Royal Kirana' },
      { name: '🏪 Fresh Mart (Owner)', phone: '9848012345', pin: '1234', roleLabel: 'Fresh Mart' }
    ]
  },
  {
    id: 'CASHIER',
    label: 'POS Cashier',
    badge: 'Billing Counter',
    icon: CreditCard,
    accentColor: '#2563eb',
    lightBg: '#eff6ff',
    borderColor: '#bfdbfe',
    title: 'POS Billing Counter Login',
    description: 'High-speed barcode scanner checkout, thermal receipt printing, weigh scale input, and shift register reconciliation.',
    defaultPhone: '9876543212',
    defaultPin: '1234',
    demoStores: [
      { name: '💵 Counter 1 Cashier', phone: '9876543212', pin: '1234', roleLabel: 'Express Counter' }
    ]
  },
  {
    id: 'MANAGER',
    label: 'Store Manager',
    badge: 'Operations',
    icon: ShieldCheck,
    accentColor: '#0891b2',
    lightBg: '#ecfeff',
    borderColor: '#a5f3fc',
    title: 'Store Manager Portal',
    description: 'Stock inward receiving, purchase entries, product catalog updates, pricing, and live customer orders.',
    defaultPhone: '9876543211',
    defaultPin: '1234',
    demoStores: [
      { name: '🛡️ Store Operations Manager', phone: '9876543211', pin: '1234', roleLabel: 'General Manager' }
    ]
  },
  {
    id: 'DELIVERY',
    label: 'Delivery Rider',
    badge: 'Fleet Portal',
    icon: Bike,
    accentColor: '#d97706',
    lightBg: '#fffbeb',
    borderColor: '#fde68a',
    title: 'Delivery Partner Portal',
    description: 'Live assigned delivery tasks, customer delivery navigation, order tracking updates, and cash-on-delivery collection.',
    defaultPhone: '9876543213',
    defaultPin: '1234',
    demoStores: [
      { name: '🛵 Express Delivery Rider', phone: '9876543213', pin: '1234', roleLabel: 'Fleet Agent 1' }
    ]
  },
  {
    id: 'PLATFORM',
    label: 'Super Admin',
    badge: 'Central Cloud',
    icon: Globe,
    accentColor: '#7c3aed',
    lightBg: '#f5f3ff',
    borderColor: '#ddd6fe',
    title: 'Mana Kirana Central Cloud Control',
    description: 'Multi-tenant SaaS control center, merchant store approvals, subscription billing plans, and database audit logs.',
    defaultPhone: '9999999999',
    defaultPin: '9999',
    demoStores: [
      { name: '🌐 Platform Root Admin', phone: '9999999999', pin: '9999', roleLabel: 'SaaS Superadmin' }
    ]
  }
];

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'OWNER',
  onSwitchToCustomer
}) => {
  if (!isOpen) return null;

  // Map initial mode to Division
  const resolveInitialDivision = (): LoginDivision => {
    if (initialMode === 'DELIVERY') return 'DELIVERY';
    if (initialMode === 'PLATFORM') return 'PLATFORM';
    if (initialMode === 'CASHIER') return 'CASHIER';
    if (initialMode === 'MANAGER') return 'MANAGER';
    return 'OWNER';
  };

  const [activeDivision, setActiveDivision] = useState<LoginDivision>(resolveInitialDivision);
  const currentConfig = DIVISIONS.find(d => d.id === activeDivision) || DIVISIONS[0];

  const [mobile, setMobile] = useState(currentConfig.defaultPhone);
  const [pin, setPin] = useState(currentConfig.defaultPin);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Switch fields on division tab change
  const handleSelectDivision = (div: LoginDivision) => {
    setActiveDivision(div);
    const cfg = DIVISIONS.find(d => d.id === div) || DIVISIONS[0];
    setMobile(cfg.defaultPhone);
    setPin(cfg.defaultPin);
    setError('');
  };

  // Sync if initialMode changes while opened
  useEffect(() => {
    handleSelectDivision(resolveInitialDivision());
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || !pin) {
      setError('Please provide registered mobile number and PIN/password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.login({
        mobile: mobile.trim(),
        password: pin.trim(),
      });
      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials. Please check phone number or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoMobile: string, demoPin: string) => {
    setMobile(demoMobile);
    setPin(demoPin);
    setError('');
  };

  const ActiveIcon = currentConfig.icon;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
    >
      <style>{`
        .login-tabs-bar::-webkit-scrollbar { display: none; height: 0; width: 0; }
        .login-scroll-body::-webkit-scrollbar { width: 6px; }
        .login-scroll-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .login-scroll-body::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      <div
        className="modal-card"
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: 'min(92vh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          background: 'white'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Division Branding */}
        <div
          style={{
            background: `linear-gradient(135deg, ${currentConfig.accentColor}, #0f172a)`,
            padding: '18px 22px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ActiveIcon size={22} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                  {currentConfig.title}
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.25)',
                    letterSpacing: '0.5px'
                  }}
                >
                  {currentConfig.badge}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', opacity: 0.9 }}>
                Mana Kirana Enterprise System Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Division Selector Tabs */}
        <div
          className="login-tabs-bar"
          style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            padding: '4px 8px 0',
            flexShrink: 0
          }}
        >
          {DIVISIONS.map((div) => {
            const Icon = div.icon;
            const isSelected = div.id === activeDivision;
            return (
              <button
                key={div.id}
                type="button"
                onClick={() => handleSelectDivision(div.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  border: 'none',
                  background: isSelected ? 'white' : 'transparent',
                  borderBottom: isSelected ? `3px solid ${div.accentColor}` : '3px solid transparent',
                  borderRadius: isSelected ? '8px 8px 0 0' : '0',
                  color: isSelected ? div.accentColor : '#64748b',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: isSelected ? '0 -2px 6px rgba(0,0,0,0.03)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} color={isSelected ? div.accentColor : '#94a3b8'} />
                <span>{div.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <div
            className="login-scroll-body"
            style={{
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              flex: 1,
              overflowY: 'auto',
              minHeight: 0
            }}
          >
            {/* Division Description Notice */}
            <div
              style={{
                background: currentConfig.lightBg,
                border: `1px solid ${currentConfig.borderColor}`,
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#334155',
                lineHeight: 1.45,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <ActiveIcon size={16} color={currentConfig.accentColor} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: currentConfig.accentColor, display: 'block', marginBottom: '2px' }}>
                  {currentConfig.label} Access Division
                </strong>
                {currentConfig.description}
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Mobile Number Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                Registered Mobile Number
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 12px',
                  background: 'white',
                  transition: 'border-color 0.2s'
                }}
              >
                <Phone size={16} color="#64748b" />
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit registered number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{
                    border: 'none',
                    width: '100%',
                    padding: '10px 10px',
                    fontSize: '0.92rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            {/* Security PIN / Password Field */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                Security PIN / Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 12px',
                  background: 'white'
                }}
              >
                <KeyRound size={16} color="#64748b" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter 4-digit PIN or password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{
                    border: 'none',
                    width: '100%',
                    padding: '10px 10px',
                    fontSize: '0.92rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credentials Switcher for Current Division */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px'
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#64748b',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Sparkles size={12} color={currentConfig.accentColor} />
                <span>1-Click Demo Accounts for {currentConfig.label}:</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                {currentConfig.demoStores?.map((demo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickFill(demo.phone, demo.pin)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: mobile === demo.phone ? currentConfig.lightBg : 'white',
                      border: `1px solid ${mobile === demo.phone ? currentConfig.accentColor : '#cbd5e1'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{demo.name}</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                      Ph: {demo.phone} • PIN: {demo.pin}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Switch to Customer Login Link */}
            {onSwitchToCustomer && (
              <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={onSwitchToCustomer}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-700, #15803d)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ShoppingBag size={14} />
                  <span>Looking for Customer Shopping Account? Sign in here</span>
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              padding: '14px 22px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                background: currentConfig.accentColor,
                borderColor: currentConfig.accentColor,
                gap: '8px',
                padding: '9px 20px',
                fontWeight: 700
              }}
            >
              <span>{loading ? 'Authenticating...' : `Sign In as ${currentConfig.label}`}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
