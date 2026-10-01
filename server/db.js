import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { storeProfile, sampleCategories, sampleProducts, sampleCustomers, sampleSuppliers, sampleRecentOrders } from './seedData.js';
import { runMigrations } from './migrations/migrationManager.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'kirana_central.db');

// Multi-Tenant Dual Database Engine (MySQL in Production / SQLite in Development)
const isMySQLConfigured = process.env.DB_CLIENT === 'mysql' && Boolean(process.env.DB_HOST);

let mysqlPool = null;
let sqliteDb = null;

if (isMySQLConfigured) {
  try {
    const mysql = await import('mysql2/promise');
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    console.log(`[Database] Connected to Enterprise MySQL Pool at ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}`);
  } catch (err) {
    console.error('[Database Error] Failed to initialize MySQL Pool, falling back to SQLite:', err.message);
    mysqlPool = null;
  }
}

if (!mysqlPool) {
  sqlite3.verbose();
  sqliteDb = new sqlite3.Database(DB_PATH);
  console.log(`[Database] Connected to SQLite database at ${DB_PATH}`);
}

export const isMySQL = () => Boolean(mysqlPool);
export const isSQLite = () => !mysqlPool;

// Unified Promise-Based Query Helper
export const query = async (sql, params = []) => {
  if (mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows;
  }
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

export const getOne = async (sql, params = []) => {
  if (mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  }
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
};

export const execute = async (sql, params = []) => {
  if (mysqlPool) {
    const [result] = await mysqlPool.execute(sql, params);
    return { lastID: result.insertId, changes: result.affectedRows };
  }
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Sequential execution for SQLite initialization
const execScript = async (sql) => {
  if (mysqlPool) return;
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await new Promise((res, rej) => {
        sqliteDb.run(stmt, (err) => {
          if (err) return rej(err);
          res();
        });
      });
    } catch (e) {
      console.error('[SQL Statement Failed]:', stmt.substring(0, 100), '->', e.message);
      throw e;
    }
  }
};

