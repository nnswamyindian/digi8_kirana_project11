import { storeProfile, sampleCategories, sampleProducts, sampleCustomers, sampleSuppliers, sampleRecentOrders } from '../seedData.js';

/**
 * Robust Zero-Config SQLite Engine for Local Development & Testing
 * Implements the dual-engine database architecture specified for the platform.
 */
export function initSqliteDatabase(sqliteDb) {
  // 1. Create Core Tables
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      custom_domain TEXT UNIQUE,
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
      min_order_value NUMERIC DEFAULT 199.00,
      delivery_charge NUMERIC DEFAULT 30.00,
      free_delivery_above NUMERIC DEFAULT 499.00,
      estimated_delivery_mins TEXT DEFAULT '30-45 mins',
      store_status TEXT DEFAULT 'OPEN',
      opening_time TEXT DEFAULT '07:30',
      closing_time TEXT DEFAULT '22:30',
      operating_days TEXT DEFAULT 'Mon-Sun',
      printer_width TEXT DEFAULT '80mm',
      printer_connection TEXT DEFAULT 'BROWSER_DIRECT',
      cashier_max_discount NUMERIC DEFAULT 5.00,
      manager_max_discount NUMERIC DEFAULT 20.00,
      upi_id TEXT DEFAULT 'apnakirana@okhdfcbank',
      weighted_barcode_enabled INTEGER DEFAULT 0,
      weighted_barcode_prefix TEXT DEFAULT '20',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      custom_domain TEXT,
      tagline TEXT,
      owner_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT,
      upi_id TEXT,
      currency_symbol TEXT DEFAULT '₹',
      min_order_value NUMERIC DEFAULT 199.00,
      delivery_charge NUMERIC DEFAULT 30.00,
      free_delivery_above NUMERIC DEFAULT 499.00,
      estimated_delivery_mins TEXT DEFAULT '30-45 mins',
      store_status TEXT DEFAULT 'OPEN',
      opening_time TEXT DEFAULT '07:30',
      closing_time TEXT DEFAULT '22:30',
      operating_days TEXT DEFAULT 'Mon-Sun',
      logo_url TEXT,
      printer_width TEXT DEFAULT '80mm',
      printer_connection TEXT DEFAULT 'BROWSER_DIRECT',
      cashier_max_discount NUMERIC DEFAULT 5.00,
      manager_max_discount NUMERIC DEFAULT 20.00,
      weighted_barcode_enabled INTEGER DEFAULT 0,
      weighted_barcode_prefix TEXT DEFAULT '20',
      status TEXT DEFAULT 'ACTIVE',
      plan TEXT DEFAULT 'GROWTH',
      primary_color TEXT DEFAULT '#16a34a',
      secondary_color TEXT DEFAULT '#0f766e',
      button_color TEXT DEFAULT '#15803d',
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
      purchase_cost NUMERIC NOT NULL,
      selling_price NUMERIC NOT NULL,
      mrp NUMERIC NOT NULL,
      wholesale_price NUMERIC,
      min_selling_price NUMERIC,
      pos_price NUMERIC,
      website_price NUMERIC,
      gst_percent NUMERIC DEFAULT 0.00,
      stock NUMERIC DEFAULT 0.000,
      reserved_stock NUMERIC DEFAULT 0.000,
      min_stock NUMERIC DEFAULT 5.000,
      max_stock NUMERIC DEFAULT 1000.000,
      reorder_level NUMERIC DEFAULT 10.000,
      supplier TEXT,
      hsn_sac TEXT,
      barcode_type TEXT DEFAULT 'MANUFACTURER',
      allow_zero_stock_purchase TEXT DEFAULT 'DISABLE_PURCHASE',
      default_discount_type TEXT DEFAULT 'NONE',
      default_discount_value NUMERIC DEFAULT 0.00,
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
      old_price NUMERIC NOT NULL,
      new_price NUMERIC NOT NULL,
      changed_by TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      tenant_id TEXT,
      product_id TEXT NOT NULL,
      change_qty NUMERIC NOT NULL,
      balance_qty NUMERIC NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      tenant_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      pin TEXT,
      password_hash TEXT,
      role TEXT NOT NULL,
      permissions TEXT,
      photo_url TEXT,
      address TEXT,
      emergency_contact TEXT,
      status TEXT DEFAULT 'ACTIVE',
      availability TEXT DEFAULT 'ONLINE',
      last_login TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      tenant_id TEXT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      credit_balance NUMERIC DEFAULT 0.00,
      total_spent NUMERIC DEFAULT 0.00,
      orders_count INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS customer_ledger (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      store_id TEXT NOT NULL,
      tenant_id TEXT,
      type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      balance_after NUMERIC NOT NULL,
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
      delivery_area_id TEXT,
      area TEXT,
      pincode TEXT,
      landmark TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      assigned_delivery_boy_id TEXT,
      assigned_delivery_boy_name TEXT,
      pickup_code TEXT,
      subtotal NUMERIC NOT NULL,
      discount NUMERIC DEFAULT 0.00,
      delivery_charge NUMERIC DEFAULT 0.00,
      gst_amount NUMERIC DEFAULT 0.00,
      total_amount NUMERIC NOT NULL,
      payment_status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_transaction_id TEXT,
      notes TEXT,
      delivery_notes TEXT,
      delivery_failure_reason TEXT,
      cancellation_reason TEXT,
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
      quantity NUMERIC NOT NULL,
      unit_price NUMERIC NOT NULL,
      cost_price NUMERIC NOT NULL,
      gross_amount NUMERIC,
      discount_type TEXT DEFAULT 'NONE',
      discount_value NUMERIC DEFAULT 0.00,
      discount_amount NUMERIC DEFAULT 0.00,
      taxable_amount NUMERIC,
      gst_percent NUMERIC DEFAULT 0.00,
      tax_amount NUMERIC DEFAULT 0.00,
      discount NUMERIC DEFAULT 0.00,
      total_price NUMERIC NOT NULL,
      manual_price_adjusted INTEGER DEFAULT 0,
      original_unit_price NUMERIC,
      discount_reason TEXT,
      approval_data TEXT,
      cost_snapshot NUMERIC DEFAULT 0.00,
      gross_profit NUMERIC DEFAULT 0.00
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
      total_cost NUMERIC NOT NULL,
      payment_status TEXT DEFAULT 'PAID',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      unit_cost NUMERIC NOT NULL,
      total_cost NUMERIC NOT NULL
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
      delivery_charge NUMERIC DEFAULT 30.00,
      min_order_value NUMERIC DEFAULT 199.00,
      free_delivery_above NUMERIC DEFAULT 499.00,
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
      store_upi_qr_url TEXT,
      upi_id TEXT DEFAULT '',
      upi_store_name TEXT DEFAULT '',
      cod_enabled INTEGER DEFAULT 1,
      cod_min_order NUMERIC DEFAULT 0.00,
      cod_max_order NUMERIC DEFAULT 10000.00,
      online_payment_enabled INTEGER DEFAULT 1,
      cash_enabled INTEGER DEFAULT 1,
      upi_enabled INTEGER DEFAULT 1,
      card_enabled INTEGER DEFAULT 1,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      order_id TEXT NOT NULL,
      customer_id TEXT,
      amount NUMERIC NOT NULL,
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

    CREATE TABLE IF NOT EXISTS payment_audits (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      store_id TEXT,
      transaction_id TEXT,
      order_id TEXT NOT NULL,
      amount NUMERIC,
      payment_method TEXT,
      paid_by_user_id TEXT,
      paid_by_user_name TEXT,
      action TEXT,
      status_before TEXT,
      status_after TEXT,
      actor_id TEXT,
      actor_name TEXT,
      notes TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      event_type TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      metadata TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      monthly_price NUMERIC NOT NULL,
      yearly_price NUMERIC NOT NULL,
      setup_fee NUMERIC DEFAULT 0,
      max_products INTEGER DEFAULT 500,
      max_staff INTEGER DEFAULT 5,
      max_delivery_agents INTEGER DEFAULT 5,
      max_orders_per_month INTEGER DEFAULT 1000,
      storage_limit_mb INTEGER DEFAULT 1024,
      custom_domain INTEGER DEFAULT 0,
      online_store INTEGER DEFAULT 1,
      pos INTEGER DEFAULT 1,
      inventory INTEGER DEFAULT 1,
      delivery_tracking INTEGER DEFAULT 1,
      mobile_app INTEGER DEFAULT 0,
      advanced_reports INTEGER DEFAULT 0,
      is_popular INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      status TEXT NOT NULL,
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      cancel_at_period_end INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saas_platform_invoices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      tax_amount NUMERIC DEFAULT 0.00,
      total_amount NUMERIC NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      paid_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenant_domains (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      domain_type TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      ssl_status TEXT NOT NULL,
      dns_target TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT NOT NULL,
      tenant_id TEXT,
      store_name TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT NOT NULL,
      user_email TEXT,
      user_phone TEXT,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_replies (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      message TEXT NOT NULL,
      is_internal_note INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS store_applications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      applicant_name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      business_name TEXT,
      business_type TEXT DEFAULT 'KIRANA_GROCERY',
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      gst_number TEXT,
      requested_plan TEXT DEFAULT 'pro',
      status TEXT DEFAULT 'PENDING',
      review_notes TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      terms_accepted INTEGER DEFAULT 1,
      terms_version TEXT DEFAULT 'v1.0',
      ip_address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      billing_cycle TEXT DEFAULT 'MONTHLY',
      current_period_start TEXT,
      current_period_end TEXT,
      amount NUMERIC NOT NULL DEFAULT 999,
      setup_fee_paid NUMERIC DEFAULT 0.00,
      auto_renew INTEGER DEFAULT 1,
      grace_period_end TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_subscription_payments (
      id TEXT PRIMARY KEY,
      subscription_id TEXT,
      tenant_id TEXT NOT NULL,
      application_id TEXT,
      amount NUMERIC NOT NULL,
      payment_method TEXT DEFAULT 'RAZORPAY',
      provider TEXT DEFAULT 'RAZORPAY',
      provider_payment_id TEXT,
      provider_order_id TEXT,
      status TEXT DEFAULT 'SUCCESS',
      paid_at TEXT,
      invoice_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      tenant_id TEXT NOT NULL,
      subscription_id TEXT,
      amount NUMERIC NOT NULL,
      tax_amount NUMERIC DEFAULT 0.00,
      total_amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'PAID',
      due_date TEXT,
      paid_at TEXT,
      invoice_pdf_url TEXT,
      line_items_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      id TEXT PRIMARY KEY,
      key_name TEXT NOT NULL UNIQUE,
      key_value TEXT NOT NULL,
      category TEXT DEFAULT 'GENERAL',
      description TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      price_monthly NUMERIC NOT NULL,
      price_yearly NUMERIC NOT NULL,
      features_json TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      tenant_id TEXT,
      status TEXT,
      payment_status TEXT,
      notes TEXT,
      updated_by TEXT,
      created_at TEXT,
      previous_status TEXT,
      new_status TEXT,
      changed_by_name TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      product_id TEXT NOT NULL,
      product_name TEXT,
      quantity NUMERIC NOT NULL,
      unit TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      reference_id TEXT,
      previous_stock NUMERIC NOT NULL,
      new_stock NUMERIC NOT NULL,
      unit_cost NUMERIC DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      entity_type TEXT,
      entity_id TEXT,
      store_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_price_history (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      old_purchase_price NUMERIC,
      new_purchase_price NUMERIC,
      old_selling_price NUMERIC,
      new_selling_price NUMERIC,
      old_mrp NUMERIC,
      new_mrp NUMERIC,
      changed_by TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_purchase_price_history (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      purchase_price NUMERIC NOT NULL,
      quantity NUMERIC NOT NULL,
      supplier_id TEXT,
      supplier_name TEXT,
      purchase_invoice_id TEXT,
      effective_date TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_tracking_sessions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT,
      status TEXT DEFAULT 'IN_PROGRESS',
      start_time TEXT NOT NULL,
      end_time TEXT,
      start_lat NUMERIC,
      start_lng NUMERIC,
      current_lat NUMERIC,
      current_lng NUMERIC,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_locations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      session_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      latitude NUMERIC NOT NULL,
      longitude NUMERIC NOT NULL,
      accuracy NUMERIC,
      speed NUMERIC,
      heading NUMERIC,
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
      order_total NUMERIC NOT NULL,
      amount_collected NUMERIC NOT NULL,
      customer_tendered NUMERIC NOT NULL,
      change_returned NUMERIC DEFAULT 0.00,
      currency TEXT DEFAULT 'INR',
      payment_method TEXT DEFAULT 'CASH',
      collected_at TEXT NOT NULL,
      latitude NUMERIC,
      longitude NUMERIC,
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
      expected_amount NUMERIC NOT NULL,
      received_amount NUMERIC NOT NULL,
      difference NUMERIC NOT NULL,
      orders_count INTEGER NOT NULL,
      approved_by TEXT NOT NULL,
      notes TEXT,
      handover_time TEXT NOT NULL,
      status TEXT DEFAULT 'COMPLETED'
    );
  `);

  // Ensure Customer table columns exist
  const custCols = sqliteDb.pragma('table_info(customers)');
  if (!custCols.some(c => c.name.toLowerCase() === 'password')) {
    sqliteDb.exec('ALTER TABLE customers ADD COLUMN password TEXT');
  }
  if (!custCols.some(c => c.name.toLowerCase() === 'status')) {
    sqliteDb.exec('ALTER TABLE customers ADD COLUMN status TEXT DEFAULT "ACTIVE"');
  }
  if (!custCols.some(c => c.name.toLowerCase() === 'city')) {
    sqliteDb.exec('ALTER TABLE customers ADD COLUMN city TEXT');
  }
  if (!custCols.some(c => c.name.toLowerCase() === 'pincode')) {
    sqliteDb.exec('ALTER TABLE customers ADD COLUMN pincode TEXT');
  }

  // Ensure Product columns exist
  const prodCols = sqliteDb.pragma('table_info(products)');
  const addProdCol = (name, type) => {
    if (!prodCols.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      sqliteDb.exec(`ALTER TABLE products ADD COLUMN ${name} ${type}`);
    }
  };
  addProdCol('sku', 'TEXT');
  addProdCol('max_stock', 'NUMERIC DEFAULT 1000.000');
  addProdCol('reorder_level', 'NUMERIC DEFAULT 10.000');
  addProdCol('supplier', 'TEXT');
  addProdCol('hsn_sac', 'TEXT');
  addProdCol('barcode_type', "TEXT DEFAULT 'MANUFACTURER'");
  addProdCol('allow_zero_stock_purchase', "TEXT DEFAULT 'DISABLE_PURCHASE'");
  addProdCol('default_discount_type', "TEXT DEFAULT 'NONE'");
  addProdCol('default_discount_value', 'NUMERIC DEFAULT 0.00');

  // Ensure Order Status History columns exist
  const oshCols = sqliteDb.pragma('table_info(order_status_history)');
  if (!oshCols.some(c => c.name.toLowerCase() === 'status')) {
    sqliteDb.exec('ALTER TABLE order_status_history ADD COLUMN status TEXT');
  }
  if (!oshCols.some(c => c.name.toLowerCase() === 'payment_status')) {
    sqliteDb.exec('ALTER TABLE order_status_history ADD COLUMN payment_status TEXT');
  }
  if (!oshCols.some(c => c.name.toLowerCase() === 'notes')) {
    sqliteDb.exec('ALTER TABLE order_status_history ADD COLUMN notes TEXT');
  }
  if (!oshCols.some(c => c.name.toLowerCase() === 'updated_by')) {
    sqliteDb.exec('ALTER TABLE order_status_history ADD COLUMN updated_by TEXT');
  }
  if (!oshCols.some(c => c.name.toLowerCase() === 'created_at')) {
    sqliteDb.exec('ALTER TABLE order_status_history ADD COLUMN created_at TEXT');
  }

  // Ensure notification_events columns exist
  const notifCols = sqliteDb.pragma('table_info(notification_events)');
  if (!notifCols.some(c => c.name.toLowerCase() === 'store_id')) {
    sqliteDb.exec('ALTER TABLE notification_events ADD COLUMN store_id TEXT');
  }
  if (!notifCols.some(c => c.name.toLowerCase() === 'type')) {
    sqliteDb.exec('ALTER TABLE notification_events ADD COLUMN type TEXT');
  }
  if (!notifCols.some(c => c.name.toLowerCase() === 'entity_type')) {
    sqliteDb.exec('ALTER TABLE notification_events ADD COLUMN entity_type TEXT');
  }
  if (!notifCols.some(c => c.name.toLowerCase() === 'entity_id')) {
    sqliteDb.exec('ALTER TABLE notification_events ADD COLUMN entity_id TEXT');
  }
  if (!notifCols.some(c => c.name.toLowerCase() === 'read_status')) {
    sqliteDb.exec('ALTER TABLE notification_events ADD COLUMN read_status INTEGER DEFAULT 0');
  }

  // 2. Ensure UPI columns exist on tables
  const tenantCols = sqliteDb.pragma('table_info(tenants)');
  if (!tenantCols.some(c => c.name.toLowerCase() === 'upi_id')) {
    sqliteDb.exec('ALTER TABLE tenants ADD COLUMN upi_id TEXT DEFAULT "apnakirana@okhdfcbank"');
  }

  const storeCols = sqliteDb.pragma('table_info(stores)');
  if (!storeCols.some(c => c.name.toLowerCase() === 'upi_id')) {
    sqliteDb.exec('ALTER TABLE stores ADD COLUMN upi_id TEXT DEFAULT "apnakirana@okhdfcbank"');
  }

  const payCols = sqliteDb.pragma('table_info(payment_settings)');
  if (!payCols.some(c => c.name.toLowerCase() === 'store_upi_id')) {
    sqliteDb.exec('ALTER TABLE payment_settings ADD COLUMN store_upi_id TEXT DEFAULT "apnakirana@okhdfcbank"');
  }
  if (!payCols.some(c => c.name.toLowerCase() === 'upi_id')) {
    sqliteDb.exec('ALTER TABLE payment_settings ADD COLUMN upi_id TEXT DEFAULT "apnakirana@okhdfcbank"');
  }

  const userCols = sqliteDb.pragma('table_info(users)');
  if (!userCols.some(c => c.name.toLowerCase() === 'email')) {
    sqliteDb.exec('ALTER TABLE users ADD COLUMN email TEXT');
  }
  if (!userCols.some(c => c.name.toLowerCase() === 'password_hash')) {
    sqliteDb.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  }

  // Ensure default demo users and products for store_fresh_002 exist
  sqliteDb.prepare(`
    INSERT OR IGNORE INTO users (id, tenant_id, store_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', datetime('now'), datetime('now'))
  `).run('user_fresh_owner', 'store_fresh_002', 'store_fresh_002', 'Venkatesh Rao', '9848012345', '1234', 'STORE_OWNER', JSON.stringify(['*']));

  sqliteDb.prepare(`
    INSERT OR IGNORE INTO users (id, tenant_id, store_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', datetime('now'), datetime('now'))
  `).run('usr_royal_rider', 'store_royal_001', 'store_royal_001', 'Raju Rider (Delivery Partner)', '9876543213', '1234', 'DELIVERY_BOY', JSON.stringify(['delivery']));

  sqliteDb.prepare(`
    INSERT OR IGNORE INTO users (id, tenant_id, store_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', datetime('now'), datetime('now'))
  `).run('usr_fresh_rider', 'store_fresh_002', 'store_fresh_002', 'Suresh Kumar (Delivery Partner)', '9848012348', '1234', 'DELIVERY_BOY', JSON.stringify(['delivery']));

  sqliteDb.prepare(`
    INSERT OR IGNORE INTO users (id, tenant_id, store_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', datetime('now'), datetime('now'))
  `).run('usr_sai_rider', 'store_sai_002', 'store_sai_002', 'Venkatesh (Delivery Partner)', '9848099993', '1234', 'DELIVERY_BOY', JSON.stringify(['delivery']));

  sqliteDb.prepare(`
    INSERT OR IGNORE INTO products (
      id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
      purchase_cost, selling_price, mrp, stock, is_active, is_visible_online, is_pos_available,
      photo_url, created_at, updated_at
    ) VALUES (
      'prod_fresh_apple', 'store_fresh_002', 'store_fresh_002', 'cat_fruits_001',
      'Fresh Shimla Apple Red Delicious', 'FreshMart', '8902222333344', 'KG', 1,
      120, 160, 180, 45, 1, 1, 1,
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
      datetime('now'), datetime('now')
    )
  `).run();

  if (!payCols.some(c => c.name.toLowerCase() === 'store_upi_name')) {
    sqliteDb.exec('ALTER TABLE payment_settings ADD COLUMN store_upi_name TEXT DEFAULT "Apna Kirana & Supermarket"');
  }
  if (!payCols.some(c => c.name.toLowerCase() === 'upi_store_name')) {
    sqliteDb.exec('ALTER TABLE payment_settings ADD COLUMN upi_store_name TEXT DEFAULT "Apna Kirana & Supermarket"');
  }

  // Ensure product visibility flags are normalized for POS and Storefront
  sqliteDb.exec('UPDATE products SET is_pos_available = 1 WHERE is_pos_available IS NULL OR is_pos_available = 0');
  sqliteDb.exec('UPDATE products SET is_visible_online = 1 WHERE is_visible_online IS NULL OR is_visible_online = 0');
  sqliteDb.exec('UPDATE products SET is_active = 1 WHERE is_active IS NULL');

  // 3. Check if seeding is needed
  const tenantCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM tenants').get()?.count || 0;
  if (tenantCount === 0) {
    const now = new Date().toISOString();

    // Seed Tenant 1: Royal Kirana
    sqliteDb.prepare(`
      INSERT OR REPLACE INTO tenants (
        id, name, slug, owner_name, owner_email, owner_phone, business_type,
        gstin, address, city, state, pincode, status, plan,
        primary_color, secondary_color, button_color, logo_url, banner_url, tagline,
        min_order_value, delivery_charge, free_delivery_above, estimated_delivery_mins,
        store_status, opening_time, closing_time, operating_days, printer_width,
        upi_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'store_royal_001', 'Apna Kirana & Supermarket', 'royal-kirana', 'Rajesh Sharma', 'rajesh@apnakirana.com', '9876543210', 'SUPERMARKET',
      '36AABCU9603R1ZM', 'Shop #4, Main Market, Kukatpally, Hyderabad', 'Hyderabad', 'Telangana', '500072', 'ACTIVE', 'PRO',
      '#16a34a', '#0f766e', '#15803d', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=300&q=80', '', 'Fresh & Pure Groceries Delivered Daily',
      149, 29, 399, '25–35 mins',
      'OPEN', '07:00', '23:00', 'Mon-Sun', '80mm',
      'apnakirana@okhdfcbank', now, now
    );

    // Seed Tenant 2: Fresh Mart
    sqliteDb.prepare(`
      INSERT OR REPLACE INTO tenants (
        id, name, slug, owner_name, owner_email, owner_phone, business_type,
        gstin, address, city, state, pincode, status, plan,
        primary_color, secondary_color, button_color, logo_url, banner_url, tagline,
        min_order_value, delivery_charge, free_delivery_above, estimated_delivery_mins,
        store_status, opening_time, closing_time, operating_days, printer_width,
        upi_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'store_fresh_002', 'Fresh Mart & Daily Needs', 'fresh-mart', 'Venkatesh Rao', 'venkat@freshmart.in', '9876543220', 'KIRANA_GROCERY',
      '36AAECR5512M1Z8', 'G-12, Cyber Gateway, Hitec City, Madhapur, Hyderabad', 'Hyderabad', 'Telangana', '500081', 'ACTIVE', 'GROWTH',
      '#2563eb', '#1e40af', '#1d4ed8', 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=300&q=80', '', 'Your Daily Grocery Partner',
      99, 25, 299, '20–30 mins',
      'OPEN', '06:30', '22:30', 'Mon-Sun', '80mm',
      'freshmart@okhdfcbank', now, now
    );

    // Seed Stores
    sqliteDb.prepare(`
      INSERT OR REPLACE INTO stores (
        id, name, tagline, owner_name, phone, email, address, gstin, upi_id,
        currency_symbol, min_order_value, delivery_charge, free_delivery_above,
        estimated_delivery_mins, store_status, opening_time, closing_time,
        operating_days, logo_url, printer_width, printer_connection, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      storeProfile.id, storeProfile.name, storeProfile.tagline, storeProfile.owner_name,
      storeProfile.phone, storeProfile.email, storeProfile.address, storeProfile.gstin,
      storeProfile.upi_id || 'apnakirana@okhdfcbank', storeProfile.currency_symbol, storeProfile.min_order_value,
      storeProfile.delivery_charge, storeProfile.free_delivery_above,
      storeProfile.estimated_delivery_mins, storeProfile.store_status,
      storeProfile.opening_time, storeProfile.closing_time, storeProfile.operating_days,
      storeProfile.logo_url, storeProfile.printer_width, storeProfile.printer_connection,
      now
    );

    // Seed Payment Settings for Royal Kirana & default
    sqliteDb.prepare(`
      INSERT OR REPLACE INTO payment_settings (
        id, tenant_id, razorpay_enabled, razorpay_test_mode, razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret,
        store_upi_id, store_upi_name, store_upi_qr_url, upi_id, upi_store_name, cod_enabled, cod_min_order, cod_max_order,
        online_payment_enabled, cash_enabled, upi_enabled, card_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'default', 'store_royal_001', 0, 1,
      process.env.RAZORPAY_KEY_ID || 'rzp_test_kirana_demo',
      process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_kirana_demo_secret',
      process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_kirana_123',
      'apnakirana@okhdfcbank', 'Apna Kirana & Supermarket', '',
      'apnakirana@okhdfcbank', 'Apna Kirana & Supermarket',
      1, 0, 10000, 1, 1, 1, 1, now
    );

    sqliteDb.prepare(`
      INSERT OR REPLACE INTO payment_settings (
        id, tenant_id, razorpay_enabled, razorpay_test_mode, razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret,
        store_upi_id, store_upi_name, store_upi_qr_url, upi_id, upi_store_name, cod_enabled, cod_min_order, cod_max_order,
        online_payment_enabled, cash_enabled, upi_enabled, card_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'pay_royal_001', 'store_royal_001', 0, 1,
      process.env.RAZORPAY_KEY_ID || 'rzp_test_kirana_demo',
      process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_kirana_demo_secret',
      process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_kirana_123',
      'apnakirana@okhdfcbank', 'Apna Kirana & Supermarket', '',
      'apnakirana@okhdfcbank', 'Apna Kirana & Supermarket',
      1, 0, 10000, 1, 1, 1, 1, now
    );

    sqliteDb.prepare(`
      INSERT OR REPLACE INTO payment_settings (
        id, tenant_id, razorpay_enabled, razorpay_test_mode, razorpay_key_id, razorpay_key_secret, razorpay_webhook_secret,
        store_upi_id, store_upi_name, store_upi_qr_url, upi_id, upi_store_name, cod_enabled, cod_min_order, cod_max_order,
        online_payment_enabled, cash_enabled, upi_enabled, card_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'pay_fresh_002', 'store_fresh_002', 0, 1,
      process.env.RAZORPAY_KEY_ID || 'rzp_test_kirana_demo',
      process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_kirana_demo_secret',
      process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_kirana_123',
      'freshmart@okhdfcbank', 'Fresh Mart & Daily Needs', '',
      'freshmart@okhdfcbank', 'Fresh Mart & Daily Needs',
      1, 0, 10000, 1, 1, 1, 1, now
    );

    // Seed Platform Admin & Store Users
    sqliteDb.prepare(`
      INSERT OR REPLACE INTO users (id, store_id, tenant_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', ?, ?)
    `).run('usr_platform_admin', 'store_royal_001', 'Platform Super Administrator', '9999999999', '9999', 'PLATFORM_ADMIN', JSON.stringify(['*']), now, now);

    sqliteDb.prepare(`
      INSERT OR REPLACE INTO users (id, store_id, tenant_id, name, phone, pin, role, permissions, photo_url, address, emergency_contact, status, availability, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)
    `).run('usr_owner', 'store_royal_001', 'store_royal_001', 'Ramesh Patel (Owner)', '9876543210', '1234', 'STORE_OWNER', JSON.stringify(['*']), 'Shop #4, Main Market, Kukatpally', '9876543200', 'ACTIVE', 'ONLINE', now, now);

    // Seed Categories
    const catStmt = sqliteDb.prepare(`
      INSERT OR REPLACE INTO categories (id, store_id, tenant_id, name, slug, icon, image_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const cat of sampleCategories) {
      catStmt.run(cat.id, storeProfile.id, storeProfile.id, cat.name, cat.slug, cat.icon, cat.image_url, cat.sort_order);
    }

    // Seed Products
    const prodStmt = sqliteDb.prepare(`
      INSERT OR REPLACE INTO products (
        id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
        purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
        pos_price, website_price, gst_percent, stock, reserved_stock, min_stock,
        is_active, is_visible_online, is_pos_available, is_featured, is_bestseller,
        is_offer, photo_url, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of sampleProducts) {
      prodStmt.run(
        p.id, storeProfile.id, storeProfile.id, p.category_id, p.name, p.brand, p.barcode, p.unit, p.is_loose,
        p.purchase_cost, p.selling_price, p.mrp, p.wholesale_price, p.min_selling_price,
        p.selling_price, p.selling_price, p.gst_percent, p.stock, p.reserved_stock, p.min_stock,
        p.is_active, p.is_visible_online, p.is_pos_available, p.is_featured, p.is_bestseller,
        p.is_offer, p.photo_url, p.description, now, now
      );
    }

    // Seed Customers
    const custStmt = sqliteDb.prepare(`
      INSERT OR REPLACE INTO customers (id, store_id, tenant_id, name, phone, email, address, credit_balance, total_spent, orders_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of sampleCustomers) {
      custStmt.run(c.id, storeProfile.id, storeProfile.id, c.name, c.phone, c.email, c.address, c.credit_balance, c.total_spent, c.orders_count, now);
    }

    // Seed Suppliers
    const suppStmt = sqliteDb.prepare(`
      INSERT OR REPLACE INTO suppliers (id, store_id, tenant_id, name, phone, company, gstin, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of sampleSuppliers) {
      suppStmt.run(s.id, storeProfile.id, storeProfile.id, s.name, s.phone, s.company, s.gstin, s.address);
    }

    // Seed Orders
    const ordStmt = sqliteDb.prepare(`
      INSERT OR REPLACE INTO orders (
        id, store_id, tenant_id, order_number, invoice_number, order_type, status,
        customer_id, customer_name, customer_phone, delivery_address,
        subtotal, discount, delivery_charge, gst_amount, total_amount,
        payment_status, payment_method, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const o of sampleRecentOrders) {
      ordStmt.run(
        o.id, storeProfile.id, storeProfile.id, o.order_number, o.invoice_number, o.order_type, o.status,
        null, o.customer_name, o.customer_phone, o.delivery_address,
        o.subtotal, o.discount, o.delivery_charge, o.gst_amount, o.total_amount,
        o.payment_status, o.payment_method, '', o.created_at, o.created_at
      );
    }

    // Seed Platform Settings & Plans
    sqliteDb.prepare(`
      INSERT OR REPLACE INTO platform_plans (id, name, slug, price_monthly, price_yearly, features_json, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('plan_pro', 'Pro Kirana Platform', 'pro', 999, 9990, JSON.stringify(["Unlimited Products", "POS Billing", "Online Storefront", "UPI Payments"]), 1, now);

    sqliteDb.prepare(`
      INSERT OR REPLACE INTO platform_settings (id, key_name, key_value, category, description, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('set_platform_name', 'platform_name', 'Apna Kirana & Supermarket SaaS', 'GENERAL', 'Platform Branding Name', now);

    // Seed Standard Users
    const userStmt = sqliteDb.prepare(`
      INSERT OR REPLACE INTO users (
        id, store_id, tenant_id, name, email, phone, pin, role, permissions, status, availability, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    userStmt.run(
      'user_super_admin', null, null, 'Platform Super Admin', 'admin@digi8.in', '9999999999', '9999',
      'PLATFORM_ADMIN', JSON.stringify(['*']), 'ACTIVE', 'ONLINE', now, now
    );

    userStmt.run(
      'user_royal_owner', 'store_royal_001', 'store_royal_001', 'Rajesh Sharma', 'rajesh@apnakirana.com', '9876543210', '1234',
      'STORE_OWNER', JSON.stringify(['pos:all', 'inventory:all', 'settings:all', 'orders:all', 'reports:all']), 'ACTIVE', 'ONLINE', now, now
    );

    userStmt.run(
      'user_fresh_owner', 'store_fresh_002', 'store_fresh_002', 'Venkatesh Rao', 'venkat@freshmart.in', '9848012345', '1234',
      'STORE_OWNER', JSON.stringify(['pos:all', 'inventory:all', 'settings:all', 'orders:all', 'reports:all']), 'ACTIVE', 'ONLINE', now, now
    );

    // Seed Active Delivery Riders for Tenants
    userStmt.run(
      'usr_royal_rider', 'store_royal_001', 'store_royal_001', 'Raju Rider (Delivery Partner)', 'raju@royalkirana.in', '9876543213', '1234',
      'DELIVERY_BOY', JSON.stringify(['delivery']), 'ACTIVE', 'ONLINE', now, now
    );

    userStmt.run(
      'usr_fresh_rider', 'store_fresh_002', 'store_fresh_002', 'Suresh Kumar (Delivery Partner)', 'suresh@freshmart.in', '9848012348', '1234',
      'DELIVERY_BOY', JSON.stringify(['delivery']), 'ACTIVE', 'ONLINE', now, now
    );

    userStmt.run(
      'usr_sai_rider', 'store_sai_002', 'store_sai_002', 'Venkatesh (Delivery Partner)', 'venky@saikirana.in', '9848099993', '1234',
      'DELIVERY_BOY', JSON.stringify(['delivery']), 'ACTIVE', 'ONLINE', now, now
    );

    console.log('[Database] Seeded initial Multi-Tenant Kirana datasets into SQLite successfully.');
  }
}
