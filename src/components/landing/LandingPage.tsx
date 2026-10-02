import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Store,
  ShoppingCart,
  ShieldCheck,
  Zap,
  CreditCard,
  Navigation,
  Scale,
  Users,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Globe,
  Smartphone,
  ExternalLink,
  Search,
  FileText,
  BadgeCheck,
  Lock
} from 'lucide-react';
import { StoreRegistrationModal } from './StoreRegistrationModal';
import { ApplicationStatusModal } from './ApplicationStatusModal';

interface LandingPageProps {
  onSwitchToStorefront: () => void;
  onOpenStoreLogin: () => void;
  onOpenPlatformAdminLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSwitchToStorefront,
  onOpenStoreLogin,
  onOpenPlatformAdminLogin
}) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('pro');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusIdentifier, setStatusIdentifier] = useState('');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    api.getSubscriptionPlans()
      .then(setPlans)
      .catch(() => {
        // Fallback demo plans
        setPlans([
          {
            id: 'plan_starter',
            name: 'Starter Kirana',
            slug: 'starter',
            description: 'Essential cloud POS and inventory for single-counter neighborhood shops.',
            monthly_price: 999,
            yearly_price: 9990,
            setup_fee: 1499,
            max_products: 1000,
            max_staff: 2,
            max_delivery_agents: 2,
            custom_domain: 0,
            is_popular: 0
          },
          {
            id: 'plan_pro',
            name: 'Professional Supermarket',
            slug: 'pro',
            description: 'Full omnichannel store with custom domain, multi-staff POS, and real-time delivery.',
            monthly_price: 2499,
            yearly_price: 24990,
            setup_fee: 2499,
            max_products: 5000,
            max_staff: 8,
            max_delivery_agents: 6,
            custom_domain: 1,
            is_popular: 1
          },
          {
            id: 'plan_business',
            name: 'Business Superstore',
            slug: 'business',
            description: 'High-volume supermarkets with multi-till checkout, full white-labeling & live radar.',
            monthly_price: 4999,
            yearly_price: 49990,
            setup_fee: 3999,
            max_products: 15000,
            max_staff: 20,
            max_delivery_agents: 15,
            custom_domain: 1,
            is_popular: 0
          },
          {
            id: 'plan_enterprise',
            name: 'Enterprise Multi-Store',
            slug: 'enterprise',
            description: 'Multi-store chains & grocery franchises with custom SLA, dedicated server & ERP sync.',
            monthly_price: 9999,
            yearly_price: 99990,
            setup_fee: 9999,
            max_products: 50000,
            max_staff: 100,
            max_delivery_agents: 50,
            custom_domain: 1,
            is_popular: 0
          }
        ]);
      });
  }, []);

  const handleSelectPlan = (slug: string) => {
    setSelectedPlanSlug(slug);
    setIsRegisterOpen(true);
  };

  const faqs = [
    {
      q: 'Do I need special computers or barcode scanners to use this?',
      a: 'No. The platform runs seamlessly in any web browser, tablet, or PC. It supports any standard USB or Bluetooth barcode scanner, weighing scale, and thermal receipt printer (58mm or 80mm) without special drivers.'
    },
    {
      q: 'How does the store approval process work?',
      a: 'After you submit your store registration, our compliance team reviews your business information within 2-4 hours. Once approved, you receive a notification to settle your plan subscription, which instantly unlocks and activates your store.'
    },
    {
      q: 'Can I connect my own custom domain (e.g. www.royalkirana.com)?',
      a: 'Yes! Stores on the Professional, Business, and Enterprise plans can link their custom domains with automated DNS verification and free 256-bit SSL certificates.'
    },
    {
      q: 'Does POS billing work if our shop internet drops out?',
      a: 'Yes. Our Progressive Web App (PWA) includes offline billing resilience. You can continue scanning items and printing receipts without internet; transactions automatically sync to the cloud once reconnected.'
    },
    {
      q: 'How do customers pay on the online store?',
      a: 'Your store supports Cash on Delivery (COD), dynamic NPCI UPI QR codes directly linked to your store VPA, and Razorpay online payments (Cards, Netbanking, Wallets).'
    }
  ];

  return (
    <div style={{ background: '#020617', color: '#f8fafc', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* 1. TOP ANNOUNCEMENT & NAVBAR */}
      <div style={{ background: 'linear-gradient(90deg, #15803d, #0f766e)', padding: '6px 16px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.02em', color: 'white' }}>
        🚀 Powering 120+ Indian Retailers • White-Label Kirana SaaS with Live Delivery Tracking & Cloud POS • <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setIsRegisterOpen(true)}>Register Your Store Today</span>
      </div>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', background: 'rgba(2, 6, 23, 0.85)', borderBottom: '1px solid #1e293b', padding: '14px 24px' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #16a34a, #0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Digi8 Apna Kirana <span style={{ fontSize: '0.65rem', background: '#16a34a', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>SAAS</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Digi8 Solutions • Enterprise Retail Cloud Platform</div>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }} className="landing-nav">
            <a href="#features" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>Features</a>
            <a href="#how-it-works" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>How It Works</a>
            <a href="#pricing" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>Pricing</a>
            <a href="#faq" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>FAQ</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsStatusModalOpen(true)}
              style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', padding: '7px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Search size={14} />
              <span>Check Status</span>
            </button>

            <button
              onClick={onOpenStoreLogin}
              style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '7px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Store Login
            </button>

            <button
              onClick={() => setIsRegisterOpen(true)}
              className="btn btn-primary"
              style={{ background: '#16a34a', borderColor: '#16a34a', padding: '7px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              <span>Start Your Store</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section style={{ padding: '70px 24px 60px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '920px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(22, 163, 74, 0.12)', border: '1px solid rgba(22, 163, 74, 0.3)', borderRadius: '24px', padding: '6px 14px', marginBottom: '22px', fontSize: '0.82rem', color: '#4ade80', fontWeight: 600 }}>
            <Sparkles size={15} />
            <span>Next-Generation Indian Retail Grocery Cloud</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 20px 0', color: 'white' }}>
            Run Your Grocery Store <br />
            <span style={{ background: 'linear-gradient(135deg, #4ade80, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Smarter, Faster & Everywhere.
            </span>
          </h1>

          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: '720px', margin: '0 auto 32px auto' }}>
            Complete POS billing counter, weighed loose grain pricing, automated inventory, dynamic UPI QR, live rider GPS tracking, and customer Khata — fully white-labeled on your own domain.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #16a34a, #0f766e)', border: 'none', padding: '14px 28px', fontSize: '1rem', fontWeight: 800, borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4)' }}
            >
              <span>Start Your Store Now</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={onSwitchToStorefront}
              className="btn btn-secondary"
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid #334155', color: 'white', padding: '14px 24px', fontSize: '1rem', fontWeight: 700, borderRadius: '10px' }}
            >
              <ExternalLink size={18} />
              <span>Explore Demo Kirana Store</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '14px', padding: '20px' }}>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>120+</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Stores</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80' }}>₹2.8 Cr+</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Monthly GMV</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>&lt; 40s</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Counter Billing</div>
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#facc15' }}>99.98%</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Cloud Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES GRID */}
      <section id="features" style={{ padding: '70px 24px', background: '#0a0f1d', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>
              Engineered for Indian Grocery Operations
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '640px', margin: '0 auto' }}>
              Everything a modern Kirana or multi-store supermarket needs to operate offline and sell online.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '22px' }}>
            {/* Feature 1 */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(22, 163, 74, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Zap size={22} color="#4ade80" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>High-Speed POS Billing</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Scan barcodes with audio feedback, apply cashier discounts up to 5%, trigger Manager PIN approval for larger discounts, and print 58mm/80mm thermal receipts.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Scale size={22} color="#38bdf8" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Loose Items & Weight Scale</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Sell unpolished pulses, rice, flours, and dry fruits by exact weight (250g, 500g, 1.25kg) with instant dynamic price calculations.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <ShoppingCart size={22} color="#facc15" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Customer Online Storefront</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                A modern e-commerce storefront for your customers with live stock indicators, delivery radius verification, and instant cart checkout.
              </p>
            </div>

            {/* Feature 4 */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Navigation size={22} color="#c084fc" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Live Fleet Radar & GPS Tracking</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Assign deliveries to your store riders, watch real-time coordinates, track doorstep cash collections, and approve shift cash handovers.
              </p>
            </div>

            {/* Feature 5 */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <CreditCard size={22} color="#fb7185" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>NPCI Dynamic UPI & Razorpay</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Generate bill-exact UPI QR codes directly encoded with your store VPA, or accept debit/credit cards and netbanking with HMAC security.
              </p>
            </div>

            {/* Feature 6 */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(20, 184, 166, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Globe size={22} color="#2dd4bf" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>White-Label & Custom Domains</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Connect your brand's domain (e.g. <code>www.royalkirana.com</code>) with automated DNS verification and dedicated brand color palettes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (6 STEPS) */}
      <section id="how-it-works" style={{ padding: '70px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simple Onboarding</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', marginTop: '6px' }}>How to Launch in 6 Easy Steps</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', marginBottom: '6px' }}>01</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Register Your Store</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Fill in store name, mobile number, PIN, shop address, and business category.</p>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80', marginBottom: '6px' }}>02</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Company Review & Approval</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Our operations team validates your location details and approves your application.</p>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#facc15', marginBottom: '6px' }}>03</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Choose Your Plan</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Pick the ideal tier: Starter, Professional, Business, or Enterprise.</p>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc', marginBottom: '6px' }}>04</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Make Platform Payment</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Settle your subscription invoice online via Razorpay or direct UPI.</p>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fb7185', marginBottom: '6px' }}>05</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Setup Catalog & Staff</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Add products, configure cashier credentials, and connect your printer.</p>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2dd4bf', marginBottom: '6px' }}>06</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Go Live with Custom Domain</h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Link your own web address and begin billing counter & online sales.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION (DYNAMIC FROM DB) */}
      <section id="pricing" style={{ padding: '70px 24px', background: '#0a0f1d', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transparent SaaS Pricing</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', marginTop: '6px', marginBottom: '12px' }}>
              Choose the Plan for Your Store Scale
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>No hidden transaction commissions. Full feature access.</p>

            {/* Monthly / Yearly Toggle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#1e293b', padding: '4px', borderRadius: '10px', marginTop: '16px', border: '1px solid #334155' }}>
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: billingCycle === 'MONTHLY' ? '#16a34a' : 'transparent', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('YEARLY')}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: billingCycle === 'YEARLY' ? '#16a34a' : 'transparent', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Annual Billing</span>
                <span style={{ fontSize: '0.68rem', background: '#facc15', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>Save 17%</span>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '22px' }}>
            {plans.map(p => {
              const isYearly = billingCycle === 'YEARLY';
              const price = isYearly ? Math.round(p.yearly_price / 12) : p.monthly_price;
              const isPopular = Boolean(p.is_popular || p.slug === 'pro');

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#0f172a',
                    border: isPopular ? '2px solid #16a34a' : '1px solid #1e293b',
                    borderRadius: '16px',
                    padding: '28px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  {isPopular && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#16a34a', color: 'white', fontSize: '0.72rem', fontWeight: 800, padding: '3px 12px', borderRadius: '12px', letterSpacing: '0.05em' }}>
                      MOST POPULAR
                    </div>
                  )}

                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '6px' }}>{p.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', minHeight: '38px', lineHeight: 1.4 }}>{p.description}</p>

                    <div style={{ margin: '20px 0' }}>
                      <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white' }}>₹{price}</span>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}> / month</span>
                      {isYearly && (
                        <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '2px' }}>Billed ₹{p.yearly_price} annually</div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', marginBottom: '24px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>What's Included:</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color="#4ade80" />
                          <span>Up to {p.max_products} Products</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color="#4ade80" />
                          <span>{p.max_staff} Staff / Cashier Accounts</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color="#4ade80" />
                          <span>{p.max_delivery_agents} Delivery Rider Logins</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color="#4ade80" />
                          <span>Full Cloud POS Billing Counter</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color="#4ade80" />
                          <span>Customer Online Storefront</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color="#4ade80" />
                          <span>Live Fleet GPS Radar & Handover</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color={p.custom_domain ? '#4ade80' : '#64748b'} />
                          <span style={!p.custom_domain ? { color: '#64748b', textDecoration: 'line-through' } : {}}>Custom Domain Integration</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(p.slug)}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      background: isPopular ? 'linear-gradient(135deg, #16a34a, #0f766e)' : '#1e293b',
                      borderColor: isPopular ? '#16a34a' : '#334155',
                      padding: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 700
                    }}
                  >
                    <span>Choose {p.name}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section id="faq" style={{ padding: '70px 24px' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>Frequently Asked Questions</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Have questions before getting started? Here are answers to common questions.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, idx) => {
              const isOpen = faqOpenIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                  style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px 20px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0 }}>{faq.q}</h4>
                    <ChevronDown size={18} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </div>
                  {isOpen && (
                    <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, margin: '12px 0 0 0', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer style={{ background: '#0a0f1d', borderTop: '1px solid #1e293b', padding: '40px 24px 30px 24px' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '30px' }}>
          <div style={{ maxWidth: '340px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #16a34a, #0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Store size={18} color="white" />
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>Digi8 Apna Kirana</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
              India's leading retail cloud operating system for Kirana shops, supermarkets, and grocery chains. Built by Digi8 Solutions (Digi8ApnaKirana.com).
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', marginBottom: '12px' }}>Platform Navigation</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => setIsRegisterOpen(true)}>Register Store</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setIsStatusModalOpen(true)}>Application Status</span>
              <span style={{ cursor: 'pointer' }} onClick={onOpenStoreLogin}>Staff & Owner Login</span>
              <span style={{ cursor: 'pointer' }} onClick={onSwitchToStorefront}>Live Customer Store Demo</span>
              <span style={{ cursor: 'pointer', color: '#38bdf8' }} onClick={onOpenPlatformAdminLogin}>Company Control Center</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', marginBottom: '12px' }}>Company & Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
              <span>Email: support@digi8solutions.com</span>
              <span>Phone: +91 99999 99999</span>
              <span>Hostinger VPS Enterprise Infrastructure</span>
              <span>Terms of Service & Privacy Policy</span>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1240px', margin: '30px auto 0 auto', borderTop: '1px solid #1e293b', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '0.78rem', color: '#64748b' }}>
          <div>© 2026 Digi8 Solutions. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Privacy</span>
            <span>Terms</span>
            <span>Security</span>
            <span>Status: All Systems Operational 🟢</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <StoreRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        initialPlanSlug={selectedPlanSlug}
        onOpenStatusCheck={(appNum) => {
          setStatusIdentifier(appNum);
          setIsStatusModalOpen(true);
        }}
      />

      <ApplicationStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        initialIdentifier={statusIdentifier}
        onOpenStoreLogin={onOpenStoreLogin}
      />
    </div>
  );
};