export async function initDatabase() {
  if (!mysqlPool) {
    await execScript(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;

      -- CENTRAL SAAS TENANTS TABLE
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        custom_domain TEXT,
        owner_name TEXT NOT NULL,
        owner_email TEXT,
        owner_phone TEXT NOT NULL,
        business_type TEXT DEFAULT 'KIRANA_GROCERY',
        gstin TEXT,
        address TEXT NOT NULL,
        city TEXT,
        state TEXT,
        pincode TEXT,
        status TEXT DEFAULT 'ACTIVE',
        plan TEXT DEFAULT 'GROWTH',
        plan_expires_at TEXT,
        primary_color TEXT DEFAULT '#16a34a',
        secondary_color TEXT DEFAULT '#0f766e',
        button_color TEXT DEFAULT '#15803d',
        logo_url TEXT,
        banner_url TEXT,
        tagline TEXT DEFAULT 'Fresh & Pure Groceries Delivered Daily',
        currency_symbol TEXT DEFAULT '₹',
        min_order_value REAL DEFAULT 199,
        delivery_charge REAL DEFAULT 30,
        free_delivery_above REAL DEFAULT 499,
        estimated_delivery_mins TEXT DEFAULT '30-45 mins',
        store_status TEXT DEFAULT 'OPEN',
        opening_time TEXT DEFAULT '07:30',
        closing_time TEXT DEFAULT '22:30',
        operating_days TEXT DEFAULT 'Mon-Sun',
        printer_width TEXT DEFAULT '80mm',
        printer_connection TEXT DEFAULT 'BROWSER_DIRECT',
        cashier_max_discount REAL DEFAULT 5,
        manager_max_discount REAL DEFAULT 20,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tagline TEXT,
        owner_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        gstin TEXT,
        upi_id TEXT,
        currency_symbol TEXT DEFAULT '₹',
        min_order_value REAL DEFAULT 199,
        delivery_charge REAL DEFAULT 30,
        free_delivery_above REAL DEFAULT 499,
        estimated_delivery_mins TEXT DEFAULT '30-45 mins',
        store_status TEXT DEFAULT 'OPEN',
        opening_time TEXT DEFAULT '07:30',
        closing_time TEXT DEFAULT '22:30',
        operating_days TEXT DEFAULT 'Mon-Sun',
        logo_url TEXT,
        printer_width TEXT DEFAULT '80mm',
        printer_connection TEXT DEFAULT 'BROWSER_DIRECT',
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        icon TEXT,
        image_url TEXT,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        barcode TEXT,
        unit TEXT NOT NULL,
        is_loose INTEGER DEFAULT 0,
        purchase_cost REAL NOT NULL,
        selling_price REAL NOT NULL,
        mrp REAL NOT NULL,
        wholesale_price REAL,
        min_selling_price REAL,
        pos_price REAL,
        website_price REAL,
        gst_percent REAL DEFAULT 0,
        stock REAL DEFAULT 0,
        reserved_stock REAL DEFAULT 0,
        min_stock REAL DEFAULT 5,
        is_active INTEGER DEFAULT 1,
        is_visible_online INTEGER DEFAULT 1,
        is_pos_available INTEGER DEFAULT 1,
        is_featured INTEGER DEFAULT 0,
        is_bestseller INTEGER DEFAULT 0,
        is_offer INTEGER DEFAULT 0,
        photo_url TEXT,
        description TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS price_history (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        old_price REAL NOT NULL,
        new_price REAL NOT NULL,
        changed_by TEXT,
        reason TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        product_id TEXT NOT NULL,
        change_qty REAL NOT NULL,
        balance_qty REAL NOT NULL,
        type TEXT NOT NULL,
        reference_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        credit_balance REAL DEFAULT 0,
        total_spent REAL DEFAULT 0,
        orders_count INTEGER DEFAULT 0,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS customer_ledger (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        balance_after REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        order_number TEXT NOT NULL,
        invoice_number TEXT NOT NULL,
        order_type TEXT NOT NULL,
        status TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        delivery_address TEXT,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        delivery_charge REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        payment_status TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        tenant_id TEXT,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        cost_price REAL NOT NULL,
        gross_amount REAL,
        discount_type TEXT DEFAULT 'NONE',
        discount_value REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        taxable_amount REAL,
        gst_percent REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total_price REAL NOT NULL,
        manual_price_adjusted INTEGER DEFAULT 0,
        original_unit_price REAL,
        discount_reason TEXT,
        approval_data TEXT
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        company TEXT,
        gstin TEXT,
        address TEXT
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        supplier_id TEXT NOT NULL,
        invoice_no TEXT,
        total_cost REAL NOT NULL,
        payment_status TEXT DEFAULT 'PAID',
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchase_items (
        id TEXT PRIMARY KEY,
        purchase_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        user_name TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_areas (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        area_name TEXT NOT NULL,
        pincodes TEXT NOT NULL,
        delivery_charge REAL DEFAULT 30,
        min_order_value REAL DEFAULT 199,
        estimated_delivery TEXT DEFAULT '30-45 mins',
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        pin TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions TEXT NOT NULL,
        photo_url TEXT,
        address TEXT,
        emergency_contact TEXT,
        status TEXT DEFAULT 'ACTIVE',
        availability TEXT DEFAULT 'ONLINE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_audits (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        paid_by_user_id TEXT,
        paid_by_user_name TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_status_history (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        payment_status TEXT,
        notes TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_settings (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        razorpay_enabled INTEGER DEFAULT 0,
        razorpay_test_mode INTEGER DEFAULT 1,
        razorpay_key_id TEXT DEFAULT '',
        razorpay_key_secret TEXT DEFAULT '',
        razorpay_webhook_secret TEXT DEFAULT '',
        store_upi_id TEXT DEFAULT '',
        store_upi_name TEXT DEFAULT '',
        store_upi_qr_url TEXT DEFAULT '',
        cod_enabled INTEGER DEFAULT 1,
        cod_min_order REAL DEFAULT 0,
        cod_max_order REAL DEFAULT 10000,
        online_payment_enabled INTEGER DEFAULT 1,
        cash_enabled INTEGER DEFAULT 1,
        upi_enabled INTEGER DEFAULT 1,
        card_enabled INTEGER DEFAULT 1,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        tenant_id TEXT,
        customer_id TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        method TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_payment_id TEXT,
        provider_order_id TEXT,
        transaction_reference TEXT,
        status TEXT NOT NULL,
        collected_by TEXT,
        collected_by_id TEXT,
        collected_at TEXT,
        verified_at TEXT,
        failure_reason TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        event_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        signature TEXT,
        processed INTEGER DEFAULT 0,
        processed_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_tracking_sessions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        order_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        start_lat REAL,
        start_lng REAL,
        current_lat REAL,
        current_lng REAL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_locations (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL,
        speed REAL,
        heading REAL,
        timestamp TEXT NOT NULL,
        tracking_status TEXT
      );

      CREATE TABLE IF NOT EXISTS delivery_cash_collections (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        order_id TEXT NOT NULL,
        payment_transaction_id TEXT,
        agent_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        order_total REAL NOT NULL,
        amount_collected REAL NOT NULL,
        customer_tendered REAL NOT NULL,
        change_returned REAL DEFAULT 0,
        currency TEXT DEFAULT 'INR',
        payment_method TEXT DEFAULT 'CASH',
        collected_at TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        device_info TEXT,
        notes TEXT,
        handover_id TEXT,
        handover_status TEXT DEFAULT 'PENDING'
      );

      CREATE TABLE IF NOT EXISTS cash_handover_sessions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        agent_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        expected_amount REAL NOT NULL,
        received_amount REAL NOT NULL,
        difference REAL NOT NULL,
        orders_count INTEGER NOT NULL,
        approved_by TEXT NOT NULL,
        notes TEXT,
        handover_time TEXT NOT NULL,
        status TEXT DEFAULT 'COMPLETED'
      );

      CREATE TABLE IF NOT EXISTS notification_events (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        tenant_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        read_status INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

    `);
  }

  // Safe schema migrations helper
  const safeAddCol = async (tableName, col, type) => {
    try {
      const columns = await query(`PRAGMA table_info(${tableName})`);
      const names = new Set(columns.map(c => c.name));
      if (!names.has(col)) {
        await execute(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${type}`);
        console.log(`[Migration] Added column ${col} to ${tableName} table.`);
      }
    } catch (e) {
      // Table may not exist or column exists
    }
  };

  // Ensure new Phase 4 Multi-Tenant columns exist
  await safeAddCol('stores', 'slug', 'TEXT');
  await safeAddCol('stores', 'custom_domain', 'TEXT');
  await safeAddCol('stores', 'status', 'TEXT');
  await safeAddCol('stores', 'plan', 'TEXT');
  await safeAddCol('stores', 'primary_color', 'TEXT');
  await safeAddCol('stores', 'secondary_color', 'TEXT');
  await safeAddCol('stores', 'button_color', 'TEXT');
  await safeAddCol('stores', 'cashier_max_discount', 'REAL');
  await safeAddCol('stores', 'manager_max_discount', 'REAL');

  await safeAddCol('categories', 'tenant_id', 'TEXT');
  await safeAddCol('products', 'tenant_id', 'TEXT');
  await safeAddCol('stock_movements', 'tenant_id', 'TEXT');
  await safeAddCol('customers', 'tenant_id', 'TEXT');
  await safeAddCol('customer_ledger', 'tenant_id', 'TEXT');
  await safeAddCol('orders', 'tenant_id', 'TEXT');
  await safeAddCol('order_items', 'tenant_id', 'TEXT');
  await safeAddCol('order_items', 'gross_amount', 'REAL');
  await safeAddCol('order_items', 'discount_type', 'TEXT');
  await safeAddCol('order_items', 'discount_value', 'REAL');
  await safeAddCol('order_items', 'discount_amount', 'REAL');
  await safeAddCol('order_items', 'taxable_amount', 'REAL');
  await safeAddCol('order_items', 'gst_percent', 'REAL');
  await safeAddCol('order_items', 'tax_amount', 'REAL');
  await safeAddCol('order_items', 'total_price', 'REAL');
  await safeAddCol('order_items', 'manual_price_adjusted', 'INTEGER');
  await safeAddCol('order_items', 'original_unit_price', 'REAL');
  await safeAddCol('order_items', 'discount_reason', 'TEXT');
  await safeAddCol('order_items', 'approval_data', 'TEXT');

  await safeAddCol('audit_logs', 'tenant_id', 'TEXT');
  await safeAddCol('delivery_areas', 'tenant_id', 'TEXT');
  await safeAddCol('delivery_areas', 'free_delivery_above', 'REAL');
  await safeAddCol('users', 'tenant_id', 'TEXT');
  await safeAddCol('payment_settings', 'tenant_id', 'TEXT');
  await safeAddCol('payment_transactions', 'tenant_id', 'TEXT');
  await safeAddCol('delivery_tracking_sessions', 'tenant_id', 'TEXT');
  await safeAddCol('delivery_locations', 'tenant_id', 'TEXT');
  await safeAddCol('delivery_cash_collections', 'tenant_id', 'TEXT');
  await safeAddCol('cash_handover_sessions', 'tenant_id', 'TEXT');
  await safeAddCol('notification_events', 'tenant_id', 'TEXT');

  await safeAddCol('orders', 'delivery_area_id', 'TEXT');
  await safeAddCol('orders', 'area', 'TEXT');
  await safeAddCol('orders', 'pincode', 'TEXT');
  await safeAddCol('orders', 'landmark', 'TEXT');
  await safeAddCol('orders', 'latitude', 'REAL');
  await safeAddCol('orders', 'longitude', 'REAL');
  await safeAddCol('orders', 'assigned_delivery_boy_id', 'TEXT');
  await safeAddCol('orders', 'assigned_delivery_boy_name', 'TEXT');
  await safeAddCol('orders', 'pickup_code', 'TEXT');
  await safeAddCol('orders', 'payment_transaction_id', 'TEXT');
  await safeAddCol('orders', 'delivery_notes', 'TEXT');
  await safeAddCol('orders', 'delivery_failure_reason', 'TEXT');
  await safeAddCol('orders', 'cancellation_reason', 'TEXT');

  // Now create indexes safely once columns exist
  if (!mysqlPool) {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)',
      'CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id, category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
      'CREATE INDEX IF NOT EXISTS idx_payment_trans_order ON payment_transactions(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_tracking_order ON delivery_tracking_sessions(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notification_events(store_id, read_status)'
    ];
    for (const idx of indexes) {
      try { await execute(idx); } catch (e) { /* ignore index duplicate */ }
    }
  }

  // Migrate or Seed Tenant 001 ("Royal Kirana" / "Apna Kirana")
  const royalTenant = await getOne('SELECT id FROM tenants WHERE id = ?', ['store_royal_001']);
  const now = new Date().toISOString();
  if (!royalTenant) {
    const existingStore = await getOne('SELECT * FROM stores WHERE id = ?', ['store_royal_001']);
    await execute(`
      INSERT INTO tenants (
        id, name, slug, custom_domain, owner_name, owner_email, owner_phone,
        business_type, gstin, address, city, state, pincode, status, plan,
        primary_color, secondary_color, button_color, logo_url, banner_url,
        tagline, currency_symbol, min_order_value, delivery_charge, free_delivery_above,
        estimated_delivery_mins, store_status, opening_time, closing_time, operating_days,
        printer_width, printer_connection, cashier_max_discount, manager_max_discount,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'store_royal_001',
      existingStore?.name || 'Apna Kirana & Supermarket',
      'royal-kirana',
      null,
      existingStore?.owner_name || 'Ramesh Patel',
      existingStore?.email || 'ramesh@apnakirana.com',
      existingStore?.phone || '9876543210',
      'KIRANA_GROCERY',
      existingStore?.gstin || '36AABCU9603R1ZM',
      existingStore?.address || 'Shop #4, Main Market, Kukatpally',
      'Hyderabad',
      'Telangana',
      '500072',
      'ACTIVE',
      'GROWTH',
      '#16a34a',
      '#0f766e',
      '#15803d',
      existingStore?.logo_url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      existingStore?.tagline || 'Fresh & Pure Groceries Delivered Daily',
      '₹',
      existingStore?.min_order_value || 199,
      existingStore?.delivery_charge || 30,
      existingStore?.free_delivery_above || 499,
      existingStore?.estimated_delivery_mins || '30-45 mins',
      existingStore?.store_status || 'OPEN',
      existingStore?.opening_time || '07:30',
      existingStore?.closing_time || '22:30',
      existingStore?.operating_days || 'Mon-Sun',
      '80mm',
      'BROWSER_DIRECT',
      5,
      20,
      now,
      now
    ]);
    console.log('[Migration] Initialized Tenant 001 (royal-kirana).');
  }

  // Backfill tenant_id on all existing data for store_royal_001
  await execute('UPDATE categories SET tenant_id = "store_royal_001" WHERE tenant_id IS NULL OR tenant_id = ""');
  await execute('UPDATE products SET tenant_id = "store_royal_001" WHERE tenant_id IS NULL OR tenant_id = ""');
  await execute('UPDATE orders SET tenant_id = "store_royal_001" WHERE tenant_id IS NULL OR tenant_id = ""');
  await execute('UPDATE order_items SET tenant_id = "store_royal_001" WHERE tenant_id IS NULL OR tenant_id = ""');
  await execute('UPDATE customers SET tenant_id = "store_royal_001" WHERE tenant_id IS NULL OR tenant_id = ""');
  await execute('UPDATE delivery_areas SET tenant_id = "store_royal_001" WHERE tenant_id IS NULL OR tenant_id = ""');
  await execute('UPDATE users SET tenant_id = "store_royal_001" WHERE (tenant_id IS NULL OR tenant_id = "") AND role != "PLATFORM_ADMIN"');
  await execute('UPDATE payment_settings SET tenant_id = "store_royal_001" WHERE tenant_id IS NULL OR tenant_id = ""');

  // Seed Tenant 002 ("Fresh Mart Superstore" / slug: "fresh-mart") for multi-tenancy verification
  const freshTenant = await getOne('SELECT id FROM tenants WHERE id = ?', ['store_fresh_002']);
  if (!freshTenant) {
    await execute(`
      INSERT INTO tenants (
        id, name, slug, custom_domain, owner_name, owner_email, owner_phone,
        business_type, gstin, address, city, state, pincode, status, plan,
        primary_color, secondary_color, button_color, logo_url, banner_url,
        tagline, currency_symbol, min_order_value, delivery_charge, free_delivery_above,
        estimated_delivery_mins, store_status, opening_time, closing_time, operating_days,
        printer_width, printer_connection, cashier_max_discount, manager_max_discount,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'store_fresh_002',
      'Fresh Mart Superstore',
      'fresh-mart',
      null,
      'Vikram Rao',
      'vikram@freshmart.com',
      '9848012345',
      'SUPERMARKET',
      '36AAECR5512M1Z8',
      'G-12, Cyber Gateway, Madhapur',
      'Hyderabad',
      'Telangana',
      '500081',
      'ACTIVE',
      'PRO',
      '#2563eb', // Royal Blue Brand
      '#1d4ed8',
      '#1e40af',
      'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
      'Smart Living, Freshest Groceries Delivered in 20 Mins',
      '₹',
      149,
      25,
      399,
      '20-35 mins',
      'OPEN',
      '07:00',
      '23:00',
      'Mon-Sun',
      '80mm',
      'BROWSER_DIRECT',
      8,
      25,
      now,
      now
    ]);

    // Seed Fresh Mart initial categories
    const catFresh1 = 'cat_fm_dairy_' + Math.random().toString(36).substring(2, 7);
    const catFresh2 = 'cat_fm_fruits_' + Math.random().toString(36).substring(2, 7);
    await execute('INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [catFresh1, 'store_fresh_002', 'store_fresh_002', 'Fresh Dairy & Eggs', 'fresh-dairy', 'Milk', 1]);
    await execute('INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [catFresh2, 'store_fresh_002', 'store_fresh_002', 'Farm Fresh Fruits', 'farm-fruits', 'Apple', 2]);

    // Seed Fresh Mart initial products (different pricing and items from Tenant 1)
    await execute(`
      INSERT INTO products (
        id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
        purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
        pos_price, website_price, gst_percent, stock, min_stock, is_active, is_visible_online,
        is_pos_available, is_featured, is_bestseller, is_offer, photo_url, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'prod_fm_milk', 'store_fresh_002', 'store_fresh_002', catFresh1, 'Amul Taaza Homogenised Toned Milk 1L', 'Amul', '8901262010053', 'PACKET', 0,
      54, 72, 75, 68, 65, 72, 72, 0, 85, 10, 1, 1, 1, 1, 1, 0,
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
      'Fresh toned milk pasteurized and hygienically packed.', now, now
    ]);

    await execute(`
      INSERT INTO products (
        id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
        purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
        pos_price, website_price, gst_percent, stock, min_stock, is_active, is_visible_online,
        is_pos_available, is_featured, is_bestseller, is_offer, photo_url, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'prod_fm_apples', 'store_fresh_002', 'store_fresh_002', catFresh2, 'Shimla Royal Apple (Loose)', 'Fresh Orchards', '8901262019999', 'KG', 1,
      120, 160, 190, 150, 140, 160, 160, 0, 50, 5, 1, 1, 1, 1, 1, 1,
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
      'Crisp, sweet, juicy and handpicked Shimla red apples.', now, now
    ]);

    // Seed Fresh Mart Owner user
    await execute(`
      INSERT INTO users (id, store_id, tenant_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', ?, ?)
    `, ['usr_fresh_owner', 'store_fresh_002', 'store_fresh_002', 'Vikram Rao (Owner)', '9848012345', '1234', 'STORE_OWNER', JSON.stringify(['*']), now, now]);

    // Seed Fresh Mart Delivery Areas
    await execute(`
      INSERT INTO delivery_areas (id, store_id, tenant_id, area_name, pincodes, delivery_charge, min_order_value, estimated_delivery, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, ['area_fm_hitech', 'store_fresh_002', 'store_fresh_002', 'Hitec City & Madhapur', '500081, 500084', 25, 149, '20–30 mins', now, now]);

    console.log('[Migration] Initialized Tenant 002 (fresh-mart) with isolated products, branding & user.');
  }

  // Seed Central Platform Super Admin user (tenant_id is NULL)
  const existingPlatformAdmin = await getOne('SELECT id FROM users WHERE phone = ?', ['9999999999']);
  if (!existingPlatformAdmin) {
    await execute(`
      INSERT INTO users (id, store_id, tenant_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', ?, ?)
    `, [
      'usr_platform_admin',
      'store_royal_001',
      'Platform Super Administrator',
      '9999999999',
      '9999',
      'PLATFORM_ADMIN',
      JSON.stringify(['*']),
      now,
      now
    ]);
    console.log('[Migration] Initialized Central Platform Admin (phone: 9999999999 / pin: 9999).');
  }

  // Seed default payment_settings if not present
  const existingPaySettings = await getOne('SELECT id FROM payment_settings WHERE id = "default" OR tenant_id = "store_royal_001"');
  if (!existingPaySettings) {
    const store = await getOne('SELECT * FROM stores LIMIT 1');
    await execute(`
      INSERT INTO payment_settings (
        id, tenant_id, razorpay_enabled, razorpay_test_mode, razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret,
        store_upi_id, store_upi_name, store_upi_qr_url, cod_enabled, cod_min_order, cod_max_order,
        online_payment_enabled, cash_enabled, upi_enabled, card_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'pay_royal_001',
      'store_royal_001',
      0,
      1,
      process.env.RAZORPAY_KEY_ID || 'rzp_test_kirana_demo',
      process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_kirana_demo_secret',
      process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_kirana_123',
      store?.upi_id || 'apnakirana@okhdfcbank',
      store?.name || 'Apna Kirana & Supermarket',
      '',
      1, 0, 10000, 1, 1, 1, 1, now
    ]);
    console.log('[Migration] Initialized default payment_settings for store_royal_001.');
  }

  // Check if store profile exists in stores table, if not seed it
  const existingStore = await getOne('SELECT id FROM stores WHERE id = ?', [storeProfile.id]);
  if (!existingStore) {
    console.log('Seeding initial Kirana database...');
    await execute(`
      INSERT INTO stores (
        id, name, tagline, owner_name, phone, email, address, gstin, upi_id,
        currency_symbol, min_order_value, delivery_charge, free_delivery_above,
        estimated_delivery_mins, store_status, opening_time, closing_time,
        operating_days, logo_url, printer_width, printer_connection, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      storeProfile.id, storeProfile.name, storeProfile.tagline, storeProfile.owner_name,
      storeProfile.phone, storeProfile.email, storeProfile.address, storeProfile.gstin,
      storeProfile.upi_id, storeProfile.currency_symbol, storeProfile.min_order_value,
      storeProfile.delivery_charge, storeProfile.free_delivery_above,
      storeProfile.estimated_delivery_mins, storeProfile.store_status,
      storeProfile.opening_time, storeProfile.closing_time, storeProfile.operating_days,
      storeProfile.logo_url, storeProfile.printer_width, storeProfile.printer_connection,
      now
    ]);

    for (const cat of sampleCategories) {
      await execute(`
        INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, image_url, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [cat.id, storeProfile.id, storeProfile.id, cat.name, cat.slug, cat.icon, cat.image_url, cat.sort_order]);
    }

    for (const p of sampleProducts) {
      await execute(`
        INSERT INTO products (
          id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
          purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
          pos_price, website_price, gst_percent, stock, reserved_stock, min_stock,
          is_active, is_visible_online, is_pos_available, is_featured, is_bestseller,
          is_offer, photo_url, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        p.id, storeProfile.id, storeProfile.id, p.category_id, p.name, p.brand, p.barcode, p.unit, p.is_loose,
        p.purchase_cost, p.selling_price, p.mrp, p.wholesale_price, p.min_selling_price,
        p.selling_price, p.selling_price, p.gst_percent, p.stock, p.reserved_stock, p.min_stock,
        p.is_active, p.is_visible_online, p.is_pos_available, p.is_featured, p.is_bestseller,
        p.is_offer, p.photo_url, p.description, now, now
      ]);
    }

    for (const c of sampleCustomers) {
      await execute(`
        INSERT INTO customers (id, store_id, tenant_id, name, phone, email, address, credit_balance, total_spent, orders_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [c.id, storeProfile.id, storeProfile.id, c.name, c.phone, c.email, c.address, c.credit_balance, c.total_spent, c.orders_count, now]);
    }

    for (const s of sampleSuppliers) {
      await execute(`
        INSERT INTO suppliers (id, store_id, tenant_id, name, phone, company, gstin, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [s.id, storeProfile.id, storeProfile.id, s.name, s.phone, s.company, s.gstin, s.address]);
    }

    for (const o of sampleRecentOrders) {
      await execute(`
        INSERT INTO orders (
          id, store_id, tenant_id, order_number, invoice_number, order_type, status,
          customer_id, customer_name, customer_phone, delivery_address,
          subtotal, discount, delivery_charge, gst_amount, total_amount,
          payment_status, payment_method, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        o.id, storeProfile.id, storeProfile.id, o.order_number, o.invoice_number, o.order_type, o.status,
        null, o.customer_name, o.customer_phone, o.delivery_address,
        o.subtotal, o.discount, o.delivery_charge, o.gst_amount, o.total_amount,
        o.payment_status, o.payment_method, '', o.created_at, o.created_at
      ]);

      for (const item of o.items) {
        await execute(`
          INSERT INTO order_items (
            id, order_id, tenant_id, product_id, product_name, unit, quantity,
            unit_price, cost_price, gross_amount, discount_type, discount_value,
            discount_amount, taxable_amount, gst_percent, tax_amount, discount, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NONE', 0, 0, ?, 0, 0, 0, ?)
        `, [
          'item_' + Math.random().toString(36).substring(2, 9),
          o.id, storeProfile.id, 'prod_generic', item.product_name, item.unit, item.quantity,
          item.unit_price, item.cost_price, item.total_price, item.total_price, item.total_price
        ]);
      }
    }
  }

  // Ensure default staff exists
  const userCount = await getOne('SELECT COUNT(*) as count FROM users');
  if (!userCount || userCount.count === 0) {
    const defaultUsers = [
      {
        id: 'usr_owner',
        name: 'Ramesh Patel (Owner)',
        phone: '9876543210',
        pin: '1234',
        role: 'STORE_OWNER',
        permissions: JSON.stringify(['*']),
        address: 'Shop #4, Main Market, Kukatpally, Hyderabad',
        emergency_contact: '9876543200',
        status: 'ACTIVE',
        availability: 'ONLINE'
      },
      {
        id: 'usr_subadmin',
        name: 'Anil Sharma (Manager)',
        phone: '9876543211',
        pin: '1234',
        role: 'MANAGER',
        permissions: JSON.stringify(['*']),
        address: 'H.No 12-4, Moosapet',
        emergency_contact: '9876543201',
        status: 'ACTIVE',
        availability: 'ONLINE'
      },
      {
        id: 'usr_cashier',
        name: 'Priya Verma (Cashier)',
        phone: '9876543212',
        pin: '1234',
        role: 'CASHIER',
        permissions: JSON.stringify(['view_orders', 'manage_orders', 'pos_billing']),
        address: 'Plot 24, Nizampet Road',
        emergency_contact: '9876543202',
        status: 'ACTIVE',
        availability: 'ONLINE'
      },
      {
        id: 'usr_delivery_1',
        name: 'Ravi Kumar (Delivery Boy)',
        phone: '9876543213',
        pin: '1234',
        role: 'DELIVERY_AGENT',
        permissions: JSON.stringify(['view_delivery', 'update_delivery_status', 'mark_cod_paid']),
        address: 'Street 5, Kukatpally Housing Board',
        emergency_contact: '9876543203',
        status: 'ACTIVE',
        availability: 'ONLINE'
      }
    ];

    for (const u of defaultUsers) {
      await execute(`
        INSERT INTO users (id, store_id, tenant_id, name, phone, pin, role, permissions, photo_url, address, emergency_contact, status, availability, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)
      `, [u.id, 'store_royal_001', 'store_royal_001', u.name, u.phone, u.pin, u.role, u.permissions, u.address, u.emergency_contact, u.status, u.availability, now, now]);
    }
  }

  // Run automated schema migrations & version tracking
  await runMigrations();

  console.log('[Database] Database initialized and verified with Multi-Tenant SaaS schema.');
}

export default {
  query,
  getOne,
  execute,
  initDatabase,
  isMySQL,
  isSQLite
};
