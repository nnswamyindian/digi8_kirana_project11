import React from 'react';
import { StoreProfile } from '../../types';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Heart } from 'lucide-react';

interface StoreFooterProps {
  store: StoreProfile;
  onOpenOwnerLogin: () => void;
}

export const StoreFooter: React.FC<StoreFooterProps> = ({ store, onOpenOwnerLogin }) => {
  return (
    <footer style={{
      backgroundColor: 'var(--bg-dark)',
      color: '#cbd5e1',
      padding: '48px 24px 24px',
      marginTop: 'auto',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '40px',
        marginBottom: '40px'
      }}>
        {/* Col 1: Store Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem'
            }}>
              🛒
            </div>
            <div>
              <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800 }}>{store.name}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--primary-500)', fontWeight: 700 }}>
                {store.tagline || 'Supermarket & Kirana'}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#94a3b8' }}>
            Serving our local community with handpicked fresh groceries, farm pulses, authentic spices, and daily household supplies at unbeatable kirana rates.
          </p>
        </div>

        {/* Col 2: Store Timings & Delivery */}
        <div>
          <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 800, marginBottom: '16px' }}>
            STORE TIMINGS & DELIVERY
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--primary-500)" />
              <span>{store.operating_days}: {store.opening_time} - {store.closing_time}</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--primary-500)" />
              <span>Free Delivery on orders above ₹{store.free_delivery_above}</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="var(--primary-500)" />
              <span>Serving all neighborhoods within 5 KM radius</span>
            </li>
          </ul>
        </div>

        {/* Col 3: Contact & Address */}
        <div>
          <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 800, marginBottom: '16px' }}>
            VISIT OUR STORE
          </h4>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '10px' }}>
            📍 {store.address}
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
            📞 Phone / WhatsApp: <strong style={{ color: 'white' }}>{store.phone}</strong>
          </p>
          {store.gstin && (
            <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
              GSTIN: <strong>{store.gstin}</strong>
            </p>
          )}
        </div>

        {/* Col 4: Quick Links */}
        <div>
          <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 800, marginBottom: '16px' }}>
            STORE MANAGEMENT
          </h4>
          <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginBottom: '14px' }}>
            Are you the store owner or counter staff?
          </p>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', borderColor: 'rgba(255,255,255,0.2)', color: 'white', background: 'rgba(255,255,255,0.06)' }}
            onClick={onOpenOwnerLogin}
          >
            🏪 Open Owner Dashboard & POS
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.8rem',
        color: '#64748b'
      }}>
        <div>
          © {new Date().getFullYear()} {store.name}. All Rights Reserved.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#94a3b8' }}>
            Designed by{' '}
            <a
              href="https://digi8solutions.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none' }}
              onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Digi8Solutions
            </a>
          </span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Crafted with <Heart size={14} color="#ef4444" fill="#ef4444" /> for Local Commerce
          </span>
        </div>
      </div>
    </footer>
  );
};
