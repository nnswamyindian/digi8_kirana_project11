import React, { useState, useEffect } from 'react';
import { mobileApi } from '../services/mobileApi';
import { mobileLocation } from '../services/mobileLocation';

export const DeliveryAgentAppScreen: React.FC = () => {
  const [rider, setRider] = useState<{ id: string; name: string; phone: string } | null>({
    id: 'user_boy_1',
    name: 'Suresh Kumar (Rider)',
    phone: '9848011223'
  });
  const [assignedOrders, setAssignedOrders] = useState<any[]>([
    {
      id: 'order_10245',
      order_number: 'GR-10245',
      customer_name: 'Ananya Sharma',
      customer_phone: '9876500001',
      delivery_address: 'Flat 402, Green Valley Apts, Madhapur, Hyderabad',
      total_amount: 650,
      payment_method: 'COD',
      payment_status: 'PENDING',
      status: 'OUT_FOR_DELIVERY'
    }
  ]);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [cashCollectedModal, setCashCollectedModal] = useState<any | null>(null);
  const [cashAmountInput, setCashAmountInput] = useState<string>('');

  const toggleGps = (orderId: string) => {
    if (isGpsActive) {
      mobileLocation.stopTracking();
      setIsGpsActive(false);
    } else {
      mobileLocation.startTracking(rider!.id, orderId);
      setIsGpsActive(true);
    }
  };

  const handleCollectCash = async () => {
    if (!cashCollectedModal) return;
    const amount = Number(cashAmountInput) || cashCollectedModal.total_amount;
    try {
      await mobileApi.recordCashCollection(cashCollectedModal.id, {
        collected_amount: amount,
        payment_mode: 'CASH',
        notes: 'Collected by mobile rider app'
      });
      alert(`₹${amount} recorded successfully. Handover to store owner at end of shift.`);
      setCashCollectedModal(null);
    } catch (err: any) {
      alert('Error recording cash collection: ' + err.message);
    }
  };

  const handleFinishDelivery = async (orderId: string) => {
    const otp = window.prompt('Enter 4-digit Customer Delivery OTP:', '4321');
    if (!otp) return;
    try {
      await mobileApi.completeDelivery(orderId, otp);
      mobileLocation.stopTracking();
      setIsGpsActive(false);
      setAssignedOrders(prev => prev.filter(o => o.id !== orderId));
      alert('Order successfully marked as DELIVERED!');
    } catch (err: any) {
      alert('Error completing delivery: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '16px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>KIRANA RIDER PORTAL</span>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{rider?.name}</h2>
          </div>
          <span style={{ background: '#059669', color: 'white', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 800 }}>
            ON DUTY
          </span>
        </div>
      </div>

      {/* GPS Status Indicator Banner */}
      <div style={{
        padding: '12px 16px',
        background: isGpsActive ? '#064e3b' : '#334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #475569'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isGpsActive ? '#4ade80' : '#94a3b8',
            boxShadow: isGpsActive ? '0 0 10px #4ade80' : 'none'
          }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {isGpsActive ? 'Live GPS Broadcasting Active' : 'GPS Idle'}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
          {isGpsActive ? 'Coords: 17.4483, 78.3915' : 'Tap Start to Broadcast'}
        </span>
      </div>

      {/* Assigned Orders List */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Assigned Deliveries ({assignedOrders.length})
        </h3>

        {assignedOrders.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748b' }}>
            No pending deliveries right now. Enjoy your break!
          </div>
        ) : (
          assignedOrders.map(order => (
            <div key={order.id} style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', border: '1px solid #334155', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, color: '#38bdf8' }}>#{order.order_number}</span>
                <span style={{ background: '#f59e0b', color: '#78350f', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  {order.payment_method} • ₹{order.total_amount}
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{order.customer_name}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.4 }}>
                📍 {order.delivery_address}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={() => alert(`Dialing customer at ${order.customer_phone}`)}
                  style={{ background: '#334155', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  📞 Call Customer
                </button>
                <button
                  onClick={() => toggleGps(order.id)}
                  style={{
                    background: isGpsActive ? '#dc2626' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isGpsActive ? '⏹ Stop GPS' : '▶ Start Transit GPS'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {order.payment_method === 'COD' && (
                  <button
                    onClick={() => {
                      setCashCollectedModal(order);
                      setCashAmountInput(String(order.total_amount));
                    }}
                    style={{ background: '#d97706', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    💵 Collect Cash
                  </button>
                )}
                <button
                  onClick={() => handleFinishDelivery(order.id)}
                  style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  ✓ Complete Delivery
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cash Collection Modal */}
      {cashCollectedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 999 }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', maxWidth: '360px', width: '100%', border: '1px solid #475569' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Collect Cash on Delivery</h3>
            <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '0.85rem' }}>
              Confirm exact cash received from <strong>{cashCollectedModal.customer_name}</strong>.
            </p>
            <input
              type="number"
              value={cashAmountInput}
              onChange={e => setCashAmountInput(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #64748b', background: '#0f172a', color: 'white', fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCashCollectedModal(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#334155', color: 'white', border: 'none', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCollectCash}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#059669', color: 'white', border: 'none', fontWeight: 800 }}
              >
                Confirm Cash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
