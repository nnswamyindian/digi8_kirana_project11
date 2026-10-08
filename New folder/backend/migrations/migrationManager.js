import { query, getOne, execute } from '../db.js';

/**
 * Enterprise Database Migration Manager (MySQL 8+ Engine)
 * Provides automated, idempotent, version-controlled schema migrations
 * specifically optimized for MySQL enterprise multi-tenant databases.
 */

const migrations = [
  {
    version: '20260301_001',
    name: 'initial_schema_baseline',
    up: async () => {
      // Baseline check: ensure core tables exist
      const check = await getOne(
        "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'tenants'"
      );
      console.log(`[Migration Baseline] Core tables check: ${check?.cnt || 0} found`);
    }
  },
  {
    version: '20260301_002',
    name: 'add_token_and_offline_indexes',
    up: async () => {
      try {
        await execute(`
          ALTER TABLE orders 
          ADD INDEX idx_orders_offline_sync (tenant_id, created_at, status)
        `);
      } catch (e) {
        // Index may already exist
      }
    }
  },
  {
    version: '20260301_003',
    name: 'customer_khata_audit_indexing',
    up: async () => {
      try {
        await execute(`
          ALTER TABLE customer_ledger 
          ADD INDEX idx_cust_ledger_lookup (customer_id, tenant_id, created_at)
        `);
      } catch (e) {
        // Index may already exist
      }
    }
  },
  {
    version: '20260301_004',
    name: 'phase5_saas_company_control_center',
    up: async () => {
      // 1. Subscription Plans Table
      await execute(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) NOT NULL,
          description TEXT,
          monthly_price DECIMAL(10,2) NOT NULL,
          yearly_price DECIMAL(10,2) NOT NULL,
          setup_fee DECIMAL(10,2) DEFAULT 0,
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
          created_at VARCHAR(50) NOT NULL,
          updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Store Applications Table
      await execute(`
        CREATE TABLE IF NOT EXISTS store_applications (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64),
          application_number VARCHAR(50) NOT NULL,
          store_name VARCHAR(150) NOT NULL,
          owner_name VARCHAR(120) NOT NULL,
          email VARCHAR(150),
          phone VARCHAR(20) NOT NULL,
          business_name VARCHAR(150),
          business_type VARCHAR(60) DEFAULT 'KIRANA_GROCERY',
          address TEXT,
          city VARCHAR(80),
          state VARCHAR(80),
          pincode VARCHAR(20),
          gst_number VARCHAR(30),
          requested_plan VARCHAR(64) DEFAULT 'PRO',
          status VARCHAR(30) DEFAULT 'PENDING',
          review_notes TEXT,
          reviewed_by VARCHAR(120),
          reviewed_at VARCHAR(50),
          terms_accepted TINYINT(1) DEFAULT 1,
          terms_version VARCHAR(20) DEFAULT 'v1.0',
          ip_address VARCHAR(45),
          created_at VARCHAR(50) NOT NULL,
          updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. Platform Subscriptions Table (Store -> Company)
      await execute(`
        CREATE TABLE IF NOT EXISTS platform_subscriptions (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64) NOT NULL,
          plan_id VARCHAR(64) NOT NULL,
          status VARCHAR(30) DEFAULT 'PENDING',
          billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
          current_period_start VARCHAR(50),
          current_period_end VARCHAR(50),
          amount DECIMAL(10,2) NOT NULL,
          setup_fee_paid DECIMAL(10,2) DEFAULT 0,
          auto_renew TINYINT(1) DEFAULT 1,
          grace_period_end VARCHAR(50),
          cancelled_at VARCHAR(50),
          created_at VARCHAR(50) NOT NULL,
          updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Platform Subscription Payments (Store -> Company)
      await execute(`
        CREATE TABLE IF NOT EXISTS platform_subscription_payments (
          id VARCHAR(64) PRIMARY KEY,
          subscription_id VARCHAR(64),
          tenant_id VARCHAR(64) NOT NULL,
          application_id VARCHAR(64),
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(30) DEFAULT 'RAZORPAY',
          provider VARCHAR(50) DEFAULT 'RAZORPAY',
          provider_payment_id VARCHAR(100),
          provider_order_id VARCHAR(100),
          status VARCHAR(30) DEFAULT 'PENDING',
          paid_at VARCHAR(50),
          invoice_id VARCHAR(64),
          created_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 5. Platform Invoices (Store -> Company Invoices)
      await execute(`
        CREATE TABLE IF NOT EXISTS platform_invoices (
          id VARCHAR(64) PRIMARY KEY,
          invoice_number VARCHAR(50) NOT NULL,
          tenant_id VARCHAR(64) NOT NULL,
          subscription_id VARCHAR(64),
          amount DECIMAL(10,2) NOT NULL,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          total_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(30) DEFAULT 'PAID',
          due_date VARCHAR(50),
          paid_at VARCHAR(50),
          invoice_pdf_url TEXT,
          line_items_json TEXT,
          created_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 6. Tenant Custom Domains Table
      await execute(`
        CREATE TABLE IF NOT EXISTS tenant_domains (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64) NOT NULL,
          domain VARCHAR(150) NOT NULL,
          domain_type VARCHAR(30) DEFAULT 'CUSTOM_DOMAIN',
          verification_token VARCHAR(100) NOT NULL,
          verification_status VARCHAR(30) DEFAULT 'PENDING',
          ssl_status VARCHAR(30) DEFAULT 'PENDING',
          is_primary TINYINT(1) DEFAULT 0,
          dns_target VARCHAR(150) DEFAULT 'stores.digi8solutions.com',
          verified_at VARCHAR(50),
          created_at VARCHAR(50) NOT NULL,
          updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 7. Tenant Feature Overrides Table
      await execute(`
        CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64) NOT NULL,
          feature_key VARCHAR(100) NOT NULL,
          enabled TINYINT(1) NOT NULL,
          override_value TEXT,
          created_at VARCHAR(50) NOT NULL,
          updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 8. Support Tickets Table
      await execute(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64) NOT NULL,
          store_name VARCHAR(150),
          created_by_user_id VARCHAR(64),
          created_by_name VARCHAR(120),
          subject VARCHAR(200) NOT NULL,
          description TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'MEDIUM',
          status VARCHAR(20) DEFAULT 'OPEN',
          responses_json TEXT,
          created_at VARCHAR(50) NOT NULL,
          updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 9. Platform Global Settings
      await execute(`
        CREATE TABLE IF NOT EXISTS platform_settings (
          key_name VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed Initial Default Subscription Plans if empty
      const plansCount = await getOne('SELECT COUNT(*) as count FROM subscription_plans');
      if (!plansCount || plansCount.count === 0) {
        const now = new Date().toISOString();
        const initialPlans = [
          {
            id: 'plan_starter',
            name: 'Starter Kirana',
            slug: 'starter',
            description: 'Essential POS billing & inventory for single-counter neighborhood shops.',
            monthly_price: 999,
            yearly_price: 9990,
            setup_fee: 1499,
            max_products: 1000,
            max_staff: 2,
            max_delivery_agents: 2,
            max_orders_per_month: 500,
            storage_limit_mb: 1024,
            custom_domain: 0,
            online_store: 1,
            pos: 1,
            inventory: 1,
            delivery_tracking: 1,
            mobile_app: 0,
            advanced_reports: 0,
            is_popular: 0
          },
          {
            id: 'plan_pro',
            name: 'Professional Supermarket',
            slug: 'pro',
            description: 'Full omnichannel store with custom domain, multi-staff POS, and real-time delivery.',
            monthly_price: 2499,
            yearly_price: 24990,
            setup_fee: 2499,
            max_products: 5000,
            max_staff: 8,
            max_delivery_agents: 6,
            max_orders_per_month: 3000,
            storage_limit_mb: 5120,
            custom_domain: 1,
            online_store: 1,
            pos: 1,
            inventory: 1,
            delivery_tracking: 1,
            mobile_app: 1,
            advanced_reports: 1,
            is_popular: 1
          },
          {
            id: 'plan_business',
            name: 'Business Superstore',
            slug: 'business',
            description: 'High-volume supermarkets with multi-till checkout, full white-labeling & live radar.',
            monthly_price: 4999,
            yearly_price: 49990,
            setup_fee: 3999,
            max_products: 15000,
            max_staff: 20,
            max_delivery_agents: 15,
            max_orders_per_month: 10000,
            storage_limit_mb: 15360,
            custom_domain: 1,
            online_store: 1,
            pos: 1,
            inventory: 1,
            delivery_tracking: 1,
            mobile_app: 1,
            advanced_reports: 1,
            is_popular: 0
          },
          {
            id: 'plan_enterprise',
            name: 'Enterprise Multi-Store',
            slug: 'enterprise',
            description: 'Multi-store chains & grocery franchises with custom SLA, dedicated server & ERP sync.',
            monthly_price: 9999,
            yearly_price: 99990,
            setup_fee: 9999,
            max_products: 50000,
            max_staff: 100,
            max_delivery_agents: 50,
            max_orders_per_month: 50000,
            storage_limit_mb: 51200,
            custom_domain: 1,
            online_store: 1,
            pos: 1,
            inventory: 1,
            delivery_tracking: 1,
            mobile_app: 1,
            advanced_reports: 1,
            is_popular: 0
          }
        ];

        for (const p of initialPlans) {
          await execute(`
            INSERT INTO subscription_plans (
              id, name, slug, description, monthly_price, yearly_price, setup_fee,
              max_products, max_staff, max_delivery_agents, max_orders_per_month, storage_limit_mb,
              custom_domain, online_store, pos, inventory, delivery_tracking, mobile_app, advanced_reports,
              is_popular, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name)
          `, [
            p.id, p.name, p.slug, p.description, p.monthly_price, p.yearly_price, p.setup_fee,
            p.max_products, p.max_staff, p.max_delivery_agents, p.max_orders_per_month, p.storage_limit_mb,
            p.custom_domain, p.online_store, p.pos, p.inventory, p.delivery_tracking, p.mobile_app, p.advanced_reports,
            p.is_popular, now, now
          ]);
        }
      }

      // Seed Initial Sample Application & Subscriptions for Demo Tenants if not present
      const existingApp = await getOne('SELECT id FROM store_applications WHERE tenant_id = "store_royal_001"');
      if (!existingApp) {
        const now = new Date().toISOString();
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        await execute(`
          INSERT INTO store_applications (
            id, tenant_id, application_number, store_name, owner_name, email, phone,
            business_name, business_type, address, city, state, pincode, gst_number,
            requested_plan, status, review_notes, reviewed_by, reviewed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE store_name = VALUES(store_name)
        `, [
          'app_royal_001', 'store_royal_001', 'STORE-100001', 'Apna Kirana & Supermarket',
          'Ramesh Patel', 'store@apnakirana.in', '9876543210', 'Apna Kirana Retail Pvt Ltd',
          'KIRANA_GROCERY', 'Shop 12, Main Market Road', 'Ghaziabad', 'Uttar Pradesh', '201014',
          '09AAECR1234F1Z8', 'pro', 'ACTIVATED', 'Approved by founding team. Good local presence.',
          'Platform Super Administrator', now, now, now
        ]);

        await execute(`
          INSERT INTO platform_subscriptions (
            id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end,
            amount, setup_fee_paid, auto_renew, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id)
        `, [
          'sub_royal_001', 'store_royal_001', 'plan_pro', 'ACTIVE', 'MONTHLY',
          now, nextMonth, 2499.00, 2499.00, now, now
        ]);

        await execute(`
          INSERT INTO platform_invoices (
            id, invoice_number, tenant_id, subscription_id, amount, tax_amount, total_amount,
            status, due_date, paid_at, line_items_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE invoice_number = VALUES(invoice_number)
        `, [
          'inv_sub_001', 'INV-SAAS-1001', 'store_royal_001', 'sub_royal_001',
          2499.00, 449.82, 2948.82, now, now,
          JSON.stringify([{ description: 'Pro Plan Monthly Subscription', amount: 2499 }]),
          now
        ]);

        await execute(`
          INSERT INTO tenant_domains (
            id, tenant_id, domain, domain_type, verification_token, verification_status,
            ssl_status, is_primary, dns_target, verified_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'stores.digi8solutions.com', ?, ?, ?)
          ON DUPLICATE KEY UPDATE domain = VALUES(domain)
        `, [
          'dom_royal_001', 'store_royal_001', 'apnakirana.in', 'CUSTOM_DOMAIN',
          'tok_verification_apnakirana_verified', 'VERIFIED', 'ACTIVE', now, now, now
        ]);
      }
    }
  },
  {
    version: '20260302_001',
    name: 'phase6_inventory_transactions_pricing_whatsapp_invoicing',
    up: async () => {
      // Safe column addition helper for migration in MySQL
      const safeAddColumn = async (tableName, colName, colDef) => {
        try {
          const rows = await query(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [tableName, colName]
          );
          if (rows.length === 0) {
            await execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colDef}`);
            console.log(`[Migration Phase 6] Added column ${colName} to ${tableName}`);
          }
        } catch (err) {
          // Ignore if exists
        }
      };

      // 1. Core Phase 6 Tables
      await execute(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await execute(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await execute(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await execute(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Extend products table with Phase 6 & 6A columns
      await safeAddColumn('products', 'sku', 'VARCHAR(100)');
      await safeAddColumn('products', 'max_stock', 'DECIMAL(12,3) DEFAULT 1000');
      await safeAddColumn('products', 'reorder_level', 'DECIMAL(12,3) DEFAULT 10');
      await safeAddColumn('products', 'supplier', 'VARCHAR(150)');
      await safeAddColumn('products', 'hsn_sac', 'VARCHAR(50)');
      await safeAddColumn('products', 'barcode_type', "VARCHAR(30) DEFAULT 'MANUFACTURER'");
      await safeAddColumn('products', 'allow_zero_stock_purchase', "VARCHAR(30) DEFAULT 'DISABLE_PURCHASE'");
      await safeAddColumn('products', 'default_discount_type', "VARCHAR(20) DEFAULT 'NONE'");
      await safeAddColumn('products', 'default_discount_value', 'DECIMAL(10,2) DEFAULT 0');

      // 3. Extend order_items with cost_snapshot and gross_profit
      await safeAddColumn('order_items', 'cost_snapshot', 'DECIMAL(10,2) DEFAULT 0');
      await safeAddColumn('order_items', 'gross_profit', 'DECIMAL(10,2) DEFAULT 0');

      // 4. Extend tenants and stores with invoice customization & WhatsApp Business configuration
      const configCols = [
        ['invoice_prefix', "VARCHAR(30) DEFAULT 'INV'"],
        ['invoice_show_logo', 'TINYINT(1) DEFAULT 1'],
        ['invoice_show_gst', 'TINYINT(1) DEFAULT 1'],
        ['invoice_show_address', 'TINYINT(1) DEFAULT 1'],
        ['invoice_show_phone', 'TINYINT(1) DEFAULT 1'],
        ['invoice_show_customer_name', 'TINYINT(1) DEFAULT 1'],
        ['invoice_show_customer_mobile', 'TINYINT(1) DEFAULT 1'],
        ['invoice_show_qr', 'TINYINT(1) DEFAULT 1'],
        ['invoice_show_tax', 'TINYINT(1) DEFAULT 1'],
        ['invoice_show_discount', 'TINYINT(1) DEFAULT 1'],
        ['invoice_footer_message', "TEXT"],
        ['invoice_thank_you_message', "TEXT"],
        ['whatsapp_enabled', 'TINYINT(1) DEFAULT 0'],
        ['whatsapp_business_number', 'VARCHAR(50)'],
        ['whatsapp_phone_number_id', 'VARCHAR(100)'],
        ['whatsapp_account_id', 'VARCHAR(100)'],
        ['whatsapp_access_token', 'TEXT'],
        ['whatsapp_template_name', "VARCHAR(100) DEFAULT 'kirana_invoice_update'"],
        ['whatsapp_auto_send', 'TINYINT(1) DEFAULT 0'],
        ['allow_selling_below_cost', 'TINYINT(1) DEFAULT 0'],
        ['allow_negative_inventory', 'TINYINT(1) DEFAULT 0'],
        ['minimum_margin_alert_percent', 'DECIMAL(5,2) DEFAULT 10'],
        ['timezone', "VARCHAR(50) DEFAULT 'Asia/Kolkata'"],
      ];

      for (const [col, def] of configCols) {
        await safeAddColumn('tenants', col, def);
        await safeAddColumn('stores', col, def);
      }

      // 5. Backfill SKU on existing products if empty
      const prods = await query('SELECT id, barcode, name FROM products WHERE sku IS NULL OR sku = ""');
      for (const p of prods) {
        const sku = (p.barcode || ('SKU-' + p.id)).trim();
        await execute('UPDATE products SET sku = ? WHERE id = ?', [sku, p.id]);
      }

      // 6. Backfill cost_snapshot on existing order_items where missing
      await execute(`
        UPDATE order_items
        SET cost_snapshot = cost_price,
            gross_profit = (total_price - (cost_price * quantity))
        WHERE cost_snapshot IS NULL OR cost_snapshot = 0
      `);

      // 7. Safe indexes for Phase 6 fast lookups
      const indexes = [
        'ALTER TABLE products ADD INDEX idx_prod_tenant_barcode (tenant_id, barcode)',
        'ALTER TABLE products ADD INDEX idx_prod_tenant_sku (tenant_id, sku)',
        'ALTER TABLE inventory_transactions ADD INDEX idx_inv_tx_lookup (tenant_id, product_id, created_at)',
        'ALTER TABLE orders ADD INDEX idx_orders_tenant_date (tenant_id, created_at)'
      ];
      for (const idx of indexes) {
        try { await execute(idx); } catch (e) { /* ignore if already exists */ }
      }
      console.log('[Migration Phase 6] Applied Phase 6 & Phase 6A schema updates successfully.');
    }
  },
  {
    version: '20260302_002',
    name: 'digi8_customer_auth_and_storefront_expansion',
    up: async () => {
      const safeAddColumn = async (tableName, colName, colDef) => {
        try {
          const rows = await query(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [tableName, colName]
          );
          if (rows.length === 0) {
            await execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colDef}`);
            console.log(`[Migration Digi8] Added column ${colName} to ${tableName}`);
          }
        } catch (err) {
          // Ignore if exists
        }
      };

      // 1. Customer Authentication support
      await safeAddColumn('customers', 'password', 'VARCHAR(255)');
      await safeAddColumn('customers', 'pin', 'VARCHAR(20)');
      await safeAddColumn('customers', 'status', "VARCHAR(20) DEFAULT 'ACTIVE'");

      // 2. Storefront configuration & metadata
      await safeAddColumn('tenants', 'is_storefront_enabled', 'TINYINT(1) DEFAULT 1');
      await safeAddColumn('stores', 'is_storefront_enabled', 'TINYINT(1) DEFAULT 1');
      await safeAddColumn('tenants', 'store_category', "VARCHAR(100) DEFAULT 'Kirana & Supermarket'");
      await safeAddColumn('stores', 'store_category', "VARCHAR(100) DEFAULT 'Kirana & Supermarket'");
      await safeAddColumn('tenants', 'support_phone', "VARCHAR(20) DEFAULT '9876543210'");
      await safeAddColumn('tenants', 'support_email', "VARCHAR(100) DEFAULT 'support@apnakirana.in'");
      await safeAddColumn('tenants', 'social_links', 'TEXT');

      // 3. Store applications enhancements
      await safeAddColumn('store_applications', 'currency', "VARCHAR(10) DEFAULT '₹'");
      await safeAddColumn('store_applications', 'timezone', "VARCHAR(50) DEFAULT 'Asia/Kolkata'");
      await safeAddColumn('store_applications', 'delivery_available', 'TINYINT(1) DEFAULT 1');
      await safeAddColumn('store_applications', 'pickup_available', 'TINYINT(1) DEFAULT 1');
      await safeAddColumn('store_applications', 'pan_number', 'VARCHAR(30) NULL');
      await safeAddColumn('store_applications', 'whatsapp_number', 'VARCHAR(20) NULL');
      await safeAddColumn('store_applications', 'store_category', "VARCHAR(100) DEFAULT 'Kirana & Supermarket'");
      await safeAddColumn('store_applications', 'country', "VARCHAR(50) DEFAULT 'India'");

      console.log('[Migration Digi8] Customer auth, storefront metadata, and store applications schema migration applied.');
    }
  },
  {
    version: '20260303_001',
    name: 'enterprise_multitenant_hardening_and_auth',
    up: async () => {
      const safeAddColumn = async (tableName, colName, colDef) => {
        try {
          const rows = await query(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [tableName, colName]
          );
          if (rows.length === 0) {
            await execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colDef}`);
            console.log(`[Migration Enterprise] Added column ${colName} to ${tableName}`);
          }
        } catch (err) {
          // Ignore if exists
        }
      };

      // 1. Hardening Users table with email, password_hash, pin_hash, verification flags
      await safeAddColumn('users', 'email', 'VARCHAR(150) NULL');
      await safeAddColumn('users', 'password_hash', 'VARCHAR(255) NULL');
      await safeAddColumn('users', 'pin_hash', 'VARCHAR(255) NULL');
      await safeAddColumn('users', 'email_verified', 'TINYINT(1) DEFAULT 0');
      await safeAddColumn('users', 'mobile_verified', 'TINYINT(1) DEFAULT 0');
      await safeAddColumn('users', 'last_login', 'VARCHAR(50) NULL');

      // 2. Hardening Stores table with tenant_id, owner_user_id, branding & feature flags
      await safeAddColumn('stores', 'tenant_id', 'VARCHAR(64) NULL');
      await safeAddColumn('stores', 'store_slug', 'VARCHAR(80) NULL');
      await safeAddColumn('stores', 'business_name', 'VARCHAR(150) NULL');
      await safeAddColumn('stores', 'owner_user_id', 'VARCHAR(64) NULL');
      await safeAddColumn('stores', 'whatsapp', 'VARCHAR(20) NULL');
      await safeAddColumn('stores', 'city', 'VARCHAR(80) NULL');
      await safeAddColumn('stores', 'state', 'VARCHAR(80) NULL');
      await safeAddColumn('stores', 'pincode', 'VARCHAR(20) NULL');
      await safeAddColumn('stores', 'gst_number', 'VARCHAR(30) NULL');
      await safeAddColumn('stores', 'subscription_id', 'VARCHAR(64) NULL');
      await safeAddColumn('stores', 'white_label_enabled', 'TINYINT(1) DEFAULT 0');

      // 3. Create Enterprise OTPs Lifecycle Table
      await execute(`
        CREATE TABLE IF NOT EXISTS otps (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64) NULL,
          phone VARCHAR(20) NULL,
          email VARCHAR(150) NULL,
          otp_code VARCHAR(10) NOT NULL,
          purpose VARCHAR(40) NOT NULL,
          attempts INT DEFAULT 0,
          max_attempts INT DEFAULT 3,
          expires_at VARCHAR(50) NOT NULL,
          is_verified TINYINT(1) DEFAULT 0,
          created_at VARCHAR(50) NOT NULL,
          INDEX idx_otps_phone_purp (phone, purpose, is_verified),
          INDEX idx_otps_email_purp (email, purpose, is_verified)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Create Enterprise Discount Audits Table
      await execute(`
        CREATE TABLE IF NOT EXISTS discount_audits (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64) NOT NULL,
          order_id VARCHAR(64) NULL,
          item_id VARCHAR(64) NULL,
          original_amount DECIMAL(10,2) NOT NULL,
          discount_percent DECIMAL(5,2) NOT NULL,
          discount_amount DECIMAL(10,2) NOT NULL,
          requested_by VARCHAR(120) NULL,
          requested_by_id VARCHAR(64) NULL,
          approved_by VARCHAR(120) NULL,
          approved_by_id VARCHAR(64) NULL,
          reason VARCHAR(255) NULL,
          status VARCHAR(30) DEFAULT 'APPROVED',
          created_at VARCHAR(50) NOT NULL,
          INDEX idx_disc_audit_tenant (tenant_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 5. Create Enterprise User Sessions & Multi-device Token Table
      await execute(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          tenant_id VARCHAR(64) NULL,
          token_hash VARCHAR(64) NULL,
          ip_address VARCHAR(50) NULL,
          user_agent TEXT NULL,
          last_active VARCHAR(50) NOT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at VARCHAR(50) NOT NULL,
          INDEX idx_sessions_user (user_id, is_active),
          INDEX idx_sessions_tenant (tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Synchronize Stores and Tenants: Ensure every tenant has a synchronized stores entry
      try {
        await execute(`
          UPDATE stores 
          SET tenant_id = id 
          WHERE (tenant_id IS NULL OR tenant_id = '') AND id IS NOT NULL;
        `);
        await execute(`
          UPDATE orders 
          SET tenant_id = store_id 
          WHERE (tenant_id IS NULL OR tenant_id = '') AND store_id IS NOT NULL;
        `);
        await execute(`
          UPDATE order_items oi
          JOIN orders o ON oi.order_id = o.id
          SET oi.tenant_id = o.tenant_id
          WHERE (oi.tenant_id IS NULL OR oi.tenant_id = '');
        `);
      } catch (syncErr) {
        console.warn('[Migration Warning] Syncing store/tenant IDs:', syncErr.message);
      }

      console.log('[Migration Enterprise] Migration 20260303_001 applied successfully.');
    }
  },
  {
    version: '20260303_002',
    name: 'company_control_center_invoicing_and_payments',
    up: async () => {
      const safeAddColumn = async (tableName, colName, colDef) => {
        try {
          const rows = await query(
            'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [tableName, colName]
          );
          if (rows.length === 0) {
            await execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colDef}`);
            console.log(`[Migration Platform] Added column ${colName} to ${tableName}`);
          }
        } catch (err) {
          // Ignore
        }
      };

      // 1. Platform Invoices Extensions for Partial Payments & Pricing Snapshots
      await safeAddColumn('platform_invoices', 'paid_amount', 'DECIMAL(10,2) DEFAULT 0');
      await safeAddColumn('platform_invoices', 'balance_amount', 'DECIMAL(10,2) DEFAULT 0');
      await safeAddColumn('platform_invoices', 'payment_method', 'VARCHAR(50) DEFAULT NULL');
      await safeAddColumn('platform_invoices', 'notes', 'TEXT DEFAULT NULL');
      await safeAddColumn('platform_invoices', 'plan_name_snapshot', 'VARCHAR(100) DEFAULT NULL');
      await safeAddColumn('platform_invoices', 'monthly_price_snapshot', 'DECIMAL(10,2) DEFAULT 0');
      await safeAddColumn('platform_invoices', 'setup_fee_snapshot', 'DECIMAL(10,2) DEFAULT 0');
      await safeAddColumn('platform_invoices', 'discount_snapshot', 'DECIMAL(10,2) DEFAULT 0');
      await safeAddColumn('platform_invoices', 'tax_snapshot', 'DECIMAL(10,2) DEFAULT 0');

      // Backfill balance_amount for existing invoices
      await execute(`
        UPDATE platform_invoices 
        SET paid_amount = CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END,
            balance_amount = CASE WHEN status = 'PAID' THEN 0 ELSE total_amount END
        WHERE balance_amount = 0 AND status = 'PENDING';
      `);

      // 2. Platform Payments Extensions for Manual Payments (Cash, Bank, Proof, Reference)
      await safeAddColumn('platform_subscription_payments', 'transaction_reference', 'VARCHAR(100) DEFAULT NULL');
      await safeAddColumn('platform_subscription_payments', 'proof_url', 'TEXT DEFAULT NULL');
      await safeAddColumn('platform_subscription_payments', 'notes', 'TEXT DEFAULT NULL');
      await safeAddColumn('platform_subscription_payments', 'received_by', 'VARCHAR(120) DEFAULT NULL');
      await safeAddColumn('platform_subscription_payments', 'verified_by', 'VARCHAR(120) DEFAULT NULL');
      await safeAddColumn('platform_subscription_payments', 'verified_at', 'VARCHAR(50) DEFAULT NULL');

      // 3. Ensure Platform Settings Seed
      const now = new Date().toISOString();
      const defaultSettings = [
        ['company_profile', JSON.stringify({
          company_name: 'Digi8 Solutions Pvt Ltd',
          platform_name: 'Mana Kirana Kottu',
          email: 'support@digi8solutions.com',
          phone: '+91 99999 99999',
          address: 'Plot 104, IT Corridor, Madhapur, Hyderabad, Telangana - 500081',
          gstin: '36AABCD1234E1Z5'
        })],
        ['billing_bank_details', JSON.stringify({
          account_name: 'Digi8 Solutions Private Limited',
          bank_name: 'HDFC Bank Ltd',
          account_number: '50200088991122',
          ifsc_code: 'HDFC0001234',
          branch: 'Madhapur Cyber Gateway, Hyderabad',
          upi_id: 'digi8solutions@okhdfcbank',
          invoice_prefix: 'INV-SAAS'
        })]
      ];

      for (const [k, v] of defaultSettings) {
        await execute(
          'INSERT INTO platform_settings (key_name, value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE updated_at=VALUES(updated_at)',
          [k, v, now]
        );
      }

      console.log('[Migration Platform] Applied migration 20260303_002 successfully.');
    }
  },
  {
    version: '20260303_003',
    name: 'add_updated_at_to_platform_invoices',
    up: async () => {
      try {
        const rows = await query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'platform_invoices' AND COLUMN_NAME = 'updated_at'"
        );
        if (rows.length === 0) {
          await execute('ALTER TABLE platform_invoices ADD COLUMN updated_at VARCHAR(50) DEFAULT NULL');
          console.log('[Migration Platform] Added updated_at column to platform_invoices');
        }
      } catch (err) {
        console.warn('[Migration Platform] Note on platform_invoices updated_at:', err.message);
      }
    }
  }
];

export async function runMigrations() {
  try {
    // 1. Ensure schema_migrations table exists
    await execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        applied_at VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Fetch applied migrations
    const appliedRows = await query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(appliedRows.map(r => r.version));

    let executedCount = 0;

    // 3. Run pending migrations in order
    for (const m of migrations) {
      if (!appliedVersions.has(m.version)) {
        console.log(`[Migration] Applying migration ${m.version}: ${m.name}...`);
        await m.up();
        const now = new Date().toISOString();
        await execute(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
          [m.version, m.name, now]
        );
        executedCount++;
      }
    }

    if (executedCount > 0) {
      console.log(`[Migration] Successfully applied ${executedCount} pending migration(s).`);
    } else {
      console.log(`[Migration] Database schema is up to date (baseline verified).`);
    }
  } catch (err) {
    console.error('[Migration Error]: Failed to run schema migrations:', err.message);
  }
}
