import React, { useState, useEffect } from 'react';
import { DeliveryArea, User } from '../../types';
import { api } from '../../services/api';
import { 
  MapPin, Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock, 
  IndianRupee, AlertCircle, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';

interface DeliveryAreaManagementProps {
  currentUser?: User | null;
}

export const DeliveryAreaManagement: React.FC<DeliveryAreaManagementProps> = ({ currentUser }) => {
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);

  // Form fields
  const [areaName, setAreaName] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('30');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('30-45 minutes');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canManage = currentUser ? (
    currentUser.role === 'OWNER' ||
    currentUser.role === 'STORE_OWNER' ||
    currentUser.role === 'STORE_MANAGER' ||
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'PLATFORM_ADMIN' ||
    Boolean(currentUser.permissions?.includes('manage_delivery_areas'))
  ) : true;

  const loadAreas = async () => {
    setLoading(true);
    try {
      const data = await api.getDeliveryAreas();
      setAreas(data);
    } catch (err: any) {
      console.error('Failed to load delivery areas', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const openAddModal = () => {
    setEditingArea(null);
    setAreaName('');
    setPincodes('');
    setDeliveryCharge('30');
    setMinOrderAmount('0');
    setEstimatedDeliveryTime('30-45 minutes');
    setIsActive(true);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (area: DeliveryArea) => {
    setEditingArea(area);
    setAreaName(area.area_name);
    setPincodes(area.pincodes);
    setDeliveryCharge(area.delivery_charge.toString());
    setMinOrderAmount((area.min_order_amount ?? (area as any).min_order_value ?? 0).toString());
    setEstimatedDeliveryTime(area.estimated_delivery_time || (area as any).estimated_delivery || '30-45 minutes');
    setIsActive(Boolean(area.is_active));
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim() || !pincodes.trim()) {
      setError('Please provide Area Name and at least one PIN code.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        area_name: areaName.trim(),
        pincodes: pincodes.trim(),
        delivery_charge: parseFloat(deliveryCharge) || 0,
        min_order_amount: parseFloat(minOrderAmount) || 0,
        min_order_value: parseFloat(minOrderAmount) || 0,
        estimated_delivery_time: estimatedDeliveryTime.trim() || '30-45 minutes',
        estimated_delivery: estimatedDeliveryTime.trim() || '30-45 minutes',
        is_active: isActive ? 1 : 0,
      };

      if (editingArea) {
        await api.updateDeliveryArea(editingArea.id.toString(), payload);
      } else {
        await api.createDeliveryArea(payload);
      }

      setIsModalOpen(false);
      await loadAreas();
    } catch (err: any) {
      setError(err.message || 'Failed to save delivery area.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from delivery service areas?`)) {
      return;
    }
    try {
      await api.deleteDeliveryArea(id.toString());
      await loadAreas();
    } catch (err: any) {
      alert(err.message || 'Failed to delete delivery area.');
    }
  };

  const handleToggleStatus = async (area: DeliveryArea) => {
    try {
      await api.updateDeliveryArea(area.id.toString(), {
        is_active: area.is_active ? 0 : 1
      });
      await loadAreas();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={26} color="var(--primary-600)" />
            Delivery Service Areas & PIN Codes
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Configure serviceable localities, PIN codes, custom delivery charges, and minimum order rules for home delivery.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadAreas} title="Refresh">
            <RefreshCw size={16} />
          </button>
          {canManage && (
            <button className="btn btn-primary" onClick={openAddModal} style={{ gap: '8px' }}>
              <Plus size={18} />
              <span>Add Delivery Area</span>
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <div style={{ padding: '12px 16px', background: '#fef3c7', color: '#92400e', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <ShieldAlert size={18} />
          <span>You have read-only access. Only store owners and administrators with <code>manage_delivery_areas</code> permission can edit delivery zones.</span>
        </div>
      )}

      {/* Areas Table / Card List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Loading delivery areas...</p>
        </div>
      ) : areas.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-light)'
        }}>
          <MapPin size={48} color="var(--primary-400)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>No delivery areas configured</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
            Add your first delivery area to start accepting local home deliveries restricted to your serviceable PIN codes.
          </p>
          {canManage && (
            <button className="btn btn-primary btn-lg" onClick={openAddModal}>
              <Plus size={18} />
              <span>Add Delivery Area</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {areas.map((area) => (
            <div
              key={area.id}
              style={{
                background: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                border: area.is_active ? '1px solid var(--border-light)' : '1px dashed #cbd5e1',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: area.is_active ? 1 : 0.65,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {area.area_name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => canManage && handleToggleStatus(area)}
                    disabled={!canManage}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: canManage ? 'pointer' : 'default',
                      padding: 0
                    }}
                    title={area.is_active ? 'Click to disable' : 'Click to enable'}
                  >
                    <span className={`badge ${area.is_active ? 'badge-green' : 'badge-gray'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {area.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {area.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </button>
                </div>

                {/* PIN Codes Badges */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Serviceable PIN Codes:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {area.pincodes.split(',').map((p) => p.trim()).filter(Boolean).map((pin) => (
                      <span
                        key={pin}
                        style={{
                          backgroundColor: 'var(--primary-50)',
                          color: 'var(--primary-800)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: '1px solid var(--primary-200)'
                        }}
                      >
                        {pin}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Delivery details grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '0.825rem',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Delivery Fee:</span>
                    <strong style={{ color: 'var(--primary-700)', fontSize: '0.95rem' }}>
                      ₹{area.delivery_charge}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Est. Delivery:</span>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {area.estimated_delivery_time || (area as any).estimated_delivery || '30-45 minutes'}
                    </strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Minimum Order:</span>
                    <strong>{Number(area.min_order_amount ?? (area as any).min_order_value ?? 0) > 0 ? `₹${area.min_order_amount ?? (area as any).min_order_value}` : 'No minimum'}</strong>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {canManage && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditModal(area)}
                    style={{ gap: '6px' }}
                  >
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                    onClick={() => handleDelete(area.id, area.area_name)}
                    title="Delete area"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Add / Edit Delivery Area */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingArea ? `Edit Area: ${editingArea.area_name}` : 'Add Delivery Service Area'}</h3>
              <button className="btn-icon btn-secondary" onClick={() => setIsModalOpen(false)}>
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                  <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    ⚠️ {error}
                  </div>
                )}

                <div className="form-group">
                  <label>Area / Locality Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kukatpally, Moosapet, Miyapur"
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)' }}>The display name shown to customers.</small>
                </div>

                <div className="form-group">
                  <label>Serviceable PIN Codes (Comma-separated) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500072, 500090, 500091"
                    value={pincodes}
                    onChange={(e) => setPincodes(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)' }}>
                    Enter 6-digit PIN codes separated by commas. Only customers in these PIN codes can choose home delivery.
                  </small>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Delivery Charge (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Min. Order Value (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Estimated Delivery Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 30–45 minutes"
                    value={estimatedDeliveryTime}
                    onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="area-status-toggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="area-status-toggle" style={{ fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                    Enable this area for active delivery
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingArea ? 'Save Changes' : 'Create Delivery Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
