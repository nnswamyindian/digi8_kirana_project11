import React, { useState, useEffect } from 'react';
import { Purchase, Supplier, Product } from '../../types';
import { api } from '../../services/api';
import { Plus, Trash2, Truck, Users, X, ShoppingCart } from 'lucide-react';

interface PurchasesManagementProps {
  products: Product[];
}

export const PurchasesManagement: React.FC<PurchasesManagementProps> = ({ products }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'purchases' | 'suppliers'>('purchases');

  // Purchase Modal State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([]);

  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierCompany, setSupplierCompany] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  const loadData = async () => {
    try {
      const [p, s] = await Promise.all([api.getPurchases(), api.getSuppliers()]);
      setPurchases(p);
      setSuppliers(s);
      if (s.length > 0 && !selectedSupplierId) setSelectedSupplierId(s[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPurchaseModal = () => {
    setInvoiceNo('PUR-' + Math.floor(1000 + Math.random() * 9000));
    setNotes('');
    if (products.length > 0) {
      setPurchaseItems([
        { product_id: products[0].id, quantity: 20, unit_cost: products[0].purchase_cost }
      ]);
    }
    setIsPurchaseModalOpen(true);
  };

  const handleAddPurchaseItemRow = () => {
    if (products.length === 0) return;
    setPurchaseItems(prev => [
      ...prev,
      { product_id: products[0].id, quantity: 10, unit_cost: products[0].purchase_cost }
    ]);
  };

  const handleRemovePurchaseItemRow = (idx: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || purchaseItems.length === 0) {
      alert('Please select a supplier and add at least one item');
      return;
    }

    try {
      await api.createPurchase({
        supplier_id: selectedSupplierId,
        invoice_no: invoiceNo.trim(),
        items: purchaseItems,
        notes: notes.trim(),
      });
      setIsPurchaseModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error recording purchase: ' + err);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    try {
      await api.createSupplier({
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        company: supplierCompany.trim(),
        gstin: supplierGstin.trim(),
        address: supplierAddress.trim(),
      });
      setIsSupplierModalOpen(false);
      setSupplierName('');
      setSupplierPhone('');
      setSupplierCompany('');
      setSupplierGstin('');
      setSupplierAddress('');
      loadData();
    } catch (err) {
      alert('Error creating supplier: ' + err);
    }
  };

  const totalPurchaseCost = purchaseItems.reduce((sum, it) => sum + (it.quantity * it.unit_cost), 0);

  return (
    <div>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn-sm ${activeSubTab === 'purchases' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('purchases')}
          >
            <Truck size={14} />
            <span>Purchases & Stock In ({purchases.length})</span>
          </button>
          <button
            className={`btn-sm ${activeSubTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('suppliers')}
          >
            <Users size={14} />
            <span>Suppliers Directory ({suppliers.length})</span>
          </button>
        </div>

        {activeSubTab === 'purchases' ? (
          <button className="btn btn-primary btn-sm" onClick={handleOpenPurchaseModal}>
            <Plus size={16} />
            <span>+ Record Purchase / Stock In</span>
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setIsSupplierModalOpen(true)}>
            <Plus size={16} />
            <span>+ Add Supplier</span>
          </button>
        )}
      </div>

      {/* Tab 1: Purchases Table */}
      {activeSubTab === 'purchases' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Supplier</th>
                <th>Total Cost</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.invoice_no || 'N/A'}</strong></td>
                  <td>
                    <div><strong>{p.supplier_name || 'Direct Wholesale'}</strong></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.supplier_company}</div>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--primary-700)', fontSize: '1rem' }}>
                    ₹{p.total_cost.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="badge badge-green">{p.payment_status}</span>
                  </td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {p.notes || '-'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Suppliers Table */}
      {activeSubTab === 'suppliers' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Company / Business</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.company || '-'}</td>
                  <td>{s.phone}</td>
                  <td><code>{s.gstin || '-'}</code></td>
                  <td style={{ fontSize: '0.825rem' }}>{s.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Purchase Modal */}
      {isPurchaseModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPurchaseModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Record Purchase & Stock Intake</h3>
              <button className="btn-icon btn-secondary" onClick={() => setIsPurchaseModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePurchase}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Supplier *</label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      required
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.company})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Supplier Invoice No *</label>
                    <input
                      type="text"
                      required
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800 }}>Items Received</label>
                  <button type="button" className="btn-sm btn-secondary" onClick={handleAddPurchaseItemRow}>
                    + Add Item Row
                  </button>
                </div>

                {/* Items Dynamic Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center', background: 'var(--bg-subtle)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
                      <select
                        value={item.product_id}
                        onChange={(e) => {
                          const prod = products.find(p => p.id === e.target.value);
                          setPurchaseItems(prev => prev.map((it, i) => i === idx ? {
                            ...it,
                            product_id: e.target.value,
                            unit_cost: prod ? prod.purchase_cost : it.unit_cost
                          } : it));
                        }}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPurchaseItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                        }}
                      />

                      <input
                        type="number"
                        step="0.5"
                        placeholder="Unit Cost ₹"
                        value={item.unit_cost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPurchaseItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_cost: val } : it));
                        }}
                      />

                      <button
                        type="button"
                        className="btn-icon"
                        style={{ color: '#ef4444', width: '28px', height: '28px' }}
                        onClick={() => handleRemovePurchaseItemRow(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', fontWeight: 800 }}>
                  <span>Total Purchase Bill:</span>
                  <span style={{ color: 'var(--primary-700)', fontSize: '1.15rem' }}>₹{totalPurchaseCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPurchaseModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Bill & Increase Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSupplierModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 Add Supplier / Distributor</h3>
              <button className="btn-icon btn-secondary" onClick={() => setIsSupplierModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Mittal"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Company / Agency Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mittal Grains & Agro Trading"
                    value={supplierCompany}
                    onChange={(e) => setSupplierCompany(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>GSTIN</label>
                  <input
                    type="text"
                    placeholder="09AA..."
                    value={supplierGstin}
                    onChange={(e) => setSupplierGstin(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Mandi / Warehouse Address</label>
                  <textarea
                    rows={2}
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSupplierModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
