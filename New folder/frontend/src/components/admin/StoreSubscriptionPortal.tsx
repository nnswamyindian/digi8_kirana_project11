import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  Calendar,
  Clock,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  Sparkles,
  RefreshCw,
  X,
  Printer
} from 'lucide-react';

export const StoreSubscriptionPortal: React.FC = () => {
  const [data, setData] = useState<{ subscription: any; invoices: any[] } | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [subData, plansData] = await Promise.all([
        api.getStoreSubscription().catch(() => ({ subscription: null, invoices: [] })),
        api.getSubscriptionPlans().catch(() => [])
      ]);
      setData(subData);
      setPlans(plansData);
      if (subData?.subscription?.plan_id) {
        setSelectedPlanId(subData.subscription.plan_id);
      }
    } catch (err: any) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handlePayRenewal = async () => {
    if (!data?.subscription) return;
    setIsProcessingPayment(true);
    setActionMessage(null);
    try {
      // Mock / Real payment order
      const orderRes = await api.createSubscriptionPaymentOrder({
        application_number: data.subscription.tenant_id,
        billing_cycle: data.subscription.billing_cycle || 'MONTHLY'
      });

      // Verify payment
      await api.verifySubscriptionPayment({
        application_number: data.subscription.tenant_id,
        payment_id: `pay_mock_${Date.now()}`
      });

      setActionMessage({ type: 'success', text: 'Subscription renewed successfully! Your store is active.' });
      setIsUpgradeOpen(false);
      await fetchPortalData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Payment failed' });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const currentSub = data?.subscription;
  const currentPlan = plans.find(p => p.id === currentSub?.plan_id) || {
    name: currentSub?.plan_name || 'Professional Supermarket',
    monthly_price: currentSub?.amount || 2499,
    yearly_price: 24990,
    max_products: 5000,
    max_staff: 8,
    max_delivery_agents: 6,
    custom_domain: 1,
    delivery_tracking: 1,
    advanced_reports: 1
  };

  const isExpired = currentSub?.status === 'EXPIRED';
  const isPending = currentSub?.status === 'PAYMENT_PENDING';
  const isActive = currentSub?.status === 'ACTIVE' || (!currentSub && true);

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Zap size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Subscription & Platform Billing
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Manage your store's SaaS subscription, plan features, invoices, and renewal schedule.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchPortalData}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsUpgradeOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={14} />
            <span>Upgrade / Renew Plan</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.9rem',
          background: actionMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: actionMessage.type === 'success' ? '#166534' : '#991b1b'
        }}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '28px',
        color: 'white',
        marginBottom: '28px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#10b981' }}>
              Current Plan
            </span>
            <span style={{
              background: isActive ? 'rgba(16, 185, 129, 0.2)' : isPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: isActive ? '#34d399' : isPending ? '#fbbf24' : '#f87171',
              border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.4)' : isPending ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              padding: '2px 10px',
              borderRadius: '20px',
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              {currentSub?.status || 'ACTIVE'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px 0', color: 'white' }}>
            {currentPlan.name}
          </h2>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#38bdf8' }}>
            ₹{currentPlan.monthly_price?.toLocaleString('en-IN')}{' '}
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>/ month</span>
          </div>
        </div>

        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.825rem', marginBottom: '4px' }}>
            <Calendar size={14} />
            <span>Next Billing Date</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>
            {currentSub?.end_date ? new Date(currentSub.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '01 Oct 2027'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '4px', fontWeight: 600 }}>
            {currentSub?.billing_cycle === 'YEARLY' ? 'Annual Billing Cycle' : 'Monthly Recurring Billing'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => setIsUpgradeOpen(true)}
            className="btn"
            style={{
              background: '#10b981',
              color: 'white',
              fontWeight: 700,
              padding: '12px 20px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Renew / Upgrade Subscription</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* Quotas & Limits Grid */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
        Plan Capacity & Features
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Products Capacity</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {currentPlan.max_products?.toLocaleString('en-IN') || 'Unlimited'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Included in Plan</span>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Staff Accounts</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {currentPlan.max_staff || 8} Logins
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Role-Based Access</span>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Delivery Fleet</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {currentPlan.max_delivery_agents || 6} Riders
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Live GPS Radar</span>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Custom Domain</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: currentPlan.custom_domain ? '#10b981' : '#64748b', margin: '4px 0' }}>
            {currentPlan.custom_domain ? 'Enabled' : 'Not Included'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Full White-Labeling</span>
        </div>
      </div>

      {/* Platform Invoices History */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
              SaaS Billing History & Invoices
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Official tax invoices issued by platform company for software subscriptions.
            </p>
          </div>
          <Receipt size={20} color="#64748b" />
        </div>

        {(!data?.invoices || data.invoices.length === 0) ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
            <Receipt size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No subscription invoices generated yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Invoice #</th>
                  <th style={{ padding: '12px 18px' }}>Billing Period</th>
                  <th style={{ padding: '12px 18px' }}>Plan</th>
                  <th style={{ padding: '12px 18px' }}>Amount</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#64748b' }}>
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: '#334155' }}>
                      {currentPlan.name}
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0f172a' }}>
                      ₹{inv.total_amount?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{
                        background: inv.status === 'PAID' ? '#ecfdf5' : '#fffbeb',
                        color: inv.status === 'PAID' ? '#059669' : '#d97706',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        <Download size={12} />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade / Renew Modal */}
      {isUpgradeOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            padding: '28px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={24} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Renew or Upgrade Plan
                </h3>
              </div>
              <button
                onClick={() => setIsUpgradeOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cycle Selector */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '10px', display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedBillingCycle('MONTHLY')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedBillingCycle === 'MONTHLY' ? 'white' : 'transparent',
                    color: selectedBillingCycle === 'MONTHLY' ? '#0f172a' : '#64748b',
                    boxShadow: selectedBillingCycle === 'MONTHLY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBillingCycle('YEARLY')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedBillingCycle === 'YEARLY' ? 'white' : 'transparent',
                    color: selectedBillingCycle === 'YEARLY' ? '#0f172a' : '#64748b',
                    boxShadow: selectedBillingCycle === 'YEARLY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Yearly (Save ~17%)
                </button>
              </div>
            </div>

            {/* Plan selection list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {plans.map(p => {
                const isSelected = selectedPlanId === p.id;
                const price = selectedBillingCycle === 'YEARLY' ? p.yearly_price : p.monthly_price;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    style={{
                      border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      padding: '16px',
                      cursor: 'pointer',
                      background: isSelected ? '#f0fdf4' : 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        {p.max_products?.toLocaleString()} Products • {p.max_staff} Staff • {p.custom_domain ? 'Custom Domain' : 'Subdomain'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{price?.toLocaleString('en-IN')}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {selectedBillingCycle === 'YEARLY' ? '/ year' : '/ month'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsUpgradeOpen(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayRenewal}
                disabled={isProcessingPayment}
                className="btn btn-primary"
                style={{ flex: 2, padding: '12px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isProcessingPayment ? <RefreshCw size={16} className="animate-spin" /> : <CreditCard size={16} />}
                <span>Proceed to Pay & Activate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice View Modal */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  DIGI8 SOLUTIONS PVT LTD
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  Cloud Grocery Platform & SaaS Operations
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}>
                  TAX INVOICE - PAID
                </span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                  #{selectedInvoice.invoice_number}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Billed To:</span>
                <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>Your Kirana Store</div>
                <div style={{ color: '#64748b' }}>Store ID: {selectedInvoice.tenant_id}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Invoice Details:</span>
                <div style={{ color: '#64748b', marginTop: '2px' }}>Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}</div>
                <div style={{ color: '#64748b' }}>Status: {selectedInvoice.status}</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: '#334155' }}>Platform SaaS Subscription</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{selectedInvoice.subtotal?.toLocaleString('en-IN') || selectedInvoice.total_amount?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', fontSize: '1rem', fontWeight: 800 }}>
                <span style={{ color: '#0f172a' }}>Total Amount Paid</span>
                <span style={{ color: '#10b981' }}>₹{selectedInvoice.total_amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', borderRadius: '8px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
