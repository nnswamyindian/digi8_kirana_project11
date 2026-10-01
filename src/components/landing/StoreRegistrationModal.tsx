import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, CheckCircle2, Building2, Store, User, Phone, Mail, MapPin, ShieldCheck, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
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
    store_name: '',
    owner_name: '',
    phone: '',
    email: '',
    pin: '',
    business_name: '',
    business_type: 'KIRANA_GROCERY',
    address: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '',
    gst_number: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.store_name.trim() || !formData.owner_name.trim() || !formData.phone.trim()) {
      setErrorMsg('Store Name, Owner Name, and Mobile Number are required.');
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
          maxWidth: '680px',
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>Register Your Grocery Store</h2>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Join 120+ Kiranas & Supermarkets powered by Digi8 SaaS</span>
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
              Application Submitted Successfully!
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
              Your application for <strong style={{ color: '#f8fafc' }}>{submittedData.store_name}</strong> has been received and is currently under review by our onboarding team.
            </p>

            <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: '12px', padding: '16px', maxWidth: '360px', margin: '0 auto 28px auto' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Application Reference</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '1px', marginTop: '4px' }}>
                {submittedData.application_number}
              </div>
              <div style={{ display: 'inline-block', marginTop: '8px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', fontSize: '0.75rem', fontWeight: 700 }}>
                ⏳ STATUS: UNDER REVIEW
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenStatusCheck) onOpenStatusCheck(submittedData.application_number);
                }}
                className="btn btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a', padding: '10px 20px', fontWeight: 700 }}
              >
                <span>Track Application & Pay</span>
                <ArrowRight size={16} />
              </button>

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Store / Shop Name *
                </label>
                <input
                  type="text"
                  name="store_name"
                  value={formData.store_name}
                  onChange={handleChange}
                  placeholder="e.g. Royal Kirana & Superstore"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Patel"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Registered Mobile Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit Mobile (e.g. 9876543210)"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="owner@store.in"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Store Login 4-Digit PIN *
                </label>
                <input
                  type="password"
                  name="pin"
                  maxLength={6}
                  value={formData.pin}
                  onChange={handleChange}
                  placeholder="4-digit security PIN (e.g. 1234)"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Business Category
                </label>
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
                >
                  <option value="KIRANA_GROCERY">Kirana & Grocery Store</option>
                  <option value="SUPERMARKET">Supermarket / Hypermarket</option>
                  <option value="ORGANIC_STORE">Organic & Dry Fruits Store</option>
                  <option value="WHOLESALE_MART">Wholesale Cash & Carry</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Selected Plan
                </label>
                <select
                  name="requested_plan"
                  value={formData.requested_plan}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}
                >
                  <option value="starter">Starter Kirana (₹999 / month)</option>
                  <option value="pro">Professional Supermarket (₹2,499 / month) ⭐ Popular</option>
                  <option value="business">Business Superstore (₹4,999 / month)</option>
                  <option value="enterprise">Enterprise Multi-Store (₹9,999 / month)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  placeholder="e.g. 36AAECR1234F1Z8"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Store Physical Address
              </label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Shop number, street, landmark, area"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
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
                I agree to the <strong style={{ color: 'white' }}>Platform Merchant Terms of Service</strong> and <strong style={{ color: 'white' }}>Privacy Policy</strong>. I understand that our store application will be reviewed by the company team before subscription payment and full platform activation.
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
                    <span>Submit Application</span>
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
