import React from 'react';
import { StoreProfile } from '../../types';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Scale, Truck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface HeroBannerProps {
  store: StoreProfile;
  onShopNow: () => void;
  onExploreLoose: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ store, onShopNow, onExploreLoose }) => {
  const { language } = useLanguage();
  const isTe = language === 'te';

  return (
    <section className="hero-section">
      <div className="hero-inner">
        <div>
          <div className="hero-badge">
            <Sparkles size={15} />
            <span>
              {isTe ? 'మార్కెట్ నుంచి నేరుగా • హోల్‌సేల్ కిరాణా ధరలు' : 'Direct Mandi Sourcing • Kirana Wholesale Rates'}
            </span>
          </div>

          <h2 className="hero-title">
            {isTe ? (
              <>
                తాజా సరుకులు.<br />
                <span className="highlight">సులభమైన షాపింగ్.</span><br />
                మరింత సరసమైన ధరలు.
              </>
            ) : (
              <>
                Fresh Groceries.<br />
                <span className="highlight">Simple Shopping.</span><br />
                Better Prices.
              </>
            )}
          </h2>

          <p className="hero-subtitle">
            {isTe 
              ? `ప్రీమియం బాస్మతి బియ్యం, కందిపప్పు, స్వచ్ఛమైన నూనెలు, డెయిరీ మరియు నిత్యావసర సరుకులు మీ విశ్వసనీయ దుకాణం నుంచి ఆర్డర్ చేయండి. ${store.estimated_delivery_mins} నిమిషాల్లో వేగవంతమైన హోమ్ డెలివరీ.`
              : `Order premium Basmati rice, unpolished dals, pure oils, fresh dairy, and daily essentials from your trusted neighborhood store. Guaranteed fast delivery in ${store.estimated_delivery_mins}.`}
          </p>

          <div className="hero-ctas">
            <button className="btn btn-accent btn-lg" onClick={onShopNow}>
              <span>{isTe ? 'సరుకులు కొనండి' : 'SHOP NOW'}</span>
              <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-secondary btn-lg"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={onExploreLoose}
            >
              <Scale size={18} />
              <span>{isTe ? 'వదులు సరుకులు / కేజీ లెక్కన' : 'Loose Grocery / Per KG'}</span>
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
              <h4>{isTe ? `${store.estimated_delivery_mins} డెలివరీ` : `${store.estimated_delivery_mins} Delivery`}</h4>
              <p>{isTe ? 'మీ ఇంటి వద్దకే మెరుపు వేగంతో డెలివరీ' : 'Lightning fast doorstep delivery in your neighborhood'}</p>
            </div>
          </div>

          <div className="hero-feature-card">
            <div className="hero-feature-icon">
              <Scale size={22} color="#fef08a" />
            </div>
            <div>
              <h4>{isTe ? 'ఖచ్చితమైన తూకం' : 'Exact Loose Weight'}</h4>
              <p>{isTe ? 'మీకు కావాల్సినంత మాత్రమే కొనండి (250గ్రా, 750గ్రా, 1.5కిలో)' : 'Buy exactly what you need (e.g. 250g, 750g, 1.5kg)'}</p>
            </div>
          </div>

          <div className="hero-feature-card">
            <div className="hero-feature-icon">
              <ShieldCheck size={22} color="#fef08a" />
            </div>
            <div>
              <h4>{isTe ? '100% స్వచ్ఛమైనవి' : '100% Mandi Fresh'}</h4>
              <p>{isTe ? 'నాణ్యమైన పప్పులు, బియ్యం మరియు మసాలా దినుసులు' : 'Handpicked, unpolished pulses and premium spices'}</p>
            </div>
          </div>

          <div className="hero-feature-card">
            <div className="hero-feature-icon">
              <Zap size={22} color="#fef08a" />
            </div>
            <div>
              <h4>{isTe ? 'తక్షణ UPI & నగదు' : 'Instant UPI & Khata'}</h4>
              <p>{isTe ? 'PhonePe, Google Pay, Paytm లేదా క్యాష్ ఆన్ డెలివరీ' : 'Pay smoothly via PhonePe, GPay, Paytm or Cash'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
