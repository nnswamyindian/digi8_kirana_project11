import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { api } from '../../services/api';
import { Users, Plus, Phone, FileText, CheckCircle2, X, Banknote, Search } from 'lucide-react';

export const CustomersManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [openingCredit, setOpeningCredit] = useState<number>(0);

  // Khata Ledger Modal
  const [activeLedgerCustomer, setActiveLedgerCustomer] = useState<Customer | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      await api.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        credit_balance: openingCredit,
      });
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setOpeningCredit(0);
      loadCustomers();
    } catch (err) {
      alert('Failed to create customer: ' + err);
    }
  };

  const handleOpenLedger = async (cust: Customer) => {
    setActiveLedgerCustomer(cust);
    try {
      const res = await api.getCustomerLedger(cust.id);
      setLedgerEntries(res.ledger);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async (type: 'PAYMENT_RECEIVED' | 'CREDIT_GIVEN') => {
    if (!activeLedgerCustomer || paymentAmount <= 0) return;

    try {
      const res = await api.addCustomerLedgerEntry(
        activeLedgerCustomer.id,
        type,
        paymentAmount,
        paymentNotes || (type === 'PAYMENT_RECEIVED' ? 'Cash/UPI Repayment' : 'Manual Credit Entry')
      );
      alert(type === 'PAYMENT_RECEIVED' ? `Recorded ₹${paymentAmount} repayment. New balance: ₹${res.new_balance}` : `Recorded ₹${paymentAmount} credit. New balance: ₹${res.new_balance}`);
      setPaymentAmount(0);
      setPaymentNotes('');
      // Refresh ledger
      const updated = await api.getCustomerLedger(activeLedgerCustomer.id);
      setActiveLedgerCustomer(updated.customer);
      setLedgerEntries(updated.ledger);
      loadCustomers();
    } catch (err) {
      alert('Error recording ledger transaction: ' + err);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const totalOutstandingCredit = customers.reduce((sum, c) => sum + (c.credit_balance || 0), 0);

  return (
    <div>
      {/* Top Bar with Total Udhar Metric */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <Banknote size={26} />
          </div>
          <div>
            <div className="kpi-title">Total Outstanding Khata (Udhar)</div>
            <div className="kpi-value" style={{ color: '#b91c1c' }}>
              ₹{totalOutstandingCredit.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Across all registered credit customers
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
            <Users size={26} />
          </div>
          <div>
            <div className="kpi-title">Active Customers</div>
            <div className="kpi-value">{customers.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Local buyers with saved accounts
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '6px 12px', flex: 1, maxWidth: '400px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', width: '100%', marginLeft: '8px', fontSize: '0.875rem' }}
          />
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Customer Directory Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone Number</th>
              <th>Address / Flat</th>
              <th>Orders Placed</th>
              <th>Total Spending</th>
              <th>Khata (Credit Due)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} color="var(--primary-700)" />
                    {c.phone}
                  </span>
                </td>
                <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  {c.address || '-'}
                </td>
                <td>{c.orders_count || 0} bills</td>
                <td style={{ fontWeight: 700 }}>
                  ₹{(c.total_spent || 0).toLocaleString('en-IN')}
                </td>
                <td>
                  <strong style={{
                    fontSize: '1rem',
                    color: c.credit_balance > 0 ? '#b91c1c' : '#15803d'
                  }}>
                    ₹{c.credit_balance || 0}
                  </strong>
                </td>
                <td>
                  <button
                    className="btn-sm btn-secondary"
                    onClick={() => handleOpenLedger(c)}
                    style={{ gap: '4px' }}
                  >
                    <FileText size={14} />
                    <span>Khata Ledger</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Add Customer</h3>
              <button className="btn-icon btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9820123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Address / Flat No</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Flat 402, Block B, Royal Palms"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Opening Khata Balance (₹ Udhar)</label>
                  <input
                    type="number"
                    value={openingCredit}
                    onChange={(e) => setOpeningCredit(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Khata Ledger Modal */}
      {activeLedgerCustomer && (
        <div className="modal-backdrop" onClick={() => setActiveLedgerCustomer(null)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>📖 Khata Ledger: {activeLedgerCustomer.name}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ph: {activeLedgerCustomer.phone}</div>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setActiveLedgerCustomer(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Balance Card */}
              <div style={{
                background: activeLedgerCustomer.credit_balance > 0 ? '#fee2e2' : '#f0fdf4',
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Outstanding Balance</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: activeLedgerCustomer.credit_balance > 0 ? '#b91c1c' : '#15803d' }}>
                    ₹{activeLedgerCustomer.credit_balance.toFixed(2)}
                  </div>
                </div>

                {/* Quick Payment Action */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="number"
                      placeholder="Amount ₹"
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      style={{ width: '100px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleRecordPayment('PAYMENT_RECEIVED')}
                    >
                      Receive Payment
                    </button>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => handleRecordPayment('CREDIT_GIVEN')}
                  >
                    + Give More Credit (Udhar)
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '10px' }}>Transaction History</h4>
              <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
                {ledgerEntries.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No ledger entries recorded yet.
                  </div>
                ) : (
                  ledgerEntries.map(entry => (
                    <div key={entry.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-light)',
                      fontSize: '0.85rem'
                    }}>
                      <div>
                        <strong>{entry.type.replace(/_/g, ' ')}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {entry.notes || 'Counter entry'} • {new Date(entry.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: entry.type.includes('PAYMENT') ? '#15803d' : '#b91c1c' }}>
                          {entry.type.includes('PAYMENT') ? `-₹${entry.amount}` : `+₹${entry.amount}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Bal: ₹{entry.balance_after}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveLedgerCustomer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
