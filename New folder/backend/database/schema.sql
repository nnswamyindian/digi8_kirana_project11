-- ====================================================================
-- KIRANA SAAS PLATFORM - PRODUCTION MYSQL 8+ ENTERPRISE SCHEMA
-- Architecture: Shared Database + Shared Tables + Multi-Tenant Isolation
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notification_events;
DROP TABLE IF EXISTS cash_handover_sessions;
DROP TABLE IF EXISTS delivery_cash_collections;
DROP TABLE IF EXISTS delivery_locations;
DROP TABLE IF EXISTS delivery_tracking_sessions;
DROP TABLE IF EXISTS payment_webhook_events;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS payment_settings;
DROP TABLE IF EXISTS payment_audits;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS delivery_areas;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS customer_ledger;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS tenants;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. CENTRAL TENANTS CATALOG
CREATE TABLE tenants (
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
  status ENUM('ACTIVE', 'SUSPENDED', 'PENDING', 'INACTIVE') DEFAULT 'ACTIVE',
  plan ENUM('FREE', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE') DEFAULT 'GROWTH',
  plan_expires_at DATETIME DEFAULT NULL,
  primary_color VARCHAR(20) DEFAULT '#16a34a',
  secondary_color VARCHAR(20) DEFAULT '#0f766e',
  button_color VARCHAR(20) DEFAULT '#15803d',
  logo_url TEXT,
  banner_url TEXT,
  tagline VARCHAR(255) DEFAULT 'Fresh & Pure Groceries Delivered to Your Doorstep',
  currency_symbol VARCHAR(10) DEFAULT '₹',
  min_order_value DECIMAL(10,2) DEFAULT 199.00,
  delivery_charge DECIMAL(10,2) DEFAULT 30.00,
  free_delivery_above DECIMAL(10,2) DEFAULT 499.00,
  estimated_delivery_mins VARCHAR(50) DEFAULT '30-45 mins',
  store_status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
  opening_time VARCHAR(10) DEFAULT '07:30',
  closing_time VARCHAR(10) DEFAULT '22:30',
  operating_days VARCHAR(50) DEFAULT 'Mon-Sun',
  printer_width VARCHAR(20) DEFAULT '80mm',
  printer_connection VARCHAR(30) DEFAULT 'BROWSER_DIRECT',
  cashier_max_discount DECIMAL(5,2) DEFAULT 5.00,
  manager_max_discount DECIMAL(5,2) DEFAULT 20.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenants_slug (slug),
  INDEX idx_tenants_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CATEGORIES
CREATE TABLE categories (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  icon VARCHAR(60) DEFAULT NULL,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tenant_category_slug (tenant_id, slug),
  INDEX idx_category_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PRODUCTS & INVENTORY
CREATE TABLE products (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  category_id VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100) DEFAULT NULL,
  barcode VARCHAR(64) DEFAULT NULL,
  unit VARCHAR(20) NOT NULL,
  is_loose TINYINT(1) DEFAULT 0,
  purchase_cost DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  wholesale_price DECIMAL(10,2) DEFAULT NULL,
  min_selling_price DECIMAL(10,2) DEFAULT NULL,
  pos_price DECIMAL(10,2) DEFAULT NULL,
  website_price DECIMAL(10,2) DEFAULT NULL,
  gst_percent DECIMAL(5,2) DEFAULT 0.00,
  stock DECIMAL(10,3) DEFAULT 0.000,
  reserved_stock DECIMAL(10,3) DEFAULT 0.000,
  min_stock DECIMAL(10,3) DEFAULT 5.000,
  is_active TINYINT(1) DEFAULT 1,
  is_visible_online TINYINT(1) DEFAULT 1,
  is_pos_available TINYINT(1) DEFAULT 1,
  is_featured TINYINT(1) DEFAULT 0,
  is_bestseller TINYINT(1) DEFAULT 0,
  is_offer TINYINT(1) DEFAULT 0,
  photo_url TEXT,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_prod_tenant_barcode (tenant_id, barcode),
  INDEX idx_prod_tenant_search (tenant_id, name, brand),
  INDEX idx_prod_tenant_category (tenant_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. USERS & STAFF
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) DEFAULT NULL, -- NULL for PLATFORM_ADMIN
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  pin VARCHAR(100) NOT NULL,
  role VARCHAR(40) NOT NULL,
  permissions JSON NOT NULL,
  photo_url TEXT,
  address TEXT,
  emergency_contact VARCHAR(20) DEFAULT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  availability ENUM('ONLINE', 'OFFLINE', 'BUSY') DEFAULT 'ONLINE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_user_phone (tenant_id, phone),
  INDEX idx_users_tenant_role (tenant_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ORDERS & INVOICES
CREATE TABLE orders (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  order_type VARCHAR(30) NOT NULL, -- POS, ONLINE_DELIVERY, ONLINE_PICKUP
  status VARCHAR(40) NOT NULL,
  customer_id VARCHAR(64) DEFAULT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  delivery_address TEXT,
  delivery_area_id VARCHAR(64) DEFAULT NULL,
  area VARCHAR(100) DEFAULT NULL,
  pincode VARCHAR(20) DEFAULT NULL,
  landmark VARCHAR(150) DEFAULT NULL,
  latitude DECIMAL(10,7) DEFAULT NULL,
  longitude DECIMAL(10,7) DEFAULT NULL,
  assigned_delivery_boy_id VARCHAR(64) DEFAULT NULL,
  assigned_delivery_boy_name VARCHAR(120) DEFAULT NULL,
  pickup_code VARCHAR(20) DEFAULT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0.00,
  delivery_charge DECIMAL(10,2) DEFAULT 0.00,
  gst_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(30) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  payment_transaction_id VARCHAR(64) DEFAULT NULL,
  notes TEXT,
  delivery_notes TEXT,
  delivery_failure_reason TEXT,
  cancellation_reason TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tenant_order_number (tenant_id, order_number),
  UNIQUE KEY uq_tenant_invoice_number (tenant_id, invoice_number),
  INDEX idx_orders_tenant_status (tenant_id, status),
  INDEX idx_orders_tenant_date (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ORDER ITEMS WITH PRODUCT-LEVEL DISCOUNTS
CREATE TABLE order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  discount_type VARCHAR(20) DEFAULT 'NONE', -- FIXED, PERCENT, NONE
  discount_value DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  taxable_amount DECIMAL(10,2) NOT NULL,
  gst_percent DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_price DECIMAL(10,2) NOT NULL,
  manual_price_adjusted TINYINT(1) DEFAULT 0,
  original_unit_price DECIMAL(10,2) DEFAULT NULL,
  discount_reason VARCHAR(60) DEFAULT NULL,
  approval_data JSON DEFAULT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_items_tenant_order (tenant_id, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. CUSTOMERS & LEDGER
CREATE TABLE customers (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(120) DEFAULT NULL,
  address TEXT,
  credit_balance DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  orders_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tenant_customer_phone (tenant_id, phone),
  INDEX idx_cust_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customer_ledger (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) NOT NULL,
  type VARCHAR(30) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_ledger_tenant_cust (tenant_id, customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. REAL-TIME DELIVERY TRACKING
CREATE TABLE delivery_tracking_sessions (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  agent_name VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME DEFAULT NULL,
  start_lat DECIMAL(10,7) DEFAULT NULL,
  start_lng DECIMAL(10,7) DEFAULT NULL,
  current_lat DECIMAL(10,7) DEFAULT NULL,
  current_lng DECIMAL(10,7) DEFAULT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_trk_tenant_order (tenant_id, order_id),
  INDEX idx_trk_tenant_agent (tenant_id, agent_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE delivery_locations (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy DECIMAL(8,2) DEFAULT NULL,
  speed DECIMAL(8,2) DEFAULT NULL,
  heading DECIMAL(8,2) DEFAULT NULL,
  timestamp DATETIME NOT NULL,
  tracking_status VARCHAR(30) DEFAULT 'ACTIVE',
  INDEX idx_loc_tenant_session (tenant_id, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PAYMENT SETTINGS & TRANSACTIONS
CREATE TABLE payment_settings (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL UNIQUE,
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_transactions (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  method VARCHAR(30) NOT NULL,
  provider VARCHAR(30) NOT NULL,
  provider_payment_id VARCHAR(100) DEFAULT NULL,
  provider_order_id VARCHAR(100) DEFAULT NULL,
  transaction_reference VARCHAR(100) DEFAULT NULL,
  status VARCHAR(30) NOT NULL,
  collected_by VARCHAR(120) DEFAULT NULL,
  collected_by_id VARCHAR(64) DEFAULT NULL,
  collected_at DATETIME DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  failure_reason TEXT,
  metadata JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_txn_tenant_order (tenant_id, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. CASH COLLECTIONS & HANDOVERS
CREATE TABLE delivery_cash_collections (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  payment_transaction_id VARCHAR(64) DEFAULT NULL,
  agent_id VARCHAR(64) NOT NULL,
  agent_name VARCHAR(120) NOT NULL,
  order_total DECIMAL(10,2) NOT NULL,
  amount_collected DECIMAL(10,2) NOT NULL,
  customer_tendered DECIMAL(10,2) NOT NULL,
  change_returned DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_method VARCHAR(30) DEFAULT 'CASH',
  collected_at DATETIME NOT NULL,
  latitude DECIMAL(10,7) DEFAULT NULL,
  longitude DECIMAL(10,7) DEFAULT NULL,
  notes TEXT,
  handover_id VARCHAR(64) DEFAULT NULL,
  handover_status VARCHAR(30) DEFAULT 'PENDING',
  INDEX idx_cash_tenant_agent (tenant_id, agent_id, handover_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cash_handover_sessions (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  agent_name VARCHAR(120) NOT NULL,
  expected_amount DECIMAL(10,2) NOT NULL,
  received_amount DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) NOT NULL,
  orders_count INT NOT NULL,
  approved_by VARCHAR(120) NOT NULL,
  notes TEXT,
  handover_time DATETIME NOT NULL,
  status VARCHAR(30) DEFAULT 'COMPLETED',
  INDEX idx_handover_tenant (tenant_id, agent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. AUDIT & NOTIFICATIONS
CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) DEFAULT NULL,
  user_name VARCHAR(120) DEFAULT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(64) DEFAULT NULL,
  old_values JSON DEFAULT NULL,
  new_values JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_tenant_action (tenant_id, action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_events (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(60) DEFAULT NULL,
  entity_id VARCHAR(64) DEFAULT NULL,
  read_status TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_tenant (tenant_id, read_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- 12. PHASE 5: SAAS COMPANY CONTROL CENTER & SUBSCRIPTION BILLING
-- ====================================================================

-- 12.1 SUBSCRIPTION PLANS (Dynamic pricing configured by Company)
CREATE TABLE subscription_plans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL,
  yearly_price DECIMAL(10,2) NOT NULL,
  setup_fee DECIMAL(10,2) DEFAULT 0.00,
  max_products INT DEFAULT 500,
  max_staff INT DEFAULT 5,
  max_delivery_agents INT DEFAULT 5,
  max_orders_per_month INT DEFAULT 1000,
  storage_limit_mb INT DEFAULT 1024,
  custom_domain TINYINT(1) DEFAULT 0,
  online_store TINYINT(1) DEFAULT 1,
  pos TINYINT(1) DEFAULT 1,
  inventory TINYINT(1) DEFAULT 1,
  delivery_tracking TINYINT(1) DEFAULT 1,
  mobile_app TINYINT(1) DEFAULT 0,
  advanced_reports TINYINT(1) DEFAULT 0,
  is_popular TINYINT(1) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plans_slug (slug),
  INDEX idx_plans_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12.2 STORE APPLICATIONS (Merchant Onboarding & Approval Queue)
CREATE TABLE store_applications (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) DEFAULT NULL,
  application_number VARCHAR(50) NOT NULL UNIQUE,
  store_name VARCHAR(150) NOT NULL,
  owner_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(20) NOT NULL,
  business_name VARCHAR(150) DEFAULT NULL,
  business_type VARCHAR(60) DEFAULT 'KIRANA_GROCERY',
  address TEXT DEFAULT NULL,
  city VARCHAR(80) DEFAULT NULL,
  state VARCHAR(80) DEFAULT NULL,
  pincode VARCHAR(20) DEFAULT NULL,
  gst_number VARCHAR(30) DEFAULT NULL,
  requested_plan VARCHAR(64) DEFAULT 'pro',
  status ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'ACTIVATED', 'REJECTED', 'SUSPENDED') DEFAULT 'PENDING',
  review_notes TEXT DEFAULT NULL,
  reviewed_by VARCHAR(120) DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  terms_accepted TINYINT(1) DEFAULT 1,
  terms_version VARCHAR(20) DEFAULT 'v1.0',
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_status (status),
  INDEX idx_app_phone (phone),
  INDEX idx_app_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12.3 PLATFORM SUBSCRIPTIONS (Store -> Company Contract)
CREATE TABLE platform_subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) NOT NULL,
  status ENUM('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'GRACE_PERIOD') DEFAULT 'PENDING',
  billing_cycle ENUM('MONTHLY', 'YEARLY') DEFAULT 'MONTHLY',
  current_period_start DATETIME DEFAULT NULL,
  current_period_end DATETIME DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  setup_fee_paid DECIMAL(10,2) DEFAULT 0.00,
  auto_renew TINYINT(1) DEFAULT 1,
  grace_period_end DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sub_tenant (tenant_id),
  INDEX idx_sub_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12.4 PLATFORM SUBSCRIPTION PAYMENTS (Separate from grocery store sales)
CREATE TABLE platform_subscription_payments (
  id VARCHAR(64) PRIMARY KEY,
  subscription_id VARCHAR(64) DEFAULT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  application_id VARCHAR(64) DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'RAZORPAY',
  provider VARCHAR(50) DEFAULT 'RAZORPAY',
  provider_payment_id VARCHAR(100) DEFAULT NULL,
  provider_order_id VARCHAR(100) DEFAULT NULL,
  status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  paid_at DATETIME DEFAULT NULL,
  invoice_id VARCHAR(64) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plat_pay_tenant (tenant_id),
  INDEX idx_plat_pay_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12.5 PLATFORM INVOICES (Company Invoices to Stores)
CREATE TABLE platform_invoices (
  id VARCHAR(64) PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  tenant_id VARCHAR(64) NOT NULL,
  subscription_id VARCHAR(64) DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('PAID', 'PENDING', 'VOID') DEFAULT 'PAID',
  due_date DATETIME DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,
  invoice_pdf_url TEXT DEFAULT NULL,
  line_items_json JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plat_inv_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12.6 TENANT CUSTOM DOMAINS (White-Label Domain Mapping)
CREATE TABLE tenant_domains (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  domain VARCHAR(150) NOT NULL UNIQUE,
  domain_type ENUM('SUBDOMAIN', 'CUSTOM_DOMAIN') DEFAULT 'CUSTOM_DOMAIN',
  verification_token VARCHAR(100) NOT NULL,
  verification_status ENUM('PENDING', 'VERIFYING', 'VERIFIED', 'FAILED') DEFAULT 'PENDING',
  ssl_status ENUM('PENDING', 'ACTIVE', 'FAILED') DEFAULT 'PENDING',
  is_primary TINYINT(1) DEFAULT 0,
  dns_target VARCHAR(150) DEFAULT 'stores.digi8solutions.com',
  verified_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_domain_tenant (tenant_id),
  INDEX idx_domain_lookup (domain, verification_status, ssl_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12.7 TENANT FEATURE OVERRIDES (SaaS Feature Flag Granularity)
CREATE TABLE tenant_feature_overrides (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  enabled TINYINT(1) NOT NULL,
  override_value TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_feature (tenant_id, feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12.8 SUPPORT TICKETS
CREATE TABLE support_tickets (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  store_name VARCHAR(150) DEFAULT NULL,
  created_by_user_id VARCHAR(64) DEFAULT NULL,
  created_by_name VARCHAR(120) DEFAULT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
  responses_json JSON DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ticket_tenant (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. STORES PROFILE
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

-- 14. GLOBAL PRODUCT CATALOG (FMCG MASTER)
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

-- 15. INVENTORY TRANSACTIONS
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(200),
  quantity DECIMAL(12,3) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(100),
  previous_stock DECIMAL(12,3) NOT NULL,
  new_stock DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(120),
  created_at VARCHAR(50) NOT NULL,
  INDEX idx_inv_tx_tenant_prod (tenant_id, product_id),
  INDEX idx_inv_tx_type (transaction_type),
  INDEX idx_inv_tx_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. PRODUCT PRICE HISTORY
CREATE TABLE IF NOT EXISTS product_price_history (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  old_purchase_price DECIMAL(10,2),
  new_purchase_price DECIMAL(10,2),
  old_selling_price DECIMAL(10,2),
  new_selling_price DECIMAL(10,2),
  old_mrp DECIMAL(10,2),
  new_mrp DECIMAL(10,2),
  changed_by VARCHAR(120),
  reason TEXT,
  created_at VARCHAR(50) NOT NULL,
  INDEX idx_pph_tenant_prod (tenant_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. PRODUCT PURCHASE PRICE HISTORY
CREATE TABLE IF NOT EXISTS product_purchase_price_history (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  supplier_id VARCHAR(64),
  supplier_name VARCHAR(150),
  purchase_invoice_id VARCHAR(100),
  effective_date VARCHAR(50),
  created_by VARCHAR(120),
  created_at VARCHAR(50) NOT NULL,
  INDEX idx_ppph_tenant_prod (tenant_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. WHATSAPP LOGS
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  invoice_number VARCHAR(100),
  customer_name VARCHAR(150),
  customer_phone VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL,
  message_id VARCHAR(120),
  payload TEXT,
  response TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at VARCHAR(50) NOT NULL,
  updated_at VARCHAR(50) NOT NULL,
  INDEX idx_wa_tenant_order (tenant_id, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. SCHEMA MIGRATIONS TRACKING
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  applied_at VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


