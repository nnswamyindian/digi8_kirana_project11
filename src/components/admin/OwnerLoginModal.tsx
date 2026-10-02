import React, { useState } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { X, Lock, Phone, KeyRound, ShieldCheck, ArrowRight, Bike, UserCheck } from 'lucide-react';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialMode?: 'STAFF' | 'DELIVERY' | 'PLATFORM';
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'STAFF'
}) => {
  if (!isOpen) return null;

  const defaultMobile = initialMode === 'DELIVERY' ? '9876543213' : (initialMode === 'PLATFORM' ? '9999999999' : '9876543210');
  const defaultPin = initialMode === 'PLATFORM' ? '9999' : '1234';

  const [mobile, setMobile] = useState(defaultMobile);
  const [pin, setPin] = useState(defaultPin);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const modalTitle = initialMode === 'DELIVERY'
    ? 'Delivery Partner Login'
    : (initialMode === 'PLATFORM' ? 'Digi8 Platform Admin Login' : 'Store Staff & Owner Login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || !pin) {
      setError('Please provide mobile number and PIN/password');
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="var(--primary-700)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{modalTitle}</h3>
          </div>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Access POS billing counter, inventory master, delivery routes, and online order management.
            </p>

            {error && (
              <div style={{ padding: '10px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
                ⚠️ {error}
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label>Mobile Number (Registered)</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '2px 10px', background: 'white' }}>
                <Phone size={16} color="#64748b" />
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{ border: 'none', width: '100%', padding: '8px 10px', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Security PIN / Password</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '2px 10px', background: 'white' }}>
                <KeyRound size={16} color="#64748b" />
                <input
                  type="password"
                  required
                  placeholder="PIN or Password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ border: 'none', width: '100%', padding: '8px 10px', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* Quick Demo Login Preset Buttons */}
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                ⚡ Quick Demo Roles (Click to Switch):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'flex-start', gap: '4px', background: '#eff6ff', borderColor: '#bfdbfe' }}
                  onClick={() => handleQuickFill('9999999999', '9999')}
                >
                  <span>🌐 Platform Admin</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'flex-start', gap: '4px' }}
                  onClick={() => handleQuickFill('9876543210', '1234')}
                >
                  <span>👑 Royal Kirana</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'flex-start', gap: '4px' }}
                  onClick={() => handleQuickFill('9848012345', '1234')}
                >
                  <span>🏪 Fresh Mart Owner</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'flex-start', gap: '4px' }}
                  onClick={() => handleQuickFill('9876543211', '1234')}
                >
                  <span>🛡️ Store Manager</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'flex-start', gap: '4px' }}
                  onClick={() => handleQuickFill('9876543212', '1234')}
                >
                  <span>💵 Cashier</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'flex-start', gap: '4px' }}
                  onClick={() => handleQuickFill('9876543213', '1234')}
                >
                  <Bike size={13} color="#059669" />
                  <span>🛵 Delivery Rider</span>
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ gap: '6px' }} disabled={loading}>
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
