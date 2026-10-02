import React, { useState, useEffect } from 'react';
import { Product, InventoryTransaction } from '../../types';
import { api } from '../../services/api';
import { History, X, RefreshCw, ArrowUpRight, ArrowDownRight, Package, AlertCircle } from 'lucide-react';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !product) return;
    setIsLoading(true);
    api.getProductStockHistory(product.id)
      .then(res => setTransactions(res))
      .catch(err => console.error('Failed to load stock history:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#10b981',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <History size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Stock History & Audit Trail
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {product.name} • Current Stock: <strong>{product.stock} {product.unit}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              <div>Loading audit trail...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <Package size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No inventory transactions recorded yet.</p>
              <span style={{ fontSize: '0.8rem' }}>Stock receipts, sales, and adjustments will appear here.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {transactions.map((tx) => {
                const isPositive = ['OPENING_STOCK', 'PURCHASE', 'STOCK_RECEIVE', 'RETURN', 'SALE_REVERSAL'].includes(tx.transaction_type) || tx.quantity > 0;
                return (
                  <div
                    key={tx.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: isPositive ? '#dcfce7' : '#fee2e2',
                          color: isPositive ? '#166534' : '#991b1b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {isPositive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                          {tx.transaction_type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          {new Date(tx.created_at).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {tx.created_by ? ` • By ${tx.created_by}` : ''}
                        </div>
                        {tx.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                            "{tx.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: isPositive ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {isPositive ? '+' : ''}{tx.quantity} {tx.unit}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        Balance: <strong>{tx.previous_stock} → {tx.new_stock}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
