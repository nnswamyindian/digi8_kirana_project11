import React, { useState, useEffect } from 'react';
import { PaymentReconciliationData, CashHandoverSession, PaymentTransaction } from '../../types';
import { api } from '../../services/api';
import {
  Banknote, CreditCard, QrCode, RefreshCw, CheckCircle2,
  AlertTriangle, ArrowDownRight, ShieldCheck, Search, Filter,
  RotateCcw, DollarSign, Calendar, FileText, Check, X
} from 'lucide-react';

export const PaymentReconciliation: React.FC = () => {
  const [data, setData] = useState<PaymentReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Handover Modal State
  const [handoverModalAgent, setHandoverModalAgent] = useState<any | null>(null);
  const [receivedCashInput, setReceivedCashInput] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  // Refund Modal State
  const [refundModalTxn, setRefundModalTxn] = useState<PaymentTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');

  const loadReconciliation = async () => {
    setLoading(true);
    try {
      const res = await api.getPaymentReconciliation({
        startDate,
        endDate: endDate ? `${endDate}T23:59:59` : undefined
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load reconciliation data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReconciliation();
  }, [startDate, endDate]);

  // Real-time synchronization
  useEffect(() => {
    const unsub = api.subscribeSSE((event) => {
      if ([
        'order_payment_updated',
        'delivery_cash_collected',
        'cash_handover_completed'
      ].includes(event.type)) {
        loadReconciliation();
      }
    });
    return unsub;
  }, [startDate, endDate]);

  const openHandoverModal = (agent: any) => {
    setHandoverModalAgent(agent);
    setReceivedCashInput(String(agent.pending_cash || 0));
    setHandoverNotes('');
  };

  const handleConfirmHandover = async () => {
    if (!handoverModalAgent) return;
    const received = Number(receivedCashInput);
    if (isNaN(received) || received < 0) {
      alert('Please enter a valid cash received amount');
      return;
    }

    setIsSubmittingHandover(true);
    try {
      const res = await api.confirmCashHandover({
        agent_id: handoverModalAgent.agent_id,
        agent_name: handoverModalAgent.agent_name,
        received_amount: received,
        notes: handoverNotes,
        approved_by: 'Owner Terminal'
      });
      alert(`✓ ${res.message}`);
      setHandoverModalAgent(null);
      await loadReconciliation();
    } catch (err: any) {
      alert('Handover approval failed: ' + err.message);
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundModalTxn) return;
    const amt = Number(refundAmount);
    if (isNaN(amt) || amt <= 0 || amt > refundModalTxn.amount) {
      alert(`Please enter a valid refund amount up to ₹${refundModalTxn.amount}`);
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const res = await api.processRefund({
        order_id: refundModalTxn.order_id,
        amount: amt,
        reason: refundReason || 'Customer requested refund',
        initiated_by: 'Store Owner'
      });
      alert(`✓ ${res.message}`);
      setRefundModalTxn(null);
      await loadReconciliation();
    } catch (err: any) {
      alert('Refund failed: ' + err.message);
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = (data?.recent_transactions || []).filter(t => {
    const matchSearch = !searchQuery.trim() ||
      t.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.provider_payment_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchMethod = filterMethod === 'ALL' || t.method === filterMethod;
    return matchSearch && matchMethod;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header and Date Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Banknote size={24} color="var(--primary-600)" />
            Payment Reconciliation & Doorstep Cash Audit
          </h2>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Complete audit trail across Cash, UPI, Razorpay Gateway, and Delivery Partner Handovers
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card-bg)', border: '1px solid var(--border-light)', padding: '4px 10px', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={14} color="var(--text-muted)" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
            />
          </div>

          <button
            onClick={loadReconciliation}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Collections
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            ₹{(data?.summary.total_collected || 0).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
            Net: ₹{(data?.summary.net_revenue || 0).toFixed(0)}
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Cash Collections
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            ₹{(data?.summary.cash || 0).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            POS & Doorstep Cash
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            UPI & QR Code
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
            ₹{(data?.summary.upi || 0).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Store QR & App Scans
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Razorpay Online
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
            ₹{(data?.summary.razorpay || 0).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Gateway Verified
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Refunds Processed
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            ₹{(data?.summary.refunded || 0).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>
            Deducted from gross
          </div>
        </div>
      </div>

      {/* SECTION 1: DELIVERY AGENT CASH RECONCILIATION & HANDOVER (SECTION 30) */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Delivery Agent Cash Reconciliation & Handover
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Verify and confirm cash collected by delivery partners at customer doorsteps
            </span>
          </div>
        </div>

        {data?.agent_collections && data.agent_collections.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Delivery Partner</th>
                  <th style={{ padding: '10px 12px' }}>Orders Collected</th>
                  <th style={{ padding: '10px 12px' }}>Total Cash Collected</th>
                  <th style={{ padding: '10px 12px' }}>Already Handed Over</th>
                  <th style={{ padding: '10px 12px' }}>Pending Handover</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.agent_collections.map((col) => (
                  <tr key={col.agent_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {col.agent_name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {col.orders_count} orders
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>
                      ₹{col.total_cash.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: 700 }}>
                      ₹{col.handed_over_cash.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontWeight: 800,
                        color: col.pending_cash > 0 ? '#ea580c' : '#10b981',
                        fontSize: '0.95rem'
                      }}>
                        ₹{col.pending_cash.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {col.pending_cash > 0 ? (
                        <button
                          onClick={() => openHandoverModal(col)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                        >
                          <CheckCircle2 size={13} /> Confirm Handover
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                          ✓ Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No doorstep cash collections recorded for the selected period.
          </div>
        )}
      </div>

      {/* SECTION 2: PAYMENT TRANSACTIONS AUDIT TRAIL (SECTION 32 & 35) */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Financial Transactions Audit Log
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Complete ledger of every verified payment, method, provider, and collector
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Search Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', padding: '6px 10px', borderRadius: 'var(--radius-md)' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search Order # or Customer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none' }}
              />
            </div>

            {/* Filter by Method */}
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="RAZORPAY">Razorpay</option>
              <option value="CARD">Card</option>
              <option value="CREDIT">Khata Credit</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>Date & Time</th>
                <th style={{ padding: '10px 12px' }}>Order #</th>
                <th style={{ padding: '10px 12px' }}>Customer</th>
                <th style={{ padding: '10px 12px' }}>Method</th>
                <th style={{ padding: '10px 12px' }}>Provider & Reference</th>
                <th style={{ padding: '10px 12px' }}>Amount</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No payment transactions matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => {
                  const isPaid = txn.status === 'PAID';
                  const isRefunded = ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(txn.status);

                  return (
                    <tr key={txn.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {new Date(txn.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        <span style={{ display: 'block', fontSize: '0.7rem' }}>
                          {new Date(txn.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                        #{txn.order_number || txn.order_id}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{txn.customer_name || 'Counter Customer'}</div>
                        {txn.collected_by && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            by {txn.collected_by}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: txn.method === 'CASH' ? '#ecfdf5' : txn.method === 'UPI' ? '#eff6ff' : txn.method === 'RAZORPAY' ? '#f5f3ff' : '#f8fafc',
                          color: txn.method === 'CASH' ? '#065f46' : txn.method === 'UPI' ? '#1e40af' : txn.method === 'RAZORPAY' ? '#6b21a8' : '#334155'
                        }}>
                          {txn.method}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <div>{txn.provider}</div>
                        {txn.provider_payment_id && (
                          <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#64748b' }}>
                            {txn.provider_payment_id}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 800, color: isRefunded ? '#ef4444' : 'var(--text-main)' }}>
                        {isRefunded ? `-₹${txn.amount.toFixed(2)}` : `₹${txn.amount.toFixed(2)}`}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: isPaid ? '#ecfdf5' : isRefunded ? '#fef2f2' : '#fffbeb',
                          color: isPaid ? '#065f46' : isRefunded ? '#991b1b' : '#b45309'
                        }}>
                          {txn.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {isPaid && (
                          <button
                            onClick={() => {
                              setRefundModalTxn(txn);
                              setRefundAmount(String(txn.amount));
                              setRefundReason('');
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Initiate full or partial refund"
                            style={{ fontSize: '0.725rem', padding: '4px 8px' }}
                          >
                            <RotateCcw size={12} /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM CASH HANDOVER MODAL (SECTION 30) */}
      {handoverModalAgent && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Confirm Doorstep Cash Handover
              </h3>
              <button
                onClick={() => setHandoverModalAgent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Confirm physical cash handover from delivery partner <strong>{handoverModalAgent.agent_name}</strong>.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expected Cash</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  ₹{(handoverModalAgent.pending_cash || 0).toFixed(2)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Difference</div>
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: (Number(receivedCashInput) - handoverModalAgent.pending_cash) === 0 ? '#10b981' : '#ef4444'
                }}>
                  ₹{(Number(receivedCashInput || 0) - handoverModalAgent.pending_cash).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '6px' }}>
                Cash Received (₹) *
              </label>
              <input
                type="number"
                step="any"
                value={receivedCashInput}
                onChange={(e) => setReceivedCashInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '1.1rem',
                  fontWeight: 700
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '6px' }}>
                Handover Notes / Verification Signature
              </label>
              <input
                type="text"
                placeholder="e.g. Verified by owner, exact cash received"
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.825rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setHandoverModalAgent(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={isSubmittingHandover}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {isSubmittingHandover ? 'Processing...' : 'Approve Handover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESS REFUND MODAL (SECTION 33) */}
      {refundModalTxn && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw size={18} /> Initiate Payment Refund
              </h3>
              <button
                onClick={() => setRefundModalTxn(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Order #{refundModalTxn.order_number || refundModalTxn.order_id} • Original Amount: ₹{refundModalTxn.amount.toFixed(2)} ({refundModalTxn.method})
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                Refund Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Max ₹${refundModalTxn.amount}`}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '1.1rem',
                  fontWeight: 700
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                Reason for Refund *
              </label>
              <input
                type="text"
                placeholder="e.g. Customer return, damaged items, cancellation"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRefundModalTxn(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                disabled={isSubmittingRefund}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                {isSubmittingRefund ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
