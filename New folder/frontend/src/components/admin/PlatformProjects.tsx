import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Briefcase,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  DollarSign,
  Calendar,
  User,
  Building,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Receipt
} from 'lucide-react';

interface PlatformProjectsProps {
  onBackToOverview?: () => void;
}

export const PlatformProjects: React.FC<PlatformProjectsProps> = ({ onBackToOverview }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    category: 'SAAS_EXPANSION',
    status: 'ACTIVE',
    total_budget: '',
    amount_paid: '',
    lead_engineer: '',
    start_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    description: ''
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getPlatformProjects();
      setProjects(data.projects || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      console.error('Failed to load platform projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.client_name.trim()) {
      alert('Please provide project name and client name');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createPlatformProject({
        ...formData,
        total_budget: Number(formData.total_budget) || 0,
        amount_paid: Number(formData.amount_paid) || 0
      });
      setNotice({ type: 'success', text: `Project "${formData.name}" added to enterprise portfolio!` });
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        client_name: '',
        category: 'SAAS_EXPANSION',
        status: 'ACTIVE',
        total_budget: '',
        amount_paid: '',
        lead_engineer: '',
        start_date: new Date().toISOString().split('T')[0],
        completion_date: '',
        description: ''
      });
      await loadProjects();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Failed to create project' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    const matchesSearch = !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lead_engineer?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '4px' }}>
      {/* Scope Disclaimer Banner */}
      <div style={{
        background: 'linear-gradient(90deg, #0f172a, #1e293b)',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Briefcase size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Company Enterprise Projects & Client Deployments
              <span style={{ fontSize: '0.68rem', background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                DIGI8 SOLUTIONS
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Institutional implementations, chain migrations, and ERP integrations. Fully segregated from individual Kirana store counter sales.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadProjects}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', color: 'white', border: '1px solid #475569' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', borderColor: '#0284c7' }}
          >
            <Plus size={14} />
            <span>New Enterprise Project</span>
          </button>
        </div>
      </div>

      {notice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: notice.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${notice.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: notice.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          {notice.text}
        </div>
      )}

      {/* Financial Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Total Projects</span>
            <Briefcase size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px 0' }}>
            {summary?.total_projects || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
            {summary?.active_projects || 0} Active Deployments
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Contracted Budget</span>
            <DollarSign size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', margin: '8px 0 4px 0' }}>
            {formatCurrency(summary?.total_budget || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            All Active & Historical Contracts
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Payments Collected</span>
            <TrendingUp size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7', margin: '8px 0 4px 0' }}>
            {formatCurrency(summary?.total_paid || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
            {summary?.total_budget ? Math.round(((summary?.total_paid || 0) / summary.total_budget) * 100) : 0}% Realized
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <span>Outstanding Balance</span>
            <AlertCircle size={16} color="#eab308" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', margin: '8px 0 4px 0' }}>
            {formatCurrency(summary?.total_outstanding || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Pending Milestone Invoices
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Projects' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'PLANNING', label: 'Planning' },
            { id: 'COMPLETED', label: 'Completed' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: filterStatus === f.id ? '1px solid #0284c7' : '1px solid #e2e8f0',
                background: filterStatus === f.id ? '#f0f9ff' : 'white',
                color: filterStatus === f.id ? '#0284c7' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search project or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px 8px 32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Projects Table / Cards */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Project & Client</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Contract Value</th>
                <th style={{ padding: '12px 16px' }}>Collected</th>
                <th style={{ padding: '12px 16px' }}>Balance</th>
                <th style={{ padding: '12px 16px' }}>Invoice Status</th>
                <th style={{ padding: '12px 16px' }}>Lead Engineer</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                    <div>Loading enterprise projects portfolio...</div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No projects found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const percentPaid = p.total_budget > 0 ? Math.round((p.amount_paid / p.total_budget) * 100) : 0;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Building size={12} />
                          <span>{p.client_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          {p.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: p.status === 'COMPLETED' ? '#f0fdf4' : p.status === 'ACTIVE' || p.status === 'IN_PROGRESS' ? '#e0f2fe' : '#fef3c7',
                          color: p.status === 'COMPLETED' ? '#166534' : p.status === 'ACTIVE' || p.status === 'IN_PROGRESS' ? '#0369a1' : '#b45309',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(p.total_budget)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#16a34a' }}>{formatCurrency(p.amount_paid)}</div>
                        <div style={{ width: '80px', height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, percentPaid)}%`, height: '100%', background: '#16a34a' }} />
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: p.outstanding_balance > 0 ? '#d97706' : '#64748b' }}>
                        {formatCurrency(p.outstanding_balance)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: p.invoice_status === 'PAID' ? '#dcfce7' : p.invoice_status === 'PARTIAL' ? '#fef9c3' : '#fee2e2',
                          color: p.invoice_status === 'PAID' ? '#15803d' : p.invoice_status === 'PARTIAL' ? '#a16207' : '#b91c1c',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px'
                        }}>
                          {p.invoice_status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.8rem' }}>
                        {p.lead_engineer || 'Digi8 Solutions Core Team'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#0f172a',
              color: 'white',
              padding: '18px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>New Enterprise Platform Project</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reliance Smart Point POS Rollout"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Client Organization *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Andhra Pradesh Retail Federation"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      <option value="SAAS_EXPANSION">SaaS Expansion</option>
                      <option value="GOVERNMENT_RETAIL">Government Retail</option>
                      <option value="ENTERPRISE_INTEGRATION">Enterprise Integration</option>
                      <option value="CLOUD_MIGRATION">Cloud Migration</option>
                      <option value="HARDWARE_DEPLOYMENT">Hardware & POS Terminals</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Total Budget (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1500000"
                      value={formData.total_budget}
                      onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Amount Collected (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 500000"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Lead Engineer / Solution Architect
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Varma (Digi8 Solutions)"
                    value={formData.lead_engineer}
                    onChange={(e) => setFormData({ ...formData, lead_engineer: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Scope & Technical Deliverables
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe milestones, hardware integrations, cloud sync specifications..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', background: '#0284c7', borderColor: '#0284c7' }}
                >
                  {isSubmitting ? 'Recording...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
