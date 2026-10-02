import React, { useState } from 'react';
import { CustomerUser } from '../../types';
import { api } from '../../services/api';
import { X, Lock, Phone, User as UserIcon, Mail, MapPin, ArrowRight, ShieldCheck, ShoppingBag, Eye, EyeOff } from 'lucide-react';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (customer: CustomerUser) => void;
  storeName?: string;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  storeName = 'Apna Kirana'
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('Please provide your 10-digit mobile number and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.customerLogin({ phone: phone.trim(), password: password.trim() });
      onAuthSuccess(res.customer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError('Full Name, Mobile Number, and Password are required.');
      return;
    }

    if (phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.customerRegister({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password: password.trim(),
        address: address.trim()
      });
      onAuthSuccess(res.customer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoCustomer = () => {
    setPhone('9811223344');
    setPassword('1234');
    setError(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        className="modal-card"
        style={{ maxWidth: '440px', width: '100%', borderRadius: '16px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'var(--primary-700, #15803d)', padding: '18px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={18} color="white" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Customer Account</h3>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{storeName} Online Storefront</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light, #e2e8f0)', background: '#f8fafc' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: mode === 'LOGIN' ? 'white' : 'transparent',
              borderBottom: mode === 'LOGIN' ? '2px solid var(--primary-600, #16a34a)' : 'none',
              fontWeight: mode === 'LOGIN' ? 700 : 500,
              color: mode === 'LOGIN' ? 'var(--primary-700, #15803d)' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
            onClick={() => { setMode('LOGIN'); setError(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: mode === 'REGISTER' ? 'white' : 'transparent',
              borderBottom: mode === 'REGISTER' ? '2px solid var(--primary-600, #16a34a)' : 'none',
              fontWeight: mode === 'REGISTER' ? 700 : 500,
              color: mode === 'REGISTER' ? 'var(--primary-700, #15803d)' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
            onClick={() => { setMode('REGISTER'); setError(null); }}
          >
            Create Account
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', marginBottom: '14px' }}>
              ⚠️ {error}
            </div>
          )}

          {mode === 'LOGIN' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Mobile Number (10 Digits)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                  <Phone size={16} color="#94a3b8" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9811223344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ border: 'none', padding: '9px 10px', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Password / PIN</label>
                  <button
                    type="button"
                    onClick={handleQuickDemoCustomer}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ⚡ Demo Fill (Sunita)
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                  <Lock size={16} color="#94a3b8" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ border: 'none', padding: '9px 10px', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ marginTop: '8px', width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, borderRadius: '8px' }}
              >
                <span>{loading ? 'Signing In...' : 'Sign In to Shop'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Your Full Name
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                  <UserIcon size={16} color="#94a3b8" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ border: 'none', padding: '9px 10px', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Mobile Number (For Delivery & OTP)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                  <Phone size={16} color="#94a3b8" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ border: 'none', padding: '9px 10px', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Email Address (Optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                  <Mail size={16} color="#94a3b8" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ border: 'none', padding: '9px 10px', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Default Delivery Address
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                  <MapPin size={16} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Flat / House No, Street, Landmark"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ border: 'none', padding: '9px 10px', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Choose Password
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                  <Lock size={16} color="#94a3b8" />
                  <input
                    type="password"
                    required
                    placeholder="Minimum 4 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ border: 'none', padding: '9px 10px', fontSize: '0.9rem', width: '100%', outline: 'none' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ marginTop: '8px', width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, borderRadius: '8px' }}
              >
                <span>{loading ? 'Creating Account...' : 'Register & Start Shopping'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Customer benefits banner */}
          <div style={{ marginTop: '16px', background: '#f8fafc', borderRadius: '10px', padding: '12px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155' }}>
              <ShieldCheck size={14} color="#16a34a" />
              <span>Customer Account Benefits:</span>
            </div>
            <div>• Real-time delivery status tracking with rider contact</div>
            <div>• Instant re-order from previous purchases</div>
            <div>• Store credit & Khata ledger balance tracking</div>
          </div>
        </div>
      </div>
    </div>
  );
};
