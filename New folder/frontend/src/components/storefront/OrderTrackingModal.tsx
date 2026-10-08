import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { api } from '../../services/api';
import {
  X, Search, Clock, CheckCircle2, PackageCheck, Bike, AlertCircle,
  MapPin, Phone, ShieldCheck, Navigation, Store as StoreIcon, RefreshCw
} from 'lucide-react';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber = '',
}) => {
  if (!isOpen) return null;

  const [orderQuery, setOrderQuery] = useState(initialOrderNumber || 'GR-10245');
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingDetails, setTrackingDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async (orderId: string) => {
    try {
      const details = await api.getTrackingDetails(orderId);
      setTrackingDetails(details);
    } catch {
      // Session may not exist yet if not out for delivery
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderQuery.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const orders = await api.getOrders({ search: orderQuery.trim(), limit: 1 });
      if (orders && orders.length > 0) {
        const found = orders[0];
        setOrder(found);
        await fetchTracking(found.id);
      } else {
        setError('No order found with this Order ID or Phone number.');
        setOrder(null);
        setTrackingDetails(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search order');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      setOrderQuery(initialOrderNumber);
      handleSearch();
    }
  }, [initialOrderNumber]);

  // Real-time synchronization for rider location and order status updates
  useEffect(() => {
    const unsub = api.subscribeSSE((event) => {
      if (!order) return;
      if (event.type === 'rider_location_updated' && event.data?.order_id === order.id) {
        fetchTracking(order.id);
      } else if (['order_status_updated', 'order_payment_updated'].includes(event.type) && event.data?.order_id === order.id) {
        api.getOrderById(order.id).then(setOrder).catch(console.error);
        fetchTracking(order.id);
      }
    });
    return unsub;
  }, [order?.id]);

  const steps = [
    { key: 'NEW', label: 'Confirmed', icon: Clock },
    { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle2 },
    { key: 'PREPARING', label: 'Packing', icon: PackageCheck },
    { key: 'OUT_FOR_DELIVERY', label: 'On The Way', icon: Bike },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
  ];

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    const orderIndex = steps.findIndex(s => s.key === currentStatus);
    const thisIndex = steps.findIndex(s => s.key === stepKey);

    if (currentStatus === 'CANCELLED') return 'cancelled';
    if (currentStatus === 'FAILED') return 'cancelled';
    if (thisIndex < orderIndex || currentStatus === 'DELIVERED') return 'completed';
    if (thisIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📍</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
              Live Order & Delivery Tracking
            </h3>
          </div>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Enter Order ID (e.g. GR-10245) or Mobile"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1.5px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem',
                fontWeight: 600
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ padding: '0 20px' }}>
              {isLoading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
              <span>Track</span>
            </button>
          </form>

          {error && (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '16px' }}>
              <AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              {error}
            </div>
          )}

          {order && (
            <div>
              {/* Order High Level Header */}
              <div style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Order Number
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    #{order.order_number}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {new Date(order.created_at).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${order.status === 'DELIVERED' ? 'badge-green' : order.status === 'OUT_FOR_DELIVERY' ? 'badge-blue' : order.status === 'CANCELLED' ? 'badge-red' : 'badge-amber'}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-700)', marginTop: '4px' }}>
                    ₹{Number(order.total_amount || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: order.payment_status === 'PAID' ? '#10b981' : '#f59e0b' }}>
                    ● {order.payment_status} ({order.payment_method})
                  </div>
                </div>
              </div>

              {/* Status Timeline Stepper */}
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '24px 10px 28px' }}>
                <div style={{
                  position: 'absolute',
                  top: '18px',
                  left: '20px',
                  right: '20px',
                  height: '4px',
                  backgroundColor: 'var(--border-light)',
                  zIndex: 0
                }} />

                {steps.map(step => {
                  const state = getStepStatus(step.key, order.status);
                  const Icon = step.icon;

                  let bgColor = 'var(--card-bg)';
                  let borderColor = 'var(--border-light)';
                  let iconColor = 'var(--text-muted)';

                  if (state === 'completed') {
                    bgColor = 'var(--primary-600)';
                    borderColor = 'var(--primary-600)';
                    iconColor = '#ffffff';
                  } else if (state === 'current') {
                    bgColor = 'var(--primary-100)';
                    borderColor = 'var(--primary-600)';
                    iconColor = 'var(--primary-700)';
                  }

                  return (
                    <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '64px', textAlign: 'center' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: bgColor,
                        border: `2px solid ${borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: iconColor,
                        marginBottom: '6px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.06)'
                      }}>
                        <Icon size={18} />
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: state === 'current' ? 800 : 600, color: state === 'current' ? 'var(--primary-700)' : 'var(--text-muted)' }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* LIVE MAP & RIDER CARD (SECTION 21) */}
              {order.status === 'OUT_FOR_DELIVERY' && (
                <div style={{
                  background: 'linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  {/* Delivery Partner Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                      }}>
                        <Bike size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#065f46' }}>
                          {order.assigned_delivery_boy_name || 'Delivery Partner'} is on the way!
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                          Estimated Arrival: ~{order.estimated_delivery_mins || '15–25 mins'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: '#059669',
                        color: 'white'
                      }}>
                        ● LIVE TRACKING
                      </span>
                    </div>
                  </div>

                  {/* Visual Delivery Route Map Diagram */}
                  <div style={{
                    background: 'white',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    border: '1px solid #d1fae5',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                      {/* Connecting Line */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '40px',
                        right: '40px',
                        height: '3px',
                        background: 'repeating-linear-gradient(to right, #10b981 0, #10b981 6px, transparent 6px, transparent 10px)',
                        zIndex: 0
                      }} />

                      {/* Store Node */}
                      <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                          <StoreIcon size={18} />
                        </div>
                        <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#475569' }}>Kirana Store</span>
                      </div>

                      {/* Agent In-Transit Node with Live Radar Pulse */}
                      <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: '#10b981',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 4px',
                          boxShadow: '0 0 0 6px rgba(16, 185, 129, 0.2)',
                          animation: 'pulse 1.8s infinite'
                        }}>
                          <Bike size={22} />
                        </div>
                        <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#065f46' }}>
                          {order.assigned_delivery_boy_name?.split(' ')[0] || 'Rider'}
                        </span>
                      </div>

                      {/* Customer Node */}
                      <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                          <MapPin size={18} />
                        </div>
                        <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#92400e' }}>Your Doorstep</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} />
                    <span>Contactless OTP or Doorstep payment verification ready upon arrival.</span>
                  </div>
                </div>
              )}

              {/* Delivery Address & Items Card */}
              <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '14px'
              }}>
                <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  DELIVERY DESTINATION
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {order.customer_name} • {order.customer_phone}
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {order.delivery_address || 'Home Delivery'} {order.area ? `• ${order.area}` : ''} {order.pincode ? `(${order.pincode})` : ''}
                </div>
                {order.landmark && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Landmark: {order.landmark}
                  </div>
                )}
              </div>

              {/* Order Status History Timeline */}
              {order.status_history && order.status_history.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
                    Status Timeline Updates
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {order.status_history.map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.775rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-500)', marginTop: '4px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{h.status.replace(/_/g, ' ')}: </span>
                          <span style={{ color: 'var(--text-muted)' }}>{h.notes}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
                          {new Date(h.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
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
