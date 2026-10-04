import React, { useState, useEffect, useCallback } from 'react';
import {
  RevenueAnalyticsReport, ProductProfitabilityItem,
  CategoryProfitabilityItem, InventoryValuationReport, MonthlySummaryReport
} from '../../types';
import { api } from '../../services/api';
import {
  TrendingUp, TrendingDown, BarChart3, Package, ShoppingCart,
  DollarSign, Percent, AlertTriangle, Download, RefreshCw,
  Calendar, Filter, ChevronUp, ChevronDown, ArrowUpRight,
  ArrowDownRight, Layers, Tag, Boxes, Activity
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtPct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const fmtNum = (n: number) => Number(n || 0).toLocaleString('en-IN');

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const TABS = [
  { id: 'revenue', label: 'Revenue Dashboard', icon: TrendingUp },
  { id: 'products', label: 'Product Profitability', icon: BarChart3 },
  { id: 'categories', label: 'Category Analysis', icon: Layers },
  { id: 'inventory', label: 'Inventory Valuation', icon: Boxes },
  { id: 'monthly', label: 'Monthly Summary', icon: Calendar },
];

// ─── KPI Card ───────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
  title: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; trend?: 'up' | 'down' | 'neutral';
}> = ({ title, value, sub, icon, color, trend }) => (
  <div style={{
    background: 'white', borderRadius: '16px', padding: '20px',
    border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s',
  }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)')}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '12px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', background: color,
      }}>{icon}</div>
      {trend && (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b' }}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : trend === 'down' ? <ArrowDownRight size={16} /> : null}
        </span>
      )}
    </div>
    <div>
      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
    </div>
  </div>
);

// ─── Section Header ──────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div style={{ marginBottom: '16px' }}>
    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
    {sub && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>{sub}</p>}
  </div>
);

