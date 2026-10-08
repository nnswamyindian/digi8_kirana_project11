import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { Warehouse, AlertTriangle, ArrowUpDown, Plus, Minus, Search, CheckCircle2, X, PackagePlus, History } from 'lucide-react';
import { StockReceiveModal } from './StockReceiveModal';
import { StockHistoryModal } from './StockHistoryModal';

export const InventoryManagement: React.FC = () => {
  const [valuation, setValuation] = useState<any | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Adjustment Modal State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'ADD' | 'REMOVE' | 'SET'>('ADD');
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<string>('Physical count reconciliation');

  // Phase 6: Stock Receive & History States
  const [isStockReceiveOpen, setIsStockReceiveOpen] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);

  const loadInventory = async () => {
    try {
      const data = await api.getInventory();
      setValuation(data.valuation);
      setItems(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    try {
      await api.adjustStock({
        product_id: adjustingProduct.id,
        adjustment_type: adjustType,
        quantity: adjustQty,
        reason: adjustReason,
      });
      setAdjustingProduct(null);
      loadInventory();
    } catch (err) {
      alert('Failed to adjust stock: ' + err);
    }
  };

  const filteredItems = items.filter(it => {
    const matchesSearch = it.name.toLowerCase().includes(search.toLowerCase()) ||
                          it.barcode.includes(search) ||
                          (it.category_name && it.category_name.toLowerCase().includes(search.toLowerCase()));

    const isLow = it.stock <= it.min_stock && it.stock > 0;
    const isOut = it.stock <= 0;

    if (filter === 'low') return matchesSearch && isLow;
    if (filter === 'out') return matchesSearch && isOut;
    return matchesSearch;
  });

  return (
    <div>
      {/* Inventory Valuation Header Cards */}
      {valuation && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <Warehouse size={26} />
            </div>
            <div>
              <div className="kpi-title">Total Inventory Cost</div>
              <div className="kpi-value">₹{valuation.total_cost_value.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Across {valuation.total_items} items
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
              ₹
            </div>
            <div>
              <div className="kpi-title">Estimated Retail Value</div>
              <div className="kpi-value">₹{valuation.total_retail_value.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 700 }}>
                Potential Margin: ₹{valuation.potential_gross_margin.toLocaleString('en-IN')} ({valuation.margin_percent}%)
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
              <AlertTriangle size={26} />
            </div>
            <div>
              <div className="kpi-title">Low Stock Alert</div>
              <div className="kpi-value" style={{ color: valuation.low_stock_count > 0 ? '#b45309' : 'inherit' }}>
                {valuation.low_stock_count} Items
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Below reorder threshold
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              ⚠️
            </div>
            <div>
              <div className="kpi-title">Out of Stock</div>
              <div className="kpi-value" style={{ color: valuation.out_of_stock_count > 0 ? '#dc2626' : 'inherit' }}>
                {valuation.out_of_stock_count} Items
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Website disables purchase
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '6px 12px', flex: 1, maxWidth: '400px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search stock by product or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', width: '100%', marginLeft: '8px', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsStockReceiveOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <PackagePlus size={16} />
            <span>Stock Receive (Barcode)</span>
          </button>

          <button
            className={`btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Stock ({items.length})
          </button>
          <button
            className={`btn-sm ${filter === 'low' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('low')}
          >
            Low Stock ({valuation?.low_stock_count || 0})
          </button>
          <button
            className={`btn-sm ${filter === 'out' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('out')}
          >
            Out of Stock ({valuation?.out_of_stock_count || 0})
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Physical Stock</th>
              <th>Reserved (Online)</th>
              <th>Available to Sell</th>
              <th>Reorder Level</th>
              <th>Total Cost Value</th>
              <th>Total Retail Value</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(p => {
              const isLow = p.stock <= p.min_stock && p.stock > 0;
              const isOut = p.stock <= 0;

              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.brand} • {p.unit}
                    </div>
                  </td>
                  <td>{p.category_name}</td>
                  <td>
                    <strong style={{ fontSize: '0.95rem' }}>{p.stock} {p.unit}</strong>
                  </td>
                  <td>
                    {p.reserved_stock > 0 ? (
                      <span style={{ color: '#0284c7', fontWeight: 700 }}>
                        {p.reserved_stock} {p.unit}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>0</span>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: isOut ? '#dc2626' : 'var(--primary-700)' }}>
                      {p.available_stock} {p.unit}
                    </strong>
                  </td>
                  <td>{p.min_stock} {p.unit}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    ₹{Math.round(p.stock * p.purchase_cost).toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                    ₹{Math.round(p.stock * p.selling_price).toLocaleString('en-IN')}
                  </td>
                  <td>
                    {isOut ? (
                      <span className="badge badge-red">Out of Stock</span>
                    ) : isLow ? (
                      <span className="badge badge-amber">Low Stock</span>
                    ) : (
                      <span className="badge badge-green">In Stock</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => {
                          setAdjustingProduct(p);
                          setAdjustQty(10);
                          setAdjustType('ADD');
                        }}
                        style={{ gap: '4px' }}
                      >
                        <ArrowUpDown size={13} />
                        <span>Adjust</span>
                      </button>

                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => setSelectedHistoryProduct(p)}
                        title="View stock history & transactions"
                        style={{ gap: '4px' }}
                      >
                        <History size={13} />
                        <span>History</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="modal-backdrop" onClick={() => setAdjustingProduct(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Stock Adjustment</h3>
              <button className="btn-icon btn-secondary" onClick={() => setAdjustingProduct(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Product:</div>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{adjustingProduct.name}</strong>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Current Physical Stock: <strong>{adjustingProduct.stock} {adjustingProduct.unit}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Adjustment Action</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn ${adjustType === 'ADD' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAdjustType('ADD')}
                    >
                      <Plus size={14} /> Add Stock
                    </button>
                    <button
                      type="button"
                      className={`btn ${adjustType === 'REMOVE' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAdjustType('REMOVE')}
                    >
                      <Minus size={14} /> Remove Stock
                    </button>
                    <button
                      type="button"
                      className={`btn ${adjustType === 'SET' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAdjustType('SET')}
                    >
                      Set Exact
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Quantity ({adjustingProduct.unit})</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label>Reason for Adjustment</label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  >
                    <option value="Physical count reconciliation">Physical count reconciliation</option>
                    <option value="Damaged / Broken goods">Damaged / Broken goods</option>
                    <option value="Expired item write-off">Expired item write-off</option>
                    <option value="Supplier sample / Gift">Supplier sample / Gift</option>
                    <option value="Customer return / Exchange">Customer return / Exchange</option>
                    <option value="Other / Internal use">Other / Internal use</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAdjustingProduct(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHASE 6: STOCK RECEIVE BY BARCODE MODAL */}
      <StockReceiveModal
        isOpen={isStockReceiveOpen}
        onClose={() => setIsStockReceiveOpen(false)}
        products={items}
        onReceiveSuccess={() => loadInventory()}
      />

      {/* PHASE 6: STOCK HISTORY MODAL */}
      <StockHistoryModal
        isOpen={Boolean(selectedHistoryProduct)}
        onClose={() => setSelectedHistoryProduct(null)}
        product={selectedHistoryProduct}
      />
    </div>
  );
};
