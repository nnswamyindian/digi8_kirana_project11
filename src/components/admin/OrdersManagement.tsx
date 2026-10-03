import React, { useState, useEffect } from 'react';
import { Order, StoreProfile, User } from '../../types';
import { api } from '../../services/api';
import { ReceiptData } from '../../services/hardware';
import {
  Search, Filter, Printer, CheckCircle2, Clock, PackageCheck,
  Bike, XCircle, AlertCircle, Eye, RefreshCw, MapPin, Navigation,
  Banknote, Calendar, Phone, ShieldCheck, ChevronRight, X, RotateCcw
} from 'lucide-react';
import { OrderTrackingModal } from '../storefront/OrderTrackingModal';

interface OrdersManagementProps {
  store: StoreProfile;
  currentUser?: User | null;
  onPrintOrderReceipt: (receiptData: ReceiptData) => void;
}

export const OrdersManagement: React.FC<OrdersManagementProps> = ({
  store,
  currentUser,
  onPrintOrderReceipt,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Delivery boys list for assignment
  const [deliveryBoys, setDeliveryBoys] = useState<User[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');

  // Payment Confirmation Modal state
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Live Tracking Modal State
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string | null>(null);

  // Pickup Verification Modal
  const [pickupVerifyCode, setPickupVerifyCode] = useState('');
  const [pickupVerifyError, setPickupVerifyError] = useState('');
  const [isVerifyingPickup, setIsVerifyingPickup] = useState(false);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      setOrders(data);
      // If drawer is open, refresh selected order details
      if (selectedOrder) {
        const fresh = data.find((o) => o.id === selectedOrder.id);
        if (fresh) setSelectedOrder(fresh);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeliveryBoys = async () => {
    try {
      const users = await api.getUsers();
      setDeliveryBoys(users.filter((u) => u.role === 'DELIVERY_BOY' && u.is_active));
    } catch (err) {
      console.error('Failed to load riders', err);
    }
  };

  useEffect(() => {
    loadOrders();
    loadDeliveryBoys();
  }, [search, statusFilter, typeFilter]);

  // Subscribe to real-time events to auto-refresh order payments & statuses
  useEffect(() => {
    const unsub = api.subscribeSSE((event) => {
      if (['order_created', 'order_status_updated', 'order_payment_updated', 'delivery_assigned'].includes(event.type)) {
        loadOrders();
      }
    });
    return unsub;
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (err) {
      alert('Failed to update status: ' + err);
    }
  };

  const handleAssignDeliveryBoy = async (orderId: string) => {
    if (!selectedRiderId) return;
    const rider = deliveryBoys.find((r) => r.id.toString() === selectedRiderId);
    if (!rider) return;

    try {
      await api.assignDeliveryBoy(orderId, {
        delivery_boy_id: rider.id,
        delivery_boy_name: rider.name,
      });
      alert(`Order assigned to ${rider.name}`);
      setSelectedRiderId('');
      await loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to assign rider');
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentModalOrder) return;
    setIsUpdatingPayment(true);
    try {
      await api.markOrderPaid(paymentModalOrder.id, {
        payment_method: paymentModalOrder.payment_method || 'CASH',
        paid_by: currentUser?.name || 'Store Owner',
        amount: paymentModalOrder.total_amount,
      });
      setPaymentModalOrder(null);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleOpenRefund = (order: Order) => {
    setRefundModalOrder(order);
    setRefundAmount(order.total_amount.toString());
    setRefundReason('Customer requested cancellation / return');
  };

  const handleProcessRefund = async () => {
    if (!refundModalOrder) return;
    const numAmount = parseFloat(refundAmount);
    if (!numAmount || numAmount <= 0 || numAmount > refundModalOrder.total_amount) {
      alert('Please enter a valid refund amount up to ₹' + refundModalOrder.total_amount);
      return;
    }
    setIsSubmittingRefund(true);
    try {
      const res = await api.createRefund({
        payment_transaction_id: refundModalOrder.payment_transaction_id,
        order_id: refundModalOrder.id,
        amount: numAmount,
        reason: refundReason
      });
      alert(res.message || 'Refund successfully processed!');
      setRefundModalOrder(null);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || 'Refund processing failed');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleVerifyPickup = async (orderId: string) => {
    if (!pickupVerifyCode.trim()) return;
    setIsVerifyingPickup(true);
    setPickupVerifyError('');
    try {
      await api.verifyPickup(orderId, pickupVerifyCode.trim());
      setPickupVerifyCode('');
      await loadOrders();
      alert('✓ Pickup code verified! Order marked as DELIVERED.');
    } catch (err: any) {
      setPickupVerifyError(err.message || 'Invalid verification code');
    } finally {
      setIsVerifyingPickup(false);
    }
  };

  const handlePrint = (order: Order) => {
    const receiptData: ReceiptData = {
      store_name: store.name,
      store_tagline: store.tagline,
      address: store.address,
      phone: store.phone,
      gstin: store.gstin,
      invoice_no: order.invoice_number,
      order_no: order.order_number,
      date_time: new Date(order.created_at).toLocaleString('en-IN'),
      cashier: currentUser?.name || 'Online System',
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      items: order.items?.map((it) => ({
        name: it.product_name,
        qty: it.quantity,
        unit: it.unit,
        rate: it.unit_price,
        amount: it.total_price,
      })) || [],
      subtotal: order.subtotal,
      discount: order.discount,
      delivery_charge: order.delivery_charge,
      gst_amount: order.gst_amount,
      total: order.total_amount,
      payment_method: order.payment_method,
      upi_id: store?.upi_id || 'apnakirana@okhdfcbank',
      footer_text: order.delivery_address ? `Delivery Address:\n${order.delivery_address}` : '',
    };

    onPrintOrderReceipt(receiptData);
  };

  const getNavigationUrl = (order: Order) => {
    if (order.latitude && order.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
    }
    const query = encodeURIComponent(`${order.delivery_address || ''} ${order.area || ''} ${order.pincode || ''}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div>
      {/* Top Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '6px 12px', flex: 1, maxWidth: '400px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by order #, phone, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', width: '100%', marginLeft: '8px', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'white', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New Pending Orders</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PREPARING">Preparing / Packing</option>
            <option value="ASSIGNED">Assigned to Rider</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered / Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'white', fontSize: '0.85rem' }}
          >
            <option value="">All Channels</option>
            <option value="POS">Physical POS</option>
            <option value="ONLINE_DELIVERY">Online Home Delivery</option>
            <option value="ONLINE_PICKUP">Online Store Pickup</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={loadOrders}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Orders List Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Channel</th>
              <th>Customer</th>
              <th>Area / PIN</th>
              <th>Total Amount</th>
              <th>Payment Status</th>
              <th>Delivery Rider</th>
              <th>Order Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(o)}>
                <td>
                  <strong style={{ color: 'var(--primary-700)' }}>{o.order_number}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.invoice_number}</div>
                </td>
                <td>
                  <span className={`badge ${o.order_type === 'POS' ? 'badge-blue' : o.order_type === 'ONLINE_DELIVERY' ? 'badge-amber' : 'badge-purple'}`}>
                    {o.order_type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td>
                  <div><strong>{o.customer_name}</strong></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.customer_phone}</div>
                </td>
                <td>
                  {o.area ? (
                    <div>
                      <span style={{ fontWeight: 600 }}>{o.area}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PIN: {o.pincode}</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Store Counter</span>
                  )}
                </td>
                <td style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>
                  ₹{o.total_amount.toFixed(2)}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className={`badge ${o.payment_status === 'PAID' ? 'badge-green' : o.payment_status === 'REFUNDED' ? 'badge-red' : 'badge-yellow'}`}>
                      {o.payment_status}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {o.payment_method}
                    </span>
                    {o.payment_transaction_id && (
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace' }} title={`Txn: ${o.payment_transaction_id}`}>
                        #{o.payment_transaction_id.slice(-8)}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {o.assigned_delivery_boy_name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-800)' }}>
                      <Bike size={14} />
                      <span>{o.assigned_delivery_boy_name}</span>
                    </div>
                  ) : o.order_type === 'ONLINE_DELIVERY' ? (
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>Unassigned</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${o.status === 'NEW' ? 'badge-amber' :
                      o.status === 'DELIVERED' ? 'badge-green' :
                        o.status === 'CANCELLED' ? 'badge-red' :
                          o.status === 'OUT_FOR_DELIVERY' ? 'badge-purple' : 'badge-blue'
                    }`}>
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* View Details Drawer Button */}
                    <button
                      className="btn-icon btn-secondary"
                      onClick={() => setSelectedOrder(o)}
                      title="View Order Details & Map"
                    >
                      <Eye size={15} />
                    </button>

                    {/* Mark as Paid Quick Action for Pending COD */}
                    {o.payment_status === 'PENDING' && (
                      <button
                        className="btn-sm btn-accent"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        onClick={() => setPaymentModalOrder(o)}
                        title="Mark COD Cash Collected"
                      >
                        <Banknote size={12} />
                        <span>Mark Paid</span>
                      </button>
                    )}

                    {/* Quick Refund Action for Paid Orders */}
                    {o.payment_status === 'PAID' && (
                      <button
                        className="btn-icon btn-secondary"
                        style={{ color: '#ef4444' }}
                        onClick={() => handleOpenRefund(o)}
                        title="Initiate Refund"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}

                    {/* Print Packing Slip / Receipt */}
                    <button
                      className="btn-icon btn-secondary"
                      onClick={() => handlePrint(o)}
                      title="Print Bill"
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAILED ORDER DRAWER / MODAL (Requirements 11, 12, 14, 28, 64) */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '780px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    ORDER #{selectedOrder.order_number}
                  </h3>
                  <span className={`badge ${selectedOrder.order_type === 'POS' ? 'badge-blue' : 'badge-amber'}`}>
                    {selectedOrder.order_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Invoice: {selectedOrder.invoice_number} • Placed: {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </div>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setSelectedOrder(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
              {/* Customer & Address Card */}
              <div style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Customer Details
                  </h4>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedOrder.customer_name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--primary-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <Phone size={14} />
                    <a href={`tel:${selectedOrder.customer_phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {selectedOrder.customer_phone}
                    </a>
                  </div>
                  {selectedOrder.notes && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                      Note: "{selectedOrder.notes}"
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Fulfillment & Location
                  </h4>
                  {selectedOrder.delivery_mode === 'PICKUP' ? (
                    <div>
                      <span className="badge badge-purple" style={{ marginBottom: '6px' }}>Store Counter Pickup</span>
                      {selectedOrder.pickup_code && (
                        <div style={{ marginTop: '6px', padding: '6px 10px', background: '#fef3c7', borderRadius: 'var(--radius-sm)', border: '1px dashed #f59e0b', display: 'inline-block' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Pickup Code: </span>
                          <strong style={{ fontSize: '1.1rem', color: '#b45309' }}>{selectedOrder.pickup_code}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                        {selectedOrder.delivery_address || 'No address provided'}
                      </div>
                      {selectedOrder.landmark && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <strong>Landmark:</strong> {selectedOrder.landmark}
                        </div>
                      )}
                      {selectedOrder.area && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <strong>Area:</strong> {selectedOrder.area} (PIN: {selectedOrder.pincode})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Failure Alert Banner if any */}
              {selectedOrder.delivery_failure_reason && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={20} color="#ef4444" />
                  <div>
                    <strong>Delivery Attempt Failed:</strong> {selectedOrder.delivery_failure_reason}
                    {selectedOrder.delivery_notes && (
                      <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '2px' }}>
                        Notes: {selectedOrder.delivery_notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MAP & NAVIGATION VIEW (Requirements 12, 13, 14) */}
              {selectedOrder.order_type === 'ONLINE_DELIVERY' && (
                <div style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px',
                  background: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem' }}>
                      <MapPin size={18} color="var(--primary-600)" />
                      <span>📍 Customer Delivery Location</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '6px' }}
                        onClick={() => setTrackingOrderNumber(selectedOrder.order_number)}
                      >
                        <Bike size={14} color="#059669" />
                        <span>Live Track Rider</span>
                      </button>
                      <a
                        href={getNavigationUrl(selectedOrder)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '6px', textDecoration: 'none' }}
                      >
                        <Navigation size={14} color="#0284c7" />
                        <span>Open Navigation</span>
                      </a>
                    </div>
                  </div>

                  {/* Leaflet/OpenStreetMap embedded iframe if coordinates available */}
                  {selectedOrder.latitude && selectedOrder.longitude ? (
                    <div style={{ height: '200px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <iframe
                        title="Customer Location Map"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedOrder.longitude - 0.005}%2C${selectedOrder.latitude - 0.005}%2C${selectedOrder.longitude + 0.005}%2C${selectedOrder.latitude + 0.005}&layer=mapnik&marker=${selectedOrder.latitude}%2C${selectedOrder.longitude}`}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: '16px', background: '#e2e8f0', borderRadius: 'var(--radius-md)', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>
                      📍 Address mapped to <strong>{selectedOrder.area || selectedOrder.pincode || 'Customer Address'}</strong>.
                      <div style={{ marginTop: '8px' }}>
                        <a
                          href={getNavigationUrl(selectedOrder)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          <Navigation size={14} /> View On Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status & Rider Assignment Control Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px'
              }}>
                {/* Order Status Controller */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    UPDATE ORDER STATUS
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedOrder.status === 'NEW' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'ACCEPTED')}>
                        Accept Order
                      </button>
                    )}
                    {selectedOrder.status === 'ACCEPTED' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}>
                        Start Preparing
                      </button>
                    )}
                    {selectedOrder.status === 'PREPARING' && (
                      <button className="btn btn-accent btn-sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'OUT_FOR_DELIVERY')}>
                        Out for Delivery
                      </button>
                    )}
                    {selectedOrder.status === 'OUT_FOR_DELIVERY' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}>
                        Mark Delivered
                      </button>
                    )}
                    {['NEW', 'ACCEPTED'].includes(selectedOrder.status) && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444' }}
                        onClick={() => {
                          if (window.confirm('Cancel order? Reserved inventory will be returned to stock.')) {
                            handleUpdateStatus(selectedOrder.id, 'CANCELLED');
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Rider Assignment (Requirements 20, 21, 22) */}
                {selectedOrder.order_type === 'ONLINE_DELIVERY' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      ASSIGN DELIVERY RIDER
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}
                      >
                        <option value="">
                          {selectedOrder.assigned_delivery_boy_name ? `Assigned to: ${selectedOrder.assigned_delivery_boy_name}` : 'Select Delivery Rider...'}
                        </option>
                        {deliveryBoys.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.availability_status || 'ONLINE'})
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={!selectedRiderId}
                        onClick={() => handleAssignDeliveryBoy(selectedOrder.id)}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}

                {/* Pickup Order Verification Code Form (Requirement 68) */}
                {selectedOrder.delivery_mode === 'PICKUP' && selectedOrder.status !== 'DELIVERED' && (
                  <div style={{ gridColumn: '1 / -1', background: '#fef3c7', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e', display: 'block', marginBottom: '6px' }}>
                      VERIFY CUSTOMER PICKUP CODE
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="4-digit code"
                        value={pickupVerifyCode}
                        onChange={(e) => setPickupVerifyCode(e.target.value)}
                        style={{ width: '120px', padding: '6px 10px', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '2px', textAlign: 'center' }}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={isVerifyingPickup || pickupVerifyCode.length !== 4}
                        onClick={() => handleVerifyPickup(selectedOrder.id)}
                      >
                        {isVerifyingPickup ? 'Verifying...' : 'Confirm Pickup'}
                      </button>
                      {pickupVerifyError && (
                        <span style={{ color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600 }}>{pickupVerifyError}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items Table */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Ordered Items ({selectedOrder.items?.length || 0})
                </h4>
                <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{it.product_name}</strong>
                          </td>
                          <td>
                            {it.quantity} {it.unit}
                          </td>
                          <td>₹{it.unit_price.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            ₹{it.total_price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill Financials Breakdown */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                maxWidth: '360px',
                marginLeft: 'auto',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                  <span>Subtotal:</span>
                  <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#16a34a', marginBottom: '6px' }}>
                    <span>Discount:</span>
                    <span>-₹{selectedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                  <span>Delivery Charge:</span>
                  <span>{selectedOrder.delivery_charge === 0 ? 'FREE' : `₹${selectedOrder.delivery_charge.toFixed(2)}`}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  color: 'var(--primary-800)',
                  borderTop: '1px dashed var(--border-light)',
                  paddingTop: '8px',
                  marginBottom: '12px'
                }}>
                  <span>Grand Total:</span>
                  <span>₹{selectedOrder.total_amount.toFixed(2)}</span>
                </div>

                {/* Payment Status & Quick Pay Button / Refund Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Payment:</span>
                    <span className={`badge ${selectedOrder.payment_status === 'PAID' ? 'badge-green' : selectedOrder.payment_status === 'REFUNDED' ? 'badge-red' : 'badge-amber'}`}>
                      {selectedOrder.payment_status} ({selectedOrder.payment_method})
                    </span>
                    {selectedOrder.payment_transaction_id && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', fontFamily: 'monospace' }}>
                        Txn: {selectedOrder.payment_transaction_id}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {selectedOrder.payment_status === 'PENDING' && (
                      <button
                        className="btn btn-accent btn-sm"
                        onClick={() => setPaymentModalOrder(selectedOrder)}
                        style={{ gap: '4px' }}
                      >
                        <Banknote size={14} />
                        <span>Mark Paid</span>
                      </button>
                    )}
                    {selectedOrder.payment_status === 'PAID' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444', borderColor: '#fca5a5', gap: '4px' }}
                        onClick={() => handleOpenRefund(selectedOrder)}
                        title="Initiate Partial or Full Refund"
                      >
                        <RotateCcw size={13} />
                        <span>Refund</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)' }}>
              <button className="btn btn-secondary" onClick={() => handlePrint(selectedOrder)} style={{ gap: '6px' }}>
                <Printer size={16} />
                <span>Print Bill</span>
              </button>
              <button className="btn btn-primary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PAYMENT MODAL (Requirement 28) */}
      {paymentModalOrder && (
        <div className="modal-backdrop" onClick={() => setPaymentModalOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Payment Collection</h3>
              <button className="btn-icon btn-secondary" onClick={() => setPaymentModalOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-100)',
                color: 'var(--accent-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Banknote size={32} />
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-800)', margin: '4px 0 8px 0' }}>
                ₹{paymentModalOrder.total_amount.toFixed(2)}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Order #{paymentModalOrder.order_number} • {paymentModalOrder.customer_name}
              </p>

              <div style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                textAlign: 'left',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div><strong>Payment Method:</strong> Cash on Delivery (COD)</div>
                <div><strong>Collected By:</strong> {currentUser?.name || 'Store Staff'}</div>
                <div><strong>Action:</strong> Mark order status as PAID in central database</div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPaymentModalOrder(null)}
                disabled={isUpdatingPayment}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={handleConfirmPayment}
                disabled={isUpdatingPayment}
                style={{ fontWeight: 800 }}
              >
                {isUpdatingPayment ? 'Recording...' : 'CONFIRM PAID'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INITIATE REFUND MODAL (Requirement 33) */}
      {refundModalOrder && (
        <div className="modal-backdrop" onClick={() => setRefundModalOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} color="#ef4444" />
                <h3 style={{ margin: 0 }}>Initiate Refund</h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setRefundModalOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem', color: '#991b1b' }}>
                Refunding <strong>Order #{refundModalOrder.order_number}</strong> ({refundModalOrder.customer_name})
                <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#b91c1c' }}>
                  Original Total: ₹{refundModalOrder.total_amount.toFixed(2)} • Method: {refundModalOrder.payment_method}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Refund Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={refundModalOrder.total_amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Enter full or partial refund amount (Max ₹{refundModalOrder.total_amount})
                </span>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Reason for Refund *</label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Defective item, customer cancellation, wrong address"
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRefundModalOrder(null)}
                disabled={isSubmittingRefund}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleProcessRefund}
                disabled={isSubmittingRefund}
                style={{ fontWeight: 800 }}
              >
                {isSubmittingRefund ? 'Processing...' : 'CONFIRM REFUND'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE ORDER TRACKING MODAL (Requirement 21, 46) */}
      {trackingOrderNumber && (
        <OrderTrackingModal
          isOpen={Boolean(trackingOrderNumber)}
          onClose={() => setTrackingOrderNumber(null)}
          initialOrderNumber={trackingOrderNumber}
        />
      )}
    </div>
  );
};
