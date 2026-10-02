import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, CheckCircle2, Building2, Store, User, Phone, Mail, MapPin, ShieldCheck, Sparkles, ArrowRight, Loader2, Globe, Clock, Truck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StoreRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanSlug?: string;
  onOpenStatusCheck?: (appNum: string) => void;
}

export const StoreRegistrationModal: React.FC<StoreRegistrationModalProps> = ({
  isOpen,
  onClose,
  initialPlanSlug = 'pro',
  onOpenStatusCheck
}) => {
  const [formData, setFormData] = useState({
    // Store Owner
    owner_name: '',
    phone: '',
    email: '',
    pin: '',

    // Store Info
    store_name: '',
    business_name: '',
    address: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '',
    country: 'India',

    // Business Info
    gst_number: '',
    pan_number: '',
    business_type: 'KIRANA_GROCERY',
    store_category: 'Kirana & Supermarket',

    // Contact & Initial Config
    whatsapp_number: '',
    currency: '₹',
    timezone: 'Asia/Kolkata',
    delivery_available: true,
    pickup_available: true,
    requested_plan: initialPlanSlug,
    terms_accepted: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    application_number: string;
    store_name: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name: 'delivery_available' | 'pickup_available') => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.store_name.trim() || !formData.owner_name.trim() || !formData.phone.trim() || !formData.pin.trim()) {
      setErrorMsg('Store Name, Owner Name, Mobile Number, and Security PIN are required.');
      return;
    }

    if (formData.phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!formData.terms_accepted) {
      setErrorMsg('You must agree to the Platform Terms & Conditions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitStoreApplication(formData);
      setSubmittedData({
        application_number: res.application_number,
        store_name: formData.store_name
      });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '740px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '16px',
          background: '#0f172a',
          color: 'white',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #16a34a, #0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>Register Your Kirana Store</h2>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Digi8 Apna Kirana • Multi-Tenant SaaS Platform</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {submittedData ? (
          /* Success Screen */
          <div style={{ padding: '36px 28px', textAlign: 'center' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.15)', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
              <CheckCircle2 size={38} color="#22c55e" />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
              Your store registration has been submitted successfully!
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
              Your application for <strong style={{ color: '#f8fafc' }}>{submittedData.store_name}</strong> has been received with status <span style={{ color: '#f59e0b', fontWeight: 700 }}>PENDING APPROVAL</span>. Digi8 Solutions will review and approve your store.
            </p>

            <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: '12px', padding: '16px', maxWidth: '360px', margin: '0 auto 28px auto' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Application Reference ID</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '1px', marginTop: '4px' }}>
                {submittedData.application_number}
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.6)', borderRadius: '10px', padding: '14px', maxWidth: '460px', margin: '0 auto 24px auto', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'left', lineHeight: 1.6 }}>
              <strong style={{ color: 'white' }}>Next Steps:</strong>
              <div>1. Application Review by Digi8 Solutions (2-4 hours)</div>
              <div>2. Subscription Payment Generation upon Approval</div>
              <div>3. Instant Store Activation & Dashboard Access</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {onOpenStatusCheck && (
                <button
                  onClick={() => onOpenStatusCheck(submittedData.application_number)}
                  className="btn btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7', padding: '10px 20px', fontWeight: 700 }}
                >
                  Track Application Status
                </button>
              )}
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ background: '#334155', color: 'white', border: 'none', padding: '10px 20px' }}
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          /* Application Form */
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* SECTION 1: STORE OWNER */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} />
                <span>1. Store Owner Information</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh Patel"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit Mobile"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="owner@store.in"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Login PIN / Password *
                  </label>
                  <input
                    type="password"
                    name="pin"
                    value={formData.pin}
                    onChange={handleChange}
                    placeholder="4-6 digit PIN (e.g. 1234)"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: STORE INFORMATION */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Store size={15} />
                <span>2. Store & Address Details</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Store / Display Name *
                  </label>
                  <input
                    type="text"
                    name="store_name"
                    value={formData.store_name}
                    onChange={handleChange}
                    placeholder="e.g. Royal Kirana & Superstore"
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Registered Business Name
                  </label>
                  <input
                    type="text"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    placeholder="Legal Entity Name"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Store Physical Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Shop number, street, landmark, market area"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>PIN Code</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="500081"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: BUSINESS & CONTACT INFO */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} />
                <span>3. Business Information & Identifiers</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleChange}
                    placeholder="e.g. 36AAECR1234F1Z8"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    PAN Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="pan_number"
                    value={formData.pan_number}
                    onChange={handleChange}
                    placeholder="e.g. ABCDE1234F"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    WhatsApp Business Number
                  </label>
                  <input
                    type="tel"
                    name="whatsapp_number"
                    value={formData.whatsapp_number}
                    onChange={handleChange}
                    placeholder="e.g. 9876543210"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Store Category
                  </label>
                  <select
                    name="store_category"
                    value={formData.store_category}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  >
                    <option value="Kirana & Supermarket">Kirana & Supermarket</option>
                    <option value="Daily Provisions & Dal-Rice">Daily Provisions & Dal-Rice</option>
                    <option value="Organic Groceries & Dry Fruits">Organic Groceries & Dry Fruits</option>
                    <option value="Wholesale Mandi Distributor">Wholesale Mandi Distributor</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 4: INITIAL CONFIGURATION & PLAN */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} />
                <span>4. Initial Configuration & Subscription Plan</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Requested Plan
                  </label>
                  <select
                    name="requested_plan"
                    value={formData.requested_plan}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    <option value="starter">Starter Kirana (₹999 / mo)</option>
                    <option value="pro">Professional Supermarket (₹2,499 / mo) ⭐</option>
                    <option value="business">Business Superstore (₹4,999 / mo)</option>
                    <option value="enterprise">Enterprise Multi-Store (₹9,999 / mo)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Store Timezone
                  </label>
                  <input
                    type="text"
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Delivery and Pickup Toggles */}
              <div style={{ display: 'flex', gap: '20px', background: '#1e293b', padding: '10px 14px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={formData.delivery_available}
                    onChange={() => handleToggle('delivery_available')}
                  />
                  <span>Enable Home Delivery Service</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={formData.pickup_available}
                    onChange={() => handleToggle('pickup_available')}
                  />
                  <span>Enable Store Counter Pickup</span>
                </label>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <input
                type="checkbox"
                id="terms"
                checked={formData.terms_accepted}
                onChange={e => setFormData(p => ({ ...p, terms_accepted: e.target.checked }))}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer', lineHeight: 1.4 }}>
                I agree to the <strong style={{ color: 'white' }}>Digi8 Solutions Merchant Terms of Service</strong> and <strong style={{ color: 'white' }}>Privacy Policy</strong>. I understand that our store application will be reviewed by Digi8 Solutions before subscription payment and activation.
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ background: '#334155', color: 'white', border: 'none', padding: '9px 18px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a', padding: '9px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Store Application</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
