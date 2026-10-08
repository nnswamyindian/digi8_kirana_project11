import React, { useState, useEffect } from 'react';
import { User, UserRole, UserPermission } from '../../types';
import { api } from '../../services/api';
import { 
  Users, UserPlus, Shield, Bike, Phone, Key, Check, 
  X, Edit, Trash2, ShieldCheck, UserCheck, RefreshCw, AlertCircle
} from 'lucide-react';

interface StaffManagementProps {
  currentUser?: User | null;
}

const ALL_PERMISSIONS: { key: UserPermission; label: string; desc: string }[] = [
  { key: 'view_orders', label: 'View Orders', desc: 'Browse store & online orders' },
  { key: 'manage_orders', label: 'Manage Orders', desc: 'Accept, prepare, cancel orders' },
  { key: 'manage_products', label: 'Manage Products', desc: 'Create, edit, delete products' },
  { key: 'manage_stock', label: 'Manage Stock', desc: 'Update inventory and thresholds' },
  { key: 'manage_customers', label: 'Manage Customers', desc: 'View customer contact records' },
  { key: 'manage_delivery', label: 'Manage Delivery', desc: 'Oversee delivery logistics' },
  { key: 'assign_delivery_boys', label: 'Assign Delivery Staff', desc: 'Assign riders to orders' },
  { key: 'view_reports', label: 'View Reports', desc: 'Access sales and financial analytics' },
  { key: 'manage_discounts', label: 'Manage Discounts', desc: 'Apply special billing discounts' },
  { key: 'manage_prices', label: 'Manage Prices', desc: 'Update sale price and MRP' },
  { key: 'manage_users', label: 'Manage Users', desc: 'Create and edit staff accounts' },
  { key: 'manage_delivery_areas', label: 'Manage Delivery Areas', desc: 'Configure PIN codes and fees' },
  { key: 'mark_cod_paid', label: 'Mark COD as Paid', desc: 'Collect cash and mark orders paid' },
];

