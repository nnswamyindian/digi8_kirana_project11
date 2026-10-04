import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeProfile, sampleCategories, sampleProducts, sampleCustomers, sampleSuppliers, sampleRecentOrders } from './seedData.js';
import { runMigrations } from './migrations/migrationManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enterprise MySQL Configuration from Environment
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const DB_NAME = process.env.DB_NAME || 'kirana_saas_db';

let mysqlPool = null;

/**
 * Ensures the MySQL database exists before creating the pool.
 */
export async function ensureDatabaseExists() {
  try {
    const tempConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.end();
    console.log(`[Database] Ensured MySQL database \`${DB_NAME}\` is ready.`);
  } catch (err) {
    console.warn(`[Database Warning] Could not pre-verify database existence: ${err.message}`);
  }
}

/**
 * Returns the active MySQL connection pool (lazy singleton).
 */
export function getPool() {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      multipleStatements: true,
      dateStrings: true,
      decimalNumbers: true
    });
    console.log(`[Database] Connected to Enterprise MySQL Pool at ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  }
  return mysqlPool;
}

export const isMySQL = () => true;
export const isSQLite = () => false;

// Unified Promise-Based Query Helper
export const query = async (sql, params = []) => {
  const pool = getPool();
  const [rows] = await pool.query(sql, params);
  return rows;
};

export const getOne = async (sql, params = []) => {
  const pool = getPool();
  const [rows] = await pool.query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
};

export const execute = async (sql, params = []) => {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return {
    lastID: result.insertId,
    insertId: result.insertId,
    changes: result.affectedRows,
    affectedRows: result.affectedRows
  };
};

/**
 * Safe column addition helper for MySQL schema evolution
 */
export const safeAddCol = async (tableName, col, typeDef) => {
  try {
    const rows = await query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [tableName, col]
    );
    if (rows.length === 0) {
      await execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` ${typeDef}`);
      console.log(`[Database Schema] Added column ${col} to ${tableName}`);
    }
  } catch (e) {
    // Ignore if column already exists or table is created subsequently
  }
};

/**
 * Initialize all database tables and seed foundational multi-tenant data
 */
export async function initDatabase() {
  await ensureDatabaseExists();
  const pool = getPool();

  // Test pool connectivity
  try {
    const testConn = await pool.getConnection();
    testConn.release();
  } catch (err) {
    console.error('\n❌ [MySQL Connection Error]:');
    console.error(`Unable to connect to MySQL server at ${DB_HOST}:${DB_PORT} with user "${DB_USER}".`);
    console.error(`Message: ${err.message}`);
    console.error('Please ensure your MySQL service is running and credentials in .env are correct.\n');
    throw err;
  }

  // Execute Core DDL Table Setup (InnoDB utf8mb4)
  await query(`
    -- 1. CENTRAL SAAS TENANTS
    CREATE TABLE IF NOT EXISTS tenants (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(80) UNIQUE NOT NULL,
      custom_domain VARCHAR(150) UNIQUE DEFAULT NULL,
      owner_name VARCHAR(120) NOT NULL,
      owner_email VARCHAR(150) DEFAULT NULL,
      owner_phone VARCHAR(20) NOT NULL,
      business_type VARCHAR(60) DEFAULT 'KIRANA_GROCERY',
      gstin VARCHAR(30) DEFAULT NULL,
      address TEXT NOT NULL,
      city VARCHAR(80) DEFAULT NULL,
      state VARCHAR(80) DEFAULT NULL,
      pincode VARCHAR(20) DEFAULT NULL,
      status VARCHAR(30) DEFAULT 'ACTIVE',
      plan VARCHAR(30) DEFAULT 'GROWTH',
      plan_expires_at VARCHAR(50) DEFAULT NULL,
      primary_color VARCHAR(20) DEFAULT '#16a34a',
      secondary_color VARCHAR(20) DEFAULT '#0f766e',
      button_color VARCHAR(20) DEFAULT '#15803d',
      logo_url TEXT,
      banner_url TEXT,
      tagline VARCHAR(255) DEFAULT 'Fresh & Pure Groceries Delivered Daily',
      currency_symbol VARCHAR(10) DEFAULT '₹',
      min_order_value DECIMAL(10,2) DEFAULT 199.00,
      delivery_charge DECIMAL(10,2) DEFAULT 30.00,
      free_delivery_above DECIMAL(10,2) DEFAULT 499.00,
      estimated_delivery_mins VARCHAR(50) DEFAULT '30-45 mins',
      store_status VARCHAR(20) DEFAULT 'OPEN',
      opening_time VARCHAR(10) DEFAULT '07:30',
      closing_time VARCHAR(10) DEFAULT '22:30',
      operating_days VARCHAR(50) DEFAULT 'Mon-Sun',
      printer_width VARCHAR(20) DEFAULT '80mm',
      printer_connection VARCHAR(30) DEFAULT 'BROWSER_DIRECT',
      cashier_max_discount DECIMAL(5,2) DEFAULT 5.00,
      manager_max_discount DECIMAL(5,2) DEFAULT 20.00,
      upi_id VARCHAR(100) DEFAULT 'apnakirana@okhdfcbank',
      weighted_barcode_enabled TINYINT(1) DEFAULT 0,
      weighted_barcode_prefix VARCHAR(10) DEFAULT '20',
      created_at VARCHAR(50) NOT NULL,
      updated_at VARCHAR(50) NOT NULL,
      INDEX idx_tenants_slug (slug),
      INDEX idx_tenants_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 2. STORES PROFILE
    CREATE TABLE IF NOT EXISTS stores (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(80) DEFAULT NULL,
      custom_domain VARCHAR(150) DEFAULT NULL,
      tagline VARCHAR(255),
      owner_name VARCHAR(120),
      phone VARCHAR(20),
      email VARCHAR(150),
      address TEXT,
      gstin VARCHAR(30),
      upi_id VARCHAR(100),
      currency_symbol VARCHAR(10) DEFAULT '₹',
      min_order_value DECIMAL(10,2) DEFAULT 199.00,
      delivery_charge DECIMAL(10,2) DEFAULT 30.00,
      free_delivery_above DECIMAL(10,2) DEFAULT 499.00,
      estimated_delivery_mins VARCHAR(50) DEFAULT '30-45 mins',
      store_status VARCHAR(20) DEFAULT 'OPEN',
      opening_time VARCHAR(10) DEFAULT '07:30',
      closing_time VARCHAR(10) DEFAULT '22:30',
      operating_days VARCHAR(50) DEFAULT 'Mon-Sun',
      logo_url TEXT,
      printer_width VARCHAR(20) DEFAULT '80mm',
      printer_connection VARCHAR(30) DEFAULT 'BROWSER_DIRECT',
      cashier_max_discount DECIMAL(5,2) DEFAULT 5.00,
      manager_max_discount DECIMAL(5,2) DEFAULT 20.00,
      weighted_barcode_enabled TINYINT(1) DEFAULT 0,
      weighted_barcode_prefix VARCHAR(10) DEFAULT '20',
      status VARCHAR(30) DEFAULT 'ACTIVE',
      plan VARCHAR(30) DEFAULT 'GROWTH',
      primary_color VARCHAR(20) DEFAULT '#16a34a',
      secondary_color VARCHAR(20) DEFAULT '#0f766e',
      button_color VARCHAR(20) DEFAULT '#15803d',
      updated_at VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 3. CATEGORIES
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(120) NOT NULL,
      icon VARCHAR(60),
      image_url TEXT,
      sort_order INT DEFAULT 0,
      INDEX idx_cat_tenant (tenant_id),
      INDEX idx_cat_store (store_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 4. PRODUCTS & INVENTORY
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      category_id VARCHAR(64) NOT NULL,
      name VARCHAR(200) NOT NULL,
      brand VARCHAR(100),
      barcode VARCHAR(64),
      unit VARCHAR(20) NOT NULL,
      is_loose TINYINT(1) DEFAULT 0,
      purchase_cost DECIMAL(10,2) NOT NULL,
      selling_price DECIMAL(10,2) NOT NULL,
      mrp DECIMAL(10,2) NOT NULL,
      wholesale_price DECIMAL(10,2),
      min_selling_price DECIMAL(10,2),
      pos_price DECIMAL(10,2),
      website_price DECIMAL(10,2),
      gst_percent DECIMAL(5,2) DEFAULT 0.00,
      stock DECIMAL(12,3) DEFAULT 0.000,
      reserved_stock DECIMAL(12,3) DEFAULT 0.000,
      min_stock DECIMAL(12,3) DEFAULT 5.000,
      is_active TINYINT(1) DEFAULT 1,
      is_visible_online TINYINT(1) DEFAULT 1,
      is_pos_available TINYINT(1) DEFAULT 1,
      is_featured TINYINT(1) DEFAULT 0,
      is_bestseller TINYINT(1) DEFAULT 0,
      is_offer TINYINT(1) DEFAULT 0,
      photo_url TEXT,
      description TEXT,
      created_at VARCHAR(50),
      updated_at VARCHAR(50),
      INDEX idx_prod_tenant (tenant_id),
      INDEX idx_prod_barcode (barcode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 5. PRICE HISTORY & STOCK MOVEMENTS
    CREATE TABLE IF NOT EXISTS price_history (
      id VARCHAR(64) PRIMARY KEY,
      product_id VARCHAR(64) NOT NULL,
      old_price DECIMAL(10,2) NOT NULL,
      new_price DECIMAL(10,2) NOT NULL,
      changed_by VARCHAR(120),
      reason TEXT,
      created_at VARCHAR(50) NOT NULL,
      INDEX idx_price_hist_prod (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS stock_movements (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      product_id VARCHAR(64) NOT NULL,
      change_qty DECIMAL(12,3) NOT NULL,
      balance_qty DECIMAL(12,3) NOT NULL,
      type VARCHAR(40) NOT NULL,
      reference_id VARCHAR(100),
      notes TEXT,
      created_at VARCHAR(50) NOT NULL,
      INDEX idx_stock_mov_tenant (tenant_id),
      INDEX idx_stock_mov_prod (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 6. CUSTOMERS & KHATA LEDGER
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(150),
      address TEXT,
      credit_balance DECIMAL(10,2) DEFAULT 0.00,
      total_spent DECIMAL(10,2) DEFAULT 0.00,
      orders_count INT DEFAULT 0,
      created_at VARCHAR(50),
      INDEX idx_cust_tenant_phone (tenant_id, phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS customer_ledger (
      id VARCHAR(64) PRIMARY KEY,
      customer_id VARCHAR(64) NOT NULL,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      type VARCHAR(30) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      balance_after DECIMAL(10,2) NOT NULL,
      notes TEXT,
      created_at VARCHAR(50) NOT NULL,
      INDEX idx_ledger_cust (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 7. ORDERS & ITEMS
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      order_number VARCHAR(50) NOT NULL,
      invoice_number VARCHAR(50) NOT NULL,
      order_type VARCHAR(30) NOT NULL,
      status VARCHAR(40) NOT NULL,
      customer_id VARCHAR(64),
      customer_name VARCHAR(120) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      delivery_address TEXT,
      delivery_area_id VARCHAR(64),
      area VARCHAR(100),
      pincode VARCHAR(20),
      landmark VARCHAR(150),
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      assigned_delivery_boy_id VARCHAR(64),
      assigned_delivery_boy_name VARCHAR(120),
      pickup_code VARCHAR(20),
      subtotal DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0.00,
      delivery_charge DECIMAL(10,2) DEFAULT 0.00,
      gst_amount DECIMAL(10,2) DEFAULT 0.00,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_status VARCHAR(30) NOT NULL,
      payment_method VARCHAR(30) NOT NULL,
      payment_transaction_id VARCHAR(64),
      notes TEXT,
      delivery_notes TEXT,
      delivery_failure_reason TEXT,
      cancellation_reason TEXT,
      created_at VARCHAR(50) NOT NULL,
      updated_at VARCHAR(50) NOT NULL,
      INDEX idx_orders_tenant_status (tenant_id, status),
      INDEX idx_orders_date (tenant_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      product_id VARCHAR(64) NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      unit VARCHAR(20) NOT NULL,
      quantity DECIMAL(10,3) NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      cost_price DECIMAL(10,2) NOT NULL,
      gross_amount DECIMAL(10,2),
      discount_type VARCHAR(20) DEFAULT 'NONE',
      discount_value DECIMAL(10,2) DEFAULT 0.00,
      discount_amount DECIMAL(10,2) DEFAULT 0.00,
      taxable_amount DECIMAL(10,2),
      gst_percent DECIMAL(5,2) DEFAULT 0.00,
      tax_amount DECIMAL(10,2) DEFAULT 0.00,
      discount DECIMAL(10,2) DEFAULT 0.00,
      total_price DECIMAL(10,2) NOT NULL,
      manual_price_adjusted TINYINT(1) DEFAULT 0,
      original_unit_price DECIMAL(10,2),
      discount_reason VARCHAR(60),
      approval_data TEXT,
      cost_snapshot DECIMAL(10,2) DEFAULT 0.00,
      gross_profit DECIMAL(10,2) DEFAULT 0.00,
      INDEX idx_order_items_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 8. SUPPLIERS & PURCHASES
    CREATE TABLE IF NOT EXISTS suppliers (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(20),
      company VARCHAR(150),
      gstin VARCHAR(30),
      address TEXT,
      INDEX idx_supp_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS purchases (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      supplier_id VARCHAR(64) NOT NULL,
      invoice_no VARCHAR(60),
      total_cost DECIMAL(10,2) NOT NULL,
      payment_status VARCHAR(30) DEFAULT 'PAID',
      notes TEXT,
      created_at VARCHAR(50) NOT NULL,
      INDEX idx_purch_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS purchase_items (
      id VARCHAR(64) PRIMARY KEY,
      purchase_id VARCHAR(64) NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      quantity DECIMAL(10,3) NOT NULL,
      unit_cost DECIMAL(10,2) NOT NULL,
      total_cost DECIMAL(10,2) NOT NULL,
      INDEX idx_purch_item_purch (purchase_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 9. AUDIT LOGS & DELIVERY AREAS
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      action VARCHAR(80) NOT NULL,
      entity_type VARCHAR(60) NOT NULL,
      entity_id VARCHAR(64),
      details TEXT,
      user_name VARCHAR(120),
      created_at VARCHAR(50) NOT NULL,
      INDEX idx_audit_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS delivery_areas (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      area_name VARCHAR(120) NOT NULL,
      pincodes TEXT NOT NULL,
      delivery_charge DECIMAL(10,2) DEFAULT 30.00,
      min_order_value DECIMAL(10,2) DEFAULT 199.00,
      free_delivery_above DECIMAL(10,2) DEFAULT 499.00,
      estimated_delivery VARCHAR(50) DEFAULT '30-45 mins',
      is_active TINYINT(1) DEFAULT 1,
      created_at VARCHAR(50) NOT NULL,
      updated_at VARCHAR(50) NOT NULL,
      INDEX idx_deliv_areas_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 10. USERS & STAFF
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      pin VARCHAR(100) NOT NULL,
      role VARCHAR(40) NOT NULL,
      permissions TEXT NOT NULL,
      photo_url TEXT,
      address TEXT,
      emergency_contact VARCHAR(20),
      status VARCHAR(20) DEFAULT 'ACTIVE',
      availability VARCHAR(20) DEFAULT 'ONLINE',
      created_at VARCHAR(50) NOT NULL,
      updated_at VARCHAR(50) NOT NULL,
      INDEX idx_users_phone (phone),
      INDEX idx_users_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 11. PAYMENT SETTINGS & TRANSACTIONS
    CREATE TABLE IF NOT EXISTS payment_settings (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64),
      razorpay_enabled TINYINT(1) DEFAULT 0,
      razorpay_test_mode TINYINT(1) DEFAULT 1,
      razorpay_key_id VARCHAR(100) DEFAULT '',
      razorpay_key_secret VARCHAR(100) DEFAULT '',
      razorpay_webhook_secret VARCHAR(100) DEFAULT '',
      store_upi_id VARCHAR(100) DEFAULT '',
      store_upi_name VARCHAR(150) DEFAULT '',
      store_upi_qr_url TEXT,
      cod_enabled TINYINT(1) DEFAULT 1,
      cod_min_order DECIMAL(10,2) DEFAULT 0.00,
      cod_max_order DECIMAL(10,2) DEFAULT 10000.00,
      online_payment_enabled TINYINT(1) DEFAULT 1,
      cash_enabled TINYINT(1) DEFAULT 1,
      upi_enabled TINYINT(1) DEFAULT 1,
      card_enabled TINYINT(1) DEFAULT 1,
      updated_at VARCHAR(50),
      INDEX idx_pay_settings_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64),
      order_id VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64),
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      method VARCHAR(30) NOT NULL,
      provider VARCHAR(30) NOT NULL,
      provider_payment_id VARCHAR(100),
      provider_order_id VARCHAR(100),
      transaction_reference VARCHAR(100),
      status VARCHAR(30) NOT NULL,
      collected_by VARCHAR(120),
      collected_by_id VARCHAR(64),
      collected_at VARCHAR(50),
      verified_at VARCHAR(50),
      failure_reason TEXT,
      metadata TEXT,
      created_at VARCHAR(50) NOT NULL,
      updated_at VARCHAR(50) NOT NULL,
      INDEX idx_pay_trans_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS payment_audits (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64),
      transaction_id VARCHAR(64) NOT NULL,
      order_id VARCHAR(64) NOT NULL,
      action VARCHAR(60) NOT NULL,
      status_before VARCHAR(30),
      status_after VARCHAR(30),
      actor_id VARCHAR(64),
      actor_name VARCHAR(120),
      details TEXT,
      ip_address VARCHAR(45),
      created_at VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id VARCHAR(64) PRIMARY KEY,
      provider VARCHAR(30) NOT NULL,
      event_id VARCHAR(100),
      event_type VARCHAR(100) NOT NULL,
      payload TEXT NOT NULL,
      signature VARCHAR(255),
      processing_status VARCHAR(30) DEFAULT 'PENDING',
      error_message TEXT,
      received_at VARCHAR(50) NOT NULL,
      processed_at VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS order_status_history (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      previous_status VARCHAR(40),
      new_status VARCHAR(40) NOT NULL,
      changed_by_id VARCHAR(64),
      changed_by_name VARCHAR(120),
      change_reason TEXT,
      source VARCHAR(40),
      timestamp VARCHAR(50) NOT NULL,
      INDEX idx_status_hist_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 12. DELIVERY TRACKING & CASH HANDOVERS
    CREATE TABLE IF NOT EXISTS delivery_tracking_sessions (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64),
      order_id VARCHAR(64) NOT NULL,
      agent_id VARCHAR(64) NOT NULL,
      agent_name VARCHAR(120) NOT NULL,
      status VARCHAR(30) NOT NULL,
      started_at VARCHAR(50) NOT NULL,
      ended_at VARCHAR(50),
      start_lat DECIMAL(10,7),
      start_lng DECIMAL(10,7),
      current_lat DECIMAL(10,7),
      current_lng DECIMAL(10,7),
      updated_at VARCHAR(50) NOT NULL,
      INDEX idx_trk_sess_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS delivery_locations (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64),
      session_id VARCHAR(64) NOT NULL,
      agent_id VARCHAR(64) NOT NULL,
      order_id VARCHAR(64) NOT NULL,
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      accuracy DECIMAL(8,2),
      speed DECIMAL(8,2),
      heading DECIMAL(8,2),
      timestamp VARCHAR(50) NOT NULL,
      tracking_status VARCHAR(30)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS delivery_cash_collections (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64),
      order_id VARCHAR(64) NOT NULL,
      payment_transaction_id VARCHAR(64),
      agent_id VARCHAR(64) NOT NULL,
      agent_name VARCHAR(120) NOT NULL,
      order_total DECIMAL(10,2) NOT NULL,
      amount_collected DECIMAL(10,2) NOT NULL,
      customer_tendered DECIMAL(10,2) NOT NULL,
      change_returned DECIMAL(10,2) DEFAULT 0.00,
      currency VARCHAR(10) DEFAULT 'INR',
      payment_method VARCHAR(30) DEFAULT 'CASH',
      collected_at VARCHAR(50) NOT NULL,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      device_info TEXT,
      notes TEXT,
      handover_id VARCHAR(64),
      handover_status VARCHAR(30) DEFAULT 'PENDING'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS cash_handover_sessions (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64),
      agent_id VARCHAR(64) NOT NULL,
      agent_name VARCHAR(120) NOT NULL,
      expected_amount DECIMAL(10,2) NOT NULL,
      received_amount DECIMAL(10,2) NOT NULL,
      difference DECIMAL(10,2) NOT NULL,
      orders_count INT NOT NULL,
      approved_by VARCHAR(120) NOT NULL,
      notes TEXT,
      handover_time VARCHAR(50) NOT NULL,
      status VARCHAR(30) DEFAULT 'COMPLETED'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS notification_events (
      id VARCHAR(64) PRIMARY KEY,
      store_id VARCHAR(64) NOT NULL,
      tenant_id VARCHAR(64),
      type VARCHAR(60) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      entity_type VARCHAR(60),
      entity_id VARCHAR(64),
      read_status TINYINT(1) DEFAULT 0,
      created_at VARCHAR(50) NOT NULL,
      INDEX idx_notif_unread (store_id, read_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    -- 13. DIGI8 GLOBAL PRODUCT MASTER CATALOG
    CREATE TABLE IF NOT EXISTS global_product_catalog (
      id VARCHAR(64) PRIMARY KEY,
      barcode VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      brand VARCHAR(100),
      category VARCHAR(100),
      subcategory VARCHAR(100),
      unit VARCHAR(20) DEFAULT 'PACKET',
      pack_size VARCHAR(50),
      mrp DECIMAL(10,2),
      hsn_code VARCHAR(30),
      manufacturer VARCHAR(150),
      image_url TEXT,
      description TEXT,
      source VARCHAR(50) DEFAULT 'DIGI8_MASTER',
      created_at VARCHAR(50) NOT NULL,
      INDEX idx_global_barcode (barcode)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure SaaS & Phase 6 extensions
  await safeAddCol('stores', 'slug', 'VARCHAR(80)');
  await safeAddCol('stores', 'custom_domain', 'VARCHAR(150)');
  await safeAddCol('stores', 'status', 'VARCHAR(30)');
  await safeAddCol('stores', 'plan', 'VARCHAR(30)');
  await safeAddCol('stores', 'primary_color', 'VARCHAR(20)');
  await safeAddCol('stores', 'secondary_color', 'VARCHAR(20)');
  await safeAddCol('stores', 'button_color', 'VARCHAR(20)');
  await safeAddCol('stores', 'cashier_max_discount', 'DECIMAL(5,2)');
  await safeAddCol('stores', 'manager_max_discount', 'DECIMAL(5,2)');
  await safeAddCol('stores', 'weighted_barcode_enabled', 'TINYINT(1)');
  await safeAddCol('stores', 'weighted_barcode_prefix', 'VARCHAR(10)');
  await safeAddCol('tenants', 'upi_id', 'VARCHAR(100)');
  await safeAddCol('tenants', 'weighted_barcode_enabled', 'TINYINT(1)');
  await safeAddCol('tenants', 'weighted_barcode_prefix', 'VARCHAR(10)');

  // Seed Digi8 Master FMCG Global Product Catalog if empty
  try {
    const globalCount = await getOne('SELECT COUNT(*) as count FROM global_product_catalog');
    if (!globalCount || globalCount.count === 0) {
      const sampleGlobalProducts = [
        {
          id: 'gp_8901725181223',
          barcode: '8901725181223',
          name: 'Aashirvaad Superior MP Whole Wheat Atta 5kg',
          brand: 'Aashirvaad',
          category: 'Grocery & Staples',
          subcategory: 'Atta & Flour',
          unit: 'BAG',
          pack_size: '5 KG',
          mrp: 310,
          hsn_code: '1101',
          manufacturer: 'ITC Limited',
          image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
          description: '100% pure whole wheat flour processed from the finest grains with natural dietary fibers.'
        },
        {
          id: 'gp_8901058852370',
          barcode: '8901058852370',
          name: 'Maggi 2-Minute Masala Instant Noodles 70g',
          brand: 'Maggi',
          category: 'Snacks & Biscuits',
          subcategory: 'Noodles & Pasta',
          unit: 'PACKET',
          pack_size: '70 g',
          mrp: 14,
          hsn_code: '1902',
          manufacturer: 'Nestle India Ltd',
          image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
          description: 'Favorite Indian noodle with signature tastemaker spices.'
        },
        {
          id: 'gp_8901491101838',
          barcode: '8901491101838',
          name: 'Tata Salt Vacuum Evaporated Iodised Salt 1kg',
          brand: 'Tata',
          category: 'Grocery & Staples',
          subcategory: 'Salt & Sugar',
          unit: 'PACKET',
          pack_size: '1 KG',
          mrp: 28,
          hsn_code: '2501',
          manufacturer: 'Tata Consumer Products Ltd',
          image_url: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=400&q=80',
          description: 'Desh Ka Namak - Vacuum evaporated pure iodised table salt.'
        },
        {
          id: 'gp_8901063142275',
          barcode: '8901063142275',
          name: 'Parle-G Original Glucose Biscuits 250g',
          brand: 'Parle',
          category: 'Snacks & Biscuits',
          subcategory: 'Biscuits & Cookies',
          unit: 'PACKET',
          pack_size: '250 g',
          mrp: 25,
          hsn_code: '1905',
          manufacturer: 'Parle Products Pvt Ltd',
          image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80',
          description: 'World largest selling biscuit with taste and wholesome energy.'
        },
        {
          id: 'gp_8901262010014',
          barcode: '8901262010014',
          name: 'Amul Pasteurised Salted Butter 100g',
          brand: 'Amul',
          category: 'Dairy & Eggs',
          subcategory: 'Butter & Cheese',
          unit: 'PACKET',
          pack_size: '100 g',
          mrp: 58,
          hsn_code: '0405',
          manufacturer: 'Gujarat Co-operative Milk Marketing Federation',
          image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80',
          description: 'Utterly Butterly Delicious fresh cream salted butter.'
        },
        {
          id: 'gp_8901030895470',
          barcode: '8901030895470',
          name: 'Vim Dishwash Liquid Gel Lemon 500ml',
          brand: 'Vim',
          category: 'Household Care',
          subcategory: 'Utensil Cleaners',
          unit: 'BOTTLE',
          pack_size: '500 ml',
          mrp: 135,
          hsn_code: '3402',
          manufacturer: 'Hindustan Unilever Ltd',
          image_url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=400&q=80',
          description: 'Powerful degreaser with real lemon juice extracts.'
        }
      ];

      const nowStr = new Date().toISOString();
      for (const gp of sampleGlobalProducts) {
        await execute(`
          INSERT INTO global_product_catalog (
            id, barcode, name, brand, category, subcategory, unit, pack_size, mrp, hsn_code, manufacturer, image_url, description, source, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE name = VALUES(name)
        `, [
          gp.id, gp.barcode, gp.name, gp.brand, gp.category, gp.subcategory, gp.unit,
          gp.pack_size, gp.mrp, gp.hsn_code, gp.manufacturer, gp.image_url, gp.description, 'DIGI8_MASTER', nowStr
        ]);
      }
      console.log('[Database] Seeded Digi8 Master FMCG Global Product Catalog.');
    }
  } catch (err) {
    console.warn('[Global Catalog Seed Warning]:', err.message);
  }

  // Seed Tenant 001 ("Royal Kirana" / "Apna Kirana")
  const royalTenant = await getOne('SELECT id FROM tenants WHERE id = ?', ['store_royal_001']);
  const now = new Date().toISOString();
  if (!royalTenant) {
    await execute(`
      INSERT INTO tenants (
        id, name, slug, custom_domain, owner_name, owner_email, owner_phone,
        business_type, gstin, address, city, state, pincode, status, plan,
        primary_color, secondary_color, button_color, logo_url, banner_url,
        tagline, currency_symbol, min_order_value, delivery_charge, free_delivery_above,
        estimated_delivery_mins, store_status, opening_time, closing_time, operating_days,
        printer_width, printer_connection, cashier_max_discount, manager_max_discount,
        upi_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [
      'store_royal_001',
      'Apna Kirana & Supermarket',
      'royal-kirana',
      null,
      'Ramesh Patel',
      'ramesh@apnakirana.com',
      '9876543210',
      'KIRANA_GROCERY',
      '36AABCU9603R1ZM',
      'Shop #4, Main Market, Kukatpally',
      'Hyderabad',
      'Telangana',
      '500072',
      'ACTIVE',
      'GROWTH',
      '#16a34a',
      '#0f766e',
      '#15803d',
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      'Fresh & Pure Groceries Delivered Daily',
      '₹',
      199,
      30,
      499,
      '30-45 mins',
      'OPEN',
      '07:30',
      '22:30',
      'Mon-Sun',
      '80mm',
      'BROWSER_DIRECT',
      5,
      20,
      'apnakirana@okhdfcbank',
      now,
      now
    ]);
    console.log('[Database] Initialized Tenant 001 (royal-kirana).');
  }

  // Seed Tenant 002 ("Fresh Mart Superstore" / slug: "fresh-mart")
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
        upi_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
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
      '#2563eb', // Royal Blue
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
      'freshmart@oksbi',
      now,
      now
    ]);

    // Seed Fresh Mart initial categories
    const catFresh1 = 'cat_fm_dairy_001';
    const catFresh2 = 'cat_fm_fruits_002';
    await execute('INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      [catFresh1, 'store_fresh_002', 'store_fresh_002', 'Fresh Dairy & Eggs', 'fresh-dairy', 'Milk', 1]);
    await execute('INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      [catFresh2, 'store_fresh_002', 'store_fresh_002', 'Farm Fresh Fruits', 'farm-fruits', 'Apple', 2]);

    // Seed Fresh Mart initial products
    await execute(`
      INSERT INTO products (
        id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
        purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
        pos_price, website_price, gst_percent, stock, min_stock, is_active, is_visible_online,
        is_pos_available, is_featured, is_bestseller, is_offer, photo_url, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name)
    `, [
      'prod_fm_milk', 'store_fresh_002', 'store_fresh_002', catFresh1, 'Amul Taaza Homogenised Toned Milk 1L', 'Amul', '8901262010053', 'PACKET', 0,
      54, 72, 75, 68, 65, 72, 72, 0, 85, 10, 1, 1, 1, 1, 1, 0,
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
      'Fresh toned milk pasteurized and hygienically packed.', now, now
    ]);

    // Fresh Mart Owner user
    await execute(`
      INSERT INTO users (id, store_id, tenant_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name)
    `, ['usr_fresh_owner', 'store_fresh_002', 'store_fresh_002', 'Vikram Rao (Owner)', '9848012345', '1234', 'STORE_OWNER', JSON.stringify(['*']), now, now]);

    // Fresh Mart Delivery Area
    await execute(`
      INSERT INTO delivery_areas (id, store_id, tenant_id, area_name, pincodes, delivery_charge, min_order_value, free_delivery_above, estimated_delivery, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON DUPLICATE KEY UPDATE area_name=VALUES(area_name)
    `, ['area_fm_hitech', 'store_fresh_002', 'store_fresh_002', 'Hitec City & Madhapur', '500081, 500084', 25, 149, 399, '20–30 mins', now, now]);

    console.log('[Database] Initialized Tenant 002 (fresh-mart).');
  }

  // Seed Central Platform Super Admin user (tenant_id is NULL)
  const existingPlatformAdmin = await getOne('SELECT id FROM users WHERE phone = ?', ['9999999999']);
  if (!existingPlatformAdmin) {
    await execute(`
      INSERT INTO users (id, store_id, tenant_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name)
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
    console.log('[Database] Initialized Central Platform Admin (phone: 9999999999 / pin: 9999).');
  }

  // Seed default payment_settings if not present
  const existingPaySettings = await getOne('SELECT id FROM payment_settings WHERE id = "pay_royal_001" OR tenant_id = "store_royal_001"');
  if (!existingPaySettings) {
    await execute(`
      INSERT INTO payment_settings (
        id, tenant_id, razorpay_enabled, razorpay_test_mode, razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret,
        store_upi_id, store_upi_name, store_upi_qr_url, cod_enabled, cod_min_order, cod_max_order,
        online_payment_enabled, cash_enabled, upi_enabled, card_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE store_upi_id=VALUES(store_upi_id)
    `, [
      'pay_royal_001',
      'store_royal_001',
      0,
      1,
      process.env.RAZORPAY_KEY_ID || 'rzp_test_kirana_demo',
      process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_kirana_demo_secret',
      process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_kirana_123',
      'apnakirana@okhdfcbank',
      'Apna Kirana & Supermarket',
      '',
      1, 0, 10000, 1, 1, 1, 1, now
    ]);
    console.log('[Database] Initialized default payment_settings for store_royal_001.');
  }

  // Check if store profile exists in stores table, if not seed it
  const existingStore = await getOne('SELECT id FROM stores WHERE id = ?', [storeProfile.id]);
  if (!existingStore) {
    console.log('[Database] Seeding initial Kirana store catalog & inventory...');
    await execute(`
      INSERT INTO stores (
        id, name, tagline, owner_name, phone, email, address, gstin, upi_id,
        currency_symbol, min_order_value, delivery_charge, free_delivery_above,
        estimated_delivery_mins, store_status, opening_time, closing_time,
        operating_days, logo_url, printer_width, printer_connection, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name)
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
        ON DUPLICATE KEY UPDATE name=VALUES(name)
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name)
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
        ON DUPLICATE KEY UPDATE name=VALUES(name)
      `, [c.id, storeProfile.id, storeProfile.id, c.name, c.phone, c.email, c.address, c.credit_balance, c.total_spent, c.orders_count, now]);
    }

    for (const s of sampleSuppliers) {
      await execute(`
        INSERT INTO suppliers (id, store_id, tenant_id, name, phone, company, gstin, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name)
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
        ON DUPLICATE KEY UPDATE order_number=VALUES(order_number)
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
          ON DUPLICATE KEY UPDATE product_name=VALUES(product_name)
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
        ON DUPLICATE KEY UPDATE name=VALUES(name)
      `, [u.id, 'store_royal_001', 'store_royal_001', u.name, u.phone, u.pin, u.role, u.permissions, u.address, u.emergency_contact, u.status, u.availability, now, now]);
    }
  }

  // Run automated schema migrations & version tracking
  await runMigrations();

  console.log('[Database] Enterprise MySQL Database initialized and verified with Multi-Tenant SaaS schema.');
}

export default {
  query,
  getOne,
  execute,
  initDatabase,
  ensureDatabaseExists,
  isMySQL,
  isSQLite,
  getPool
};
