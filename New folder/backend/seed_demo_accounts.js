import { query, execute, initDatabase } from './db.js';
import { sampleCategories, sampleProducts } from './seedData.js';

async function seedDemoAccounts() {
  try {
    console.log('[Seed Demo Accounts] Initializing Multi-Tenant SaaS Demo Environments (3 Isolated Stores + Super Admin)...');
    await initDatabase();

    const now = new Date().toISOString();

    // 1. Ensure the 3 Tenants exist in tenants and stores tables
    const tenants = [
      {
        id: 'store_royal_001',
        name: 'Royal Kirana',
        slug: 'royal-kirana',
        custom_domain: 'royalkirana.in',
        owner_name: 'Ramesh Patel',
        owner_email: 'ramesh@royalkirana.in',
        owner_phone: '9876543210',
        business_type: 'KIRANA_GROCERY',
        gstin: '36AAAAA0000A1Z5',
        address: 'Plot 42, Jubilee Hills Road No 36, Hyderabad, Telangana',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500033',
        status: 'ACTIVE',
        plan: 'ENTERPRISE',
        primary_color: '#1d4ed8', // Royal Blue
        secondary_color: '#1e40af',
        button_color: '#2563eb',
        cashier_max_discount: 5.0,
        manager_max_discount: 20.0,
        upi_id: 'royalkirana@okhdfcbank'
      },
      {
        id: 'store_sai_002',
        name: 'Sai Kirana',
        slug: 'sai-kirana',
        custom_domain: 'saikirana.in',
        owner_name: 'Sai Prakash',
        owner_email: 'sai@saikirana.in',
        owner_phone: '9848099999',
        business_type: 'KIRANA_GROCERY',
        gstin: '36BBBBB1111B2Z6',
        address: 'Shop 5, Gandhi Road, Dilsukhnagar, Hyderabad, Telangana',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500060',
        status: 'ACTIVE',
        plan: 'GROWTH',
        primary_color: '#15803d', // Emerald Green
        secondary_color: '#166534',
        button_color: '#16a34a',
        cashier_max_discount: 5.0,
        manager_max_discount: 15.0,
        upi_id: 'saikirana@okaxis'
      },
      {
        id: 'store_fresh_003',
        name: 'Fresh Mart',
        slug: 'fresh-mart',
        custom_domain: 'freshmart.in',
        owner_name: 'Vikram Rao',
        owner_email: 'freshmart@freshmart.in',
        owner_phone: '9848012345',
        business_type: 'SUPERMARKET',
        gstin: '36CCCCC2222C3Z7',
        address: 'Building 12, Gachibowli High Street, Hyderabad, Telangana',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500032',
        status: 'ACTIVE',
        plan: 'PRO',
        primary_color: '#ea580c', // Bright Orange
        secondary_color: '#c2410c',
        button_color: '#f97316',
        cashier_max_discount: 5.0,
        manager_max_discount: 25.0,
        upi_id: 'freshmart@oksbi'
      }
    ];

    for (const t of tenants) {
      await execute(`
        INSERT INTO tenants (
          id, name, slug, custom_domain, owner_name, owner_email, owner_phone,
          business_type, gstin, address, city, state, pincode, status, plan,
          primary_color, secondary_color, button_color, cashier_max_discount,
          manager_max_discount, upi_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          slug = VALUES(slug),
          owner_name = VALUES(owner_name),
          owner_email = VALUES(owner_email),
          owner_phone = VALUES(owner_phone),
          primary_color = VALUES(primary_color),
          secondary_color = VALUES(secondary_color),
          button_color = VALUES(button_color),
          status = 'ACTIVE',
          updated_at = VALUES(updated_at)
      `, [
        t.id, t.name, t.slug, t.custom_domain, t.owner_name, t.owner_email, t.owner_phone,
        t.business_type, t.gstin, t.address, t.city, t.state, t.pincode, t.status, t.plan,
        t.primary_color, t.secondary_color, t.button_color, t.cashier_max_discount,
        t.manager_max_discount, t.upi_id, now, now
      ]);

      await execute(`
        INSERT INTO stores (
          id, tenant_id, name, slug, custom_domain, owner_name, phone, email, address,
          gstin, upi_id, status, plan, primary_color, secondary_color, button_color,
          cashier_max_discount, manager_max_discount, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          tenant_id = VALUES(tenant_id),
          name = VALUES(name),
          slug = VALUES(slug),
          phone = VALUES(phone),
          email = VALUES(email),
          status = 'ACTIVE',
          updated_at = VALUES(updated_at)
      `, [
        t.id, t.id, t.name, t.slug, t.custom_domain, t.owner_name, t.owner_phone, t.owner_email,
        t.address, t.gstin, t.upi_id, t.status, t.plan, t.primary_color, t.secondary_color,
        t.button_color, t.cashier_max_discount, t.manager_max_discount, now
      ]);

      console.log(`  -> Tenant configured: ${t.name} (${t.id})`);
    }

    // 2. Seed / Upsert Users for All Tenants and Super Admin
    const users = [
      // SUPER ADMIN (Digi8 Solutions / Mana Kirana Kottu Platform)
      {
        id: 'usr_superadmin',
        tenant_id: null,
        name: 'Platform Super Administrator',
        email: 'admin@digi8solutions.com',
        phone: '9999999999',
        pin: '9999',
        password_hash: 'password123',
        role: 'PLATFORM_ADMIN',
        permissions: JSON.stringify(['*']),
        status: 'ACTIVE'
      },
      // STORE 1: Royal Kirana
      {
        id: 'usr_royal_owner',
        tenant_id: 'store_royal_001',
        name: 'Ramesh Patel (Owner)',
        email: 'ramesh@royalkirana.in',
        phone: '9876543210',
        pin: '1234',
        password_hash: 'password123',
        role: 'STORE_OWNER',
        permissions: JSON.stringify(['*']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_royal_manager',
        tenant_id: 'store_royal_001',
        name: 'Suresh Reddy (Store Manager)',
        email: 'suresh@royalkirana.in',
        phone: '9876543211',
        pin: '1234',
        password_hash: 'password123',
        role: 'STORE_MANAGER',
        permissions: JSON.stringify(['*']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_royal_cashier',
        tenant_id: 'store_royal_001',
        name: 'Kiran Kumar (Cashier)',
        email: 'kiran@royalkirana.in',
        phone: '9876543212',
        pin: '1234',
        password_hash: 'password123',
        role: 'CASHIER',
        permissions: JSON.stringify(['pos', 'orders', 'customers']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_royal_rider',
        tenant_id: 'store_royal_001',
        name: 'Raju Rider (Delivery Partner)',
        email: 'raju@royalkirana.in',
        phone: '9876543213',
        pin: '1234',
        password_hash: 'password123',
        role: 'DELIVERY_BOY',
        permissions: JSON.stringify(['delivery']),
        status: 'ACTIVE'
      },

      // STORE 2: Sai Kirana
      {
        id: 'usr_sai_owner',
        tenant_id: 'store_sai_002',
        name: 'Sai Prakash (Owner)',
        email: 'sai@saikirana.in',
        phone: '9848099999',
        pin: '1234',
        password_hash: 'password123',
        role: 'STORE_OWNER',
        permissions: JSON.stringify(['*']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_sai_manager',
        tenant_id: 'store_sai_002',
        name: 'Manoj Sharma (Store Manager)',
        email: 'manoj@saikirana.in',
        phone: '9848099991',
        pin: '1234',
        password_hash: 'password123',
        role: 'STORE_MANAGER',
        permissions: JSON.stringify(['*']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_sai_cashier',
        tenant_id: 'store_sai_002',
        name: 'Anil Verma (Cashier)',
        email: 'anil@saikirana.in',
        phone: '9848099992',
        pin: '1234',
        password_hash: 'password123',
        role: 'CASHIER',
        permissions: JSON.stringify(['pos', 'orders', 'customers']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_sai_rider',
        tenant_id: 'store_sai_002',
        name: 'Venkatesh (Delivery Partner)',
        email: 'venky@saikirana.in',
        phone: '9848099993',
        pin: '1234',
        password_hash: 'password123',
        role: 'DELIVERY_BOY',
        permissions: JSON.stringify(['delivery']),
        status: 'ACTIVE'
      },

      // STORE 3: Fresh Mart
      {
        id: 'usr_fresh_owner',
        tenant_id: 'store_fresh_003',
        name: 'Vikram Rao (Owner)',
        email: 'freshmart@freshmart.in',
        phone: '9848012345',
        pin: '1234',
        password_hash: 'password123',
        role: 'STORE_OWNER',
        permissions: JSON.stringify(['*']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_fresh_manager',
        tenant_id: 'store_fresh_003',
        name: 'Deepak Gupta (Store Manager)',
        email: 'deepak@freshmart.in',
        phone: '9848012346',
        pin: '1234',
        password_hash: 'password123',
        role: 'STORE_MANAGER',
        permissions: JSON.stringify(['*']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_fresh_cashier',
        tenant_id: 'store_fresh_003',
        name: 'Pooja Singh (Cashier)',
        email: 'pooja@freshmart.in',
        phone: '9848012347',
        pin: '1234',
        password_hash: 'password123',
        role: 'CASHIER',
        permissions: JSON.stringify(['pos', 'orders', 'customers']),
        status: 'ACTIVE'
      },
      {
        id: 'usr_fresh_rider',
        tenant_id: 'store_fresh_003',
        name: 'Karthik (Delivery Partner)',
        email: 'karthik@freshmart.in',
        phone: '9848012348',
        pin: '1234',
        password_hash: 'password123',
        role: 'DELIVERY_BOY',
        permissions: JSON.stringify(['delivery']),
        status: 'ACTIVE'
      }
    ];

    for (const u of users) {
      await execute(`
        INSERT INTO users (
          id, store_id, tenant_id, name, email, phone, pin, password_hash,
          role, permissions, status, availability, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ONLINE', ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          email = VALUES(email),
          pin = VALUES(pin),
          password_hash = VALUES(password_hash),
          role = VALUES(role),
          tenant_id = VALUES(tenant_id),
          permissions = VALUES(permissions),
          status = 'ACTIVE',
          updated_at = VALUES(updated_at)
      `, [
        u.id, u.tenant_id || u.id, u.tenant_id, u.name, u.email, u.phone,
        u.pin, u.password_hash, u.role, u.permissions, u.status, now, now
      ]);
      console.log(`  -> User ready: ${u.name} (${u.phone} / ${u.email}) [${u.role}]`);
    }

    // 3. Seed / Upsert Isolated Customers per Tenant
    const customers = [
      {
        id: 'cust_royal_sunita',
        tenant_id: 'store_royal_001',
        name: 'Sunita Sharma',
        phone: '9811223344',
        email: 'sunita@royalkirana.in',
        address: 'Flat 101, Lakeview Apts, Hyderabad',
        credit_balance: 0,
        total_spent: 1250.00,
        orders_count: 3
      },
      {
        id: 'cust_sai_suresh',
        tenant_id: 'store_sai_002',
        name: 'Suresh Rao',
        phone: '9848088888',
        email: 'suresh@saikirana.in',
        address: 'Door 4-12, Dilsukhnagar Main Rd, Hyderabad',
        credit_balance: 150.00,
        total_spent: 890.00,
        orders_count: 2
      },
      {
        id: 'cust_fresh_anita',
        tenant_id: 'store_fresh_003',
        name: 'Anita Patel',
        phone: '9848077777',
        email: 'anita@freshmart.in',
        address: 'Villa 18, Gachibowli Meadows, Hyderabad',
        credit_balance: 0,
        total_spent: 3450.00,
        orders_count: 5
      }
    ];

    for (const c of customers) {
      await execute(`
        INSERT INTO customers (
          id, store_id, tenant_id, name, phone, email, address,
          credit_balance, total_spent, orders_count, password, pin, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1234', '1234', 'ACTIVE', ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          email = VALUES(email),
          address = VALUES(address),
          password = '1234',
          pin = '1234',
          status = 'ACTIVE'
      `, [
        c.id, c.tenant_id, c.tenant_id, c.name, c.phone, c.email, c.address,
        c.credit_balance, c.total_spent, c.orders_count, now
      ]);
      console.log(`  -> Customer ready: ${c.name} (${c.phone}) [Tenant: ${c.tenant_id}]`);
    }

    // 4. Seed Isolated Products for Sai Kirana and Fresh Mart to guarantee Multi-Tenant Isolation
    // Royal Kirana already has default products in seedData.js. Let's add distinct products for Store 2 & 3.
    const isolatedProducts = [
      // Sai Kirana Products
      {
        id: 'prod_sai_rice_5kg',
        store_id: 'store_sai_002',
        tenant_id: 'store_sai_002',
        category_id: 'cat_rice',
        name: 'Sai Deluxe Sona Masoori Raw Rice 5KG',
        brand: 'Sai Brand',
        barcode: '8901030099011',
        sku: 'SAI-RICE-05',
        unit: 'BAG',
        purchase_cost: 250.00,
        selling_price: 310.00,
        mrp: 340.00,
        stock: 35.000,
        reserved_stock: 0,
        min_stock: 5
      },
      {
        id: 'prod_sai_oil_1l',
        store_id: 'store_sai_002',
        tenant_id: 'store_sai_002',
        category_id: 'cat_oils',
        name: 'Sai Gold Pure Groundnut Oil 1L',
        brand: 'Sai Gold',
        barcode: '8901030099028',
        sku: 'SAI-OIL-01',
        unit: 'PACKET',
        purchase_cost: 165.00,
        selling_price: 195.00,
        mrp: 220.00,
        stock: 45.000,
        reserved_stock: 0,
        min_stock: 10
      },
      // Fresh Mart Products
      {
        id: 'prod_fresh_rice_5kg',
        store_id: 'store_fresh_003',
        tenant_id: 'store_fresh_003',
        category_id: 'cat_rice',
        name: 'Fresh Mart Organic Aged Basmati Rice 5KG',
        brand: 'Fresh Organic',
        barcode: '8901030088012',
        sku: 'FM-BASMATI-05',
        unit: 'BAG',
        purchase_cost: 420.00,
        selling_price: 499.00,
        mrp: 580.00,
        stock: 60.000,
        reserved_stock: 0,
        min_stock: 10
      },
      {
        id: 'prod_fresh_almonds_500g',
        store_id: 'store_fresh_003',
        tenant_id: 'store_fresh_003',
        category_id: 'cat_dryfruits',
        name: 'Fresh Mart California Almonds 500g',
        brand: 'Fresh Premium',
        barcode: '8901030088029',
        sku: 'FM-ALMOND-500',
        unit: 'PACKET',
        purchase_cost: 380.00,
        selling_price: 460.00,
        mrp: 520.00,
        stock: 25.000,
        reserved_stock: 0,
        min_stock: 5
      }
    ];

    // Seed Royal Kirana categories and sample products
    for (const cat of sampleCategories) {
      await execute(`
        INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, image_url, sort_order)
        VALUES (?, 'store_royal_001', 'store_royal_001', ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name)
      `, [cat.id, cat.name, cat.slug, cat.icon, cat.image_url, cat.sort_order]);
    }

    for (const p of sampleProducts) {
      await execute(`
        INSERT INTO products (
          id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
          purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
          pos_price, website_price, gst_percent, stock, reserved_stock, min_stock,
          is_active, is_visible_online, is_pos_available, is_featured, is_bestseller,
          is_offer, photo_url, description, created_at, updated_at
        ) VALUES (?, 'store_royal_001', 'store_royal_001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          selling_price = VALUES(selling_price),
          purchase_cost = VALUES(purchase_cost),
          stock = VALUES(stock),
          updated_at = VALUES(updated_at)
      `, [
        p.id, p.category_id, p.name, p.brand, p.barcode, p.unit, p.is_loose,
        p.purchase_cost, p.selling_price, p.mrp, p.wholesale_price, p.min_selling_price,
        p.selling_price, p.selling_price, p.gst_percent, p.stock, p.reserved_stock, p.min_stock,
        p.is_active, p.is_visible_online, p.is_pos_available, p.is_featured, p.is_bestseller,
        p.is_offer, p.photo_url, p.description, now, now
      ]);
    }

    for (const p of isolatedProducts) {
      await execute(`
        INSERT INTO products (
          id, store_id, tenant_id, category_id, name, brand, barcode, sku,
          unit, purchase_cost, selling_price, mrp, stock, reserved_stock,
          min_stock, is_active, is_visible_online, is_pos_available, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?)
        ON DUPLICATE KEY UPDATE
          selling_price = VALUES(selling_price),
          purchase_cost = VALUES(purchase_cost),
          stock = VALUES(stock),
          updated_at = VALUES(updated_at)
      `, [
        p.id, p.store_id, p.tenant_id, p.category_id, p.name, p.brand, p.barcode,
        p.sku, p.unit, p.purchase_cost, p.selling_price, p.mrp, p.stock,
        p.reserved_stock, p.min_stock, now, now
      ]);
      console.log(`  -> Product ready: ${p.name} (₹${p.selling_price}) [Tenant: ${p.tenant_id}]`);
    }

    console.log('\n[Seed Demo Accounts] 3 Isolated Store Tenants + Platform Super Admin ready!');
  } catch (err) {
    console.error('[Seed Demo Accounts Error]:', err);
  } finally {
    process.exit(0);
  }
}

seedDemoAccounts();
