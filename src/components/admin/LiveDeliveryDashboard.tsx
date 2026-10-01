import React, { useState, useEffect } from 'react';
import { ActiveDeliveryAgent, Order, User } from '../../types';
import { api } from '../../services/api';
import {
  Bike, Phone, MapPin, Navigation, Clock, CheckCircle2,
  AlertTriangle, RefreshCw, UserCheck, ShieldCheck, Map,
  Package, Search, ArrowRight, UserPlus
} from 'lucide-react';

interface LiveDeliveryDashboardProps {
  onReassignOrder?: (orderId: string) => void;
}

export const LiveDeliveryDashboard: React.FC<LiveDeliveryDashboardProps> = () => {
  const [agents, setAgents] = useState<ActiveDeliveryAgent[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [allRiders, setAllRiders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<ActiveDeliveryAgent | null>(null);

  // Reassign modal state
  const [reassignModalOrder, setReassignModalOrder] = useState<Order | null>(null);
  const [selectedNewRiderId, setSelectedNewRiderId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentList, ordersList, usersList] = await Promise.all([
        api.getActiveDeliveryAgents(),
        api.getOrders({ type: 'ONLINE_DELIVERY', status: 'OUT_FOR_DELIVERY,ASSIGNED,READY,PREPARING,ACCEPTED' }),
        api.getUsers()
      ]);
      setAgents(agentList);
      setActiveOrders(ordersList);
      setAllRiders(usersList.filter(u => u.role === 'DELIVERY_BOY' && u.status === 'ACTIVE'));
    } catch (err) {
      console.error('Failed to load live delivery data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    const unsub = api.subscribeSSE((event) => {
      if ([
        'rider_location_updated',
        'order_status_updated',
        'order_assigned',
        'delivery_cash_collected',
        'delivery_failed',
        'users_updated'
      ].includes(event.type)) {
        loadData();
      }
    });
    return unsub;
  }, []);

  const handleReassign = async () => {
    if (!reassignModalOrder || !selectedNewRiderId) return;
    const targetRider = allRiders.find(r => String(r.id) === String(selectedNewRiderId));
    if (!targetRider) return;

    setIsReassigning(true);
    try {
      await api.assignDeliveryBoy(reassignModalOrder.id, {
        delivery_boy_id: targetRider.id,
        delivery_boy_name: targetRider.name,
        assigned_by: 'Owner Live Dashboard'
      });
      alert(`Order #${reassignModalOrder.order_number} successfully reassigned to ${targetRider.name}`);
      setReassignModalOrder(null);
      await loadData();
    } catch (err: any) {
      alert('Failed to reassign order: ' + err.message);
    } finally {
      setIsReassigning(false);
    }
  };

  // Metrics
  const deliveringCount = agents.filter(a => a.current_order_id).length;
  const availableCount = agents.filter(a => a.availability === 'ONLINE' && !a.current_order_id).length;
  const totalCashHeld = agents.reduce((sum, a) => sum + (a.pending_cash_held || 0), 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header & Metrics */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bike size={24} color="var(--primary-600)" />
            Live Delivery Operations & Fleet Tracking
          </h2>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Real-time delivery agent locations, doorstep transit status & cash-in-hand monitoring
          </span>
        </div>

        <button
          onClick={loadData}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active In-Transit
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-600)', marginTop: '4px' }}>
            {deliveringCount} Riders
          </div>
          <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
            ● Delivering orders right now
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Available Fleet
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
            {availableCount} Riders
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Ready for instant dispatch
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Delivery Orders
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {activeOrders.length}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Assigned or in transit
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Fleet Cash In Hand
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ea580c', marginTop: '4px' }}>
            ₹{totalCashHeld.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#ea580c', fontWeight: 600, marginTop: '2px' }}>
            Pending handover to store
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map Radar + Active Fleet List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* INTERACTIVE DELIVERY RADAR & MAP */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Map size={18} color="var(--primary-600)" />
              Live City Delivery Radar
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, background: '#ecfdf5', padding: '3px 8px', borderRadius: '12px' }}>
              ● GPS Stream Active
            </span>
          </div>

          {/* Graphical Fleet Visualizer Canvas */}
          <div style={{
            position: 'relative',
            height: '340px',
            background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            {/* Radar Grid Circles */}
            <div style={{ position: 'absolute', width: '280px', height: '280px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', border: '1px dashed rgba(16, 185, 129, 0.25)' }} />

            {/* Central Store Hub Marker */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              textAlign: 'center',
              cursor: 'pointer'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: '#10b981',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 4px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
              }}>
                🏪
              </div>
              <span style={{ fontSize: '0.725rem', fontWeight: 800, background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '8px' }}>
                Store Central Hub
              </span>
            </div>

            {/* Active Delivery Agent Markers (Positioned dynamically on radar) */}
            {agents.map((agent, idx) => {
              const angles = [45, 135, 220, 310, 80, 260];
              const angle = angles[idx % angles.length];
              const distance = agent.current_order_id ? 100 : 70;
              const rad = (angle * Math.PI) / 180;
              const left = `calc(50% + ${Math.cos(rad) * distance}px - 20px)`;
              const top = `calc(50% + ${Math.sin(rad) * distance}px - 20px)`;

              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    zIndex: 3,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                  title={`${agent.name} • ${agent.current_order_id ? 'Delivering Order #' + agent.current_order_number : 'Available'}`}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: agent.current_order_id ? '#f59e0b' : '#3b82f6',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 2px',
                    boxShadow: agent.current_order_id ? '0 0 12px rgba(245, 158, 11, 0.8)' : '0 0 8px rgba(59, 130, 246, 0.5)',
                    animation: agent.current_order_id ? 'pulse 2s infinite' : 'none'
                  }}>
                    <Bike size={20} />
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    {agent.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                Delivering
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                Available
              </span>
            </div>
            <span>Click any rider marker on the radar to inspect details</span>
          </div>
        </div>

        {/* ACTIVE FLEET PARTNERS LIST */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px' }}>
            Riders Fleet ({agents.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: selectedAgent?.id === agent.id ? '2px solid var(--primary-600)' : '1px solid var(--border-light)',
                  background: selectedAgent?.id === agent.id ? '#f0fdf4' : 'var(--bg-subtle)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: agent.current_order_id ? '#fef3c7' : '#ecfdf5',
                      color: agent.current_order_id ? '#b45309' : '#047857',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}>
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                        {agent.name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {agent.phone}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: agent.current_order_id ? '#f59e0b' : '#10b981',
                      color: 'white'
                    }}>
                      {agent.current_order_id ? 'DELIVERING' : agent.availability}
                    </span>
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#ea580c', marginTop: '2px' }}>
                      Cash Held: ₹{(agent.pending_cash_held || 0).toFixed(0)}
                    </div>
                  </div>
                </div>

                {agent.current_order_id && (
                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '0.75rem', color: '#475569' }}>
                    <strong>Delivering:</strong> #{agent.current_order_number} • {agent.current_order_address?.slice(0, 32)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE DELIVERY ORDERS QUEUE (SECTION 27 & 60) */}
      <div style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>
          Active Home Delivery Orders Queue
        </h3>

        {activeOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            ✓ No pending home deliveries right now. All orders are fulfilled!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Order #</th>
                  <th style={{ padding: '10px 12px' }}>Customer & Destination</th>
                  <th style={{ padding: '10px 12px' }}>Amount</th>
                  <th style={{ padding: '10px 12px' }}>Delivery Boy</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map((ord) => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px', fontWeight: 800, color: 'var(--text-main)' }}>
                      #{ord.order_number}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ord.customer_name}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {ord.delivery_address || ord.area || 'Home Delivery'} {ord.pincode ? `(${ord.pincode})` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>₹{ord.total_amount.toFixed(2)}</div>
                      <span style={{ fontSize: '0.7rem', color: ord.payment_status === 'PAID' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        {ord.payment_status} ({ord.payment_method})
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {ord.assigned_delivery_boy_name ? (
                        <span style={{ fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Bike size={14} /> {ord.assigned_delivery_boy_name}
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: ord.status === 'OUT_FOR_DELIVERY' ? '#10b981' : '#fef3c7',
                        color: ord.status === 'OUT_FOR_DELIVERY' ? 'white' : '#b45309'
                      }}>
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <a
                          href={`tel:${ord.customer_phone}`}
                          className="btn btn-secondary btn-sm"
                          title="Call Customer"
                          style={{ padding: '4px 8px' }}
                        >
                          <Phone size={13} />
                        </a>
                        <button
                          onClick={() => {
                            setReassignModalOrder(ord);
                            setSelectedNewRiderId(ord.assigned_delivery_boy_id || '');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.725rem', padding: '4px 8px' }}
                        >
                          <UserPlus size={13} /> Reassign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REASSIGN DELIVERY BOY MODAL */}
      {reassignModalOrder && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '420px', width: '90%' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px' }}>
              Reassign Delivery Partner
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Order #{reassignModalOrder.order_number} • {reassignModalOrder.customer_name} ({reassignModalOrder.area || 'Local Area'})
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '6px' }}>
                Select Available Delivery Partner
              </label>
              <select
                value={selectedNewRiderId}
                onChange={(e) => setSelectedNewRiderId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <option value="">-- Choose Rider --</option>
                {allRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.phone}) - {r.availability || 'ONLINE'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setReassignModalOrder(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassign}
                disabled={!selectedNewRiderId || isReassigning}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {isReassigning ? 'Assigning...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
