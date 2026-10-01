import { query, getOne, execute, isMySQL } from '../db.js';

/**
 * Enterprise Database Migration Manager
 * Provides automated, idempotent, version-controlled schema migrations
 * compatible with both SQLite 3 (local) and MySQL 8+ (production).
 */

const migrations = [
  {
    version: '20260301_001',
    name: 'initial_schema_baseline',
    up: async () => {
      // Baseline check: ensure core tables exist
      const check = await getOne(
        isMySQL()
          ? "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_name = 'tenants'"
          : "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='tenants'"
      );
      console.log(`[Migration Baseline] Core tables check: ${check?.cnt || 0} found`);
    }
  },
  {
    version: '20260301_002',
    name: 'add_token_and_offline_indexes',
    up: async () => {
      try {
        // Safe index additions for POS offline order syncing and token lookup
        if (isMySQL()) {
          await execute(`
            ALTER TABLE orders 
            ADD INDEX IF NOT EXISTS idx_orders_offline_sync (tenant_id, created_at, status)
          `);
        } else {
          await execute(`
            CREATE INDEX IF NOT EXISTS idx_orders_offline_sync 
            ON orders (tenant_id, created_at, status)
          `);
        }
      } catch (e) {
        // Index may already exist or syntax varies by DB engine
        console.log('[Migration 002 Info]:', e.message);
      }
    }
  },
  {
    version: '20260301_003',
    name: 'customer_khata_audit_indexing',
    up: async () => {
      try {
        if (!isMySQL()) {
          await execute(`
            CREATE INDEX IF NOT EXISTS idx_cust_ledger_lookup 
            ON customer_ledger (customer_id, tenant_id, created_at)
          `);
        }
      } catch (e) {
        console.log('[Migration 003 Info]:', e.message);
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
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
          reviewed_at DATETIME,
          terms_accepted TINYINT(1) DEFAULT 1,
          terms_version VARCHAR(20) DEFAULT 'v1.0',
          ip_address VARCHAR(45),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. Platform Subscriptions Table (Store -> Company)
      await execute(`
        CREATE TABLE IF NOT EXISTS platform_subscriptions (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64) NOT NULL,
          plan_id VARCHAR(64) NOT NULL,
          status VARCHAR(30) DEFAULT 'PENDING',
          billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
          current_period_start DATETIME,
          current_period_end DATETIME,
          amount DECIMAL(10,2) NOT NULL,
          setup_fee_paid DECIMAL(10,2) DEFAULT 0,
          auto_renew TINYINT(1) DEFAULT 1,
          grace_period_end DATETIME,
          cancelled_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
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
          paid_at DATETIME,
          invoice_id VARCHAR(64),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
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
          due_date DATETIME,
          paid_at DATETIME,
          invoice_pdf_url TEXT,
          line_items_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
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
          verified_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 7. Tenant Feature Overrides Table
      await execute(`
        CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(64) NOT NULL,
          feature_key VARCHAR(100) NOT NULL,
          enabled TINYINT(1) NOT NULL,
          override_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 9. Platform Global Settings
      await execute(`
        CREATE TABLE IF NOT EXISTS platform_settings (
          key_name VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
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
        `, [
          'sub_royal_001', 'store_royal_001', 'plan_pro', 'ACTIVE', 'MONTHLY',
          now, nextMonth, 2499.00, 2499.00, now, now
        ]);

        await execute(`
          INSERT INTO platform_invoices (
            id, invoice_number, tenant_id, subscription_id, amount, tax_amount, total_amount,
            status, due_date, paid_at, line_items_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?)
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
        `, [
          'dom_royal_001', 'store_royal_001', 'apnakirana.in', 'CUSTOM_DOMAIN',
          'tok_verification_apnakirana_verified', 'VERIFIED', 'ACTIVE', now, now, now
        ]);
      }
    }
  }
];

export async function runMigrations() {
  try {
    // 1. Ensure schema_migrations table exists
    if (isMySQL()) {
      await execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(50) PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          applied_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } else {
      await execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);
    }

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
