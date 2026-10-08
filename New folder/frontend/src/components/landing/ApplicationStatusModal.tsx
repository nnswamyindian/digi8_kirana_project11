import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, Search, CheckCircle2, Clock, AlertCircle, CreditCard, ArrowRight, ShieldCheck, Loader2, Sparkles, Building2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ApplicationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onOpenStoreLogin?: () => void;
}

export const ApplicationStatusModal: React.FC<ApplicationStatusModalProps> = ({
  isOpen,
  onClose,
  initialIdentifier = '',
  onOpenStoreLogin
}) => {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [loading, setLoading] = useState(false);
  const [appDetails, setAppDetails] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setPaymentSuccess(false);

    try {
      const data = await api.getApplicationStatus(identifier.trim());
      setAppDetails(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'No application found for the provided details.');
      setAppDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePayAndActivate = async () => {
    if (!appDetails) return;
    setIsPaying(true);
    try {
      // 1. Call verification/payment endpoint
      const result = await api.verifySubscriptionPayment({
        application_number: appDetails.application_number,
        phone: appDetails.phone,
        payment_id: 'pay_sub_' + Math.random().toString(36).substring(2, 9),
        payment_method: 'RAZORPAY_SUBSCRIPTION'
      });

      setPaymentSuccess(true);
      setAppDetails((prev: any) => ({ ...prev, status: 'ACTIVATED' }));
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch (err: any) {
      alert('Payment processing failed: ' + (err.message || err));
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '16px',
          background: '#0f172a',
          color: 'white',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #1e293b' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: 0 }}>Application Status & Activation</h2>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Check review status, pay platform fee, and activate your store</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Lookup Input */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Enter 10-digit Phone or Application ID (e.g. STORE-100001)"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="btn btn-primary"
              style={{ background: '#0284c7', borderColor: '#0284c7', padding: '10px 18px', fontWeight: 700 }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>Check</span>
            </button>
          </form>

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {appDetails && (
            <div>
              {/* Top Summary Card */}
              <div style={{ background: '#1e293b', borderRadius: '12px', padding: '18px', border: '1px solid #334155', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store Application</span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: '2px 0 4px 0' }}>
                      {appDetails.store_name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      Owner: {appDetails.owner_name} • Phone: {appDetails.phone}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Ref #{appDetails.application_number}</span>
                    <div style={{ marginTop: '4px' }}>
                      {appDetails.status === 'ACTIVATED' ? (
                        <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                          🟢 ACTIVE
                        </span>
                      ) : appDetails.status === 'PAYMENT_PENDING' || appDetails.status === 'APPROVED' ? (
                        <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                          💳 PAYMENT REQUIRED
                        </span>
                      ) : appDetails.status === 'REJECTED' ? (
                        <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                          ❌ REJECTED
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                          ⏳ UNDER REVIEW
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Specific Body */}
              {appDetails.status === 'ACTIVATED' || paymentSuccess ? (
                <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <CheckCircle2 size={32} color="#22c55e" />
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
                    Your Store is Active!
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '400px', margin: '0 auto 20px auto' }}>
                    Your subscription is verified and active. You can now access the full Store Admin & POS Billing counter.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenStoreLogin) onOpenStoreLogin();
                    }}
                    className="btn btn-primary"
                    style={{ background: '#16a34a', borderColor: '#16a34a', padding: '10px 24px', fontWeight: 700 }}
                  >
                    <span>Log In to Store Admin</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : appDetails.status === 'PAYMENT_PENDING' || appDetails.status === 'APPROVED' ? (
                <div>
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0284c7', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, fontSize: '0.95rem' }}>
                      <Sparkles size={18} />
                      <span>Application Approved by Company Team!</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                      {appDetails.review_notes || 'Your store application has passed review. Complete the platform subscription fee below to instantly activate your store.'}
                    </p>
                  </div>

                  {/* Payment Invoice Summary */}
                  <div style={{ background: '#1e293b', borderRadius: '10px', padding: '16px', border: '1px solid #334155', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>
                      SaaS Subscription Breakdown
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                      <span>{appDetails.plan_name} (First Month)</span>
                      <span style={{ fontWeight: 700, color: 'white' }}>₹{appDetails.subscription_amount}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                      <span>One-Time Onboarding & Setup Fee</span>
                      <span style={{ fontWeight: 700, color: 'white' }}>₹{appDetails.setup_fee || 0}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '8px' }}>
                      <span>Subtotal</span>
                      <span>₹{appDetails.total_payable}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                      <span>GST (18%)</span>
                      <span>₹{Math.round(appDetails.total_payable * 0.18 * 100) / 100}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', borderTop: '1px solid #475569', paddingTop: '10px', marginTop: '10px' }}>
                      <span>Total Amount Payable</span>
                      <span>₹{Math.round((appDetails.total_payable * 1.18) * 100) / 100}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePayAndActivate}
                    disabled={isPaying}
                    className="btn btn-primary"
                    style={{ width: '100%', background: 'linear-gradient(135deg, #16a34a, #0f766e)', border: 'none', padding: '12px', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {isPaying ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Verifying & Activating Store...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={18} />
                        <span>Pay ₹{Math.round((appDetails.total_payable * 1.18) * 100) / 100} & Activate Store</span>
                      </>
                    )}
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '8px' }}>
                    🔒 Direct Platform Payment • 256-bit SSL Encrypted • Instant Store Activation
                  </p>
                </div>
              ) : appDetails.status === 'REJECTED' ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700 }}>
                    <AlertCircle size={18} />
                    <span>Application Rejected</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '8px' }}>
                    Reason: {appDetails.review_notes || 'Application did not meet company criteria.'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '10px' }}>
                    Please contact our support team at <strong style={{ color: 'white' }}>support@digi8solutions.com</strong> for assistance or to re-apply.
                  </p>
                </div>
              ) : (
                /* UNDER REVIEW PROGRESS */
                <div>
                  <div style={{ background: '#1e293b', borderRadius: '10px', padding: '18px', border: '1px solid #334155' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '14px' }}>
                      Onboarding Workflow
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>✓</div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>1. Registration Submitted</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Received on {new Date(appDetails.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#eab308', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>⏳</div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#facc15' }}>2. Company Compliance Review</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Our operations team reviews business details & zone coverage</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#475569', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>3. Subscription Payment Request</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Approve plan & settle setup invoice</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#475569', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>4</div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>4. Store Activated & Live</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Access POS, connect domain & start billing</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
