import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  LifeBuoy,
  Plus,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Send,
  X,
  ShieldAlert
} from 'lucide-react';

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export const StoreSupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('TECHNICAL');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getStoreTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createStoreTicket(subject.trim(), description.trim(), priority);
      setSubject('');
      setDescription('');
      setIsCreateOpen(false);
      setActionSuccess('Support ticket created successfully! Our engineering team will review it shortly.');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchTickets();
    } catch (err: any) {
      alert(`Error creating ticket: ${err.message || 'Failed to submit'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Open' };
      case 'IN_PROGRESS':
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'In Progress' };
      case 'RESOLVED':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Resolved' };
      case 'CLOSED':
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Closed' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: status };
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return { bg: '#fef2f2', color: '#b91c1c' };
      case 'HIGH':
        return { bg: '#fff7ed', color: '#c2410c' };
      case 'MEDIUM':
        return { bg: '#f0fdf4', color: '#15803d' };
      default:
        return { bg: '#f8fafc', color: '#64748b' };
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <LifeBuoy size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Help & Platform Support
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Need help with hardware, payments, custom domains, or POS setup? Submit a ticket directly to the platform engineering desk.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchTickets}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#4f46e5' }}
          >
            <Plus size={16} />
            <span>Open Support Ticket</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tickets List */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155' }}>
            Your Support Tickets ({tickets.length})
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Average Response Time: &lt; 2 Hours
          </span>
        </div>

        {tickets.length === 0 && !loading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h4 style={{ margin: '0 0 6px 0', color: '#475569' }}>No support tickets</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Have an issue or question? Open a ticket and our platform specialists will assist you immediately.
            </p>
          </div>
        ) : (
          <div>
            {tickets.map(t => {
              const sBadge = getStatusBadge(t.status);
              const pBadge = getPriorityBadge(t.priority);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  style={{
                    padding: '18px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.15s ease',
                    gap: '16px'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4f46e5',
                      flexShrink: 0
                    }}>
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                          #{t.ticket_number || t.id.slice(0, 8)}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                          {t.subject}
                        </h4>
                      </div>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '0.825rem',
                        color: '#64748b',
                        maxWidth: '500px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {t.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      background: pBadge.bg,
                      color: pBadge.color,
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {t.priority}
                    </span>

                    <span style={{
                      background: sBadge.bg,
                      color: sBadge.color,
                      border: `1px solid ${sBadge.border}`,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '20px'
                    }}>
                      {sBadge.label}
                    </span>

                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>

                    <ChevronRight size={16} color="#cbd5e1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {isCreateOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
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
            maxWidth: '550px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Open Support Ticket
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Issue connecting Thermal Printer via Bluetooth"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="POS_HARDWARE">POS & Hardware</option>
                    <option value="PAYMENTS">Billing & Payments</option>
                    <option value="DOMAIN_DNS">Custom Domain / DNS</option>
                    <option value="ONLINE_STORE">Online Store & Delivery</option>
                    <option value="TECHNICAL">Technical / Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High (Urgent Issue)</option>
                    <option value="URGENT">Critical (Store Down)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Description / Steps to Reproduce *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide detailed information regarding the problem or query..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
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
            maxWidth: '600px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                  #{selectedTicket.ticket_number || selectedTicket.id.slice(0, 8)}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                Status: {selectedTicket.status}
              </span>
              <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                Priority: {selectedTicket.priority}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', alignSelf: 'center' }}>
                Created: {new Date(selectedTicket.created_at).toLocaleString()}
              </span>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
              {selectedTicket.description}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedTicket(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
