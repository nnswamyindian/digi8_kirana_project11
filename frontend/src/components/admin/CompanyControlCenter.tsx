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
  ArrowUpRight,
  Briefcase,
  Plus,
  Edit,
  DollarSign,
  Package,
  Key,
  PhoneCall,
  Copy,
  Settings,
  Download,
  AlertCircle
} from 'lucide-react';
import { PlatformProjects } from './PlatformProjects';

interface CompanyControlCenterProps {
  initialTab?: 'overview' | 'applications' | 'stores' | 'projects' | 'plans' | 'invoices' | 'domains' | 'support' | 'logs' | 'settings';
  onSelectTenant?: (tenantId: string) => void;
  onOpenOnboarding?: () => void;
}

export const CompanyControlCenter: React.FC<CompanyControlCenterProps> = ({
  initialTab = 'overview',
  onSelectTenant,
  onOpenOnboarding
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'stores' | 'projects' | 'plans' | 'invoices' | 'domains' | 'support' | 'logs' | 'settings'>(initialTab);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
  const [platformSettings, setPlatformSettings] = useState<any>({
    company_profile: {
      company_name: 'Digi8 Solutions Pvt Ltd',
      platform_name: 'Mana Kirana Kottu',
      email: 'support@digi8solutions.com',
      phone: '+91 99999 99999',
      address: 'Plot 104, IT Corridor, Madhapur, Hyderabad, Telangana - 500081',
      gstin: '36AABCD1234E1Z5'
    },
    billing_bank_details: {
      account_name: 'Digi8 Solutions Private Limited',
      bank_name: 'HDFC Bank Ltd',
      account_number: '50200088991122',
      ifsc_code: 'HDFC0001234',
      branch: 'Madhapur Cyber Gateway, Hyderabad',
      upi_id: 'digi8solutions@okhdfcbank',
      invoice_prefix: 'INV-SAAS'
    }
  });

  // Filters & Modals
  const [appFilter, setAppFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [editingAppForm, setEditingAppForm] = useState<any | null>(null);
  const [editingStore, setEditingStore] = useState<any | null>(null);
  const [archivingStore, setArchivingStore] = useState<any | null>(null);
  const [archiveConfirmName, setArchiveConfirmName] = useState<string>('');
  
  // Store 360 Detail Modal
  const [store360ModalData, setStore360ModalData] = useState<any | null>(null);
  const [store360Tab, setStore360Tab] = useState<'overview' | 'invoices' | 'inventory' | 'staff'>('overview');
  
  // Store Credentials Modals
  const [resetPasswordModal, setResetPasswordModal] = useState<any | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState<string>('Store@2026');
  const [newPinValue, setNewPinValue] = useState<string>('1234');
  const [ownerContactModal, setOwnerContactModal] = useState<any | null>(null);
  
  // Store Products & Inventory Modals
  const [quickAddProductModal, setQuickAddProductModal] = useState<any | null>(null);
  const [newProductForm, setNewProductForm] = useState<any>({
    name: '',
    selling_price: '',
    mrp: '',
    purchase_cost: '',
    barcode: '',
    stock: 50,
    unit: 'PACKET'
  });
  const [adjustInventoryModal, setAdjustInventoryModal] = useState<any | null>(null);
  const [adjustForm, setAdjustForm] = useState<{ product_id: string; change_qty: number; reason: string; notes: string }>({
    product_id: '',
    change_qty: 10,
    reason: 'Stock Received / Purchase Inward',
    notes: 'Inward verification by Super Admin'
  });

  // Manual Payment Recording Modal
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState<any>({
    amount: 0,
    payment_method: 'CASH',
    payment_date: new Date().toISOString().slice(0, 10),
    transaction_reference: '',
    notes: 'Payment received directly from store owner',
    received_by: 'Digi8 Super Admin',
    proof_url: '',
    mark_verified: true
  });

  // Invoice Detailed View Modal
  const [viewInvoiceModalData, setViewInvoiceModalData] = useState<any | null>(null);

  // Store Activation Modal
  const [activationModalStore, setActivationModalStore] = useState<any | null>(null);
  const [forceActivationOverride, setForceActivationOverride] = useState<boolean>(false);
  const [activationOverrideReason, setActivationOverrideReason] = useState<string>('');
  const [activationSuccessNotice, setActivationSuccessNotice] = useState<any | null>(null);

  // Plan Management Modal
  const [planModalData, setPlanModalData] = useState<any | null>(null);
  const [isNewPlan, setIsNewPlan] = useState<boolean>(false);

  // Ticket Modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketReply, setTicketReply] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  
  // Feedback & Processing
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
        healthData,
        settingsData
      ] = await Promise.all([
        api.getCompanyDashboardStats().catch(() => null),
        api.getCompanyApplications().catch(() => []),
        api.getCompanyStores().catch(() => []),
        api.getAdminPlans().catch(() => []),
        api.getCompanyInvoices().catch(() => []),
        api.getCompanyDomains().catch(() => []),
        api.getCompanyTickets().catch(() => []),
        api.getPlatformAuditLogs({ limit: 30 }).catch(() => []),
        api.getPlatformHealth().catch(() => null),
        api.getPlatformSettings().catch(() => null)
      ]);

      if (dashStats && typeof dashStats === 'object' && !dashStats.error) setStats(dashStats);
      setApplications(Array.isArray(appsList) ? appsList : []);
      setStores(Array.isArray(storesList) ? storesList : []);
      setPlans(Array.isArray(plansList) ? plansList : []);
      setInvoices(Array.isArray(invList) ? invList : []);
      setDomains(Array.isArray(domList) ? domList : []);
      setTickets(Array.isArray(ticketsList) ? ticketsList : []);
      setAuditLogs(Array.isArray(logsList) ? logsList : []);
      if (healthData && !healthData.error) setHealth(healthData);
      if (settingsData && !settingsData.error) setPlatformSettings(settingsData);
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
    setTimeout(() => setActionNotice(null), 6000);
  };

  // Helper: Open application review with editable state
  const handleOpenAppReview = (app: any) => {
    setSelectedApp(app);
    setReviewNote(app.review_notes || '');
    setEditingAppForm({
      store_name: app.store_name || '',
      owner_name: app.owner_name || '',
      phone: app.phone || '',
      email: app.email || '',
      business_name: app.business_name || app.store_name || '',
      business_type: app.business_type || 'KIRANA_GROCERY',
      requested_plan: (app.requested_plan || 'pro').toLowerCase(),
      address: app.address || '',
      city: app.city || '',
      state: app.state || '',
      pincode: app.pincode || '',
      gst_number: app.gst_number || ''
    });
  };

  // Save changes to application
  const handleSaveAppChanges = async () => {
    if (!selectedApp || !editingAppForm) return;
    setIsProcessing(true);
    try {
      await api.editCompanyApplication(selectedApp.id, {
        ...editingAppForm,
        review_notes: reviewNote
      });
      showNotification('success', `Application #${selectedApp.application_number} updated successfully.`);
      await loadAllData();
      // Refresh current selectedApp
      const updated = await api.getCompanyApplicationDetails(selectedApp.id);
      if (updated?.application) {
        setSelectedApp(updated.application);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update application');
    } finally {
      setIsProcessing(false);
    }
  };

  // Application Approval Flow (Generates invoice, moves to PAYMENT_PENDING)
  const handleApproveApp = async (appId: string) => {
    setIsProcessing(true);
    try {
      const res = await api.approveCompanyApplication(appId, reviewNote || 'Approved by Company Admin');
      showNotification('success', res.message || 'Store application approved! Platform invoice generated.');
      setSelectedApp(null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Approval failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Application Request Changes Flow
  const handleRequestChanges = async (appId: string) => {
    const notes = window.prompt('Enter required corrections or missing documents needed from store owner:', 'Please upload valid GST certificate and shop photo');
    if (!notes) return;
    setIsProcessing(true);
    try {
      const res = await api.requestCompanyApplicationChanges(appId, notes);
      showNotification('success', res.message || 'Changes requested successfully.');
      setSelectedApp(null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to request changes');
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

  // Open Payment Modal for an Invoice or Application
  const handleOpenPaymentModal = (inv: any) => {
    const balance = Number(inv.balance_amount !== undefined ? inv.balance_amount : inv.total_amount);
    const defRef = `CASH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    setPaymentModalInvoice(inv);
    setPaymentForm({
      amount: balance,
      payment_method: 'CASH',
      payment_date: new Date().toISOString().slice(0, 10),
      transaction_reference: defRef,
      notes: `Direct cash settlement from ${inv.store_name || inv.owner_name || 'Store Owner'}`,
      received_by: 'Digi8 Solutions Finance Officer',
      proof_url: '',
      mark_verified: true
    });
  };

  // Submit Manual Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    setIsProcessing(true);
    try {
      const res = await api.recordCompanyPayment(paymentModalInvoice.id, {
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        transaction_reference: paymentForm.transaction_reference,
        notes: paymentForm.notes,
        received_by: paymentForm.received_by,
        proof_url: paymentForm.proof_url,
        mark_verified: paymentForm.mark_verified
      });
      showNotification('success', res.message || 'Payment recorded successfully!');
      setPaymentModalInvoice(null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Store 360 Detail View
  const handleOpenStore360 = async (storeId: string) => {
    setIsProcessing(true);
    try {
      const data = await api.getStore360(storeId);
      setStore360ModalData(data);
      setStore360Tab('overview');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to load store details');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Store Activation Confirmation Modal
  const handleOpenActivationModal = (store: any) => {
    setActivationModalStore(store);
    setForceActivationOverride(false);
    setActivationOverrideReason('');
  };

  // Submit Store Activation
  const handleConfirmActivation = async () => {
    if (!activationModalStore) return;
    setIsProcessing(true);
    try {
      const res = await api.activateStore(activationModalStore.id, {
        force_override: forceActivationOverride,
        override_reason: activationOverrideReason
      });
      showNotification('success', res.message || 'Store activated successfully!');
      setActivationSuccessNotice({
        store_name: activationModalStore.name,
        store_urls: res.store_urls
      });
      setActivationModalStore(null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Store activation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Store Owner Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModal) return;
    setIsProcessing(true);
    try {
      const res = await api.resetStoreOwnerPassword(resetPasswordModal.id, newPasswordValue, newPinValue);
      showNotification('success', res.message || 'Credentials updated successfully.');
      setResetPasswordModal(null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to reset password');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Add Product to Tenant Store
  const handleQuickAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddProductModal) return;
    setIsProcessing(true);
    try {
      const res = await api.addStoreProduct(quickAddProductModal.id, newProductForm);
      showNotification('success', res.message || 'Product created successfully.');
      setQuickAddProductModal(null);
      setNewProductForm({
        name: '',
        selling_price: '',
        mrp: '',
        purchase_cost: '',
        barcode: '',
        stock: 50,
        unit: 'PACKET'
      });
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to add product');
    } finally {
      setIsProcessing(false);
    }
  };

  // Adjust Inventory
  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustInventoryModal) return;
    setIsProcessing(true);
    try {
      const res = await api.adjustStoreInventory(adjustInventoryModal.storeId, {
        product_id: adjustForm.product_id,
        change_qty: Number(adjustForm.change_qty),
        reason: adjustForm.reason,
        notes: adjustForm.notes
      });
      showNotification('success', res.message || 'Inventory updated successfully.');
      setAdjustInventoryModal(null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to adjust inventory');
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
      const inputReason = window.prompt(`Enter reason for suspending "${store.name}":`, 'Administrative review or payment delay');
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

  // Save Plan (Create or Update)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planModalData) return;
    setIsProcessing(true);
    try {
      if (isNewPlan) {
        await api.createAdminPlan(planModalData);
        showNotification('success', `Plan "${planModalData.name}" created successfully.`);
      } else {
        await api.updateAdminPlan(planModalData.id, planModalData);
        showNotification('success', `Plan "${planModalData.name}" updated successfully.`);
      }
      setPlanModalData(null);
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save subscription plan');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Platform Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await api.updatePlatformSettings(platformSettings);
      showNotification('success', 'Platform settings and bank billing configurations saved successfully.');
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save settings');
    } finally {
      setIsProcessing(false);
    }
  };

  // Ticket Reply
  const handleSendTicketReply = async () => {
    if (!selectedTicket || !ticketReply.trim()) return;
    setIsProcessing(true);
    try {
      await api.replyCompanyTicket(selectedTicket.id, ticketReply.trim());
      showNotification('success', 'Reply recorded and dispatched.');
      setTicketReply('');
      await loadAllData();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to send reply');
    } finally {
      setIsProcessing(false);
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
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'inherit' }}>
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
              Operate the complete SaaS business: Store applications, approval & billing lifecycle, manual cash settlements, activation, plans, and store management.
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
          { key: 'applications', label: `Store Applications (${applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW' || a.status === 'PAYMENT_PENDING').length})`, icon: Inbox },
          { key: 'stores', label: `All Stores (${stores.length})`, icon: Building2 },
          { key: 'invoices', label: `Platform Billing (${invoices.length})`, icon: Receipt },
          { key: 'plans', label: `Plans & Pricing (${plans.length})`, icon: Sliders },
          { key: 'projects', label: 'Enterprise Projects', icon: Briefcase },
          { key: 'domains', label: `Custom Domains (${domains.length})`, icon: Globe },
          { key: 'settings', label: 'Platform Settings', icon: Settings },
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
                <span>PENDING / REVIEW</span>
                <Clock size={16} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', margin: '8px 0' }}>
                {applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Awaiting Approval</div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>PAYMENT PENDING</span>
                <DollarSign size={16} color="#0284c7" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0284c7', margin: '8px 0' }}>
                {invoices.filter(i => i.status === 'PENDING' || i.status === 'PARTIALLY_PAID').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>Awaiting Payment Settlement</div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>TOTAL SAAS REVENUE</span>
                <Receipt size={16} color="#059669" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', margin: '8px 0' }}>
                ₹{(stats?.total_platform_revenue ?? invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + Number(i.total_amount), 0)).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Platform Subscription Revenue</div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Pending Store Approvals
                </h3>
                <button onClick={() => setActiveTab('applications')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
                  View All
                </button>
              </div>
              {applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No applications pending review!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').slice(0, 4).map(app => (
                    <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{app.store_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.owner_name} • {app.phone}</div>
                      </div>
                      <button onClick={() => handleOpenAppReview(app)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Unsettled Invoices
                </h3>
                <button onClick={() => setActiveTab('invoices')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
                  View Billing
                </button>
              </div>
              {invoices.filter(i => i.status === 'PENDING' || i.status === 'PARTIALLY_PAID').length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  All platform invoices are fully settled!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {invoices.filter(i => i.status === 'PENDING' || i.status === 'PARTIALLY_PAID').slice(0, 4).map(inv => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{inv.invoice_number} • {inv.store_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700 }}>Due: ₹{Number(inv.balance_amount || inv.total_amount).toLocaleString('en-IN')}</div>
                      </div>
                      <button onClick={() => handleOpenPaymentModal(inv)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#059669', borderColor: '#059669' }}>
                        Record Payment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: STORE APPLICATIONS                                      */}
      {/* ============================================================== */}
      {activeTab === 'applications' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flexWrap: 'wrap' }}>
              {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'ACTIVATED', 'CHANGES_REQUESTED', 'REJECTED'].map(status => (
                <button
                  key={status}
                  onClick={() => setAppFilter(status)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
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

            <div style={{ position: 'relative', width: '280px' }}>
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
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px' }}>Registered</th>
                    <th style={{ padding: '12px 18px' }}>Actions</th>
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
                          <div>{app.application_number}</div>
                          {app.has_potential_duplicate && (
                            <span style={{ fontSize: '0.65rem', background: '#fef2f2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              POSSIBLE DUPLICATE
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{app.store_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.owner_name}</div>
                        </td>
                        <td style={{ padding: '12px 18px', color: '#334155' }}>
                          <div>{app.phone}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{app.email || 'No email provided'}</div>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0284c7' }}>
                          {app.requested_plan?.toUpperCase()}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            background: app.status === 'ACTIVATED' ? '#ecfdf5' : app.status === 'PAYMENT_RECEIVED' ? '#eff6ff' : app.status === 'PAYMENT_PENDING' ? '#fef3c7' : app.status === 'REJECTED' ? '#fef2f2' : '#f1f5f9',
                            color: app.status === 'ACTIVATED' ? '#059669' : app.status === 'PAYMENT_RECEIVED' ? '#1d4ed8' : app.status === 'PAYMENT_PENDING' ? '#d97706' : app.status === 'REJECTED' ? '#dc2626' : '#475569',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '0.78rem' }}>
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenAppReview(app)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              <Eye size={12} />
                              <span>Review & Edit</span>
                            </button>
                            {app.status === 'PAYMENT_RECEIVED' && (
                              <button
                                onClick={() => handleOpenActivationModal({ id: app.tenant_id, name: app.store_name, plan: app.requested_plan, owner_name: app.owner_name })}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.75rem', background: '#059669', borderColor: '#059669' }}
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ALL STORES (DIRECTORY & 360 MANAGEMENT)                 */}
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
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px' }}>Orders / GMV</th>
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
                          <div>{s.owner_name || 'Merchant Owner'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.phone || s.owner_phone}</div>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0284c7' }}>
                          {s.plan?.toUpperCase() || 'PRO'}
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
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.orders_count || 0} orders</div>
                          <div style={{ fontSize: '0.75rem', color: '#059669' }}>₹{Number(s.store_gmv || 0).toLocaleString('en-IN')}</div>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleOpenStore360(s.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                              title="360 Store Operations"
                            >
                              <Eye size={12} />
                              <span>Manage 360</span>
                            </button>
                            {onSelectTenant && (
                              <button
                                onClick={() => onSelectTenant(s.id)}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#0284c7', borderColor: '#0284c7' }}
                                title="Enter Merchant Owner Dashboard"
                              >
                                <span>Open Store</span>
                              </button>
                            )}
                            <button
                              onClick={() => setEditingStore(s)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStoreStatus(s)}
                              className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              {isActive ? 'Suspend' : 'Activate'}
                            </button>
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
      {/* TAB 4: PLATFORM BILLING & INVOICES                            */}
      {/* ============================================================== */}
      {activeTab === 'invoices' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Platform SaaS Subscription Invoices ({invoices.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Store-to-Company SaaS billing transactions. Separated from store grocery retail checkouts.
              </p>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Invoice #</th>
                  <th style={{ padding: '12px 18px' }}>Store & Owner</th>
                  <th style={{ padding: '12px 18px' }}>Total Amount</th>
                  <th style={{ padding: '12px 18px' }}>Paid / Balance</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px' }}>Date</th>
                  <th style={{ padding: '12px 18px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No platform subscription invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map(inv => {
                    const balance = Number(inv.balance_amount !== undefined ? inv.balance_amount : (inv.status === 'PAID' ? 0 : inv.total_amount));
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0f172a' }}>
                          {inv.invoice_number}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{inv.store_name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{inv.owner_name} • {inv.tenant_id}</div>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: '#059669' }}>
                          ₹{Number(inv.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div>Paid: ₹{Number(inv.paid_amount || 0).toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '0.75rem', color: balance > 0 ? '#d97706' : '#059669', fontWeight: 700 }}>
                            Bal: ₹{balance.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            background: inv.status === 'PAID' ? '#ecfdf5' : inv.status === 'PARTIALLY_PAID' ? '#eff6ff' : '#fffbeb',
                            color: inv.status === 'PAID' ? '#059669' : inv.status === 'PARTIALLY_PAID' ? '#1d4ed8' : '#d97706',
                            padding: '3px 8px',
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
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={async () => {
                                const details = await api.getCompanyInvoice(inv.id);
                                setViewInvoiceModalData(details);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                            >
                              View
                            </button>
                            {inv.status !== 'PAID' && (
                              <button
                                onClick={() => handleOpenPaymentModal(inv)}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.72rem', padding: '4px 8px', background: '#059669', borderColor: '#059669' }}
                              >
                                Record Payment
                              </button>
                            )}
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
      )}

      {/* ============================================================== */}
      {/* TAB 5: PLANS & PRICING (DYNAMIC DATABASE CRUD)                 */}
      {/* ============================================================== */}
      {activeTab === 'plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Subscription Plans & Feature Tiers ({plans.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Configured dynamically from database. Modify pricing, limits, and setup fees without touching code.
              </p>
            </div>
            <button
              onClick={() => {
                setIsNewPlan(true);
                setPlanModalData({
                  name: '',
                  slug: '',
                  description: '',
                  monthly_price: 2499,
                  yearly_price: 24990,
                  setup_fee: 2499,
                  max_products: 5000,
                  max_staff: 5,
                  max_delivery_agents: 5,
                  max_orders_per_month: 2000,
                  custom_domain: 1,
                  online_store: 1,
                  pos: 1,
                  inventory: 1,
                  delivery_tracking: 1,
                  mobile_app: 0,
                  advanced_reports: 1,
                  is_popular: 0,
                  status: 'ACTIVE'
                });
              }}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Create Plan</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px' }}>
            {plans.map(p => (
              <div
                key={p.id}
                style={{
                  background: 'white',
                  border: p.is_popular ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '24px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: p.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9', color: p.status === 'ACTIVE' ? '#059669' : '#64748b' }}>
                      {p.status}
                    </span>
                    {p.is_popular ? (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: '20px' }}>
                        POPULAR
                      </span>
                    ) : null}
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                    {p.name}
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b', minHeight: '36px' }}>
                    {p.description}
                  </p>

                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '14px' }}>
                    ₹{Number(p.monthly_price).toLocaleString('en-IN')}{' '}
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>/ mo</span>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Setup Fee:</span>
                      <strong>₹{Number(p.setup_fee || 0).toLocaleString('en-IN')}</strong>
                    </div>
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
                      <span style={{ color: '#64748b' }}>Subscribers:</span>
                      <strong style={{ color: '#0284c7' }}>{p.active_subscribers_count || 0} stores</strong>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <button
                    onClick={() => {
                      setIsNewPlan(false);
                      setPlanModalData(p);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Edit size={12} />
                    <span>Edit Plan</span>
                  </button>
                  <button
                    onClick={async () => {
                      const next = p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
                      await api.updateAdminPlanStatus(p.id, next);
                      showNotification('success', `Plan status set to ${next}`);
                      await loadAllData();
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    {p.status === 'ACTIVE' ? 'Archive' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: PLATFORM SETTINGS (COMPANY & BANK BILLING DETAILS)      */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', maxWidth: '800px' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
            Platform SaaS & Billing Configuration
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>
            Company credentials printed on all official SaaS invoices, payment gateways, and merchant settlement receipts.
          </p>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>
                1. Company Profile (Digi8 Solutions)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Company Legal Name</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.company_profile?.company_name || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      company_profile: { ...platformSettings.company_profile, company_name: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Company GSTIN</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.company_profile?.gstin || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      company_profile: { ...platformSettings.company_profile, gstin: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Support Email</label>
                  <input
                    type="email"
                    required
                    value={platformSettings.company_profile?.email || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      company_profile: { ...platformSettings.company_profile, email: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Support Phone</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.company_profile?.phone || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      company_profile: { ...platformSettings.company_profile, phone: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Registered Head Office Address</label>
                <input
                  type="text"
                  required
                  value={platformSettings.company_profile?.address || ''}
                  onChange={e => setPlatformSettings({
                    ...platformSettings,
                    company_profile: { ...platformSettings.company_profile, address: e.target.value }
                  })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0284c7' }}>
                2. Company Bank Details & UPI QR (For SaaS Subscription Collections)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Bank Account Name</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.billing_bank_details?.account_name || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      billing_bank_details: { ...platformSettings.billing_bank_details, account_name: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Bank Name</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.billing_bank_details?.bank_name || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      billing_bank_details: { ...platformSettings.billing_bank_details, bank_name: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Account Number</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.billing_bank_details?.account_number || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      billing_bank_details: { ...platformSettings.billing_bank_details, account_number: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.billing_bank_details?.ifsc_code || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      billing_bank_details: { ...platformSettings.billing_bank_details, ifsc_code: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Official Company UPI ID</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.billing_bank_details?.upi_id || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      billing_bank_details: { ...platformSettings.billing_bank_details, upi_id: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Branch Name</label>
                  <input
                    type="text"
                    required
                    value={platformSettings.billing_bank_details?.branch || ''}
                    onChange={e => setPlatformSettings({
                      ...platformSettings,
                      billing_bank_details: { ...platformSettings.billing_bank_details, branch: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
              <button
                type="submit"
                disabled={isProcessing}
                className="btn btn-primary"
                style={{ background: '#0284c7', borderColor: '#0284c7', padding: '10px 24px' }}
              >
                {isProcessing ? 'Saving Settings...' : 'Save Platform Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: ENTERPRISE PROJECTS (DIGI8 SOLUTIONS SERVICES)            */}
      {/* ============================================================== */}
      {activeTab === 'projects' && (
        <PlatformProjects onBackToOverview={() => setActiveTab('overview')} />
      )}

      {/* ============================================================== */}
      {/* TAB: CUSTOM DOMAINS                                           */}
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
                </tr>
              </thead>
              <tbody>
                {domains.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0f172a' }}>{d.domain}</td>
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#475569' }}>{d.tenant_id}</td>
                    <td style={{ padding: '12px 18px' }}>{d.domain_type}</td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                        {d.verification_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                        {d.ssl_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: SUPPORT HELPDESK                                         */}
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
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7' }}>#{t.ticket_number || t.id.slice(0, 8)} • {t.tenant_id}</span>
                  <span style={{ background: t.status === 'RESOLVED' ? '#ecfdf5' : '#fffbeb', color: t.status === 'RESOLVED' ? '#059669' : '#d97706', fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                    {t.status}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', margin: '4px 0' }}>{t.subject}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Priority: {t.priority} • {new Date(t.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>

          {selectedTicket && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{selectedTicket.subject}</h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tenant: {selectedTicket.tenant_id}</div>
                </div>
                <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                {selectedTicket.description}
              </div>
              <textarea
                rows={3}
                placeholder="Type official response..."
                value={ticketReply}
                onChange={e => setTicketReply(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              <button onClick={handleSendTicketReply} disabled={isProcessing || !ticketReply.trim()} className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
                Send Response
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: AUDIT & TELEMETRY                                        */}
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
                  <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>{log.action}</td>
                  <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#64748b' }}>{log.tenant_id || 'PLATFORM_GLOBAL'}</td>
                  <td style={{ padding: '12px 18px', color: '#334155' }}>{log.user_id || 'Super Admin'}</td>
                  <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '0.78rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: APPLICATION REVIEW & INLINE EDITING                   */}
      {/* ============================================================== */}
      {selectedApp && editingAppForm && (
        <div className="modal-backdrop" onClick={() => setSelectedApp(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7' }}>
                  APPLICATION REVIEW & OPERATIONAL WORKFLOW
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900 }}>
                  {selectedApp.store_name} (#{selectedApp.application_number})
                </h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setSelectedApp(null)}><X size={16} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
              {selectedApp.has_potential_duplicate && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#92400e', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertCircle size={16} />
                  <span><strong>Duplicate Protection Warning:</strong> An application with matching phone/email already exists. Please verify merchant authenticity.</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Store Name</label>
                  <input
                    type="text"
                    value={editingAppForm.store_name}
                    onChange={e => setEditingAppForm({ ...editingAppForm, store_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Owner Name</label>
                  <input
                    type="text"
                    value={editingAppForm.owner_name}
                    onChange={e => setEditingAppForm({ ...editingAppForm, owner_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Mobile Phone</label>
                  <input
                    type="text"
                    value={editingAppForm.phone}
                    onChange={e => setEditingAppForm({ ...editingAppForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Email Address</label>
                  <input
                    type="email"
                    value={editingAppForm.email}
                    onChange={e => setEditingAppForm({ ...editingAppForm, email: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Requested Plan Tier</label>
                  <select
                    value={editingAppForm.requested_plan}
                    onChange={e => setEditingAppForm({ ...editingAppForm, requested_plan: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.slug}>
                        {p.name} (₹{Number(p.monthly_price).toLocaleString('en-IN')}/mo)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>GST Number</label>
                  <input
                    type="text"
                    value={editingAppForm.gst_number}
                    onChange={e => setEditingAppForm({ ...editingAppForm, gst_number: e.target.value })}
                    placeholder="e.g. 36AABCD1234E1Z5"
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Store Address & City</label>
                <input
                  type="text"
                  value={editingAppForm.address}
                  onChange={e => setEditingAppForm({ ...editingAppForm, address: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Live Pricing Breakdown Preview */}
              {(() => {
                const selectedP = plans.find(p => p.slug === editingAppForm.requested_plan) || plans[0] || { monthly_price: 2499, setup_fee: 2499 };
                const sub = Number(selectedP.monthly_price || 2499) + Number(selectedP.setup_fee || 0);
                const tax = Math.round(sub * 0.18 * 100) / 100;
                const total = Math.round((sub + tax) * 100) / 100;
                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                      Pricing Breakdown for Approval & Invoice Generation:
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Subscription ({selectedP.name}):</span>
                      <span>₹{Number(selectedP.monthly_price).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>One-Time Setup Fee:</span>
                      <span>₹{Number(selectedP.setup_fee || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>GST (18%):</span>
                      <span>₹{tax.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#059669', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
                      <span>Total Invoice Due:</span>
                      <span>₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Review Notes / Auditor Comments</label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Notes visible on audit trail..."
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '14px 20px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSaveAppChanges}
                  disabled={isProcessing}
                  className="btn btn-secondary btn-sm"
                >
                  Save Edits
                </button>
                <button
                  type="button"
                  onClick={() => handleRequestChanges(selectedApp.id)}
                  disabled={isProcessing}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#d97706' }}
                >
                  Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectApp(selectedApp.id)}
                  disabled={isProcessing}
                  className="btn btn-danger btn-sm"
                >
                  Reject
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {selectedApp.status !== 'APPROVED' && selectedApp.status !== 'PAYMENT_PENDING' && selectedApp.status !== 'PAYMENT_RECEIVED' && selectedApp.status !== 'ACTIVATED' && (
                  <button
                    type="button"
                    onClick={() => handleApproveApp(selectedApp.id)}
                    disabled={isProcessing}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#059669', borderColor: '#059669' }}
                  >
                    Approve & Issue Invoice
                  </button>
                )}
                {(selectedApp.status === 'PAYMENT_PENDING' || selectedApp.status === 'APPROVED') && (
                  <button
                    type="button"
                    onClick={() => {
                      const inv = invoices.find(i => i.tenant_id === selectedApp.tenant_id);
                      if (inv) handleOpenPaymentModal(inv);
                      else showNotification('error', 'Platform invoice not found for this tenant.');
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#0284c7' }}
                  >
                    Record Payment
                  </button>
                )}
                {selectedApp.status === 'PAYMENT_RECEIVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenActivationModal({
                        id: selectedApp.tenant_id,
                        name: selectedApp.store_name,
                        plan: selectedApp.requested_plan,
                        owner_name: selectedApp.owner_name,
                        email: selectedApp.email,
                        phone: selectedApp.phone
                      });
                      setSelectedApp(null);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#059669' }}
                  >
                    Activate Store Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: RECORD MANUAL PAYMENT (CASH, BANK, UPI, CHEQUE)       */}
      {/* ============================================================== */}
      {paymentModalInvoice && (
        <div className="modal-backdrop" onClick={() => setPaymentModalInvoice(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669' }}>MANUAL PAYMENT RECORDING</span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900 }}>
                  Invoice {paymentModalInvoice.invoice_number}
                </h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setPaymentModalInvoice(null)}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Store Name:</span>
                    <strong>{paymentModalInvoice.store_name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Invoice Total:</span>
                    <strong>₹{Number(paymentModalInvoice.total_amount).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7' }}>
                    <span>Remaining Balance:</span>
                    <strong>₹{Number(paymentModalInvoice.balance_amount !== undefined ? paymentModalInvoice.balance_amount : paymentModalInvoice.total_amount).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Payment Method</label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="CASH">CASH (Physical Handover)</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS/IMPS)</option>
                      <option value="UPI">UPI DIRECT TRANSFER</option>
                      <option value="CHEQUE">CHEQUE</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Amount to Record (₹)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Payment Date</label>
                    <input
                      type="date"
                      required
                      value={paymentForm.payment_date}
                      onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Reference / UTR / Receipt #</label>
                    <input
                      type="text"
                      required
                      value={paymentForm.transaction_reference}
                      onChange={e => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Received By (Admin / Officer Name)</label>
                  <input
                    type="text"
                    required
                    value={paymentForm.received_by}
                    onChange={e => setPaymentForm({ ...paymentForm, received_by: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Payment Proof URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://.../receipt.jpg"
                    value={paymentForm.proof_url}
                    onChange={e => setPaymentForm({ ...paymentForm, proof_url: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Settlement Notes</label>
                  <textarea
                    rows={2}
                    value={paymentForm.notes}
                    onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="mark_verified_chk"
                    checked={paymentForm.mark_verified}
                    onChange={e => setPaymentForm({ ...paymentForm, mark_verified: e.target.checked })}
                  />
                  <label htmlFor="mark_verified_chk" style={{ fontSize: '0.8rem', color: '#334155' }}>
                    Mark payment as officially <strong>VERIFIED</strong> immediately (Authorized Administrator)
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPaymentModalInvoice(null)}>Cancel</button>
                <button type="submit" disabled={isProcessing} className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
                  {isProcessing ? 'Recording Payment...' : 'Record & Verify Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: STORE ACTIVATION CONFIRMATION                         */}
      {/* ============================================================== */}
      {activationModalStore && (
        <div className="modal-backdrop" onClick={() => setActivationModalStore(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>
                  Activate {activationModalStore.name}?
                </h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setActivationModalStore(null)}><X size={16} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                Activating this store will immediately enable <strong>Store Owner login</strong>, POS billing counters, product cataloging, and the live storefront.
              </p>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Store Name:</span>
                  <strong>{activationModalStore.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Plan Tier:</span>
                  <strong>{activationModalStore.plan?.toUpperCase() || 'PROFESSIONAL'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Owner:</span>
                  <strong>{activationModalStore.owner_name || 'Store Owner'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Subscription Start:</span>
                  <strong>{new Date().toLocaleDateString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Subscription End:</span>
                  <strong>{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>
                </div>
              </div>

              {/* Force Override for Unpaid Invoices */}
              <div style={{ border: '1px solid #fed7aa', background: '#fff7ed', padding: '12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    id="override_chk"
                    checked={forceActivationOverride}
                    onChange={e => setForceActivationOverride(e.target.checked)}
                  />
                  <label htmlFor="override_chk" style={{ fontWeight: 700, color: '#c2410c' }}>
                    Activate without prior payment verification (Admin Override)
                  </label>
                </div>
                {forceActivationOverride && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', marginBottom: '4px' }}>
                      Mandatory Override Audit Reason:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIP pilot merchant approved by Management"
                      value={activationOverrideReason}
                      onChange={e => setActivationOverrideReason(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.8rem' }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActivationModalStore(null)}>Cancel</button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmActivation}
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                {isProcessing ? 'Activating Store...' : 'Confirm & Activate Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ACTIVATION SUCCESS & URLS DISPLAY                      */}
      {/* ============================================================== */}
      {activationSuccessNotice && (
        <div className="modal-backdrop" onClick={() => setActivationSuccessNotice(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={24} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#059669' }}>
                  {activationSuccessNotice.store_name} Is Live!
                </h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setActivationSuccessNotice(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <p style={{ margin: 0, color: '#334155' }}>
                Store activated and ready for operations! Generated management and storefront links:
              </p>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>STORE MANAGEMENT URL:</span>
                  <div style={{ fontWeight: 800, color: '#0284c7' }}>{activationSuccessNotice.store_urls?.admin_login_url || 'https://manakiranakottu.com/owner'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>STOREFRONT URL:</span>
                  <div style={{ fontWeight: 800, color: '#059669' }}>{activationSuccessNotice.store_urls?.storefront_url}</div>
                </div>
                {activationSuccessNotice.store_urls?.custom_domain_url && (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>CUSTOM DOMAIN:</span>
                    <div style={{ fontWeight: 800, color: '#7c3aed' }}>{activationSuccessNotice.store_urls?.custom_domain_url}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-primary" onClick={() => setActivationSuccessNotice(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: STORE 360 COMPREHENSIVE DETAIL VIEW                   */}
      {/* ============================================================== */}
      {store360ModalData && (
        <div className="modal-backdrop" onClick={() => setStore360ModalData(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7' }}>STORE 360 OPERATIONAL DASHBOARD</span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 900 }}>
                  {store360ModalData.store?.name}
                </h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setStore360ModalData(null)}><X size={16} /></button>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', padding: '0 20px', background: '#f8fafc' }}>
              {[
                { key: 'overview', label: 'Overview & Credentials' },
                { key: 'invoices', label: `Invoices & Billing (${store360ModalData.invoices?.length || 0})` },
                { key: 'inventory', label: `Products & Stock (${store360ModalData.metrics?.products_count || 0})` },
                { key: 'staff', label: `Staff Accounts (${store360ModalData.staff?.length || 0})` }
              ].map(st => (
                <button
                  key={st.key}
                  onClick={() => setStore360Tab(st.key as any)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    borderBottom: store360Tab === st.key ? '2px solid #0284c7' : '2px solid transparent',
                    color: store360Tab === st.key ? '#0284c7' : '#64748b',
                    fontWeight: store360Tab === st.key ? 800 : 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="modal-body" style={{ padding: '20px', maxHeight: '68vh', overflowY: 'auto' }}>
              {store360Tab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Store Status</div>
                      <div style={{ fontWeight: 800, color: store360ModalData.store?.status === 'ACTIVE' ? '#059669' : '#dc2626' }}>
                        {store360ModalData.store?.status}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Plan Tier</div>
                      <div style={{ fontWeight: 800, color: '#0284c7' }}>{store360ModalData.store?.plan?.toUpperCase()}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Lifetime GMV</div>
                      <div style={{ fontWeight: 800, color: '#059669' }}>₹{store360ModalData.metrics?.total_store_gmv?.toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total Orders</div>
                      <div style={{ fontWeight: 800 }}>{store360ModalData.metrics?.orders_count}</div>
                    </div>
                  </div>

                  {/* Store Owner Credentials Box */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Store Owner Account</h4>
                      <button
                        onClick={() => {
                          setResetPasswordModal(store360ModalData.store);
                          setNewPasswordValue('Store@2026');
                          setNewPinValue('1234');
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Key size={12} />
                        <span>Reset Password / PIN</span>
                      </button>
                    </div>
                    <div style={{ fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div><span style={{ color: '#64748b' }}>Owner Name:</span> <strong>{store360ModalData.owner?.name || store360ModalData.store?.owner_name}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Phone:</span> <strong>{store360ModalData.owner?.phone || store360ModalData.store?.owner_phone}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Email:</span> <strong>{store360ModalData.owner?.email || store360ModalData.store?.owner_email || 'None'}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Last Login:</span> <strong>{store360ModalData.owner?.last_login ? new Date(store360ModalData.owner.last_login).toLocaleString() : 'Never'}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {store360Tab === 'invoices' && (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                        <th style={{ padding: '8px' }}>Invoice #</th>
                        <th style={{ padding: '8px' }}>Amount</th>
                        <th style={{ padding: '8px' }}>Status</th>
                        <th style={{ padding: '8px' }}>Date</th>
                        <th style={{ padding: '8px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store360ModalData.invoices?.map((inv: any) => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{inv.invoice_number}</td>
                          <td style={{ padding: '8px', fontWeight: 700, color: '#059669' }}>₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px' }}>{inv.status}</td>
                          <td style={{ padding: '8px' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '8px' }}>
                            {inv.status !== 'PAID' && (
                              <button
                                onClick={() => handleOpenPaymentModal({ ...inv, store_name: store360ModalData.store?.name })}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                              >
                                Record Payment
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {store360Tab === 'inventory' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Total Catalog: <strong>{store360ModalData.metrics?.products_count} items</strong> • Total Stock: <strong>{store360ModalData.metrics?.total_inventory_units} units</strong>
                    </div>
                    <button
                      onClick={() => setQuickAddProductModal(store360ModalData.store)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={12} />
                      <span>Add Product</span>
                    </button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                        <th style={{ padding: '8px' }}>Product</th>
                        <th style={{ padding: '8px' }}>Barcode</th>
                        <th style={{ padding: '8px' }}>Price</th>
                        <th style={{ padding: '8px' }}>Stock</th>
                        <th style={{ padding: '8px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store360ModalData.recent_products?.map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{p.name}</td>
                          <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.barcode}</td>
                          <td style={{ padding: '8px', fontWeight: 700 }}>₹{Number(p.selling_price).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px', fontWeight: 800, color: p.stock > 10 ? '#059669' : '#dc2626' }}>{p.stock}</td>
                          <td style={{ padding: '8px' }}>
                            <button
                              onClick={() => {
                                setAdjustInventoryModal({ storeId: store360ModalData.store.id, product: p });
                                setAdjustForm({ product_id: p.id, change_qty: 10, reason: 'Stock Inward', notes: 'Verified by Admin' });
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                            >
                              Adjust Stock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {store360Tab === 'staff' && (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                        <th style={{ padding: '8px' }}>Name</th>
                        <th style={{ padding: '8px' }}>Role</th>
                        <th style={{ padding: '8px' }}>Phone / Email</th>
                        <th style={{ padding: '8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store360ModalData.staff?.map((u: any) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{u.name}</td>
                          <td style={{ padding: '8px', fontWeight: 700, color: '#0284c7' }}>{u.role}</td>
                          <td style={{ padding: '8px' }}>{u.phone} {u.email ? `• ${u.email}` : ''}</td>
                          <td style={{ padding: '8px' }}>{u.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-secondary" onClick={() => setStore360ModalData(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: RESET STORE OWNER PASSWORD                            */}
      {/* ============================================================== */}
      {resetPasswordModal && (
        <div className="modal-backdrop" onClick={() => setResetPasswordModal(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reset Store Owner Credentials</h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setResetPasswordModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Assigning new credentials for <strong>{resetPasswordModal.name}</strong> will instantly invalidate all active browser and POS sessions for security.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>New Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={newPasswordValue}
                    onChange={e => setNewPasswordValue(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>New Quick Security PIN (4-6 digits)</label>
                  <input
                    type="text"
                    required
                    value={newPinValue}
                    onChange={e => setNewPinValue(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setResetPasswordModal(null)}>Cancel</button>
                <button type="submit" disabled={isProcessing} className="btn btn-primary" style={{ background: '#0284c7' }}>
                  {isProcessing ? 'Updating...' : 'Update & Revoke Sessions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: QUICK ADD PRODUCT TO STORE                            */}
      {/* ============================================================== */}
      {quickAddProductModal && (
        <div className="modal-backdrop" onClick={() => setQuickAddProductModal(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Add Product to {quickAddProductModal.name}</h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setQuickAddProductModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleQuickAddProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fortune Sunlite Sunflower Oil 1L"
                    value={newProductForm.name}
                    onChange={e => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Selling Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newProductForm.selling_price}
                      onChange={e => setNewProductForm({ ...newProductForm, selling_price: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>MRP (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={newProductForm.mrp}
                      onChange={e => setNewProductForm({ ...newProductForm, mrp: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Barcode (Optional)</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if empty"
                      value={newProductForm.barcode}
                      onChange={e => setNewProductForm({ ...newProductForm, barcode: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Opening Stock Units</label>
                    <input
                      type="number"
                      value={newProductForm.stock}
                      onChange={e => setNewProductForm({ ...newProductForm, stock: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setQuickAddProductModal(null)}>Cancel</button>
                <button type="submit" disabled={isProcessing} className="btn btn-primary" style={{ background: '#0284c7' }}>
                  {isProcessing ? 'Adding...' : 'Add to Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 8: ADJUST STORE INVENTORY                                */}
      {/* ============================================================== */}
      {adjustInventoryModal && (
        <div className="modal-backdrop" onClick={() => setAdjustInventoryModal(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Adjust Stock: {adjustInventoryModal.product?.name}</h3>
              <button className="btn-icon btn-secondary" onClick={() => setAdjustInventoryModal(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdjustInventory}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  Current Stock: <strong>{adjustInventoryModal.product?.stock} units</strong>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Stock Change (+ or -)</label>
                  <input
                    type="number"
                    required
                    value={adjustForm.change_qty}
                    onChange={e => setAdjustForm({ ...adjustForm, change_qty: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    New Stock will be: <strong>{Math.max(0, Number(adjustInventoryModal.product?.stock || 0) + Number(adjustForm.change_qty))} units</strong>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Adjustment Reason</label>
                  <input
                    type="text"
                    required
                    value={adjustForm.reason}
                    onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAdjustInventoryModal(null)}>Cancel</button>
                <button type="submit" disabled={isProcessing} className="btn btn-primary" style={{ background: '#0284c7' }}>
                  {isProcessing ? 'Saving...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 9: VIEW INVOICE & PAYMENT HISTORY                        */}
      {/* ============================================================== */}
      {viewInvoiceModalData && (
        <div className="modal-backdrop" onClick={() => setViewInvoiceModalData(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7' }}>OFFICIAL PLATFORM INVOICE</span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900 }}>
                  {viewInvoiceModalData.invoice?.invoice_number}
                </h3>
              </div>
              <button className="btn-icon btn-secondary" onClick={() => setViewInvoiceModalData(null)}><X size={16} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{platformSettings.company_profile?.company_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GSTIN: {platformSettings.company_profile?.gstin}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{platformSettings.company_profile?.address}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800 }}>BILLED TO:</div>
                  <div style={{ fontWeight: 800, color: '#0284c7' }}>{viewInvoiceModalData.invoice?.store_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{viewInvoiceModalData.invoice?.owner_name} • {viewInvoiceModalData.invoice?.owner_phone}</div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Description</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let items = [];
                      try { items = JSON.parse(viewInvoiceModalData.invoice?.line_items_json || '[]'); } catch {}
                      if (items.length === 0) {
                        items = [
                          { description: `${viewInvoiceModalData.invoice?.plan_name_snapshot || 'Platform'} Subscription`, amount: viewInvoiceModalData.invoice?.monthly_price_snapshot || viewInvoiceModalData.invoice?.amount },
                          { description: 'One-Time Setup Fee', amount: viewInvoiceModalData.invoice?.setup_fee_snapshot || 0 },
                          { description: 'GST (18%)', amount: viewInvoiceModalData.invoice?.tax_amount }
                        ];
                      }
                      return items.map((it: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px' }}>{it.description}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₹{Number(it.amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Grand Total:</span>
                <span style={{ color: '#059669', fontSize: '1.1rem' }}>₹{Number(viewInvoiceModalData.invoice?.total_amount).toLocaleString('en-IN')}</span>
              </div>

              {/* Payments History */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 800 }}>Payment Transactions ({viewInvoiceModalData.payments?.length || 0})</h4>
                {viewInvoiceModalData.payments?.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No payments recorded yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#64748b' }}>
                        <th style={{ padding: '4px 6px' }}>Date</th>
                        <th style={{ padding: '4px 6px' }}>Method</th>
                        <th style={{ padding: '4px 6px' }}>Ref</th>
                        <th style={{ padding: '4px 6px' }}>Amount</th>
                        <th style={{ padding: '4px 6px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewInvoiceModalData.payments.map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 6px' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '4px 6px', fontWeight: 700 }}>{p.payment_method}</td>
                          <td style={{ padding: '4px 6px' }}>{p.transaction_reference}</td>
                          <td style={{ padding: '4px 6px', fontWeight: 800, color: '#059669' }}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '4px 6px' }}>{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '12px 20px', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-secondary" onClick={() => setViewInvoiceModalData(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 10: PLAN CREATION & EDITING                              */}
      {/* ============================================================== */}
      {planModalData && (
        <div className="modal-backdrop" onClick={() => setPlanModalData(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{isNewPlan ? 'Create Subscription Plan' : `Edit Plan: ${planModalData.name}`}</h3>
              <button className="btn-icon btn-secondary" onClick={() => setPlanModalData(null)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSavePlan}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Plan Name</label>
                    <input
                      type="text"
                      required
                      value={planModalData.name}
                      onChange={e => setPlanModalData({ ...planModalData, name: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Slug</label>
                    <input
                      type="text"
                      required
                      value={planModalData.slug}
                      onChange={e => setPlanModalData({ ...planModalData, slug: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Monthly (₹)</label>
                    <input
                      type="number"
                      required
                      value={planModalData.monthly_price}
                      onChange={e => setPlanModalData({ ...planModalData, monthly_price: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Yearly (₹)</label>
                    <input
                      type="number"
                      required
                      value={planModalData.yearly_price}
                      onChange={e => setPlanModalData({ ...planModalData, yearly_price: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Setup Fee (₹)</label>
                    <input
                      type="number"
                      value={planModalData.setup_fee}
                      onChange={e => setPlanModalData({ ...planModalData, setup_fee: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Max Products</label>
                    <input
                      type="number"
                      value={planModalData.max_products}
                      onChange={e => setPlanModalData({ ...planModalData, max_products: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Staff Accounts</label>
                    <input
                      type="number"
                      value={planModalData.max_staff}
                      onChange={e => setPlanModalData({ ...planModalData, max_staff: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Delivery Agents</label>
                    <input
                      type="number"
                      value={planModalData.max_delivery_agents}
                      onChange={e => setPlanModalData({ ...planModalData, max_delivery_agents: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Description</label>
                  <textarea
                    rows={2}
                    value={planModalData.description}
                    onChange={e => setPlanModalData({ ...planModalData, description: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPlanModalData(null)}>Cancel</button>
                <button type="submit" disabled={isProcessing} className="btn btn-primary" style={{ background: '#0284c7' }}>
                  {isProcessing ? 'Saving Plan...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STORE MODAL */}
      {editingStore && (
        <div className="modal-backdrop" onClick={() => setEditingStore(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Edit Store: {editingStore.name}</h3>
              <button className="btn-icon btn-secondary" onClick={() => setEditingStore(null)}><X size={16} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsProcessing(true);
              try {
                await api.updateStore360(editingStore.id, editingStore);
                showNotification('success', `Store "${editingStore.name}" updated successfully.`);
                setEditingStore(null);
                await loadAllData();
              } catch (err: any) {
                showNotification('error', err.message || 'Failed to update store');
              } finally {
                setIsProcessing(false);
              }
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Store Name</label>
                  <input
                    type="text"
                    required
                    value={editingStore.name}
                    onChange={e => setEditingStore({ ...editingStore, name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Owner Name</label>
                    <input
                      type="text"
                      value={editingStore.owner_name || ''}
                      onChange={e => setEditingStore({ ...editingStore, owner_name: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Owner Phone</label>
                    <input
                      type="text"
                      value={editingStore.phone || editingStore.owner_phone || ''}
                      onChange={e => setEditingStore({ ...editingStore, owner_phone: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Plan</label>
                    <select
                      value={editingStore.plan || 'PRO'}
                      onChange={e => setEditingStore({ ...editingStore, plan: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="STARTER">STARTER</option>
                      <option value="PRO">PRO</option>
                      <option value="GROWTH">GROWTH</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>Status</label>
                    <select
                      value={editingStore.status || 'ACTIVE'}
                      onChange={e => setEditingStore({ ...editingStore, status: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PENDING">PENDING</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingStore(null)}>Cancel</button>
                <button type="submit" disabled={isProcessing} className="btn btn-primary" style={{ background: '#0284c7' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
