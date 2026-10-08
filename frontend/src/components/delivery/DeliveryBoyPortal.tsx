import React, { useState, useEffect, useRef } from 'react';
import { Order, User, DeliveryCashCollection, CashHandoverSession } from '../../types';
import { api } from '../../services/api';
import {
  Bike, Phone, MapPin, Navigation, Banknote, CheckCircle2,
  Clock, Package, AlertCircle, LogOut, RefreshCw, X, ShieldAlert,
  QrCode, CreditCard, ChevronRight, Check, AlertTriangle, ArrowRight,
  TrendingUp, Calendar, Compass, ShieldCheck, Map
} from 'lucide-react';

interface DeliveryBoyPortalProps {
  currentUser: User;
  onLogout: () => void;
}

export const DeliveryBoyPortal: React.FC<DeliveryBoyPortalProps> = ({
  currentUser,
  onLogout,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'deliveries' | 'cash'>('deliveries');

  // Orders and status
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<'ONLINE' | 'OFFLINE' | 'BUSY'>(
    currentUser.availability_status || 'ONLINE'
  );

  // Doorstep Payment Collection Modal
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentMethodTab, setPaymentMethodTab] = useState<'CASH' | 'UPI' | 'ONLINE'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [dynamicQRData, setDynamicQRData] = useState<any>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  // Failed Delivery Modal
  const [failedModalOrder, setFailedModalOrder] = useState<Order | null>(null);
  const [failedReason, setFailedReason] = useState<string>('CUSTOMER_UNAVAILABLE');
  const [failedNotes, setFailedNotes] = useState<string>('');
  const [isProcessingFailed, setIsProcessingFailed] = useState(false);

  // Cash Handover Summary State
  const [cashSummary, setCashSummary] = useState<{
    total_cash_collected: number;
    pending_handover: number;
    handed_over: number;
    pending_orders_count: number;
    pending_collections: DeliveryCashCollection[];
    recent_handovers: CashHandoverSession[];
  } | null>(null);
  const [loadingCashSummary, setLoadingCashSummary] = useState(false);

  // Active Map View Modal
  const [mapModalOrder, setMapModalOrder] = useState<Order | null>(null);

  // GPS Tracking Watcher
  const watchIdRef = useRef<number | null>(null);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const data = await api.getDeliveryBoyOrders(currentUser.id);
      setOrders(data);
    } catch (err: any) {
      console.error('Failed to load rider deliveries', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCashSummary = async () => {
    setLoadingCashSummary(true);
    try {
      const data = await api.getAgentCashSummary(currentUser.id);
      setCashSummary(data);
    } catch (err) {
      console.error('Failed to load cash summary', err);
    } finally {
      setLoadingCashSummary(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
    loadCashSummary();
  }, [currentUser.id]);

  // Real-time synchronization
  useEffect(() => {
    const unsub = api.subscribeSSE((event) => {
      if ([
        'new_online_order',
        'order_status_updated',
        'order_payment_updated',
        'order_assigned',
        'delivery_cash_collected',
        'cash_handover_completed',
        'delivery_failed'
      ].includes(event.type)) {
        loadDeliveries();
        loadCashSummary();
      }
    });
    return unsub;
  }, [currentUser.id]);

  // Location Tracking Lifecycle: Stream live GPS when there is an active OUT_FOR_DELIVERY order
  useEffect(() => {
    const activeDeliveringOrder = orders.find(o => o.status === 'OUT_FOR_DELIVERY');

    if (activeDeliveringOrder && navigator.geolocation) {
      if (watchIdRef.current === null) {
        console.log('[GPS Tracking Started] for order:', activeDeliveringOrder.order_number);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude, accuracy, speed, heading } = pos.coords;
            api.sendRiderLocation({
              agent_id: String(currentUser.id),
              order_id: activeDeliveringOrder.id,
              latitude,
              longitude,
              accuracy: accuracy || undefined,
              speed: speed || undefined,
              heading: heading || undefined
            }).catch(e => console.warn('[GPS send failed]:', e.message));
          },
          (err) => console.warn('[GPS Geolocation Error]:', err.message),
          { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
        );
      }
    } else {
      if (watchIdRef.current !== null) {
        console.log('[GPS Tracking Stopped]');
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [orders, currentUser.id]);

  const handleToggleAvailability = async (newStatus: 'ONLINE' | 'OFFLINE' | 'BUSY') => {
    try {
      await api.updateUserAvailability(currentUser.id, newStatus);
      setAvailability(newStatus);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await api.updateOrderStatus(orderId, status);
      await loadDeliveries();
    } catch (err: any) {
      alert('Failed to update delivery status: ' + err.message);
    }
  };

  const handleStartDelivery = async (order: Order) => {
    try {
      // 1. Update status to OUT_FOR_DELIVERY
      await handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY');

      // 2. Start tracking session
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await api.startTrackingSession({
            order_id: order.id,
            agent_id: String(currentUser.id),
            agent_name: currentUser.name,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        });
      }
    } catch (err: any) {
      alert('Failed to start delivery: ' + err.message);
    }
  };

  // Open Doorstep Payment Modal
  const openPaymentModal = (order: Order, defaultMethod: 'CASH' | 'UPI' = 'CASH') => {
    setPaymentModalOrder(order);
    setPaymentMethodTab(defaultMethod);
    setCashTendered(order.total_amount ? String(order.total_amount) : '');
    setPaymentNotes('');
    setDynamicQRData(null);
    if (defaultMethod === 'UPI') {
      handleLoadDynamicQR(order);
    }
  };

  // Load Dynamic UPI QR Code
  const handleLoadDynamicQR = async (order: Order) => {
    setLoadingQR(true);
    try {
      const data = await api.getDynamicQR(order.id);
      setDynamicQRData(data);
    } catch (err: any) {
      alert('Could not load UPI QR: ' + err.message);
    } finally {
      setLoadingQR(false);
    }
  };

  // Quick 1-click Mark as Paid for riders
  const handleQuickMarkPaid = async (order: Order, method: 'CASH' | 'UPI' = 'UPI') => {
    try {
      await api.markOrderPaid(order.id, {
        payment_method: method,
        paid_by: currentUser.name,
        amount: order.total_amount,
        notes: `Doorstep ${method} payment verified by delivery partner`
      });
      await loadDeliveries();
      await loadCashSummary();
    } catch (err: any) {
      alert('Failed to mark payment as PAID: ' + err.message);
    }
  };

  // Confirm Doorstep Cash Collection
  const handleConfirmCashCollection = async (andMarkDelivered: boolean = false) => {
    if (!paymentModalOrder) return;
    const tendered = Number(cashTendered);
    const orderTotal = Number(paymentModalOrder.total_amount);

    if (isNaN(tendered) || tendered < orderTotal) {
      alert(`Customer cash given (₹${tendered || 0}) must be at least the order total of ₹${orderTotal}`);
      return;
    }

    setIsProcessingPayment(true);
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch {
          // Fallback if GPS timed out
        }
      }

      const res = await api.recordDoorstepCashCollection({
        order_id: paymentModalOrder.id,
        agent_id: String(currentUser.id),
        agent_name: currentUser.name,
        amount_collected: orderTotal,
        customer_tendered: tendered,
        change_returned: Math.max(0, Math.round((tendered - orderTotal) * 100) / 100),
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        notes: paymentNotes || 'Collected at doorstep by delivery partner'
      });

      if (andMarkDelivered) {
        await api.updateOrderStatus(paymentModalOrder.id, 'DELIVERED');
      }

      alert(`✓ ${res.message}${andMarkDelivered ? ' Order marked DELIVERED.' : ''}`);
      setPaymentModalOrder(null);
      await loadDeliveries();
      await loadCashSummary();
    } catch (err: any) {
      alert('Cash collection failed: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Confirm UPI / QR received
  const handleConfirmUPIPayment = async (andMarkDelivered: boolean = false) => {
    if (!paymentModalOrder) return;
    setIsProcessingPayment(true);
    try {
      await api.markOrderPaid(paymentModalOrder.id, {
        payment_method: 'UPI',
        paid_by: currentUser.name,
        amount: paymentModalOrder.total_amount,
        notes: 'Doorstep UPI payment verified by delivery partner'
      });
      if (andMarkDelivered) {
        await api.updateOrderStatus(paymentModalOrder.id, 'DELIVERED');
      }
      alert(`✓ UPI payment of ₹${paymentModalOrder.total_amount} verified & recorded.${andMarkDelivered ? ' Order marked DELIVERED.' : ''}`);
      setPaymentModalOrder(null);
      await loadDeliveries();
      await loadCashSummary();
    } catch (err: any) {
      alert('UPI payment update failed: ' + err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Mark Order as Delivered
  const handleMarkDelivered = async (order: Order) => {
    // Check payment status
    if (order.payment_status !== 'PAID') {
      const proceed = window.confirm(
        `⚠️ Payment for Order #${order.order_number} is PENDING (₹${Number(order.total_amount || 0).toFixed(2)}).\n\nClick OK to collect payment (Cash or Dynamic UPI QR).\nClick Cancel to go back.`
      );
      if (proceed) {
        openPaymentModal(order, order.payment_method === 'UPI' ? 'UPI' : 'CASH');
      }
      return;
    }

    try {
      await handleUpdateStatus(order.id, 'DELIVERED');
      await loadDeliveries();
      await loadCashSummary();
    } catch (err: any) {
      alert('Failed to update status to DELIVERED: ' + err.message);
    }
  };

  // Record Failed Delivery
  const handleRecordFailure = async () => {
    if (!failedModalOrder) return;
    setIsProcessingFailed(true);
    try {
      await api.recordDeliveryFailure({
        order_id: failedModalOrder.id,
        agent_id: String(currentUser.id),
        agent_name: currentUser.name,
        reason: failedReason,
        notes: failedNotes
      });
      alert('Delivery marked as failed. Store owner has been alerted.');
      setFailedModalOrder(null);
      await loadDeliveries();
    } catch (err: any) {
      alert('Failed to report delivery: ' + err.message);
    } finally {
      setIsProcessingFailed(false);
    }
  };

  const getNavigationUrl = (order: Order) => {
    if (order.latitude && order.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
    }
    const query = encodeURIComponent(`${order.delivery_address || ''} ${order.area || ''} ${order.pincode || ''}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Metrics summary
  const pendingCount = orders.filter((o) => ['ASSIGNED', 'ACCEPTED', 'PREPARING', 'NEW', 'READY'].includes(o.status)).length;
  const outCount = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '70px' }}>
      {/* Rider Header Bar */}
      <header style={{
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-light)',
        padding: '12px 18px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-100)',
            color: 'var(--primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <Bike size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Kirana Delivery Partner • {currentUser.phone || currentUser.mobile}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Availability pill selector */}
          <select
            value={availability}
            onChange={(e) => handleToggleAvailability(e.target.value as any)}
            style={{
              padding: '6px 10px',
              borderRadius: '20px',
              border: '1px solid var(--border-light)',
              fontWeight: 700,
              fontSize: '0.75rem',
              backgroundColor: availability === 'ONLINE' ? '#ecfdf5' : availability === 'BUSY' ? '#fffbeb' : '#f1f5f9',
              color: availability === 'ONLINE' ? '#065f46' : availability === 'BUSY' ? '#b45309' : '#475569',
              cursor: 'pointer'
            }}
          >
            <option value="ONLINE">● Online</option>
            <option value="BUSY">● Busy</option>
            <option value="OFFLINE">○ Offline</option>
          </select>

          <button
            onClick={onLogout}
            title="Logout"
            style={{
              padding: '8px',
              borderRadius: '50%',
              border: '1px solid var(--border-light)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div style={{
        display: 'flex',
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0 16px'
      }}>
        <button
          onClick={() => setActiveTab('deliveries')}
          style={{
            flex: 1,
            padding: '12px 10px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'deliveries' ? '3px solid var(--primary-600)' : '3px solid transparent',
            color: activeTab === 'deliveries' ? 'var(--primary-600)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Package size={17} />
          <span>My Deliveries ({pendingCount + outCount})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('cash');
            loadCashSummary();
          }}
          style={{
            flex: 1,
            padding: '12px 10px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'cash' ? '3px solid var(--primary-600)' : '3px solid transparent',
            color: activeTab === 'cash' ? 'var(--primary-600)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Banknote size={17} />
          <span>Cash & Handover {cashSummary && cashSummary.pending_handover > 0 && `(₹${cashSummary.pending_handover})`}</span>
        </button>
      </div>

      <div style={{ maxWidth: '768px', margin: '0 auto', padding: '16px' }}>
        {/* TAB 1: DELIVERIES */}
        {activeTab === 'deliveries' && (
          <>
            {/* Quick Metrics Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <div style={{
                background: 'var(--card-bg)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                  {outCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Active Transit
                </div>
              </div>

              <div style={{
                background: 'var(--card-bg)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
                  {pendingCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Pending Pick
                </div>
              </div>

              <div style={{
                background: 'var(--card-bg)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                  {deliveredCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Delivered Today
                </div>
              </div>
            </div>

            {/* GPS Live Tracking Banner */}
            {outCount > 0 && (
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
                <div style={{ fontSize: '0.775rem', color: '#065f46', fontWeight: 600 }}>
                  Live GPS location is currently streaming to Store Owner & Customer for your active delivery.
                </div>
              </div>
            )}

            {/* Deliveries List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                <div>Loading your assigned orders...</div>
              </div>
            ) : orders.length === 0 ? (
              <div style={{
                background: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px solid var(--border-light)'
              }}>
                <Package size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                  No Active Deliveries
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>
                  You are all caught up! New customer delivery assignments will appear here automatically with sound alerts.
                </p>
                <button
                  onClick={loadDeliveries}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '16px' }}
                >
                  <RefreshCw size={14} /> Refresh List
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {orders.map((order) => {
                  const isDelivering = order.status === 'OUT_FOR_DELIVERY';
                  const isAssigned = ['ASSIGNED', 'ACCEPTED', 'READY', 'PREPARING'].includes(order.status);
                  const isDelivered = order.status === 'DELIVERED';
                  const isFailed = order.status === 'FAILED';
                  const isPaid = order.payment_status === 'PAID';

                  return (
                    <div
                      key={order.id}
                      style={{
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-lg)',
                        border: isDelivering ? '2px solid var(--primary-500)' : '1px solid var(--border-light)',
                        boxShadow: isDelivering ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Card Header */}
                      <div style={{
                        padding: '12px 16px',
                        background: isDelivering ? '#ecfdf5' : '#f8fafc',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            #{order.order_number}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: isDelivering ? '#10b981' : isDelivered ? '#64748b' : isFailed ? '#ef4444' : '#3b82f6',
                            color: 'white'
                          }}>
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                            ₹{Number(order.total_amount || 0).toFixed(2)}
                          </span>
                          <span style={{
                            display: 'block',
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            color: isPaid ? '#10b981' : '#f59e0b'
                          }}>
                            {isPaid ? '● PAID' : `● ${order.payment_method} PENDING`}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div style={{ padding: '14px 16px' }}>
                        {/* Customer Information */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                              {order.customer_name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              <MapPin size={13} style={{ flexShrink: 0 }} />
                              <span>{order.delivery_address || 'Home Delivery'} {order.area ? `• ${order.area}` : ''} {order.pincode ? `(${order.pincode})` : ''}</span>
                            </div>
                            {order.landmark && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', marginLeft: '17px' }}>
                                Landmark: {order.landmark}
                              </div>
                            )}
                          </div>

                          <a
                            href={`tel:${order.customer_phone}`}
                            className="btn btn-sm btn-secondary"
                            style={{ borderRadius: '20px', padding: '6px 12px', color: 'var(--primary-600)', borderColor: 'var(--primary-200)', flexShrink: 0 }}
                          >
                            <Phone size={13} /> Call
                          </a>
                        </div>

                        {/* Order Items Summary */}
                        {order.items && order.items.length > 0 && (
                          <div style={{
                            background: '#f8fafc',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                            fontSize: '0.75rem',
                            color: '#475569',
                            marginBottom: '12px'
                          }}>
                            <span style={{ fontWeight: 700 }}>Items ({order.items.length}): </span>
                            {order.items.map((it: any, idx: number) => (
                              <span key={idx}>
                                {it.product_name} ({it.quantity} {it.unit})
                                {idx < (order.items?.length || 0) - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons Toolbar */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                          {/* Navigation Button */}
                          <a
                            href={getNavigationUrl(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, minWidth: '110px', fontSize: '0.775rem' }}
                          >
                            <Navigation size={13} /> Maps
                          </a>

                          {/* Workflow Step: Accept -> Start -> Deliver */}
                          {order.status === 'ASSIGNED' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
                              className="btn btn-primary btn-sm"
                              style={{ flex: 2, minWidth: '140px', fontSize: '0.775rem' }}
                            >
                              <Check size={14} /> Accept Order
                            </button>
                          )}

                          {['ACCEPTED', 'READY', 'PREPARING'].includes(order.status) && (
                            <button
                              onClick={() => handleStartDelivery(order)}
                              className="btn btn-primary btn-sm"
                              style={{ flex: 2, minWidth: '140px', fontSize: '0.775rem', background: '#059669' }}
                            >
                              <Bike size={14} /> Start Delivery
                            </button>
                          )}

                          {isDelivering && (
                            <>
                              {/* Collect Payment Options (if unpaid) */}
                              {!isPaid && (
                                <>
                                  <button
                                    onClick={() => openPaymentModal(order, 'UPI')}
                                    className="btn btn-sm"
                                    style={{
                                      flex: 1,
                                      minWidth: '95px',
                                      background: '#2563eb',
                                      color: 'white',
                                      border: 'none',
                                      fontSize: '0.775rem',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px'
                                    }}
                                    title="Show Dynamic Store UPI QR Code"
                                  >
                                    <QrCode size={13} /> UPI QR
                                  </button>

                                  <button
                                    onClick={() => openPaymentModal(order, 'CASH')}
                                    className="btn btn-sm"
                                    style={{
                                      flex: 1,
                                      minWidth: '85px',
                                      background: '#f59e0b',
                                      color: 'white',
                                      border: 'none',
                                      fontSize: '0.775rem',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px'
                                    }}
                                    title="Doorstep Cash Collection"
                                  >
                                    <Banknote size={13} /> Cash
                                  </button>

                                  <button
                                    onClick={() => handleQuickMarkPaid(order, 'UPI')}
                                    className="btn btn-sm btn-secondary"
                                    style={{
                                      color: '#16a34a',
                                      borderColor: '#bbf7d0',
                                      background: '#f0fdf4',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      padding: '4px 8px'
                                    }}
                                    title="Quick 1-click mark as paid"
                                  >
                                    <Check size={13} /> Paid
                                  </button>
                                </>
                              )}

                              {/* Complete Delivery Button */}
                              <button
                                onClick={() => handleMarkDelivered(order)}
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1.5, minWidth: '120px', fontSize: '0.775rem', background: '#10b981', borderColor: '#10b981' }}
                              >
                                <CheckCircle2 size={14} /> Deliver
                              </button>

                              {/* Report Delivery Issue Button */}
                              <button
                                onClick={() => {
                                  setFailedModalOrder(order);
                                  setFailedReason('CUSTOMER_UNAVAILABLE');
                                  setFailedNotes('');
                                }}
                                className="btn btn-secondary btn-sm"
                                title="Report delivery problem"
                                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                              >
                                <AlertTriangle size={13} />
                              </button>
                            </>
                          )}

                          {isDelivered && (
                            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ fontSize: '0.775rem', color: '#10b981', fontWeight: 700 }}>
                                ✓ Delivered Successfully
                              </span>
                              {!isPaid && (
                                <button
                                  onClick={() => openPaymentModal(order, 'UPI')}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    fontSize: '0.725rem',
                                    fontWeight: 700,
                                    padding: '4px 10px'
                                  }}
                                >
                                  <Banknote size={12} /> Settle Unpaid ₹{order.total_amount}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 2: CASH & HANDOVER */}
        {activeTab === 'cash' && (
          <div>
            {/* Cash Summary Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                Today's Cash Collection Summary
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '6px', color: '#38bdf8' }}>
                ₹{(cashSummary?.total_cash_collected || 0).toFixed(2)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Pending Handover:</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>
                    ₹{(cashSummary?.pending_handover || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: '#cbd5e1' }}>
                    {cashSummary?.pending_orders_count || 0} order(s) cash held
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Already Handed Over:</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                    ₹{(cashSummary?.handed_over || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: '#cbd5e1' }}>Approved by owner</div>
                </div>
              </div>
            </div>

            {/* Pending Doorstep Cash Collections */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
              Cash In Hand (Pending Handover)
            </h4>

            {cashSummary && cashSummary.pending_collections.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {cashSummary.pending_collections.map((col) => (
                  <div
                    key={col.id}
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid #fed7aa',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                        Order #{col.order_id}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        Collected at: {new Date(col.collected_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {col.change_returned > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Tendered: ₹{col.customer_tendered} | Change returned: ₹{col.change_returned}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ea580c' }}>
                        ₹{col.amount_collected.toFixed(2)}
                      </div>
                      <span style={{ fontSize: '0.675rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#ffedd5', color: '#c2410c' }}>
                        PENDING HANDOVER
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'var(--card-bg)',
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                border: '1px solid var(--border-light)',
                marginBottom: '24px'
              }}>
                ✓ All collected cash has been handed over to store management.
              </div>
            )}

            {/* Handover History */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
              Handover Approvals History
            </h4>

            {cashSummary && cashSummary.recent_handovers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cashSummary.recent_handovers.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          Received: ₹{h.received_amount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {new Date(h.handover_time).toLocaleString('en-IN')} • Approved by {h.approved_by}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: '#ecfdf5',
                          color: '#065f46'
                        }}>
                          ✓ APPROVED
                        </span>
                        {h.difference !== 0 && (
                          <div style={{ fontSize: '0.7rem', color: h.difference > 0 ? '#10b981' : '#ef4444', fontWeight: 700, marginTop: '2px' }}>
                            Diff: ₹{h.difference}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                No past handover sessions recorded yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* DOORSTEP PAYMENT COLLECTION MODAL (SECTION 8-14)    */}
      {/* ==================================================== */}
      {paymentModalOrder && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px', width: '92%' }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-light)',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Collect Doorstep Payment
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Order #{paymentModalOrder.order_number} • {paymentModalOrder.customer_name}
                </span>
              </div>
              <button
                onClick={() => setPaymentModalOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Order Total Banner */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Order Amount Due
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                ₹{Number(paymentModalOrder.total_amount || 0).toFixed(2)}
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => setPaymentMethodTab('CASH')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentMethodTab === 'CASH' ? '2px solid var(--primary-600)' : '1px solid var(--border-light)',
                  background: paymentMethodTab === 'CASH' ? '#ecfdf5' : 'var(--card-bg)',
                  color: paymentMethodTab === 'CASH' ? 'var(--primary-700)' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Banknote size={16} /> Cash Collection
              </button>

              <button
                onClick={() => {
                  setPaymentMethodTab('UPI');
                  handleLoadDynamicQR(paymentModalOrder);
                }}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentMethodTab === 'UPI' ? '2px solid var(--primary-600)' : '1px solid var(--border-light)',
                  background: paymentMethodTab === 'UPI' ? '#eff6ff' : 'var(--card-bg)',
                  color: paymentMethodTab === 'UPI' ? '#1d4ed8' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={16} /> QR / UPI Scan
              </button>
            </div>

            {/* TAB CONTENT: CASH */}
            {paymentMethodTab === 'CASH' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Cash Received From Customer (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={`Min ₹${paymentModalOrder.total_amount}`}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    marginBottom: '8px'
                  }}
                />

                {/* Quick Cash Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setCashTendered(String(paymentModalOrder.total_amount))}
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1, fontSize: '0.725rem' }}
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered(String(Math.ceil(paymentModalOrder.total_amount / 100) * 100))}
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1, fontSize: '0.725rem' }}
                  >
                    ₹{Math.ceil(paymentModalOrder.total_amount / 100) * 100}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTendered(String(Math.ceil(paymentModalOrder.total_amount / 500) * 500))}
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1, fontSize: '0.725rem' }}
                  >
                    ₹{Math.ceil(paymentModalOrder.total_amount / 500) * 500}
                  </button>
                </div>

                {/* Change Calculation Display */}
                {Number(cashTendered) >= paymentModalOrder.total_amount && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                      Change to Return to Customer:
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d' }}>
                      ₹{(Number(cashTendered) - paymentModalOrder.total_amount).toFixed(2)}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleConfirmCashCollection(false)}
                  disabled={isProcessingPayment || Number(cashTendered) < paymentModalOrder.total_amount}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '11px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    marginBottom: '8px',
                    opacity: Number(cashTendered) < paymentModalOrder.total_amount ? 0.6 : 1
                  }}
                >
                  {isProcessingPayment ? 'Recording...' : `Confirm Cash Collection (₹${paymentModalOrder.total_amount})`}
                </button>

                <button
                  onClick={() => handleConfirmCashCollection(true)}
                  disabled={isProcessingPayment || Number(cashTendered) < paymentModalOrder.total_amount}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '11px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    background: '#059669',
                    borderColor: '#059669',
                    opacity: Number(cashTendered) < paymentModalOrder.total_amount ? 0.6 : 1
                  }}
                >
                  {isProcessingPayment ? 'Processing...' : '🚀 Confirm Cash & Mark Delivered'}
                </button>
              </div>
            )}

            {/* TAB CONTENT: QR / UPI */}
            {paymentMethodTab === 'UPI' && (
              <div style={{ textAlign: 'center' }}>
                {loadingQR ? (
                  <div style={{ padding: '30px' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generating Order UPI QR...</div>
                  </div>
                ) : dynamicQRData?.qr_code_data_url ? (
                  <div>
                    <img
                      src={dynamicQRData.qr_code_data_url}
                      alt="UPI QR Code"
                      style={{
                        width: '210px',
                        height: '210px',
                        margin: '0 auto 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)'
                      }}
                    />

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Scan with Google Pay, PhonePe, Paytm, BHIM
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      UPI ID: {dynamicQRData.upi_id} • Amount: ₹{dynamicQRData.amount}
                    </div>

                    <button
                      onClick={() => handleConfirmUPIPayment(false)}
                      disabled={isProcessingPayment}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '11px', fontSize: '0.9rem', marginBottom: '8px' }}
                    >
                      {isProcessingPayment ? 'Verifying...' : '✓ Confirm UPI Payment Received'}
                    </button>

                    <button
                      onClick={() => handleConfirmUPIPayment(true)}
                      disabled={isProcessingPayment}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '11px', fontSize: '0.9rem', background: '#059669', borderColor: '#059669' }}
                    >
                      {isProcessingPayment ? 'Processing...' : '🚀 Confirm Payment & Mark Delivered'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => handleLoadDynamicQR(paymentModalOrder)}
                      className="btn btn-secondary"
                      style={{ margin: '20px auto' }}
                    >
                      Generate QR Code
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* FAILED DELIVERY REASON MODAL (SECTION 29)             */}
      {/* ==================================================== */}
      {failedModalOrder && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={18} /> Report Failed Delivery
              </h3>
              <button
                onClick={() => setFailedModalOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Please specify why order #{failedModalOrder.order_number} could not be delivered to {failedModalOrder.customer_name}:
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                Reason for Failure
              </label>
              <select
                value={failedReason}
                onChange={(e) => setFailedReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable / Door Locked</option>
                <option value="WRONG_ADDRESS">Wrong Address / Not Found</option>
                <option value="CUSTOMER_REFUSED">Customer Refused Order</option>
                <option value="PAYMENT_ISSUE">Payment Issue / Cash Not Available</option>
                <option value="PHONE_NOT_REACHABLE">Phone Not Reachable / Switched Off</option>
                <option value="OTHER">Other Issue</option>
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                Delivery Partner Notes
              </label>
              <textarea
                rows={3}
                value={failedNotes}
                onChange={(e) => setFailedNotes(e.target.value)}
                placeholder="Called 3 times, neighbor said customer out of station..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.8rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFailedModalOrder(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordFailure}
                disabled={isProcessingFailed}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                {isProcessingFailed ? 'Reporting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
