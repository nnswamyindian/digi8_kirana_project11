import React, { useState, useEffect } from 'react';
import { Tenant, PlatformAdminStats } from '../../types';
import { api, setActiveTenantId } from '../../services/api';
import {
  Building2,
  Users,
  CreditCard,
  Activity,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Sliders,
  Database,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

interface PlatformAdminDashboardProps {
  onOpenOnboarding: () => void;
  onSelectTenant: (tenantId: string) => void;
}

export const PlatformAdminDashboard: React.FC<PlatformAdminDashboardProps> = ({
  onOpenOnboarding,
  onSelectTenant
}) => {
  const [stats, setStats] = useState<PlatformAdminStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Plan Edit Modal State
  const [editingPlanTenant, setEditingPlanTenant] = useState<Tenant | null>(null);
  const [newPlan, setNewPlan] = useState<string>('BASIC');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, tenantsData, healthData, logsData] = await Promise.all([
        api.getPlatformStats().catch(() => null),
        api.getPlatformTenants().catch(() => []),
        api.getPlatformHealth().catch(() => null),
        api.getPlatformAuditLogs({ limit: 15 }).catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setTenants(tenantsData || []);
      if (healthData) setHealth(healthData);
      setAuditLogs(logsData || []);
    } catch (err) {
      console.error('Failed to load platform admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (tenant: Tenant) => {
    const isCurrentlyActive = tenant.status === 'ACTIVE' || (tenant.status as any) === 'active';
    const nextStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';
    let reason = '';
    if (isCurrentlyActive) {
      const inputReason = window.prompt(`Enter reason for suspending "${tenant.name}":`, 'Payment failure or policy violation');
      if (inputReason === null) return;
      reason = inputReason || 'Administrative suspension';
    }

    try {
      await api.updateTenantStatus(tenant.id, nextStatus, reason);
      await loadData();
    } catch (err: any) {
      alert(`Error updating tenant status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlanTenant) return;
    setIsSubmitting(true);
    try {
      await api.updateTenantPlan(editingPlanTenant.id, newPlan);
      setEditingPlanTenant(null);
      await loadData();
    } catch (err: any) {
      alert(`Error updating plan: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchStore = (tenant: Tenant) => {
    setActiveTenantId(tenant.id);
    onSelectTenant(tenant.id);
  };

  const filteredTenants = tenants.filter(t => {
    const storeEmail = t.owner_email || t.email || '';
    const storePhone = t.owner_phone || t.phone || '';
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (storeEmail && storeEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (storePhone && storePhone.includes(searchQuery));
    const matchesPlan = selectedPlanFilter === 'all' || t.plan === selectedPlanFilter;
    const matchesStatus = selectedStatusFilter === 'all' || t.status === selectedStatusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', color: '#1e293b' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
          }}>
            <Layers size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Central Platform Admin
            </h1>
            <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Multi-Tenant Kirana SaaS Orchestrator & Live Store Fleet Controller
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.65rem 1rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={onOpenOnboarding}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.875rem',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Plus size={18} />
            Register New Store (10-Step Wizard)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Total Stores */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Stores
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {stats?.total_tenants ?? tenants.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
              {stats?.active_tenants ?? tenants.filter(t => t.status === 'ACTIVE' || (t.status as any) === 'active').length} Active Stores
            </div>
          </div>
        </div>

        {/* Total Platform GMV */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CreditCard size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Platform GMV
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              ₹{Number(stats?.total_gmv || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Cross-store verified sales
            </div>
          </div>
        </div>

        {/* Total Platform Orders */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#fef3c7',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Platform Orders
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
              {stats?.total_orders ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {stats?.today_orders ?? 0} Placed Today
            </div>
          </div>
        </div>

        {/* Health & Engine Status */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#f3e8ff',
            color: '#7e22ce',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              System Health
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: health?.status === 'ok' ? '#22c55e' : '#ef4444'
              }}></span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {health?.database?.engine?.toUpperCase() || 'MYSQL'} POOL
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Ping: {health?.database?.ping_ms || 1}ms | Up: {Math.floor((health?.uptime_seconds || 100) / 60)}m
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Stores Directory & Live Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Stores Catalog */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} color="#4f46e5" />
              Stores Catalog ({filteredTenants.length})
            </h2>

            {/* Filter controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search stores, slug, phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    width: '200px'
                  }}
                />
              </div>

              <select
                value={selectedPlanFilter}
                onChange={e => setSelectedPlanFilter(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="all">All Plans</option>
                <option value="FREE">Free</option>
                <option value="BASIC">Basic</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Store / Tenant</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Contact</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Plan</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No stores found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map(tenant => {
                    const isActive = tenant.status === 'ACTIVE' || (tenant.status as any) === 'active';
                    return (
                      <tr key={tenant.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Store info */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: tenant.branding?.primary_color || tenant.primary_color || '#4f46e5',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}>
                              {tenant.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{tenant.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                <code>{tenant.id}</code> • slug: <span style={{ color: '#4f46e5' }}>{tenant.slug}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                          <div>{tenant.phone || tenant.owner_phone || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{tenant.email || tenant.owner_email || '—'}</div>
                        </td>

                        {/* Plan */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: tenant.plan === 'PRO' ? '#fdf2f8' : tenant.plan === 'ENTERPRISE' ? '#faf5ff' : '#eff6ff',
                            color: tenant.plan === 'PRO' ? '#db2777' : tenant.plan === 'ENTERPRISE' ? '#9333ea' : '#2563eb'
                          }}>
                            {tenant.plan || 'BASIC'}
                            <button
                              onClick={() => {
                                setEditingPlanTenant(tenant);
                                setNewPlan(tenant.plan || 'BASIC');
                              }}
                              title="Change Plan"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                            >
                              <Sliders size={12} />
                            </button>
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isActive ? '#ecfdf5' : '#fef2f2',
                            color: isActive ? '#059669' : '#dc2626'
                          }}>
                            {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleSwitchStore(tenant)}
                              title="Switch into Store Dashboard"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.4rem 0.75rem',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                cursor: 'pointer'
                              }}
                            >
                              <ExternalLink size={13} />
                              Open
                            </button>

                            <button
                              onClick={() => handleToggleStatus(tenant)}
                              style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: isActive ? '#fee2e2' : '#dcfce7',
                                color: isActive ? '#dc2626' : '#15803d',
                                cursor: 'pointer'
                              }}
                            >
                              {isActive ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Platform Security & Operations Audit Stream */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="#059669" />
              SaaS Audit Stream
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Live Event Trail</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
            {auditLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No platform audit events logged yet.
              </div>
            ) : (
              auditLogs.map((log: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, color: '#4f46e5' }}>{log.action}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                      {new Date(log.created_at || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: '#334155' }}>
                    Store: <code style={{ color: '#0f172a' }}>{log.tenant_id}</code>
                  </div>
                  {log.entity && (
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      Entity: {log.entity} #{log.entity_id || ''}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Plan Upgrade Modal */}
      {editingPlanTenant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '14px',
            padding: '1.75rem',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Update SaaS Plan
            </h3>
            <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
              Change subscription tier for <strong>{editingPlanTenant.name}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { key: 'FREE', title: 'Free Tier', desc: 'Up to 50 products, 1 staff, basic POS' },
                { key: 'BASIC', title: 'Basic Tier', desc: 'Up to 500 products, 3 staff, delivery zones' },
                { key: 'PRO', title: 'Pro Tier', desc: 'Unlimited products, 15 staff, real-time GPS & live maps' },
                { key: 'ENTERPRISE', title: 'Enterprise Tier', desc: 'Custom domains, white-label mobile app, dedicated SLA' }
              ].map(planOption => (
                <label
                  key={planOption.key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: newPlan === planOption.key ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                    background: newPlan === planOption.key ? '#f5f3ff' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="saas_plan"
                    value={planOption.key}
                    checked={newPlan === planOption.key}
                    onChange={() => setNewPlan(planOption.key)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{planOption.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{planOption.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setEditingPlanTenant(null)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePlan}
                disabled={isSubmitting}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#4f46e5',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Updating...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
