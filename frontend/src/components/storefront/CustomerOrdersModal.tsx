import React, { useState, useEffect } from 'react';
import { CustomerUser } from '../../types';
import { api } from '../../services/api';
import { X, Package, Clock, CheckCircle2, ChevronRight, MapPin, Receipt, RefreshCw, AlertCircle } from 'lucide-react';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerUser;
  onTrackOrder: (orderId: string) => void;
}

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  customer,
  onTrackOrder
}) => {
  if (!isOpen) return null;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomerOrders();
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to fetch customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [customer]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>✅ Delivered</span>;
      case 'OUT_FOR_DELIVERY':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>🛵 Out for Delivery</span>;
      case 'READY':
      case 'READY_FOR_DELIVERY':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>📦 Packed & Ready</span>;
      case 'PREPARING':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>⏳ Packing Items</span>;
      case 'ACCEPTED':
      case 'NEW':
      default:
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>📋 Confirmed</span>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        className="modal-card"
        style={{ maxWidth: '580px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'var(--primary-700, #15803d)', padding: '16px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>My Orders</h3>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Order history for {customer.name} ({customer.phone})</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px auto' }} />
              <div>Loading your purchases...</div>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Package size={48} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#334155' }}>No Orders Yet</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                You have not placed any orders at this store yet. Browse the catalog and place your first order!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map(ord => (
                <div
                  key={ord.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                        Order #{ord.order_number || ord.id.slice(-6)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{new Date(ord.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(ord.status)}
                    </div>
                  </div>

                  {/* Items summary */}
                  {ord.items && ord.items.length > 0 && (
                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', color: '#475569' }}>
                      {ord.items.slice(0, 3).map((it: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{it.quantity} {it.unit || ''} × {it.product_name}</span>
                          <span style={{ fontWeight: 600 }}>₹{it.total_price}</span>
                        </div>
                      ))}
                      {ord.items.length > 3 && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          + {ord.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Amount: </span>
                      <strong style={{ fontSize: '1rem', color: 'var(--primary-700, #15803d)' }}>₹{ord.total_amount}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '6px' }}>({ord.payment_method})</span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        onClose();
                        onTrackOrder(ord.order_number || ord.id);
                      }}
                    >
                      <span>Track Order</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
