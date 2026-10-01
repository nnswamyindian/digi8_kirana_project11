import React, { useState, useEffect } from 'react';
import { DashboardReport } from '../../types';
import { api } from '../../services/api';
import { TrendingUp, CreditCard, Globe, Banknote, Download, FileText, BarChart3 } from 'lucide-react';

export const ReportsAnalytics: React.FC = () => {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getDashboardReport().then(rep => {
      setReport(rep);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !report) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading reports & analytics...</div>;
  }

  const { summary, payment_methods, top_items } = report;
  const avgOrderValue = summary.orders_count > 0 ? Math.round(summary.total_sales / summary.orders_count) : 0;
  const posShare = summary.total_sales > 0 ? Math.round((summary.pos_sales / summary.total_sales) * 100) : 0;
  const onlineShare = 100 - posShare;

  return (
    <div>
      {/* Overview Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <div className="kpi-title">Gross Revenue</div>
            <div className="kpi-value">₹{summary.total_sales.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total across POS & Online
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <FileText size={26} />
          </div>
          <div>
            <div className="kpi-title">Total Orders Fulfilled</div>
            <div className="kpi-value">{summary.orders_count}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Avg Order Value: ₹{avgOrderValue}
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Globe size={26} />
          </div>
          <div>
            <div className="kpi-title">Online Channel Share</div>
            <div className="kpi-value">{onlineShare}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ₹{summary.online_sales.toLocaleString('en-IN')} from web orders
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#f1f5f9', color: '#334155' }}>
            <CreditCard size={26} />
          </div>
          <div>
            <div className="kpi-title">Physical POS Share</div>
            <div className="kpi-value">{posShare}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ₹{summary.pos_sales.toLocaleString('en-IN')} from walk-in bills
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modes Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>
            Payment Method Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>UPI (GPay / PhonePe / Paytm):</span>
                <strong>₹{payment_methods.upi.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${summary.total_sales > 0 ? (payment_methods.upi / summary.total_sales) * 100 : 0}%`, background: 'var(--primary-600)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Cash Payments:</span>
                <strong>₹{payment_methods.cash.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${summary.total_sales > 0 ? (payment_methods.cash / summary.total_sales) * 100 : 0}%`, background: '#0284c7' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Khata (Store Credit):</span>
                <strong style={{ color: '#ea580c' }}>₹{payment_methods.credit.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${summary.total_sales > 0 ? (payment_methods.credit / summary.total_sales) * 100 : 0}%`, background: '#ea580c' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Card / POS Terminal:</span>
                <strong>₹{payment_methods.card.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${summary.total_sales > 0 ? (payment_methods.card / summary.total_sales) * 100 : 0}%`, background: '#7c3aed' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Revenue Drivers */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>
            Top Revenue Driving Products
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {top_items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx < top_items.length - 1 ? '1px dashed var(--border-light)' : 'none' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    {idx + 1}. {item.product_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Units Sold: {item.total_qty} {item.unit}
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--primary-700)', fontSize: '1.05rem' }}>
                  ₹{item.total_revenue.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
