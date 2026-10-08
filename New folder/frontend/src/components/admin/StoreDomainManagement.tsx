import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Server,
  Lock,
  ArrowRight,
  Info
} from 'lucide-react';

interface DomainRecord {
  id: string;
  tenant_id: string;
  domain: string;
  domain_type: 'SUBDOMAIN' | 'CUSTOM_DOMAIN';
  verification_status: 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'FAILED';
  verification_token?: string;
  ssl_status: 'PENDING' | 'ACTIVE' | 'FAILED';
  is_primary: number | boolean;
  verified_at?: string;
  created_at: string;
}

export const StoreDomainManagement: React.FC = () => {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const data = await api.getStoreDomains();
      setDomains(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load store domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const [storeSlug, setStoreSlug] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');

  useEffect(() => {
    fetchDomains();
    // Load store profile to get the slug for the default storefront URL
    api.getStore().then((s: any) => {
      if (s) {
        setStoreSlug(s.slug || s.id || '');
        setStoreName(s.name || 'Your Store');
      }
    }).catch(() => {});
  }, []);

  const primaryDomain = domains.find(d => d.is_primary) || domains[0];

  const DEFAULT_PLATFORM_DOMAIN = 'manakiranakottu.digi8solutions.com';
  const defaultStorefrontUrl = storeSlug
    ? `https://${DEFAULT_PLATFORM_DOMAIN}/${storeSlug}`
    : `https://${DEFAULT_PLATFORM_DOMAIN}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2500);
  };


  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;

    let cleanDomain = newDomainInput.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');

    // Basic domain validation
    if (!cleanDomain.includes('.') || cleanDomain.length < 4) {
      setActionMessage({ type: 'error', text: 'Please enter a valid domain name (e.g. www.royalkirana.com or shop.mybrand.in)' });
      return;
    }

    setIsAdding(true);
    setActionMessage(null);
    try {
      await api.addStoreDomain(cleanDomain);
      setNewDomainInput('');
      setActionMessage({ type: 'success', text: `Domain "${cleanDomain}" added successfully! Configure DNS records below to verify.` });
      await fetchDomains();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to add custom domain' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domain: DomainRecord) => {
    setVerifyingId(domain.id);
    setActionMessage(null);
    try {
      const res = await api.verifyStoreDomain(domain.id);
      setActionMessage({
        type: 'success',
        text: res.message || `Domain "${domain.domain}" verified successfully! SSL certificate is active.`
      });
      await fetchDomains();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'DNS verification failed. Ensure your CNAME or TXT records have propagated.'
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (domain: DomainRecord) => {
    if (!window.confirm(`Are you sure you want to disconnect "${domain.domain}"?`)) return;
    try {
      await api.deleteStoreDomain(domain.id);
      setActionMessage({ type: 'success', text: `Domain "${domain.domain}" disconnected.` });
      await fetchDomains();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to disconnect domain' });
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
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Globe size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Custom Domain & Branding
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Connect your own domain (e.g. <code style={{ color: '#0284c7', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>www.yourbrand.com</code>) with automated SSL encryption and white-labeling.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchDomains}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {actionMessage && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.9rem',
          background: actionMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: actionMessage.type === 'success' ? '#166534' : '#991b1b'
        }}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
           FREE DEFAULT STOREFRONT URL (Mana Kirana Platform URL)
           ────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
        borderRadius: '16px',
        padding: '22px 28px',
        color: 'white',
        marginBottom: '24px',
        boxShadow: '0 8px 24px -4px rgba(6, 78, 59, 0.4)',
        border: '1px solid rgba(52, 211, 153, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{
            background: 'rgba(52, 211, 153, 0.25)',
            color: '#6ee7b7',
            fontWeight: 800,
            padding: '2px 10px',
            borderRadius: '20px',
            fontSize: '0.7rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase'
          }}>✅ Your Free Storefront Link</span>
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px', color: '#d1fae5' }}>
          {storeName || 'Your Store'}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '10px'
        }}>
          <code style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: '#6ee7b7',
            background: 'rgba(0,0,0,0.3)',
            padding: '8px 16px',
            borderRadius: '8px',
            letterSpacing: '0.02em',
            border: '1px solid rgba(52,211,153,0.3)',
            wordBreak: 'break-all'
          }}>
            {defaultStorefrontUrl}
          </code>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleCopy(defaultStorefrontUrl, 'free-url')}
              style={{
                background: copySuccess === 'free-url' ? '#059669' : 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Copy size={14} />
              {copySuccess === 'free-url' ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={defaultStorefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={14} />
              Open Store
            </a>
          </div>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: '#a7f3d0', lineHeight: 1.5 }}>
          🌐 This is your <strong>free platform storefront URL</strong> provided by Mana Kirana Kottu. Share it with customers to start taking online orders immediately. To use your own domain (e.g. <em>www.yourbrand.com</em>), add it below.
        </p>
      </div>

      {/* Primary Custom Domain Status Hero */}
      {primaryDomain && (

        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          marginBottom: '28px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#38bdf8' }}>
                Primary Storefront URL
              </span>
              {primaryDomain.verification_status === 'VERIFIED' && (
                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ShieldCheck size={12} />
                  LIVE & SSL ENCRYPTED
                </span>
              )}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={20} color="#34d399" />
              <span>https://{primaryDomain.domain}</span>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.825rem', color: '#94a3b8' }}>
              Customers browsing this URL experience your store with your 100% white-labeled catalog, cart, and payment gateway.
            </p>
          </div>

          <a
            href={`https://${primaryDomain.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{
              background: '#0284c7',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <span>Visit Live Store</span>
            <ExternalLink size={16} />
          </a>
        </div>
      )}

      {/* Add New Custom Domain Card */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '22px',
        marginBottom: '28px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
          Connect a Custom Domain
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
          Enter your own domain name (purchased from GoDaddy, Namecheap, Google Domains, Cloudflare, etc.).
        </p>

        <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
              https://
            </span>
            <input
              type="text"
              placeholder="www.royalkirana.com or shop.royalkirana.in"
              value={newDomainInput}
              onChange={(e) => setNewDomainInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 75px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || !newDomainInput.trim()}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isAdding ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={18} />}
            <span>Connect Domain</span>
          </button>
        </form>
      </div>

      {/* Configured Domains List */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        overflow: 'hidden',
        marginBottom: '28px'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#334155' }}>
            Configured Domains ({domains.length})
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Multi-Tenant DNS Routing
          </span>
        </div>

        {domains.length === 0 && !loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
            <Globe size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No domains configured yet.</p>
          </div>
        ) : (
          <div>
            {domains.map((d) => {
              const isVerified = d.verification_status === 'VERIFIED';
              const isSubdomain = d.domain_type === 'SUBDOMAIN';

              return (
                <div
                  key={d.id}
                  style={{
                    padding: '20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isVerified ? '#ecfdf5' : '#fffbeb',
                        color: isVerified ? '#059669' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isVerified ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                            {d.domain}
                          </span>
                          {d.is_primary ? (
                            <span style={{ background: '#0284c7', color: 'white', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                              PRIMARY
                            </span>
                          ) : null}
                          <span style={{
                            background: isSubdomain ? '#f1f5f9' : '#f0fdf4',
                            color: isSubdomain ? '#475569' : '#166534',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {isSubdomain ? 'SYSTEM SUBDOMAIN' : 'CUSTOM DOMAIN'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '0.78rem', color: '#64748b' }}>
                          <span>DNS: <strong style={{ color: isVerified ? '#166534' : '#b45309' }}>{d.verification_status}</strong></span>
                          <span>SSL: <strong style={{ color: d.ssl_status === 'ACTIVE' ? '#166534' : '#b45309' }}>{d.ssl_status}</strong></span>
                          {d.verified_at && <span>Verified on: {new Date(d.verified_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!isVerified && !isSubdomain && (
                        <button
                          onClick={() => handleVerify(d)}
                          disabled={verifyingId === d.id}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {verifyingId === d.id ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                          <span>Verify DNS Now</span>
                        </button>
                      )}

                      {!isSubdomain && (
                        <button
                          onClick={() => handleDelete(d)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fff5f5' }}
                          title="Disconnect Domain"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DNS Instructions Block if Custom Domain and not yet verified */}
                  {!isVerified && !isSubdomain && (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      fontSize: '0.825rem'
                    }}>
                      <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Info size={16} color="#0284c7" />
                        <span>Action Required: Add these DNS records at your domain registrar (GoDaddy / Cloudflare / Namecheap)</span>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#edf2f7', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                              <th style={{ padding: '8px 12px' }}>Type</th>
                              <th style={{ padding: '8px 12px' }}>Host / Name</th>
                              <th style={{ padding: '8px 12px' }}>Value / Target</th>
                              <th style={{ padding: '8px 12px' }}>TTL</th>
                              <th style={{ padding: '8px 12px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', background: 'white' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>CNAME</td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{d.domain.startsWith('www.') ? 'www' : d.domain.split('.')[0]}</td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#0284c7' }}>stores.kirana-saas.com</td>
                              <td style={{ padding: '8px 12px' }}>Auto / 3600</td>
                              <td style={{ padding: '8px 12px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCopy('stores.kirana-saas.com', 'cname')}
                                  style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}
                                >
                                  <Copy size={12} />
                                  <span>{copySuccess === 'cname' ? 'Copied!' : 'Copy'}</span>
                                </button>
                              </td>
                            </tr>
                            <tr style={{ background: 'white' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>TXT</td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>_platform-verification</td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#0284c7' }}>{d.verification_token || 'platform-verify-token'}</td>
                              <td style={{ padding: '8px 12px' }}>Auto / 300</td>
                              <td style={{ padding: '8px 12px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(d.verification_token || 'platform-verify-token', 'txt')}
                                  style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}
                                >
                                  <Copy size={12} />
                                  <span>{copySuccess === 'txt' ? 'Copied!' : 'Copy'}</span>
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <p style={{ margin: '10px 0 0 0', color: '#64748b', fontSize: '0.75rem' }}>
                        Note: DNS changes can take anywhere from a few minutes up to 24 hours to propagate across global DNS resolvers. Once added, click <strong>Verify DNS Now</strong>.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* White-Label Architecture Info */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <Server size={28} color="#0284c7" />
        <div style={{ fontSize: '0.825rem', color: '#475569' }}>
          <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>Zero-Config SSL & Shared Gateway</strong>
          All custom domains are routed securely through our automated multi-tenant edge proxy. Free TLS/SSL certificates are automatically issued and renewed for your custom domain.
        </div>
      </div>
    </div>
  );
};
