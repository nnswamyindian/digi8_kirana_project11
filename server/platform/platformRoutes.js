import express from 'express';
import { query, getOne, execute, isMySQL } from '../db.js';
import { logAuditEvent } from '../tenant/tenantMiddleware.js';
import companyRoutes from './companyRoutes.js';

const router = express.Router();
router.use('/', companyRoutes);

/**
 * Health Check Endpoint for Load Balancers & Monitoring
 */
router.get('/health', async (req, res) => {
  try {
    const dbTest = await getOne('SELECT 1 as test');
    const tenantCount = await getOne('SELECT COUNT(*) as count FROM tenants');
    const orderCount = await getOne('SELECT COUNT(*) as count FROM orders');

    res.json({
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      database: dbTest?.test === 1 ? 'UP' : 'DEGRADED',
      database_driver: isMySQL() ? 'MYSQL' : 'SQLITE',
      total_tenants: tenantCount?.count || 0,
      total_orders: orderCount?.count || 0,
      memory: {
        rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      uptime_seconds: Math.round(process.uptime()),
    });
  } catch (err) {
    res.status(503).json({
      status: 'UNHEALTHY',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Platform Admin Dashboard Statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalTenantsRow = await getOne('SELECT COUNT(*) as count FROM tenants');
    const activeTenantsRow = await getOne('SELECT COUNT(*) as count FROM tenants WHERE status = "ACTIVE"');
    const suspendedTenantsRow = await getOne('SELECT COUNT(*) as count FROM tenants WHERE status = "SUSPENDED"');
    const ordersRow = await getOne('SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as gmv FROM orders');
    const usersRow = await getOne('SELECT COUNT(*) as count FROM users');
    const plansRows = await query('SELECT plan, COUNT(*) as count FROM tenants GROUP BY plan');

    const planDistribution = {
      FREE: 0,
      STARTER: 0,
      GROWTH: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };
    plansRows.forEach((r) => {
      if (planDistribution[r.plan] !== undefined) {
        planDistribution[r.plan] = r.count;
      }
    });

    const recentTenants = await query(`
      SELECT id, name, slug, owner_name, owner_phone, owner_email, status, plan, primary_color, created_at
      FROM tenants
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      total_tenants: totalTenantsRow?.count || 0,
      active_tenants: activeTenantsRow?.count || 0,
      suspended_tenants: suspendedTenantsRow?.count || 0,
      total_gmv: Math.round((ordersRow?.gmv || 0) * 100) / 100,
      total_orders: ordersRow?.count || 0,
      total_users: usersRow?.count || 0,
      plan_distribution: planDistribution,
      recent_tenants: recentTenants,
      system_health: {
        database: 'UP',
        database_type: isMySQL() ? 'MYSQL' : 'SQLITE',
        uptime_seconds: Math.round(process.uptime()),
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * List All Stores / Tenants with aggregated sales stats
 */
router.get('/tenants', async (req, res) => {
  try {
    if (req.user && req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only platform administrators can view all registered stores.' });
    }
    const tenants = await query(`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM orders o WHERE o.tenant_id = t.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE o.tenant_id = t.id) as total_revenue,
        (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id) as total_products,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as total_staff
      FROM tenants t
      ORDER BY t.created_at DESC
    `);
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Public Self-Serve Store Registration
 */
router.post('/register-store', async (req, res) => {
  try {
    const store_name = req.body.store_name;
    const owner_name = req.body.owner_name;
    const owner_phone = req.body.owner_phone || req.body.phone;
    const owner_email = req.body.owner_email || req.body.email;
    const pin = req.body.pin;
    const business_type = req.body.business_type;
    const address = req.body.address;
    const city = req.body.city;
    const state = req.body.state;
    const pincode = req.body.pincode;
    const gstin = req.body.gstin || req.body.gst_number;

    if (!store_name || !owner_name || !owner_phone || !pin) {
      return res.status(400).json({ error: 'Store name, owner name, mobile number, and PIN are required.' });
    }

    // Check if phone number is already registered
    const existingUser = await getOne('SELECT id, phone, tenant_id FROM users WHERE phone = ?', [owner_phone.trim()]);
    if (existingUser) {
      return res.status(400).json({ error: `Mobile number ${owner_phone.trim()} is already registered.` });
    }

    // Generate unique slug
    let baseSlug = store_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    if (!baseSlug) baseSlug = 'store';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await getOne('SELECT id FROM tenants WHERE slug = ?', [uniqueSlug])) {
      uniqueSlug = `${baseSlug}-${counter++}`;
    }

    const tenantId = 'store_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    // 1. Insert Tenant Record
    await execute(`
      INSERT INTO tenants (
        id, name, slug, custom_domain, owner_name, owner_email, owner_phone,
        business_type, gstin, address, city, state, pincode, status, plan,
        primary_color, secondary_color, button_color, logo_url, banner_url,
        tagline, currency_symbol, min_order_value, delivery_charge, free_delivery_above,
        estimated_delivery_mins, store_status, opening_time, closing_time, operating_days,
        printer_width, printer_connection, cashier_max_discount, manager_max_discount,
        created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'GROWTH',
        '#16a34a', '#0f766e', '#15803d',
        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
        'Your Friendly Neighborhood Kirana & Supermarket', '₹', 199, 30, 499, '30-45 mins',
        'OPEN', '07:30', '22:30', 'Mon-Sun', '80mm', 'BROWSER_DIRECT', 5, 20, ?, ?
      )
    `, [
      tenantId, store_name.trim(), uniqueSlug, owner_name.trim(),
      owner_email ? owner_email.trim() : null, owner_phone.trim(),
      business_type || 'KIRANA_GROCERY', gstin || null,
      address || 'Main Road', city || 'Hyderabad', state || 'Telangana', pincode || '500001',
      now, now
    ]);

    // 2. Insert Store Owner User
    const ownerUserId = 'usr_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO users (
        id, store_id, tenant_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'STORE_OWNER', '["*"]', 'ACTIVE', 'ONLINE', ?, ?)
    `, [
      ownerUserId, tenantId, tenantId, owner_name.trim(), owner_phone.trim(), pin.trim(), now, now
    ]);

    // 3. Create Tenant Payment Settings
    await execute(`
      INSERT INTO payment_settings (
        id, tenant_id, razorpay_enabled, razorpay_test_mode, razorpay_key_id, razorpay_key_secret,
        store_upi_id, store_upi_name, cod_enabled, online_payment_enabled, updated_at
      ) VALUES (?, ?, 0, 1, 'rzp_test_kirana_demo', 'rzp_secret_kirana_demo_secret', ?, ?, 1, 1, ?)
    `, [
      'pay_' + Math.random().toString(36).substring(2, 9),
      tenantId,
      `${uniqueSlug}@okhdfcbank`,
      store_name,
      now
    ]);

    // 4. Create Initial Delivery Zone
    await execute(`
      INSERT INTO delivery_areas (
        id, store_id, tenant_id, area_name, pincodes, delivery_charge, min_order_value, estimated_delivery, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, 'Store Local Vicinity (Within 3km)', ?, 30, 199, '30-45 mins', 1, ?, ?)
    `, [
      'area_' + Math.random().toString(36).substring(2, 9),
      tenantId, tenantId, pincode || '500001', now, now
    ]);

    await logAuditEvent({
      tenantId,
      userId: ownerUserId,
      userName: owner_name,
      action: 'TENANT_REGISTERED',
      entityType: 'TENANT',
      entityId: tenantId,
      newValues: { name: store_name, slug: uniqueSlug, phone: owner_phone }
    });

    res.json({
      success: true,
      tenant_id: tenantId,
      message: 'Store registered successfully! Welcome to the Kirana SaaS Platform.',
      tenant: {
        id: tenantId,
        name: store_name,
        slug: uniqueSlug,
        subdomain_url: `http://${uniqueSlug}.localhost:5173`,
        storefront_url: `/store/${uniqueSlug}`,
      },
      user: {
        id: ownerUserId,
        name: owner_name,
        phone: owner_phone,
        role: 'STORE_OWNER',
        tenant_id: tenantId,
      }
    });
  } catch (err) {
    console.error('[Store Registration Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 10-Step Interactive Store Onboarding Wizard Submission
 */
router.post('/onboarding', async (req, res) => {
  try {
    const tenant_id = req.body.tenant_id || (req.tenant && req.tenant.id);
    const step = req.body.step || 1;
    const data = req.body.data || req.body.step_data || {};
    if (!tenant_id) return res.status(400).json({ error: 'tenant_id is required' });

    const tenant = await getOne('SELECT * FROM tenants WHERE id = ?', [tenant_id]);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const now = new Date().toISOString();

    // Partial updates depending on the step completed
    if (step === 1 && data.store_name) {
      await execute('UPDATE tenants SET name = ?, tagline = ?, business_type = ?, updated_at = ? WHERE id = ?',
        [data.store_name, data.tagline || tenant.tagline, data.business_type || tenant.business_type, now, tenant_id]);
    } else if (step === 2 && data.logo_url) {
      await execute('UPDATE tenants SET logo_url = ?, banner_url = ?, updated_at = ? WHERE id = ?',
        [data.logo_url, data.banner_url || tenant.banner_url, now, tenant_id]);
    } else if (step === 3) {
      await execute('UPDATE tenants SET primary_color = ?, secondary_color = ?, button_color = ?, updated_at = ? WHERE id = ?',
        [data.primary_color || '#16a34a', data.secondary_color || '#0f766e', data.button_color || '#15803d', now, tenant_id]);
    } else if (step === 4) {
      await execute('UPDATE tenants SET address = ?, city = ?, state = ?, pincode = ?, updated_at = ? WHERE id = ?',
        [data.address || tenant.address, data.city || tenant.city, data.state || tenant.state, data.pincode || tenant.pincode, now, tenant_id]);
    } else if (step === 5 && data.gstin) {
      await execute('UPDATE tenants SET gstin = ?, updated_at = ? WHERE id = ?', [data.gstin, now, tenant_id]);
    } else if (step === 6) {
      // Payment Settings
      await execute(`
        UPDATE payment_settings SET
          store_upi_id = ?, store_upi_name = ?, cod_enabled = ?,
          razorpay_enabled = ?, razorpay_key_id = ?, updated_at = ?
        WHERE tenant_id = ?
      `, [
        data.upi_id || `${tenant.slug}@okhdfcbank`,
        data.upi_name || tenant.name,
        data.cod_enabled !== undefined ? Number(data.cod_enabled) : 1,
        data.razorpay_enabled ? 1 : 0,
        data.razorpay_key_id || '',
        now,
        tenant_id
      ]);
    } else if (step === 7) {
      // Delivery Settings
      await execute(`
        UPDATE tenants SET
          delivery_charge = ?, min_order_value = ?, free_delivery_above = ?,
          estimated_delivery_mins = ?, updated_at = ?
        WHERE id = ?
      `, [
        Number(data.delivery_charge) || 30,
        Number(data.min_order_value) || 199,
        Number(data.free_delivery_above) || 499,
        data.estimated_delivery_mins || '30-45 mins',
        now,
        tenant_id
      ]);
    } else if (step === 8 && (data.initial_category_name || data.name)) {
      // Create First Category
      const catName = data.initial_category_name || data.name || 'Groceries';
      const catId = 'cat_' + Math.random().toString(36).substring(2, 9);
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
      await execute(`
        INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, 'Package', 1)
      `, [catId, tenant_id, tenant_id, catName, catSlug]);
    } else if (step === 9) {
      // Create First Product
      const p = data.initial_product || data || {};
      const cat = await getOne('SELECT id FROM categories WHERE tenant_id = ? LIMIT 1', [tenant_id]);
      const prodId = 'prod_' + Math.random().toString(36).substring(2, 9);
      const uniqueBarcode = p.barcode || ('BAR_' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000));
      await execute(`
        INSERT INTO products (
          id, store_id, tenant_id, category_id, name, unit, purchase_cost, selling_price, mrp, stock,
          barcode, is_active, is_visible_online, is_pos_available, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?)
      `, [
        prodId, tenant_id, tenant_id, cat?.id || 'cat_default',
        p.name || 'Sample Grocery Product', p.unit || 'PACKET',
        Number(p.purchase_cost) || 40, Number(p.selling_price) || 50, Number(p.mrp) || 55,
        Number(p.stock) || 50, uniqueBarcode, now, now
      ]);
    } else if (step === 10) {
      // Finalize Onboarding / Optional Initial Staff
      if (data.initial_staff && data.initial_staff.name && data.initial_staff.phone) {
        const s = data.initial_staff;
        const existingStaff = await getOne('SELECT id FROM users WHERE phone = ?', [s.phone.trim()]);
        if (!existingStaff) {
          const staffId = 'usr_' + Math.random().toString(36).substring(2, 9);
          await execute(`
            INSERT INTO users (
              id, store_id, tenant_id, name, phone, pin, role, permissions, status, availability, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'ONLINE', ?, ?)
          `, [
            staffId, tenant_id, tenant_id, s.name, s.phone.trim(), s.pin || '1234',
            s.role || 'CASHIER', JSON.stringify(['view_orders', 'manage_orders', 'pos_billing']),
            now, now
          ]);
        }
      }
      // Ensure tenant is active
      await execute('UPDATE tenants SET status = "ACTIVE", updated_at = ? WHERE id = ?', [now, tenant_id]);
    }

    const updatedTenant = await getOne('SELECT * FROM tenants WHERE id = ?', [tenant_id]);
    res.json({
      success: true,
      message: `Step ${step}/10 saved successfully!`,
      tenant: updatedTenant,
    });
  } catch (err) {
    console.error('[Onboarding Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Platform Admin: Update Tenant Status (ACTIVE, SUSPENDED, PENDING)
 */
const handleStatusUpdate = async (req, res) => {
  try {
    const rawStatus = (req.body.status || '').toUpperCase();
    const reason = req.body.reason;
    if (!['ACTIVE', 'SUSPENDED', 'PENDING', 'INACTIVE'].includes(rawStatus)) {
      return res.status(400).json({ error: 'Invalid tenant status' });
    }

    const now = new Date().toISOString();
    await execute('UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?', [rawStatus, now, req.params.id]);

    await logAuditEvent({
      tenantId: req.params.id,
      action: 'TENANT_STATUS_CHANGED',
      entityType: 'TENANT',
      entityId: req.params.id,
      newValues: { status: rawStatus, reason }
    });

    res.json({ success: true, status: rawStatus, message: `Tenant status updated to ${rawStatus}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.put('/tenants/:id/status', handleStatusUpdate);
router.patch('/tenants/:id/status', handleStatusUpdate);

/**
 * Platform Admin: Update Tenant Plan
 */
const handlePlanUpdate = async (req, res) => {
  try {
    const rawPlan = (req.body.plan || '').toUpperCase();
    if (!['FREE', 'BASIC', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'].includes(rawPlan)) {
      return res.status(400).json({ error: 'Invalid SaaS plan' });
    }

    const now = new Date().toISOString();
    await execute('UPDATE tenants SET plan = ?, updated_at = ? WHERE id = ?', [rawPlan, now, req.params.id]);

    await logAuditEvent({
      tenantId: req.params.id,
      action: 'TENANT_PLAN_CHANGED',
      entityType: 'TENANT',
      entityId: req.params.id,
      newValues: { plan: rawPlan }
    });

    res.json({ success: true, plan: rawPlan, message: `Tenant plan upgraded to ${rawPlan}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.put('/tenants/:id/plan', handlePlanUpdate);
router.patch('/tenants/:id/plan', handlePlanUpdate);

/**
 * Platform Admin: Audit Logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