// ─── Progress Bar ────────────────────────────────────────────────────────────
const Bar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
    <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export const ReportsAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState('revenue');
  const [range, setRange] = useState('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [productSortBy, setProductSortBy] = useState<'revenue' | 'profit' | 'margin' | 'units'>('revenue');

  // Data states
  const [revenueData, setRevenueData] = useState<RevenueAnalyticsReport | null>(null);
  const [productData, setProductData] = useState<ProductProfitabilityItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryProfitabilityItem[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryValuationReport | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySummaryReport | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchRevenue = useCallback(async () => {
    try {
      const params: Record<string, string> = { range };
      if (range === 'custom') { params.from = customFrom; params.to = customTo; }
      const data = await api.getRevenueAnalytics(params);
      setRevenueData(data);
    } catch (e: any) { setErrors(p => ({ ...p, revenue: e.message })); }
  }, [range, customFrom, customTo]);

  const fetchProducts = useCallback(async () => {
    try {
      const params: Record<string, any> = { sort_by: productSortBy };
      if (range === 'custom') { params.from = customFrom; params.to = customTo; }
      else { params.range = range; }
      const data = await api.getProductProfitability(params);
      setProductData(data);
    } catch (e: any) { setErrors(p => ({ ...p, products: e.message })); }
  }, [range, customFrom, customTo, productSortBy]);

  const fetchCategories = useCallback(async () => {
    try {
      const params: Record<string, any> = {};
      if (range === 'custom') { params.from = customFrom; params.to = customTo; }
      else { params.range = range; }
      const data = await api.getCategoryProfitability(params);
      setCategoryData(data);
    } catch (e: any) { setErrors(p => ({ ...p, categories: e.message })); }
  }, [range, customFrom, customTo]);

  const fetchInventory = useCallback(async () => {
    try {
      const data = await api.getInventoryValuation();
      setInventoryData(data);
    } catch (e: any) { setErrors(p => ({ ...p, inventory: e.message })); }
  }, []);

  const fetchMonthly = useCallback(async () => {
    try {
      const data = await api.getMonthlySummary(selectedYear);
      setMonthlyData(data);
    } catch (e: any) { setErrors(p => ({ ...p, monthly: e.message })); }
  }, [selectedYear]);

  const loadCurrentTab = useCallback(async () => {
    setIsLoading(true);
    setErrors({});
    try {
      if (activeTab === 'revenue') await fetchRevenue();
      else if (activeTab === 'products') await fetchProducts();
      else if (activeTab === 'categories') await fetchCategories();
      else if (activeTab === 'inventory') await fetchInventory();
      else if (activeTab === 'monthly') await fetchMonthly();
    } finally { setIsLoading(false); }
  }, [activeTab, fetchRevenue, fetchProducts, fetchCategories, fetchInventory, fetchMonthly]);

  useEffect(() => { loadCurrentTab(); }, [loadCurrentTab]);

  const cardStyle: React.CSSProperties = {
    background: 'white', borderRadius: '16px', padding: '24px',
    border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
  };

  // ── Shared Filter Bar ──────────────────────────────────────────────────────
  const showDateFilter = activeTab !== 'inventory' && activeTab !== 'monthly';

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            📊 Reports & Analytics
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0' }}>
            Revenue insights, profitability analysis & inventory valuation
          </p>
        </div>
        <button
          onClick={loadCurrentTab}
          disabled={isLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px',
            fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '20px', background: '#f8fafc', borderRadius: '14px', padding: '4px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
              background: isActive ? 'white' : 'transparent',
              color: isActive ? '#0f172a' : '#64748b',
              border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
              borderRadius: '10px', fontWeight: isActive ? 800 : 600, fontSize: '0.82rem',
              cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      {showDateFilter && (
        <div style={{ display: 'flex', gap: 12, marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>DATE RANGE</label>
            <select value={range} onChange={e => setRange(e.target.value)} style={{
              padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '10px',
              fontSize: '0.85rem', fontWeight: 600, background: 'white', cursor: 'pointer',
            }}>
              {RANGE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {range === 'custom' && (
            <>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>FROM</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>TO</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem' }} />
              </div>
            </>
          )}
          {activeTab === 'products' && (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>SORT BY</label>
              <select value={productSortBy} onChange={e => setProductSortBy(e.target.value as any)} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, background: 'white', cursor: 'pointer' }}>
                <option value="revenue">Revenue</option>
                <option value="profit">Gross Profit</option>
                <option value="margin">Margin %</option>
                <option value="units">Units Sold</option>
              </select>
            </div>
          )}
        </div>
      )}
      {activeTab === 'monthly' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: '20px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>YEAR</label>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, background: 'white', cursor: 'pointer' }}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Loading State ── */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
          <div style={{ fontWeight: 700 }}>Loading analytics...</div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: REVENUE DASHBOARD                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === 'revenue' && (
        <>
          {errors.revenue && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>⚠️ {errors.revenue}</div>}
          {revenueData && (
            <>
              {/* Period Label */}
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px', fontWeight: 600 }}>
                📅 Period: {revenueData.period.from} → {revenueData.period.to}
              </div>

              {/* KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <KpiCard title="Gross Sales" value={fmt(revenueData.kpis.grossSales)} sub={`${fmtNum(revenueData.kpis.totalOrders)} orders`} icon={<TrendingUp size={20} color="#15803d" />} color="#dcfce7" />
                <KpiCard title="Total Discounts" value={fmt(revenueData.kpis.totalDiscounts)} sub="Item + Bill discounts" icon={<Tag size={20} color="#b45309" />} color="#fef3c7" trend="down" />
                <KpiCard title="Net Sales" value={fmt(revenueData.kpis.netSales)} sub="After discounts" icon={<DollarSign size={20} color="#1d4ed8" />} color="#dbeafe" />
                <KpiCard title="Total COGS" value={fmt(revenueData.kpis.cogs)} sub="Cost of goods sold" icon={<ShoppingCart size={20} color="#7c3aed" />} color="#ede9fe" />
                <KpiCard title="Gross Profit" value={fmt(revenueData.kpis.grossProfit)} sub={fmtPct(revenueData.kpis.profitMargin) + ' margin'} icon={<Activity size={20} color="#0891b2" />} color="#cffafe" trend={revenueData.kpis.grossProfit > 0 ? 'up' : 'down'} />
                <KpiCard title="Profit Margin" value={fmtPct(revenueData.kpis.profitMargin)} sub={`Markup: ${fmtPct(revenueData.kpis.markup)}`} icon={<Percent size={20} color="#dc2626" />} color="#fee2e2" />
                <KpiCard title="Units Sold" value={fmtNum(revenueData.kpis.totalUnitsSold)} sub="Total items dispatched" icon={<Package size={20} color="#0f172a" />} color="#f1f5f9" />
                <KpiCard title="Avg Order Value" value={fmt(revenueData.kpis.totalOrders > 0 ? revenueData.kpis.netSales / revenueData.kpis.totalOrders : 0)} sub="Per transaction" icon={<BarChart3 size={20} color="#9333ea" />} color="#f3e8ff" />
              </div>

              {/* Channel + Payment Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>

                {/* Channels */}
                <div style={cardStyle}>
                  <SectionHeader title="Sales by Channel" sub="POS walk-in vs Online web orders" />
                  {Object.entries(revenueData.channels || {}).map(([channel, amount]) => {
                    const total = revenueData.kpis.grossSales;
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    const colors: Record<string, string> = { POS: '#6366f1', ONLINE: '#10b981', DELIVERY: '#f59e0b', OTHER: '#94a3b8' };
                    return (
                      <div key={channel} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700 }}>{channel}</span>
                          <span><strong>{fmt(amount)}</strong> <span style={{ color: '#94a3b8' }}>({fmtPct(pct)})</span></span>
                        </div>
                        <Bar pct={pct} color={colors[channel] || '#6366f1'} />
                      </div>
                    );
                  })}
                </div>

                {/* Payment Methods */}
                <div style={cardStyle}>
                  <SectionHeader title="Payment Methods" sub="How customers paid" />
                  {Object.entries(revenueData.paymentMethods || {}).map(([method, amount]) => {
                    const total = revenueData.kpis.netSales;
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    const colors: Record<string, string> = { CASH: '#16a34a', UPI: '#7c3aed', CARD: '#0369a1', CREDIT: '#ea580c', RAZORPAY: '#2563eb' };
                    return (
                      <div key={method} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700 }}>{method}</span>
                          <span><strong>{fmt(amount)}</strong> <span style={{ color: '#94a3b8' }}>({fmtPct(pct)})</span></span>
                        </div>
                        <Bar pct={pct} color={colors[method] || '#64748b'} />
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Profit Waterfall */}
              <div style={cardStyle}>
                <SectionHeader title="Profit & Loss Summary" sub="Revenue waterfall for selected period" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Gross Sales', value: revenueData.kpis.grossSales, color: '#22c55e', sub: '100% of revenue' },
                    { label: 'Less: Discounts', value: -revenueData.kpis.totalDiscounts, color: '#f59e0b', sub: fmtPct(revenueData.kpis.grossSales > 0 ? (revenueData.kpis.totalDiscounts / revenueData.kpis.grossSales) * 100 : 0) + ' of gross' },
                    { label: 'Less: Tax Collected', value: -revenueData.kpis.totalTax, color: '#6366f1', sub: 'GST charged' },
                    { label: '= Net Sales', value: revenueData.kpis.netSales, color: '#0284c7', sub: 'After all deductions' },
                    { label: 'Less: COGS', value: -revenueData.kpis.cogs, color: '#dc2626', sub: 'Purchase cost' },
                    { label: '= Gross Profit', value: revenueData.kpis.grossProfit, color: revenueData.kpis.grossProfit >= 0 ? '#16a34a' : '#dc2626', sub: fmtPct(revenueData.kpis.profitMargin) + ' margin' },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: '14px 16px', borderRadius: '12px',
                      background: item.value < 0 ? '#fff1f2' : item.label.startsWith('=') ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${item.value < 0 ? '#fecdd3' : item.label.startsWith('=') ? '#bbf7d0' : '#e2e8f0'}`,
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: item.color }}>
                        {item.value < 0 ? '-' : ''}{fmt(Math.abs(item.value))}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{item.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Trend Table */}
              {revenueData.trend && revenueData.trend.length > 0 && (
                <div style={{ ...cardStyle, marginTop: 16 }}>
                  <SectionHeader title="Daily Trend" sub="Day-by-day breakdown of sales & profit" />
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Date', 'Orders', 'Units', 'Gross Sales', 'Net Sales', 'COGS', 'Gross Profit', 'Margin'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Date' ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.trend.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                            <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{row.date}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569' }}>{fmtNum(row.ordersCount)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569' }}>{fmtNum(row.unitsSold)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(row.grossSales)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(row.netSales)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{fmt(row.cogs)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: row.grossProfit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(row.grossProfit)}</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: row.marginPercent >= 15 ? '#dcfce7' : row.marginPercent >= 5 ? '#fef9c3' : '#fee2e2', color: row.marginPercent >= 15 ? '#15803d' : row.marginPercent >= 5 ? '#854d0e' : '#dc2626' }}>
                                {fmtPct(row.marginPercent)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: PRODUCT PROFITABILITY                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === 'products' && (
        <>
          {errors.products && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>⚠️ {errors.products}</div>}
          {productData.length === 0 && !errors.products && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>No sales data found for this period.</div>
              <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Try selecting a broader date range.</div>
            </div>
          )}
          {productData.length > 0 && (
            <div style={cardStyle}>
              <SectionHeader title={`Product Profitability — ${productData.length} products`} sub={`Sorted by ${productSortBy}. Historical cost snapshots used for accuracy.`} />

              {/* Alert counts */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { label: `${productData.filter(p => p.isNegativeProfit).length} Negative Margin`, color: '#fef2f2', text: '#dc2626', icon: '🔴' },
                  { label: `${productData.filter(p => p.isLowMargin && !p.isNegativeProfit).length} Low Margin (<10%)`, color: '#fefce8', text: '#b45309', icon: '🟡' },
                  { label: `${productData.filter(p => !p.isLowMargin).length} Healthy Margin`, color: '#f0fdf4', text: '#15803d', icon: '🟢' },
                ].map(b => (
                  <div key={b.label} style={{ padding: '6px 14px', borderRadius: 20, background: b.color, color: b.text, fontSize: '0.78rem', fontWeight: 700 }}>
                    {b.icon} {b.label}
                  </div>
                ))}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['#', 'Product', 'Category', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin', 'Stock', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: ['#', 'Product', 'Category', 'Status'].includes(h) ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productData.map((p, i) => (
                      <tr key={p.productId} style={{ borderBottom: '1px solid #f1f5f9', background: p.isNegativeProfit ? '#fff9f9' : 'white' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = p.isNegativeProfit ? '#fff9f9' : 'white')}>
                        <td style={{ padding: '9px 12px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.productName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.barcode || p.unit}</div>
                        </td>
                        <td style={{ padding: '9px 12px', color: '#475569', fontSize: '0.8rem' }}>{p.categoryName}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{fmtNum(p.unitsSold)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(p.revenue)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{fmt(p.cogs)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: p.grossProfit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(p.grossProfit)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                            background: p.isNegativeProfit ? '#fee2e2' : p.isLowMargin ? '#fef9c3' : '#dcfce7',
                            color: p.isNegativeProfit ? '#dc2626' : p.isLowMargin ? '#854d0e' : '#15803d',
                          }}>
                            {fmtPct(p.marginPercent)}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: p.currentStock <= 0 ? '#dc2626' : '#0f172a' }}>{p.currentStock}</td>
                        <td style={{ padding: '9px 12px' }}>
                          {p.isNegativeProfit ? <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>🔴 Loss</span>
                            : p.isLowMargin ? <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309' }}>🟡 Low</span>
                              : <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d' }}>🟢 Good</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: CATEGORY ANALYSIS                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === 'categories' && (
        <>
          {errors.categories && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>⚠️ {errors.categories}</div>}
          {categoryData.length === 0 && !errors.categories && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏷️</div>
              <div style={{ fontWeight: 700 }}>No category data found for this period.</div>
            </div>
          )}
          {categoryData.length > 0 && (
            <>
              {/* Category KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                {categoryData.slice(0, 4).map(cat => (
                  <div key={cat.categoryId} style={{ ...cardStyle, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: '1.5rem' }}>{cat.icon || '🛒'}</span>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{cat.categoryName}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>
                      <span>Revenue</span><strong style={{ color: '#0f172a' }}>{fmt(cat.revenue)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>
                      <span>Gross Profit</span><strong style={{ color: cat.grossProfit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(cat.grossProfit)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                      <span>Margin</span>
                      <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, background: cat.marginPercent >= 15 ? '#dcfce7' : cat.marginPercent >= 5 ? '#fef9c3' : '#fee2e2', color: cat.marginPercent >= 15 ? '#15803d' : cat.marginPercent >= 5 ? '#854d0e' : '#dc2626' }}>
                        {fmtPct(cat.marginPercent)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full Category Table */}
              <div style={cardStyle}>
                <SectionHeader title="All Categories — Profitability Breakdown" />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Category', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Category' ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryData.map(cat => {
                        const maxRev = Math.max(...categoryData.map(c => c.revenue));
                        return (
                          <tr key={cat.categoryId} style={{ borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1.2rem' }}>{cat.icon || '🛒'}</span>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{cat.categoryName}</div>
                                  <Bar pct={maxRev > 0 ? (cat.revenue / maxRev) * 100 : 0} color="#6366f1" />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{fmtNum(cat.unitsSold)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(cat.revenue)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>{fmt(cat.cogs)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: cat.grossProfit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(cat.grossProfit)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <span style={{
                                padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                                background: cat.marginPercent >= 15 ? '#dcfce7' : cat.marginPercent >= 5 ? '#fef9c3' : '#fee2e2',
                                color: cat.marginPercent >= 15 ? '#15803d' : cat.marginPercent >= 5 ? '#854d0e' : '#dc2626',
                              }}>{fmtPct(cat.marginPercent)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: INVENTORY VALUATION                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === 'inventory' && (
        <>
          {errors.inventory && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>⚠️ {errors.inventory}</div>}
          {inventoryData && (
            <>
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <KpiCard title="Total Stock Items" value={fmtNum(inventoryData.totalItems)} sub="Unique products" icon={<Package size={20} color="#0f172a" />} color="#f1f5f9" />
                <KpiCard title="Total Stock Units" value={fmtNum(inventoryData.totalStockQty)} sub="Across all products" icon={<Boxes size={20} color="#0891b2" />} color="#cffafe" />
                <KpiCard title="Cost Value" value={fmt(inventoryData.totalCostValue)} sub="At purchase price" icon={<DollarSign size={20} color="#b45309" />} color="#fef3c7" />
                <KpiCard title="Retail Value" value={fmt(inventoryData.totalRetailValue)} sub="At selling price" icon={<TrendingUp size={20} color="#15803d" />} color="#dcfce7" />
                <KpiCard title="Potential Profit" value={fmt(inventoryData.potentialGrossProfit)} sub={fmtPct(inventoryData.potentialMargin) + ' potential margin'} icon={<Activity size={20} color="#9333ea" />} color="#f3e8ff" />
                <KpiCard title="Low Stock Items" value={String(inventoryData.lowStockCount)} sub={`${inventoryData.outOfStockCount} out of stock`} icon={<AlertTriangle size={20} color="#dc2626" />} color="#fee2e2" trend="down" />
              </div>

              {/* Inventory Table */}
              <div style={cardStyle}>
                <SectionHeader title="Inventory Valuation Report" sub="Current stock value at cost & retail prices" />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Product', 'Category', 'Stock', 'Cost Price', 'Selling Price', 'Cost Value', 'Retail Value', 'Potential Profit', 'Status'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: ['Product', 'Category', 'Status'].includes(h) ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.items.map((item, i) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: item.status === 'OUT_OF_STOCK' ? '#fff9f9' : 'white' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = item.status === 'OUT_OF_STOCK' ? '#fff9f9' : 'white')}>
                          <td style={{ padding: '9px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.brand} • {item.sku || item.barcode}</div>
                          </td>
                          <td style={{ padding: '9px 12px', color: '#475569', fontSize: '0.8rem' }}>{item.categoryName}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: item.stock <= 0 ? '#dc2626' : '#0f172a' }}>{item.stock} {item.unit}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(item.purchaseCost)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(item.sellingPrice)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: '#b45309', fontWeight: 600 }}>{fmt(item.totalCostValue)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.totalRetailValue)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: item.potentialProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                            {fmt(item.potentialProfit)}
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{fmtPct(item.potentialMargin)}</div>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                              background: item.status === 'OUT_OF_STOCK' ? '#fee2e2' : item.status === 'LOW_STOCK' ? '#fef9c3' : '#dcfce7',
                              color: item.status === 'OUT_OF_STOCK' ? '#dc2626' : item.status === 'LOW_STOCK' ? '#854d0e' : '#15803d',
                            }}>
                              {item.status === 'OUT_OF_STOCK' ? '🔴 Out' : item.status === 'LOW_STOCK' ? '🟡 Low' : '🟢 OK'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                        <td colSpan={5} style={{ padding: '12px', fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>TOTALS</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, color: '#b45309' }}>{fmt(inventoryData.totalCostValue)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900 }}>{fmt(inventoryData.totalRetailValue)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, color: '#16a34a' }}>{fmt(inventoryData.potentialGrossProfit)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: MONTHLY SUMMARY                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === 'monthly' && (
        <>
          {errors.monthly && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>⚠️ {errors.monthly}</div>}
          {monthlyData && (
            <>
              {/* Year-total KPIs */}
              {(() => {
                const totals = monthlyData.months.reduce((acc, m) => ({
                  grossSales: acc.grossSales + m.grossSales,
                  netSales: acc.netSales + m.netSales,
                  cogs: acc.cogs + m.cogs,
                  grossProfit: acc.grossProfit + m.grossProfit,
                  ordersCount: acc.ordersCount + m.ordersCount,
                }), { grossSales: 0, netSales: 0, cogs: 0, grossProfit: 0, ordersCount: 0 });
                const avgMargin = totals.netSales > 0 ? (totals.grossProfit / totals.netSales) * 100 : 0;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    <KpiCard title={`${selectedYear} Gross Sales`} value={fmt(totals.grossSales)} sub="Full year" icon={<TrendingUp size={20} color="#15803d" />} color="#dcfce7" />
                    <KpiCard title="Net Sales" value={fmt(totals.netSales)} sub="After discounts" icon={<DollarSign size={20} color="#1d4ed8" />} color="#dbeafe" />
                    <KpiCard title="Total COGS" value={fmt(totals.cogs)} sub="Purchase cost" icon={<ShoppingCart size={20} color="#7c3aed" />} color="#ede9fe" />
                    <KpiCard title="Gross Profit" value={fmt(totals.grossProfit)} sub={fmtPct(avgMargin) + ' avg margin'} icon={<Activity size={20} color="#0891b2" />} color="#cffafe" trend={totals.grossProfit >= 0 ? 'up' : 'down'} />
                    <KpiCard title="Total Orders" value={fmtNum(totals.ordersCount)} sub="For the year" icon={<BarChart3 size={20} color="#9333ea" />} color="#f3e8ff" />
                  </div>
                );
              })()}

              {/* Monthly cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {monthlyData.months.map(m => (
                  <div key={m.monthNumber} style={{
                    ...cardStyle, padding: '18px',
                    borderLeft: `4px solid ${m.grossProfit >= 0 ? '#22c55e' : '#ef4444'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>{m.monthName} {selectedYear}</div>
                      <span style={{
                        padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                        background: m.marginPercent >= 15 ? '#dcfce7' : m.marginPercent >= 5 ? '#fef9c3' : '#fee2e2',
                        color: m.marginPercent >= 15 ? '#15803d' : m.marginPercent >= 5 ? '#854d0e' : '#dc2626',
                      }}>{fmtPct(m.marginPercent)}</span>
                    </div>
                    {[
                      { label: 'Gross Sales', value: fmt(m.grossSales), color: '#0f172a' },
                      { label: 'Net Sales', value: fmt(m.netSales), color: '#475569' },
                      { label: 'COGS', value: fmt(m.cogs), color: '#dc2626' },
                      { label: 'Gross Profit', value: fmt(m.grossProfit), color: m.grossProfit >= 0 ? '#16a34a' : '#dc2626' },
                      { label: 'Orders', value: fmtNum(m.ordersCount), color: '#7c3aed' },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>{row.label}</span>
                        <strong style={{ color: row.color }}>{row.value}</strong>
                      </div>
                    ))}
                    {/* Mini margin bar */}
                    <div style={{ marginTop: 10 }}>
                      <Bar pct={Math.min(100, Math.max(0, m.marginPercent * 3))} color={m.marginPercent >= 15 ? '#22c55e' : m.marginPercent >= 5 ? '#f59e0b' : '#ef4444'} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Annual comparison table */}
              <div style={cardStyle}>
                <SectionHeader title={`${selectedYear} — Month-by-Month Comparison Table`} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Month', 'Orders', 'Gross Sales', 'Net Sales', 'COGS', 'Gross Profit', 'Margin'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Month' ? 'left' : 'right', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.months.map(m => (
                        <tr key={m.monthNumber} style={{ borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                          <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{m.monthName}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569' }}>{fmtNum(m.ordersCount)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(m.grossSales)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(m.netSales)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{fmt(m.cogs)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: m.grossProfit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(m.grossProfit)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                              background: m.marginPercent >= 15 ? '#dcfce7' : m.marginPercent >= 5 ? '#fef9c3' : '#fee2e2',
                              color: m.marginPercent >= 15 ? '#15803d' : m.marginPercent >= 5 ? '#854d0e' : '#dc2626',
                            }}>{fmtPct(m.marginPercent)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Spin keyframes ── */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
