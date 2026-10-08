import React, { useEffect, useState } from 'react';
import { StoreProfile, DashboardReport, Order } from '../../types';
import { api } from '../../services/api';
import {
  TrendingUp,
  CreditCard,
  Globe,
  ShoppingCart,
  AlertTriangle,
  Package,
  ArrowUpRight,
  Printer,
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';


interface DashboardOverviewProps {
  store: StoreProfile;
  onNavigateToTab: (tab: string) => void;
  onPrintOrderReceipt: (order: Order) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  store,
  onNavigateToTab,
  onPrintOrderReceipt,
}) => {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [urlCopied, setUrlCopied] = useState(false);

  const loadData = async () => {
    try {
      const [rep, ords] = await Promise.all([
        api.getDashboardReport(),
        api.getOrders({ limit: 6 })
      ]);
      setReport(rep);
      setRecentOrders(ords);
    } catch (err) {
      console.error('Error fetching dashboard overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Build the live storefront URL for this store
  const storeSlug = (store as any).slug || store.id || '';
  const customDomain = (store as any).custom_domain;
  const platformBase = 'manakiranakottu.digi8solutions.com';
  const liveStorefrontUrl = customDomain
    ? `https://${customDomain}`
    : storeSlug
      ? `https://${platformBase}/${storeSlug}`
      : `https://${platformBase}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(liveStorefrontUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    });
  };

  if (isLoading || !report) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading store analytics...</div>;
  }

  const summary = report?.summary || {
    total_sales: 0,
    today_sales: 0,
    pos_sales: 0,
    online_sales: 0,
    orders_count: 0,
    customers_count: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
  };
  const payment_methods = report?.payment_methods || { cash: 0, upi: 0, card: 0, credit: 0 };
  const top_items = report?.top_items || [];

  const totalSalesVal = Number(summary.total_sales) || 0;
  const posSalesVal = Number(summary.pos_sales) || 0;
  const onlineSalesVal = Number(summary.online_sales) || 0;
  const todaySalesVal = Number(summary.today_sales) || 0;

  const posPercent = totalSalesVal > 0 ? Math.round((posSalesVal / totalSalesVal) * 100) : 50;
  const onlinePercent = 100 - posPercent;

  return (
    <div>
      {/* Live Store URL Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b, #047857)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px 22px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 16px -2px rgba(6,78,59,0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ee7b7', flexShrink: 0
          }}>
            <Globe size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
              🟢 Your Live Storefront URL
            </div>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '0.95rem', wordBreak: 'break-all' }}>
              {liveStorefrontUrl}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleCopyUrl}
            style={{
              background: urlCopied ? '#059669' : 'rgba(255,255,255,0.15)',
              color: 'white', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px', padding: '7px 14px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Copy size={14} />
            {urlCopied ? 'Copied!' : 'Copy Link'}
          </button>
          <a
            href={liveStorefrontUrl} target="_blank" rel="noopener noreferrer"
            style={{
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px', padding: '7px 14px',
              fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={14} />
            Open Store
          </a>
          <button
            onClick={() => onNavigateToTab('domains')}
            style={{
              background: 'rgba(255,255,255,0.12)', color: '#d1fae5',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px', padding: '7px 14px',
              fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Globe size={13} />
            Custom Domain
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* Today's Sales */}
        <div className="kpi-card">

          <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <div className="kpi-title">Today's Sales</div>
            <div className="kpi-value">₹{todaySalesVal.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              All Time: ₹{totalSalesVal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* POS Sales Channel */}
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
            <CreditCard size={26} />
          </div>
          <div>
            <div className="kpi-title">Physical POS Sales</div>
            <div className="kpi-value">₹{posSalesVal.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
              {posPercent}% of total revenue
            </div>
          </div>
        </div>

        {/* Online Orders Channel */}
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
            <Globe size={26} />
          </div>
          <div>
            <div className="kpi-title">Online Website Sales</div>
            <div className="kpi-value">₹{onlineSalesVal.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: '2px' }}>
              {onlinePercent}% of total revenue
            </div>
          </div>
        </div>

        {/* Orders & Low Stock */}
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: (summary.low_stock_count || 0) > 0 ? '#fee2e2' : '#f1f5f9', color: (summary.low_stock_count || 0) > 0 ? '#dc2626' : '#64748b' }}>
            {(summary.low_stock_count || 0) > 0 ? <AlertTriangle size={26} /> : <Package size={26} />}
          </div>
          <div>
            <div className="kpi-title">Inventory Alerts</div>
            <div className="kpi-value" style={{ color: (summary.low_stock_count || 0) > 0 ? '#dc2626' : 'inherit' }}>
              {summary.low_stock_count || 0} Low Stock
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {summary.out_of_stock_count || 0} Out of stock items
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Channel Analytics & Payment Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Sales Channel Ratio */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Omnichannel Revenue Split</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time</span>
          </h3>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                POS Counter Billing: ₹{posSalesVal.toLocaleString('en-IN')}
              </span>
              <span>{posPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${posPercent}%`, backgroundColor: '#0284c7' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                Online Website Orders: ₹{onlineSalesVal.toLocaleString('en-IN')}
              </span>
              <span>{onlinePercent}%</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${onlinePercent}%`, backgroundColor: '#d97706' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cash</div>
              <div style={{ fontWeight: 800 }}>₹{Number(payment_methods.cash || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UPI</div>
              <div style={{ fontWeight: 800, color: 'var(--primary-700)' }}>₹{Number(payment_methods.upi || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Card</div>
              <div style={{ fontWeight: 800 }}>₹{Number(payment_methods.card || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Khata (Credit)</div>
              <div style={{ fontWeight: 800, color: '#ea580c' }}>₹{Number(payment_methods.credit || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* Top 5 Best Selling Items */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Top Performing Products</span>
            <button className="btn-sm btn-secondary" onClick={() => onNavigateToTab('products')}>
              View All
            </button>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {top_items.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No product sales recorded yet. Start billing via POS counter!
              </div>
            ) : (
              top_items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < top_items.length - 1 ? '1px dashed var(--border-light)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {it.product_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Qty Sold: {it.total_qty} {it.unit}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--primary-700)' }}>
                    ₹{Number(it.total_revenue || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Stream */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Recent Sales & Orders</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unified stream of POS bills and online customer deliveries</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigateToTab('orders')}>
            Manage All Orders
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order / Bill No</th>
                <th>Channel</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No recent orders found.
                  </td>
                </tr>
              ) : (
                recentOrders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.order_number}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {order.invoice_number}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${order.order_type === 'POS' ? 'badge-blue' : 'badge-amber'}`}>
                        {order.order_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div>{order.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {order.customer_phone}
                      </div>
                    </td>
                    <td>{order.items?.length || 0} items</td>
                    <td style={{ fontWeight: 800, color: 'var(--primary-700)' }}>
                      ₹{Number(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className="badge badge-green">{order.payment_method}</span>
                    </td>
                    <td>
                      <span className={`badge ${order.status === 'DELIVERED' ? 'badge-green' : order.status === 'NEW' ? 'badge-amber' : 'badge-blue'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => onPrintOrderReceipt(order)}
                        title="Print Thermal Bill"
                      >
                        <Printer size={14} />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
