import { query, getOne } from '../db.js';

/**
 * Advanced Financial & Profit Analytics Service
 * Provides tenant-isolated revenue, COGS, gross profit, margin, and product/category profitability reporting.
 */
export class AnalyticsService {
  /**
   * Helper to resolve start & end ISO date strings for date range presets
   */
  resolveDateRange(range, customFrom, customTo) {
    const now = new Date();
    // Default to Indian Standard Time (IST: UTC+5:30) date arithmetic
    let fromDate = new Date();
    let toDate = new Date();

    switch (range) {
      case 'today':
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        fromDate.setDate(now.getDate() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setDate(now.getDate() - 1);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        fromDate.setDate(diff);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last_week': {
        const day = now.getDay();
        const diff = now.getDate() - day - 6;
        fromDate.setDate(diff);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setDate(diff + 6);
        toDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'last_month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'this_year':
        fromDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        if (customFrom) fromDate = new Date(customFrom + 'T00:00:00.000Z');
        if (customTo) toDate = new Date(customTo + 'T23:59:59.999Z');
        break;
      default:
        // Default to this month
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        break;
    }

    return {
      fromStr: fromDate.toISOString(),
      toStr: toDate.toISOString(),
      fromDisplay: fromDate.toISOString().split('T')[0],
      toDisplay: toDate.toISOString().split('T')[0]
    };
  }

  /**
   * Main Revenue & Profit KPI Dashboard
   */
  async getRevenueReport({ tenantId, range = 'this_month', fromDate, toDate, channel, paymentMethod }) {
    const { fromStr, toStr, fromDisplay, toDisplay } = this.resolveDateRange(range, fromDate, toDate);

    let orderSql = `
      SELECT o.*
      FROM orders o
      WHERE (o.tenant_id = ? OR o.store_id = ?)
        AND o.status != 'CANCELLED'
        AND o.created_at >= ?
        AND o.created_at <= ?
    `;
    const params = [tenantId, tenantId, fromStr, toStr];

    if (channel) {
      if (channel === 'POS') {
        orderSql += " AND o.order_type = 'POS'";
      } else if (channel === 'ONLINE') {
        orderSql += " AND o.order_type IN ('ONLINE_DELIVERY', 'ONLINE_PICKUP')";
      }
    }

    if (paymentMethod) {
      orderSql += ' AND o.payment_method = ?';
      params.push(paymentMethod);
    }

    orderSql += ' ORDER BY o.created_at ASC';
    const orders = await query(orderSql, params);

    // Fetch order items with cost snapshots for these orders
    const orderIds = orders.map(o => o.id);
    let items = [];
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      items = await query(`
        SELECT oi.*, p.category_id, c.name as category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE oi.order_id IN (${placeholders})
      `, orderIds);
    }

    let grossSales = 0;
    let itemDiscounts = 0;
    let billDiscounts = 0;
    let totalTax = 0;
    let netSales = 0;
    let totalCOGS = 0;
    let totalUnitsSold = 0;

    // Daily buckets for chart
    const dailyMap = new Map();
    // Hourly distribution
    const hourlyMap = new Array(24).fill(0).map((_, h) => ({ hour: h, count: 0, revenue: 0 }));
    // Payment breakdown
    const paymentMap = { CASH: 0, UPI: 0, CARD: 0, RAZORPAY: 0, CREDIT: 0, OTHER: 0 };
    // Channel breakdown
    const channelMap = { POS: 0, ONLINE_DELIVERY: 0, ONLINE_PICKUP: 0 };

    for (const ord of orders) {
      billDiscounts += Number(ord.discount) || 0;
      totalTax += Number(ord.gst_amount) || 0;

      const pMethod = ord.payment_method || 'CASH';
      if (paymentMap[pMethod] !== undefined) {
        paymentMap[pMethod] += ord.total_amount;
      } else {
        paymentMap.OTHER += ord.total_amount;
      }

      const oType = ord.order_type || 'POS';
      if (channelMap[oType] !== undefined) {
        channelMap[oType] += ord.total_amount;
      }

      // Hour
      try {
        const hour = new Date(ord.created_at).getHours();
        if (hourlyMap[hour]) {
          hourlyMap[hour].count += 1;
          hourlyMap[hour].revenue += ord.total_amount;
        }
      } catch {}

      // Date bucket
      const dateKey = ord.created_at.split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          grossSales: 0,
          netSales: 0,
          cogs: 0,
          grossProfit: 0,
          ordersCount: 0,
          unitsSold: 0
        });
      }
      const b = dailyMap.get(dateKey);
      b.ordersCount += 1;
    }

    for (const it of items) {
      const qty = Number(it.quantity) || 1;
      totalUnitsSold += qty;

      const unitPrice = Number(it.unit_price) || 0;
      const originalPrice = Number(it.original_unit_price) || unitPrice;
      const lineGross = Math.round(qty * originalPrice * 100) / 100;
      const lineDiscount = Number(it.discount_amount) || 0;
      const lineNet = Number(it.total_price) || Math.max(0, lineGross - lineDiscount);

      // Cost snapshot: use cost_snapshot if present, fallback to cost_price
      const unitCost = Number(it.cost_snapshot !== undefined && it.cost_snapshot !== null && it.cost_snapshot > 0 ? it.cost_snapshot : it.cost_price) || 0;
      const lineCost = Math.round(qty * unitCost * 100) / 100;

      grossSales += lineGross;
      itemDiscounts += lineDiscount;
      netSales += lineNet;
      totalCOGS += lineCost;

      // Add to daily bucket
      const order = orders.find(o => o.id === it.order_id);
      if (order) {
        const dateKey = order.created_at.split('T')[0];
        const b = dailyMap.get(dateKey);
        if (b) {
          b.grossSales += lineGross;
          b.netSales += lineNet;
          b.cogs += lineCost;
          b.grossProfit += (lineNet - lineCost);
          b.unitsSold += qty;
        }
      }
    }

    const totalDiscounts = itemDiscounts + billDiscounts;
    const finalNetSales = Math.max(0, Math.round(netSales * 100) / 100);
    const grossProfit = Math.max(0, Math.round((finalNetSales - totalCOGS) * 100) / 100);
    const profitMargin = finalNetSales > 0 ? Math.round((grossProfit / finalNetSales) * 10000) / 100 : 0;
    const markup = totalCOGS > 0 ? Math.round((grossProfit / totalCOGS) * 10000) / 100 : 0;

    // Format daily trend list
    const trend = Array.from(dailyMap.values()).map(d => ({
      ...d,
      grossSales: Math.round(d.grossSales * 100) / 100,
      netSales: Math.round(d.netSales * 100) / 100,
      cogs: Math.round(d.cogs * 100) / 100,
      grossProfit: Math.round(d.grossProfit * 100) / 100,
      marginPercent: d.netSales > 0 ? Math.round((d.grossProfit / d.netSales) * 10000) / 100 : 0
    }));

    return {
      period: {
        range,
        from: fromDisplay,
        to: toDisplay
      },
      kpis: {
        totalOrders: orders.length,
        totalUnitsSold: Math.round(totalUnitsSold * 100) / 100,
        grossSales: Math.round(grossSales * 100) / 100,
        itemDiscounts: Math.round(itemDiscounts * 100) / 100,
        billDiscounts: Math.round(billDiscounts * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        netSales: finalNetSales,
        cogs: Math.round(totalCOGS * 100) / 100,
        grossProfit,
        profitMargin,
        markup
      },
      trend,
      hourlyDistribution: hourlyMap,
      channels: channelMap,
      paymentMethods: paymentMap
    };
  }

  /**
   * Product Profitability Report:
   * Returns profit breakdown by item, cost snapshot, revenue, margin %, and low-margin alerts.
   */
  async getProductProfitabilityReport({ tenantId, range = 'this_month', fromDate, toDate }) {
    const { fromStr, toStr } = this.resolveDateRange(range, fromDate, toDate);

    const rows = await query(`
      SELECT
        oi.product_id,
        oi.product_name,
        p.unit,
        p.barcode,
        p.category_id,
        c.name as category_name,
        p.purchase_cost as current_purchase_cost,
        p.selling_price as current_selling_price,
        p.stock as current_stock,
        p.min_stock,
        SUM(oi.quantity) as units_sold,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity * COALESCE(NULLIF(oi.cost_snapshot, 0), oi.cost_price, p.purchase_cost, 0)) as total_cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (o.tenant_id = ? OR o.store_id = ?)
        AND o.status != 'CANCELLED'
        AND o.created_at >= ?
        AND o.created_at <= ?
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_revenue DESC
    `, [tenantId, tenantId, fromStr, toStr]);

    const report = rows.map(r => {
      const revenue = Math.round(Number(r.total_revenue) * 100) / 100;
      const cogs = Math.round(Number(r.total_cogs) * 100) / 100;
      const grossProfit = Math.round((revenue - cogs) * 100) / 100;
      const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;
      const isLowMargin = margin < 10;
      const isNegativeProfit = grossProfit < 0;

      return {
        productId: r.product_id,
        productName: r.product_name,
        categoryName: r.category_name || 'General',
        unit: r.unit || 'PACKET',
        barcode: r.barcode || '',
        unitsSold: Math.round(Number(r.units_sold) * 100) / 100,
        revenue,
        cogs,
        grossProfit,
        marginPercent: margin,
        currentStock: Number(r.current_stock) || 0,
        isLowMargin,
        isNegativeProfit
      };
    });

    return report;
  }

  /**
   * Category Profitability Report:
   * Returns profit breakdown grouped by product category.
   */
  async getCategoryProfitabilityReport({ tenantId, range = 'this_month', fromDate, toDate }) {
    const { fromStr, toStr } = this.resolveDateRange(range, fromDate, toDate);

    const rows = await query(`
      SELECT
        COALESCE(c.id, 'cat_uncategorized') as category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.icon, '🛍️') as icon,
        SUM(oi.quantity) as units_sold,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.quantity * COALESCE(NULLIF(oi.cost_snapshot, 0), oi.cost_price, p.purchase_cost, 0)) as total_cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (o.tenant_id = ? OR o.store_id = ?)
        AND o.status != 'CANCELLED'
        AND o.created_at >= ?
        AND o.created_at <= ?
      GROUP BY c.id, c.name
      ORDER BY total_revenue DESC
    `, [tenantId, tenantId, fromStr, toStr]);

    return rows.map(r => {
      const revenue = Math.round(Number(r.total_revenue) * 100) / 100;
      const cogs = Math.round(Number(r.total_cogs) * 100) / 100;
      const grossProfit = Math.round((revenue - cogs) * 100) / 100;
      const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;

      return {
        categoryId: r.category_id,
        categoryName: r.category_name,
        icon: r.icon,
        unitsSold: Math.round(Number(r.units_sold) * 100) / 100,
        revenue,
        cogs,
        grossProfit,
        marginPercent: margin
      };
    });
  }

  /**
   * Inventory Valuation & Potential Margin Report
   */
  async getInventoryValuation(tenantId) {
    const products = await query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.tenant_id = ? OR p.store_id = ?) AND p.is_active = 1
      ORDER BY p.name ASC
    `, [tenantId, tenantId]);

    let totalStockQty = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const items = products.map(p => {
      const stock = Number(p.stock) || 0;
      const cost = Number(p.purchase_cost) || 0;
      const retail = Number(p.selling_price) || 0;
      const minStock = Number(p.min_stock) || 5;

      const itemCost = Math.round(stock * cost * 100) / 100;
      const itemRetail = Math.round(stock * retail * 100) / 100;
      const itemProfit = Math.round((itemRetail - itemCost) * 100) / 100;
      const margin = itemRetail > 0 ? Math.round((itemProfit / itemRetail) * 10000) / 100 : 0;

      totalStockQty += stock;
      totalCostValue += itemCost;
      totalRetailValue += itemRetail;

      if (stock <= 0) outOfStockCount++;
      else if (stock <= minStock) lowStockCount++;

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        unit: p.unit,
        barcode: p.barcode,
        sku: p.sku,
        categoryName: p.category_name || 'General',
        stock,
        purchaseCost: cost,
        sellingPrice: retail,
        totalCostValue: itemCost,
        totalRetailValue: itemRetail,
        potentialProfit: itemProfit,
        potentialMargin: margin,
        status: stock <= 0 ? 'OUT_OF_STOCK' : stock <= minStock ? 'LOW_STOCK' : 'IN_STOCK'
      };
    });

    const potentialGrossProfit = Math.round((totalRetailValue - totalCostValue) * 100) / 100;
    const overallMargin = totalRetailValue > 0 ? Math.round((potentialGrossProfit / totalRetailValue) * 10000) / 100 : 0;

    return {
      totalItems: products.length,
      totalStockQty: Math.round(totalStockQty * 100) / 100,
      totalCostValue: Math.round(totalCostValue * 100) / 100,
      totalRetailValue: Math.round(totalRetailValue * 100) / 100,
      potentialGrossProfit,
      potentialMargin: overallMargin,
      lowStockCount,
      outOfStockCount,
      items
    };
  }

  /**
   * Monthly Revenue & Profit Comparison
   */
  async getMonthlySummary(tenantId, year = new Date().getFullYear()) {
    const orders = await query(`
      SELECT o.id, o.total_amount, o.subtotal, o.discount, o.created_at
      FROM orders o
      WHERE (o.tenant_id = ? OR o.store_id = ?)
        AND o.status != 'CANCELLED'
        AND o.created_at LIKE ?
    `, [tenantId, tenantId, `${year}%`]);

    const orderIds = orders.map(o => o.id);
    let itemRows = [];
    if (orderIds.length > 0) {
      const ph = orderIds.map(() => '?').join(',');
      itemRows = await query(`
        SELECT oi.order_id, oi.quantity,
               COALESCE(NULLIF(oi.cost_snapshot, 0), oi.cost_price, 0) as unit_cost,
               oi.total_price
        FROM order_items oi
        WHERE oi.order_id IN (${ph})
      `, orderIds);
    }

    // Build per-order cogs map
    const orderCogs = new Map();
    for (const it of itemRows) {
      const prev = orderCogs.get(it.order_id) || 0;
      orderCogs.set(it.order_id, prev + ((Number(it.quantity) || 1) * (Number(it.unit_cost) || 0)));
    }

    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const buckets = Array.from({ length: 12 }, (_, i) => ({
      monthNumber: i + 1,
      monthName: MONTH_NAMES[i],
      ordersCount: 0,
      grossSales: 0,
      netSales: 0,
      cogs: 0,
      grossProfit: 0,
      marginPercent: 0,
    }));

    for (const o of orders) {
      try {
        const m = new Date(o.created_at).getMonth();
        const bucket = buckets[m];
        if (!bucket) continue;

        const gross = Number(o.subtotal) || Number(o.total_amount) || 0;
        const net = Number(o.total_amount) || 0;
        const cogs = Math.round((orderCogs.get(o.id) || 0) * 100) / 100;

        bucket.ordersCount += 1;
        bucket.grossSales += gross;
        bucket.netSales += net;
        bucket.cogs += cogs;
        bucket.grossProfit += (net - cogs);
      } catch {}
    }

    return {
      year,
      months: buckets.map(b => ({
        ...b,
        grossSales: Math.round(b.grossSales * 100) / 100,
        netSales: Math.round(b.netSales * 100) / 100,
        cogs: Math.round(b.cogs * 100) / 100,
        grossProfit: Math.round(b.grossProfit * 100) / 100,
        marginPercent: b.netSales > 0 ? Math.round((b.grossProfit / b.netSales) * 10000) / 100 : 0,
      }))
    };
  }
}

export const analyticsService = new AnalyticsService();
