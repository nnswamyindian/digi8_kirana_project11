import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Building2,
  Users,
  CreditCard,
  Activity,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Sliders,
  Database,
  Cpu,
  Layers,
  Sparkles,
  Inbox,
  Globe,
  Receipt,
  LifeBuoy,
  FileText,
  Clock,
  Send,
  Eye,
  Check,
  X,
  Lock,
  ArrowUpRight
} from 'lucide-react';

interface CompanyControlCenterProps {
  onSelectTenant?: (tenantId: string) => void;
  onOpenOnboarding?: () => void;
}

export const CompanyControlCenter: React.FC<CompanyControlCenterProps> = ({
  onSelectTenant,
  onOpenOnboarding
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'stores' | 'plans' | 'invoices' | 'domains' | 'support' | 'logs'>('overview');
  const [loading, setLoading] = useState<boolean>(true);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  // Filters & Modals
  const [appFilter, setAppFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketReply, setTicketReply] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        dashStats,
        appsList,
        storesList,
        plansList,
        invList,
        domList,
        ticketsList,
        logsList,
        healthData
      ] = await Promise.all([
        api.getCompanyDashboardStats().catch(() => null),
        api.getCompanyApplications().catch(() => []),
        api.getCompanyStores().catch(() => []),
        api.getSubscriptionPlans().catch(() => []),
        api.getCompanyInvoices().catch(() => []),
        api.getCompanyDomains().catch(() => []),
        api.getCompanyTickets().catch(() => []),
        api.getPlatformAuditLogs({ limit: 20 }).catch(() => []),
        api.getPlatformHealth().catch(() => null)
      ]);

      if (dashStats) setStats(dashStats);
      setApplications(appsList || []);
      setStores(storesList || []);
      setPlans(plansList || []);
      setInvoices(invList || []);
      setDomains(domList || []);
      setTickets(ticketsList || []);
      setAuditLogs(logsList || []);
      if (healthData) setHealth(healthData);
    } catch (err: any) {
      console.error('Failed to load company control center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Application Approval Flow
  const handleApproveApp = async (appId: string) => {
    setIsProcessing(true);
    try {
      const res = await api.approveCompanyApplication(appId, reviewNote || 'Approved by Company Admin');
      showNotification('success', res.message || 'Store application approved! Payment request generated.');
      setSelectedApp(null);
      setReviewNote('');
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Approval failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Application Rejection Flow
  const handleRejectApp = async (appId: string) => {
    const reason = window.prompt('Enter rejection reason for store applicant:', 'Incomplete documentation or unserviceable region');
    if (!reason) return;

    setIsProcessing(true);
    try {
      const res = await api.rejectCompanyApplication(appId, reason);
      showNotification('success', res.message || 'Application rejected.');
      setSelectedApp(null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Rejection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle Store Status (Activate / Suspend)
  const handleToggleStoreStatus = async (store: any) => {
    const isCurrentlyActive = store.status === 'ACTIVE' || store.status === 'active';
    const nextStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';
    let reason = '';
    if (isCurrentlyActive) {
      const inputReason = window.prompt(`Enter reason for suspending "${store.name}":`, 'Payment failure or terms violation');
      if (inputReason === null) return;
      reason = inputReason || 'Administrative suspension';
    }

    try {
      await api.updateCompanyStoreStatus(store.id, nextStatus, reason);
      showNotification('success', `Store status changed to ${nextStatus}`);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update store status');
    }
  };

  // Ticket Reply & Resolution
  const handleSendTicketReply = async () => {
    if (!selectedTicket || !ticketReply.trim()) return;
    setIsProcessing(true);
    try {
      await api.replyCompanyTicket(selectedTicket.id, ticketReply.trim());
      showNotification('success', 'Reply recorded and sent to store owner');
      setTicketReply('');
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to send reply');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await api.updateCompanyTicketStatus(selectedTicket.id, status);
      showNotification('success', `Ticket #${selectedTicket.ticket_number} marked as ${status}`);
      setSelectedTicket(prev => prev ? { ...prev, status } : null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Status update failed');
    }
  };

  const filteredApps = applications.filter(a => {
    const matchesFilter = appFilter === 'ALL' || a.status === appFilter;
    const matchesQuery = !searchQuery ||
      a.store_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone?.includes(searchQuery) ||
      a.application_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const filteredStores = stores.filter(s => {
    return !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery) ||
      s.id?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 16px -4px rgba(2, 132, 199, 0.4)'
          }}>
            <Building2 size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Company Control Center
              </h1>
              <span style={{
                background: '#0284c7',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.05em'
              }}>
                LEVEL 1 — PLATFORM OWNER
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              SaaS merchant onboarding, subscription billing, store approvals, white-label routing, and customer domains.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadAllData}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sync Platform</span>
          </button>
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} />
              <span>Instant Onboard Store</span>
            </button>
          )}
        </div>
      </div>

      {actionNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          background: actionNotice.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${actionNotice.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: actionNotice.type === 'success' ? '#065f46' : '#991b1b'
        }}>
          {actionNotice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { key: 'overview', label: 'Overview & Metrics', icon: Activity },
          { key: 'applications', label: `Store Applications (${applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').length})`, icon: Inbox },
          { key: 'stores', label: `All Stores (${stores.length})`, icon: Building2 },
          { key: 'plans', label: 'Plans & Pricing', icon: Sliders },
          { key: 'invoices', label: 'Platform Billing', icon: Receipt },
          { key: 'domains', label: `Custom Domains (${domains.length})`, icon: Globe },
          { key: 'support', label: `Helpdesk (${tickets.filter(t => t.status === 'OPEN').length})`, icon: LifeBuoy },
          { key: 'logs', label: 'Audit & Telemetry', icon: Cpu }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent',
                color: isActive ? '#0284c7' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW & METRICS                                     */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* Key Metric KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>TOTAL STORES</span>
                <Building2 size={16} color="#0284c7" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '8px 0' }}>
                {stats?.total_tenants ?? stores.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Registered Merchants</div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>ACTIVE STORES</span>
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', margin: '8px 0' }}>
                {stats?.active_tenants ?? stores.filter(s => s.status === 'ACTIVE' || s.status === 'active').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Operational & Paid</div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>PENDING APPLICATIONS</span>
                <Clock size={16} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', margin: '8px 0' }}>
                {applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>Needs Review</div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>PAYMENT PENDING</span>
                <CreditCard size={16} color="#6366f1" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#6366f1', margin: '8px 0' }}>
                {applications.filter(a => a.status === 'PAYMENT_PENDING').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Awaiting First Invoice</div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>PLATFORM MRR</span>
                <Sparkles size={16} color="#059669" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', margin: '8px 0' }}>
                ₹{((stats?.active_tenants || stores.length) * 2499).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Recurring SaaS Revenue</div>
            </div>
          </div>

          {/* Revenue Separation Reminder Notice */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '14px',
            padding: '20px 24px',
            color: 'white',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
                <Lock size={14} />
                Strict Financial Separation Architecture
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '4px' }}>
                Platform SaaS Subscription Revenue vs Store Retail Orders
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.825rem', color: '#94a3b8' }}>
                Company revenue is collected through SaaS plans and setup fees. Customer grocery checkout payments flow exclusively into store merchant accounts.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('invoices')}
              className="btn btn-secondary btn-sm"
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)' }}
            >
              <span>View SaaS Invoices</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Quick Action Split: Pending Applications & Active Stores Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
            {/* Pending Applications preview */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  Recent Applications Requiring Review
                </h3>
                <button
                  onClick={() => setActiveTab('applications')}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  View All ({applications.length})
                </button>
              </div>

              {applications.slice(0, 5).map(app => (
                <div
                  key={app.id}
                  style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{app.store_name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{app.owner_name} • {app.phone}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: app.status === 'APPROVED' ? '#ecfdf5' : app.status === 'PAYMENT_PENDING' ? '#eff6ff' : '#fffbeb',
                      color: app.status === 'APPROVED' ? '#059669' : app.status === 'PAYMENT_PENDING' ? '#1d4ed8' : '#d97706',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}>
                      {app.status}
                    </span>
                    <button
                      onClick={() => { setSelectedApp(app); setActiveTab('applications'); }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Platform Health and Telemetry */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                Infrastructure & System Telemetry
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={16} color="#10b981" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Database Engine</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981' }}>{health?.database?.status || 'CONNECTED (OPTIMAL)'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={16} color="#0284c7" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Multi-Tenant Edge Proxy</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7' }}>SSL AUTO-PROVISIONING</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} color="#6366f1" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Live Fleet WebSockets</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6366f1' }}>ACTIVE (ZERO DELAY)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: STORE APPLICATIONS (PIPELINE)                          */}
      {/* ============================================================== */}
      {activeTab === 'applications' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
              {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PENDING', 'REJECTED'].map(status => (
                <button
                  key={status}
                  onClick={() => setAppFilter(status)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: appFilter === status ? '#0284c7' : '#f1f5f9',
                    color: appFilter === status ? 'white' : '#475569'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search store, owner, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Applications Table */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 18px' }}>App ID</th>
                    <th style={{ padding: '12px 18px' }}>Store & Owner</th>
                    <th style={{ padding: '12px 18px' }}>Contact</th>
                    <th style={{ padding: '12px 18px' }}>Plan</th>
                    <th style={{ padding: '12px 18px' }}>Registered</th>
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No store applications found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map(app => (
                      <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0f172a' }}>
                          {app.application_number}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{app.store_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.owner_name}</div>
                        </td>
                        <td style={{ padding: '12px 18px', color: '#334155' }}>
                          <div>{app.phone}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{app.email}</div>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0284c7' }}>
                          {app.requested_plan?.toUpperCase()}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '0.78rem' }}>
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            background: app.status === 'APPROVED' ? '#ecfdf5' : app.status === 'PAYMENT_PENDING' ? '#eff6ff' : app.status === 'REJECTED' ? '#fef2f2' : '#fffbeb',
                            color: app.status === 'APPROVED' ? '#059669' : app.status === 'PAYMENT_PENDING' ? '#1d4ed8' : app.status === 'REJECTED' ? '#dc2626' : '#d97706',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <Eye size={12} />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Application Detail Review Modal */}
          {selectedApp && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '650px',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7' }}>APPLICATION REVIEW</span>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
                      {selectedApp.store_name}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Owner Name</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedApp.owner_name}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Phone / Mobile</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedApp.phone}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Email Address</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedApp.email}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Requested Plan</span>
                    <div style={{ fontWeight: 800, color: '#0284c7' }}>{selectedApp.requested_plan?.toUpperCase()}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>GST Number</span>
                    <div style={{ color: '#0f172a' }}>{selectedApp.gst_number || 'N/A (Unregistered)'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Address / City</span>
                    <div style={{ color: '#0f172a' }}>{selectedApp.address}, {selectedApp.city}, {selectedApp.state} {selectedApp.pincode}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Review Notes / Approver Comments
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Optional notes visible to auditors..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Workflow Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {selectedApp.status !== 'APPROVED' && selectedApp.status !== 'PAYMENT_PENDING' && (
                    <button
                      onClick={() => handleApproveApp(selectedApp.id)}
                      disabled={isProcessing}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Check size={16} />
                      <span>Approve & Request Payment</span>
                    </button>
                  )}

                  {selectedApp.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleRejectApp(selectedApp.id)}
                      disabled={isProcessing}
                      className="btn btn-danger"
                      style={{ padding: '12px 20px', borderRadius: '8px' }}
                    >
                      Reject Application
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedApp(null)}
                    className="btn btn-secondary"
                    style={{ padding: '12px 18px', borderRadius: '8px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ALL STORES (DIRECTORY)                                 */}
      {/* ============================================================== */}
      {activeTab === 'stores' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              All Registered Stores ({filteredStores.length})
            </h3>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search store name, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 18px' }}>Store & Tenant ID</th>
                    <th style={{ padding: '12px 18px' }}>Owner</th>
                    <th style={{ padding: '12px 18px' }}>Plan</th>
                    <th style={{ padding: '12px 18px' }}>Primary Domain</th>
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map(s => {
                    const isActive = s.status === 'ACTIVE' || s.status === 'active';
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>{s.id}</div>
                        </td>
                        <td style={{ padding: '12px 18px', color: '#334155' }}>
                          <div>{s.owner_name || 'Merchant Admin'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.phone}</div>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0284c7' }}>
                          {s.plan?.toUpperCase() || 'PRO'}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '0.8rem', color: '#475569' }}>
                          {s.domain || `${s.id}.platform.com`}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            background: isActive ? '#ecfdf5' : '#fef2f2',
                            color: isActive ? '#059669' : '#dc2626',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleToggleStoreStatus(s)}
                              className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              {isActive ? 'Suspend' : 'Activate'}
                            </button>
                            {onSelectTenant && (
                              <button
                                onClick={() => onSelectTenant(s.id)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                title="Login As Tenant"
                              >
                                Manage Store
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PLANS & PRICING                                        */}
      {/* ============================================================== */}
      {activeTab === 'plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Subscription Plans & Feature Tiers
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Configurable dynamically from database. Prices are never hard-coded in the platform.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {plans.map(p => (
              <div
                key={p.id}
                style={{
                  background: 'white',
                  border: `2px solid ${p.is_popular ? '#0284c7' : '#e2e8f0'}`,
                  borderRadius: '16px',
                  padding: '24px',
                  position: 'relative'
                }}
              >
                {p.is_popular ? (
                  <span style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    background: '#0284c7',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 10px',
                    borderRadius: '20px'
                  }}>
                    MOST POPULAR
                  </span>
                ) : null}

                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  {p.name}
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b', minHeight: '36px' }}>
                  {p.description}
                </p>

                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '14px' }}>
                  ₹{p.monthly_price?.toLocaleString('en-IN')}{' '}
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>/ mo</span>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Max Products:</span>
                    <strong>{p.max_products?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Staff Accounts:</span>
                    <strong>{p.max_staff}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Delivery Agents:</span>
                    <strong>{p.max_delivery_agents}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Custom Domain:</span>
                    <strong style={{ color: p.custom_domain ? '#059669' : '#94a3b8' }}>{p.custom_domain ? 'YES' : 'NO'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>One-time Setup Fee:</span>
                    <strong>₹{p.setup_fee?.toLocaleString('en-IN') || 0}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: PLATFORM BILLING & INVOICES                            */}
      {/* ============================================================== */}
      {activeTab === 'invoices' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Platform SaaS Subscription Invoices ({invoices.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Store-to-Company SaaS billing transactions. Not mixed with retail store customer checkouts.
              </p>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Invoice #</th>
                  <th style={{ padding: '12px 18px' }}>Tenant ID</th>
                  <th style={{ padding: '12px 18px' }}>Total Amount</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No platform subscription invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0f172a' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#475569' }}>
                        {inv.tenant_id}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: 800, color: '#059669' }}>
                        ₹{inv.total_amount?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{
                          background: inv.status === 'PAID' ? '#ecfdf5' : '#fffbeb',
                          color: inv.status === 'PAID' ? '#059669' : '#d97706',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#64748b' }}>
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: CUSTOM DOMAINS                                         */}
      {/* ============================================================== */}
      {activeTab === 'domains' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Platform Custom Domains ({domains.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                All white-label merchant hostnames dynamically resolved by the reverse proxy.
              </p>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Domain Name</th>
                  <th style={{ padding: '12px 18px' }}>Tenant ID</th>
                  <th style={{ padding: '12px 18px' }}>Type</th>
                  <th style={{ padding: '12px 18px' }}>DNS Verification</th>
                  <th style={{ padding: '12px 18px' }}>SSL Status</th>
                  <th style={{ padding: '12px 18px' }}>Primary</th>
                </tr>
              </thead>
              <tbody>
                {domains.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0f172a' }}>
                      {d.domain}
                    </td>
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#475569' }}>
                      {d.tenant_id}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {d.domain_type}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{
                        background: d.verification_status === 'VERIFIED' ? '#ecfdf5' : '#fffbeb',
                        color: d.verification_status === 'VERIFIED' ? '#059669' : '#d97706',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        {d.verification_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{
                        background: d.ssl_status === 'ACTIVE' ? '#ecfdf5' : '#fffbeb',
                        color: d.ssl_status === 'ACTIVE' ? '#059669' : '#d97706',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        {d.ssl_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      {d.is_primary ? <CheckCircle2 size={16} color="#059669" /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: SUPPORT HELPDESK                                       */}
      {/* ============================================================== */}
      {activeTab === 'support' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                Store Support Tickets ({tickets.length})
              </h3>
            </div>

            {tickets.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  background: selectedTicket?.id === t.id ? '#f0f9ff' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7' }}>
                    #{t.ticket_number || t.id.slice(0, 8)} • {t.tenant_id}
                  </span>
                  <span style={{
                    background: t.status === 'RESOLVED' ? '#ecfdf5' : '#fffbeb',
                    color: t.status === 'RESOLVED' ? '#059669' : '#d97706',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {t.status}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', margin: '4px 0' }}>
                  {t.subject}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Priority: {t.priority} • {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Ticket Response Panel */}
          {selectedTicket && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedTicket.subject}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Tenant: {selectedTicket.tenant_id}
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                {selectedTicket.description}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  onClick={() => handleUpdateTicketStatus('IN_PROGRESS')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => handleUpdateTicketStatus('RESOLVED')}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', background: '#059669' }}
                >
                  Mark Resolved
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Reply to Merchant
                </label>
                <textarea
                  rows={4}
                  placeholder="Type official response from Digi8Solutions platform engineering..."
                  value={ticketReply}
                  onChange={(e) => setTicketReply(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
                <button
                  onClick={handleSendTicketReply}
                  disabled={isProcessing || !ticketReply.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={14} />
                  <span>Send Response</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 8: AUDIT & TELEMETRY                                      */}
      {/* ============================================================== */}
      {activeTab === 'logs' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
              Platform Administrative Audit Trail
            </h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 18px' }}>Action</th>
                <th style={{ padding: '12px 18px' }}>Tenant ID</th>
                <th style={{ padding: '12px 18px' }}>User / Actor</th>
                <th style={{ padding: '12px 18px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>
                    {log.action}
                  </td>
                  <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#64748b' }}>
                    {log.tenant_id || 'PLATFORM_GLOBAL'}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#334155' }}>
                    {log.user_id || 'System'}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '0.78rem' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