export const StaffManagement: React.FC<StaffManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('SUB_ADMIN');
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isOwner = currentUser ? (
    currentUser.role === 'OWNER' ||
    currentUser.role === 'STORE_OWNER' ||
    currentUser.role === 'STORE_MANAGER' ||
    currentUser.role === 'PLATFORM_ADMIN' ||
    Boolean(currentUser.permissions?.includes('manage_users'))
  ) : true;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load staff users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = (defaultRole: UserRole = 'SUB_ADMIN') => {
    setEditingUser(null);
    setName('');
    setMobile('');
    setPassword('');
    setRole(defaultRole);
    setPermissions(defaultRole === 'SUB_ADMIN' ? ['view_orders', 'manage_orders', 'manage_stock', 'assign_delivery_boys'] : []);
    setAddress('');
    setEmergencyContact('');
    setIsActive(true);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setMobile(u.mobile || u.phone || '');
    setPassword(''); // leave blank to keep unchanged
    setRole(u.role);
    setPermissions((u.permissions || []) as UserPermission[]);
    setAddress(u.address || '');
    setEmergencyContact(u.emergency_contact || '');
    setIsActive(Boolean(u.is_active));
    setError('');
    setIsModalOpen(true);
  };

  const togglePermission = (perm: UserPermission) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter((p) => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      setError('Name and mobile number are required.');
      return;
    }
    if (!editingUser && !password.trim()) {
      setError('Password / PIN is required for new accounts.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: any = {
        name: name.trim(),
        mobile: mobile.trim(),
        phone: mobile.trim(),
        role,
        permissions: (role === 'OWNER' || (role as string) === 'STORE_OWNER') ? ALL_PERMISSIONS.map((p) => p.key) : permissions,
        address: address.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        is_active: isActive ? 1 : 0,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      };

      if (password.trim()) {
        payload.password = password.trim();
        payload.pin = password.trim();
      }

      if (editingUser) {
        await api.updateUser(editingUser.id, payload);
      } else {
        await api.createUser(payload);
      }

      setIsModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.role === 'OWNER' || (u.role as string) === 'STORE_OWNER') {
      alert('The Store Owner account cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to deactivate or remove ${u.name}?`)) {
      return;
    }
    try {
      await api.deleteUser(u.id);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const getRoleBadge = (r: UserRole | string) => {
    switch (r) {
      case 'OWNER':
      case 'STORE_OWNER':
        return <span className="badge badge-purple">Store Owner</span>;
      case 'STORE_MANAGER':
      case 'SUB_ADMIN':
        return <span className="badge badge-blue">Store Manager</span>;
      case 'CASHIER':
        return <span className="badge badge-yellow">Cashier / POS</span>;
      case 'DELIVERY_BOY':
      case 'DELIVERY_RIDER':
        return <span className="badge badge-green">Delivery Rider</span>;
      default:
        return <span className="badge badge-gray">{r}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} color="var(--primary-600)" />
            Staff & Role Permissions Management
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage store employees, sub-admins, cashiers, and delivery riders with granular role-based permissions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadUsers} title="Refresh list">
            <RefreshCw size={16} />
          </button>
          {isOwner && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => openAddModal('DELIVERY_BOY')} style={{ gap: '6px' }}>
                <Bike size={16} />
                <span>+ Rider</span>
              </button>
              <button className="btn btn-secondary" onClick={() => openAddModal('CASHIER')} style={{ gap: '6px' }}>
                <Key size={16} />
                <span>+ Cashier</span>
              </button>
              <button className="btn btn-primary" onClick={() => openAddModal('SUB_ADMIN')} style={{ gap: '6px' }}>
                <UserPlus size={16} />
                <span>+ Add Staff</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Staff Grid Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Loading staff members...</p>
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)' }}>
          <Users size={48} color="var(--primary-400)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>No staff members found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                background: 'var(--card-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {u.name}
                    </h3>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Phone size={12} /> {u.mobile || u.phone}
                    </div>
                  </div>
                  <div>{getRoleBadge(u.role)}</div>
                </div>

                {/* Delivery Boy Status Badge */}
                {u.role === 'DELIVERY_BOY' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '8px 0', fontSize: '0.8rem' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: u.availability_status === 'ONLINE' ? '#10b981' : u.availability_status === 'BUSY' ? '#f59e0b' : '#94a3b8'
                    }} />
                    <span style={{ fontWeight: 600 }}>
                      {u.availability_status || 'OFFLINE'}
                    </span>
                  </div>
                )}

                {/* Permissions pills */}
                {u.role === 'SUB_ADMIN' && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Granted Permissions:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {u.permissions && u.permissions.length > 0 ? (
                        u.permissions.slice(0, 4).map((p) => (
                          <span key={p} style={{ fontSize: '0.7rem', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No permissions granted</span>
                      )}
                      {u.permissions && u.permissions.length > 4 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary-600)', fontWeight: 700 }}>
                          +{u.permissions.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {u.address && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    📍 {u.address}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {isOwner && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '14px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(u)} style={{ gap: '4px' }}>
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                  {u.role !== 'OWNER' && (u.role as string) !== 'STORE_OWNER' && (
                    <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(u)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Add / Edit Staff */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? `Edit Staff: ${editingUser.name}` : 'Create Staff / Rider Account'}</h3>
              <button className="btn-icon btn-secondary" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                {error && (
                  <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    ⚠️ {error}
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Suresh Goud"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Mobile Number (Login ID) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9848012345"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Role *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                    >
                      <option value="SUB_ADMIN">Sub Admin</option>
                      <option value="DELIVERY_BOY">Delivery Boy / Rider</option>
                      <option value="CASHIER">Cashier / Billing Staff</option>
                      <option value="STOCK_MANAGER">Stock Manager</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>{editingUser ? 'Change Password (optional)' : 'Password *'}</label>
                    <input
                      type="password"
                      placeholder={editingUser ? 'Leave blank to keep existing' : 'e.g. kirana123'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {role === 'DELIVERY_BOY' && (
                  <div className="form-grid">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Residential Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Kukatpally, Hyderabad"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Emergency Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9848099999"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Sub Admin Configurable Permissions */}
                {role === 'SUB_ADMIN' && (
                  <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, display: 'block', marginBottom: '8px' }}>
                      ASSIGN PERMISSIONS FOR SUB-ADMIN
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {ALL_PERMISSIONS.map((perm) => {
                        const isChecked = permissions.includes(perm.key);
                        return (
                          <div
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: isChecked ? '1px solid var(--primary-500)' : '1px solid var(--border-light)',
                              background: isChecked ? 'var(--primary-50)' : 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{ cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{perm.label}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{perm.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                  {saving ? 'Saving...' : editingUser ? 'Save Staff Details' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
