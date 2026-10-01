import React from 'react';
import { StoreProfile } from '../../types';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Scale, Truck } from 'lucide-react';

interface HeroBannerProps {
  store: StoreProfile;
  onShopNow: () => void;
  onExploreLoose: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ store, onShopNow, onExploreLoose }) => {
  return (
    <section className="hero-section">
      <div className="hero-inner">
        <div>
          <div className="hero-badge">
            <Sparkles size={15} />
            <span>Direct Mandi Sourcing • Kirana Wholesale Rates</span>
          </div>

          <h2 className="hero-title">
            Fresh Groceries.<br />
            <span className="highlight">Simple Shopping.</span><br />
            Better Prices.
          </h2>

          <p className="hero-subtitle">
            Order premium Basmati rice, unpolished dals, pure oils, fresh dairy, and daily essentials from your trusted neighborhood store. Guaranteed fast delivery in {store.estimated_delivery_mins}.
          </p>

          <div className="hero-ctas">
            <button className="btn btn-accent btn-lg" onClick={onShopNow}>
              <span>SHOP NOW</span>
              <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-secondary btn-lg"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={onExploreLoose}
            >
              <Scale size={18} />
              <span>Loose Grocery / Per KG</span>
            </button>
          </div>
        </div>

        {/* 4 Feature Highlights */}
        <div className="hero-features-grid">
          <div className="hero-feature-card">
            <div className="hero-feature-icon">
              <Truck size={22} color="#fef08a" />
            </div>
            <div>
              <h4>{store.estimated_delivery_mins} Delivery</h4>
              <p>Lightning fast doorstep delivery in your neighborhood</p>
            </div>
          </div>

          <div className="hero-feature-card">
            <div className="hero-feature-icon">
              <Scale size={22} color="#fef08a" />
            </div>
            <div>
              <h4>Exact Loose Weight</h4>
              <p>Buy exactly what you need (e.g. 250g, 750g, 1.5kg)</p>
            </div>
          </div>

          <div className="hero-feature-card">
            <div className="hero-feature-icon">
              <ShieldCheck size={22} color="#fef08a" />
            </div>
            <div>
              <h4>100% Mandi Fresh</h4>
              <p>Handpicked, unpolished pulses and premium spices</p>
            </div>
          </div>

          <div className="hero-feature-card">
            <div className="hero-feature-icon">
              <Zap size={22} color="#fef08a" />
            </div>
            <div>
              <h4>Instant UPI & Khata</h4>
              <p>Pay smoothly via PhonePe, GPay, Paytm or Cash</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
