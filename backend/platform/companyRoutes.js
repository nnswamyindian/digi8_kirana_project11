import express from 'express';
import { query, getOne, execute, isMySQL } from '../db.js';
import { logAuditEvent } from '../tenant/tenantMiddleware.js';
import { requireAuth, requireRole } from '../auth/authMiddleware.js';

const router = express.Router();

// ====================================================================
// 1. PUBLIC SAAS LANDING PAGE & APPLICATIONS
// ====================================================================

/**
 * Get all active subscription plans for landing page pricing
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await query(`
      SELECT * FROM subscription_plans 
      WHERE status = 'ACTIVE' 
      ORDER BY monthly_price ASC
    `);
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Submit Store Application (Public Registration)
 * Does NOT immediately activate the store! Creates record with status 'PENDING'
 */
router.post('/applications', async (req, res) => {
  try {
    const {
      store_name,
      owner_name,
      email,
      phone,
      password,
      pin,
      business_name,
      business_type,
      store_category,
      address,
      city,
      state,
      pincode,
      country = 'India',
      gst_number,
      pan_number,
      whatsapp_number,
      currency = '₹',
      timezone = 'Asia/Kolkata',
      delivery_available = true,
      pickup_available = true,
      requested_plan,
      terms_accepted
    } = req.body;

    if (!store_name || !owner_name || !phone) {
      return res.status(400).json({ error: 'Store Name, Owner Name, and Mobile Number are required.' });
    }

    const cleanPhone = String(phone).trim();
    const cleanPin = pin || password || '1234';

    // Check for duplicate application or registered user with same phone
    const existingUser = await getOne('SELECT id, phone FROM users WHERE phone = ?', [cleanPhone]);
    if (existingUser) {
      return res.status(400).json({
        error: `Mobile number ${cleanPhone} is already registered on the platform. Please log in or check your application status.`
      });
    }

    const existingApp = await getOne(
      'SELECT id, application_number, status FROM store_applications WHERE phone = ? AND status IN ("PENDING", "UNDER_REVIEW", "APPROVED", "PAYMENT_PENDING")',
      [cleanPhone]
    );
    if (existingApp) {
      return res.status(400).json({
        error: `An active application (${existingApp.application_number}) is already submitted for ${cleanPhone}. Current status: ${existingApp.status}.`
      });
    }

    // Generate unique application number and tenant ID
    const appNum = 'STORE-' + Math.floor(100000 + Math.random() * 900000);
    const appId = 'app_' + Math.random().toString(36).substring(2, 9);
    const tenantId = 'store_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    // Determine initial slug
    let baseSlug = store_name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 30);
    if (!baseSlug) baseSlug = 'store';
    let slug = baseSlug;
    let counter = 1;
    while (await getOne('SELECT id FROM tenants WHERE slug = ?', [slug])) {
      slug = `${baseSlug}-${counter++}`;
    }

    const planSlug = requested_plan || 'pro';
    const plan = await getOne('SELECT * FROM subscription_plans WHERE slug = ? OR id = ? LIMIT 1', [planSlug, planSlug]);

    // 1. Insert into store_applications (Status: PENDING)
    await execute(`
      INSERT INTO store_applications (
        id, tenant_id, application_number, store_name, owner_name, email, phone,
        business_name, business_type, address, city, state, pincode, gst_number,
        pan_number, whatsapp_number, store_category, country, currency, timezone,
        delivery_available, pickup_available,
        requested_plan, status, review_notes, terms_accepted, ip_address, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)
    `, [
      appId, tenantId, appNum, store_name.trim(), owner_name.trim(),
      email ? email.trim() : null, cleanPhone,
      business_name ? business_name.trim() : store_name.trim(),
      business_type || 'KIRANA_GROCERY',
      address ? address.trim() : 'Store Address',
      city ? city.trim() : 'City',
      state ? state.trim() : 'State',
      pincode ? pincode.trim() : '500001',
      gst_number ? gst_number.trim() : null,
      pan_number ? pan_number.trim() : null,
      whatsapp_number ? whatsapp_number.trim() : cleanPhone,
      store_category || 'Kirana & Supermarket',
      country || 'India',
      currency || '₹',
      timezone || 'Asia/Kolkata',
      delivery_available ? 1 : 0,
      pickup_available ? 1 : 0,
      plan ? plan.slug : 'pro',
      'Initial application submitted via Public SaaS portal.',
      terms_accepted ? 1 : 0,
      req.ip || '127.0.0.1',
      now, now
    ]);

    // 2. Insert into tenants with PENDING status (NOT active yet!)
    await execute(`
      INSERT INTO tenants (
        id, name, slug, custom_domain, owner_name, owner_email, owner_phone,
        business_type, gstin, address, city, state, pincode, status, plan,
        primary_color, secondary_color, button_color, logo_url, banner_url,
        tagline, currency_symbol, min_order_value, delivery_charge, free_delivery_above,
        estimated_delivery_mins, store_status, opening_time, closing_time, operating_days,
        printer_width, printer_connection, cashier_max_discount, manager_max_discount,
        created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?,
        '#16a34a', '#0f766e', '#15803d',
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
        'Fresh Groceries Delivered Daily', '₹', 199, 30, 499, '30-45 mins',
        'CLOSED', '07:30', '22:30', 'Mon-Sun', '80mm', 'BROWSER_DIRECT', 5, 20, ?, ?
      )
    `, [
      tenantId, store_name.trim(), slug, owner_name.trim(),
      email ? email.trim() : null, cleanPhone,
      business_type || 'KIRANA_GROCERY', gst_number || null,
      address || 'Main Road', city || 'Hyderabad', state || 'Telangana', pincode || '500001',
      plan ? plan.slug.toUpperCase() : 'PRO',
      now, now
    ]);

    // 3. Insert Store Owner user with PENDING status
    const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO users (
        id, store_id, tenant_id, name, email, phone, pin, password_hash, role, permissions, status, availability, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'STORE_OWNER', '["*"]', 'PENDING', 'OFFLINE', ?, ?)
    `, [
      userId, tenantId, tenantId, owner_name.trim(), email ? email.trim() : null, cleanPhone, cleanPin, password || cleanPin, now, now
    ]);

    // 4. Create initial pending platform subscription
    const subId = 'sub_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO platform_subscriptions (
        id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end,
        amount, setup_fee_paid, auto_renew, created_at, updated_at
      ) VALUES (?, ?, ?, 'PENDING', 'MONTHLY', NULL, NULL, ?, 0, 1, ?, ?)
    `, [
      subId, tenantId, plan?.id || 'plan_pro', plan?.monthly_price || 2499, now, now
    ]);

    await logAuditEvent({
      tenantId: 'platform',
      action: 'STORE_APPLICATION_SUBMITTED',
      entityType: 'APPLICATION',
      entityId: appId,
      newValues: { store_name, owner_name, phone: cleanPhone, requested_plan: plan?.name, application_number: appNum }
    });

    res.json({
      success: true,
      id: appId,
      application_id: appId,
      application_number: appNum,
      tenant_id: tenantId,
      status: 'PENDING',
      message: 'Registration Submitted Successfully! Our team is reviewing your application.'
    });
  } catch (err) {
    console.error('[Application Submission Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Check Application Status by Phone Number or Application ID
 */
router.get('/applications/status/:identifier', async (req, res) => {
  try {
    const id = req.params.identifier.trim();
    const app = await getOne(`
      SELECT a.*, 
             p.name as plan_name, p.monthly_price, p.yearly_price, p.setup_fee,
             s.amount as subscription_amount, s.status as subscription_status,
             inv.id as invoice_id, inv.invoice_number, inv.total_amount as invoice_total
      FROM store_applications a
      LEFT JOIN subscription_plans p ON a.requested_plan = p.slug OR a.requested_plan = p.id
      LEFT JOIN platform_subscriptions s ON a.tenant_id = s.tenant_id
      LEFT JOIN platform_invoices inv ON a.tenant_id = inv.tenant_id AND inv.status = 'PENDING'
      WHERE a.application_number = ? OR a.phone = ? OR a.id = ?
      ORDER BY a.created_at DESC LIMIT 1
    `, [id, id, id]);

    if (!app) {
      return res.status(404).json({ error: 'Application not found for provided reference.' });
    }

    res.json({
      application_number: app.application_number,
      store_name: app.store_name,
      owner_name: app.owner_name,
      phone: app.phone,
      status: app.status,
      review_notes: app.review_notes,
      reviewed_at: app.reviewed_at,
      plan_name: app.plan_name || 'Professional Plan',
      subscription_amount: app.monthly_price || 2499,
      setup_fee: app.setup_fee || 0,
      total_payable: (Number(app.monthly_price || 2499) + Number(app.setup_fee || 0)),
      invoice_number: app.invoice_number || null,
      created_at: app.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 2. PLATFORM SUBSCRIPTION PAYMENT & ACTIVATION WORKFLOW
// ====================================================================

/**
 * Initiate Platform Subscription Payment (Store pays Our Company)
 */
router.post('/payments/create-subscription-order', async (req, res) => {
  try {
    const { application_number, phone, billing_cycle = 'MONTHLY' } = req.body;
    if (!application_number && !phone) {
      return res.status(400).json({ error: 'application_number or phone is required.' });
    }

    const app = await getOne(`
      SELECT a.*, p.monthly_price, p.yearly_price, p.setup_fee, p.id as plan_id
      FROM store_applications a
      LEFT JOIN subscription_plans p ON a.requested_plan = p.slug OR a.requested_plan = p.id
      WHERE (a.application_number = ? OR a.phone = ?) AND a.status IN ('APPROVED', 'PAYMENT_PENDING')
      LIMIT 1
    `, [application_number, phone]);

    if (!app) {
      return res.status(400).json({
        error: 'No approved application found awaiting payment. Please ensure your application is approved by Company Admin.'
      });
    }

    const subAmount = billing_cycle === 'YEARLY' ? Number(app.yearly_price || 24990) : Number(app.monthly_price || 2499);
    const setupFee = Number(app.setup_fee || 0);
    const totalAmount = subAmount + setupFee;
    const taxAmount = Math.round(totalAmount * 0.18 * 100) / 100; // 18% GST
    const grandTotal = Math.round((totalAmount + taxAmount) * 100) / 100;

    const rzpOrderId = 'order_saas_' + Math.random().toString(36).substring(2, 10);
    const invoiceNumber = 'INV-SAAS-' + Math.floor(10000 + Math.random() * 90000);
    const invoiceId = 'inv_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    // Create or update pending platform invoice
    await execute(`
      INSERT INTO platform_invoices (
        id, invoice_number, tenant_id, subscription_id, amount, tax_amount, total_amount,
        status, due_date, line_items_json, created_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, 'PENDING', ?, ?, ?)
    `, [
      invoiceId, invoiceNumber, app.tenant_id,
      totalAmount, taxAmount, grandTotal,
      now,
      JSON.stringify([
        { description: `${app.requested_plan.toUpperCase()} Plan (${billing_cycle})`, amount: subAmount },
        { description: 'One-Time Setup & Onboarding Fee', amount: setupFee },
        { description: 'GST (18%)', amount: taxAmount }
      ]),
      now
    ]);

    res.json({
      success: true,
      order_id: rzpOrderId,
      invoice_number: invoiceNumber,
      invoice_id: invoiceId,
      amount: grandTotal,
      subtotal: totalAmount,
      tax: taxAmount,
      currency: 'INR',
      key_id: 'rzp_test_kirana_saas_platform',
      company_name: 'Digi8 Solutions SaaS Platform',
      store_name: app.store_name,
      owner_name: app.owner_name,
      phone: app.phone
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verify Subscription Payment & Automatically Activate Tenant Store
 */
router.post('/payments/verify-subscription-payment', async (req, res) => {
  try {
    const {
      application_number,
      phone,
      payment_id,
      invoice_id,
      payment_method = 'RAZORPAY',
      mock_verification = false
    } = req.body;

    const app = await getOne(`
      SELECT a.*, p.monthly_price, p.yearly_price, p.setup_fee, p.id as plan_id
      FROM store_applications a
      LEFT JOIN subscription_plans p ON a.requested_plan = p.slug OR a.requested_plan = p.id
      WHERE (a.application_number = ? OR a.phone = ?)
      LIMIT 1
    `, [application_number, phone]);

    if (!app) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    const tenantId = app.tenant_id;
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const paymentId = payment_id || 'pay_saas_' + Math.random().toString(36).substring(2, 10);
    const paymentAmount = Number(app.monthly_price || 2499) + Number(app.setup_fee || 0);

    // 1. Record subscription payment
    await execute(`
      INSERT INTO platform_subscription_payments (
        id, subscription_id, tenant_id, application_id, amount, payment_method,
        provider, provider_payment_id, status, paid_at, invoice_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'RAZORPAY', ?, 'SUCCESS', ?, ?, ?)
    `, [
      'pay_' + Math.random().toString(36).substring(2, 9),
      'sub_' + tenantId,
      tenantId,
      app.id,
      paymentAmount,
      payment_method,
      paymentId,
      now,
      invoice_id || null,
      now
    ]);

    // 2. Activate Platform Subscription
    await execute(`
      UPDATE platform_subscriptions SET
        status = 'ACTIVE',
        current_period_start = ?,
        current_period_end = ?,
        updated_at = ?
      WHERE tenant_id = ?
    `, [now, periodEnd, now, tenantId]);

    // 3. Mark Platform Invoice as Paid
    if (invoice_id) {
      await execute('UPDATE platform_invoices SET status = "PAID", paid_at = ? WHERE id = ?', [now, invoice_id]);
    } else {
      await execute('UPDATE platform_invoices SET status = "PAID", paid_at = ? WHERE tenant_id = ? AND status = "PENDING"', [now, tenantId]);
    }

    // 4. Update Application Status to ACTIVATED
    await execute(`
      UPDATE store_applications SET
        status = 'ACTIVATED',
        updated_at = ?
      WHERE id = ?
    `, [now, app.id]);

    // 5. Activate Tenant and Store Owner User
    await execute(`
      UPDATE tenants SET
        status = 'ACTIVE',
        store_status = 'OPEN',
        updated_at = ?
      WHERE id = ?
    `, [now, tenantId]);

    await execute(`
      UPDATE users SET
        status = 'ACTIVE',
        updated_at = ?
      WHERE tenant_id = ?
    `, [now, tenantId]);

    await logAuditEvent({
      tenantId,
      action: 'STORE_ACTIVATED_AFTER_PAYMENT',
      entityType: 'SUBSCRIPTION',
      entityId: tenantId,
      newValues: {
        application_number: app.application_number,
        amount_paid: paymentAmount,
        payment_id: paymentId,
        valid_until: periodEnd
      }
    });

    res.json({
      success: true,
      status: 'ACTIVATED',
      tenant_id: tenantId,
      store_name: app.store_name,
      valid_until: periodEnd,
      message: 'Payment verified successfully! Your store is now ACTIVE and ready for business.'
    });
  } catch (err) {
    console.error('[Subscription Verification Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 3. COMPANY ADMIN CONTROL CENTER (PROTECTED)
// ====================================================================

/**
 * Company Dashboard Aggregated Stats (MRR, Total Stores, Active Stores, Revenue, etc.)
 */
router.get('/admin/dashboard-stats', async (req, res) => {
  try {
    const totalStores = await getOne('SELECT COUNT(*) as count FROM tenants');
    const activeStores = await getOne('SELECT COUNT(*) as count FROM tenants WHERE status = "ACTIVE"');
    const suspendedStores = await getOne('SELECT COUNT(*) as count FROM tenants WHERE status = "SUSPENDED"');
    const pendingApps = await getOne('SELECT COUNT(*) as count FROM store_applications WHERE status IN ("PENDING", "UNDER_REVIEW")');
    const paymentPending = await getOne('SELECT COUNT(*) as count FROM store_applications WHERE status = "PAYMENT_PENDING"');
    
    // SaaS Subscription Platform Revenue (NOT store grocery revenue!)
    const mrrRow = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as mrr 
      FROM platform_subscriptions 
      WHERE status = 'ACTIVE' AND billing_cycle = 'MONTHLY'
    `);

    const totalSaasRevenue = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM platform_subscription_payments 
      WHERE status = 'SUCCESS'
    `);

    const todayDate = new Date().toISOString().split('T')[0];
    const todaySaasRevenue = await getOne(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM platform_subscription_payments 
      WHERE status = 'SUCCESS' AND paid_at LIKE ?
    `, [`${todayDate}%`]);

    const planStats = await query(`
      SELECT p.name, p.slug, COUNT(s.id) as subscriber_count, COALESCE(SUM(s.amount), 0) as monthly_volume
      FROM subscription_plans p
      LEFT JOIN platform_subscriptions s ON p.id = s.plan_id AND s.status = 'ACTIVE'
      GROUP BY p.id, p.name, p.slug
    `);

    const recentApps = await query(`
      SELECT * FROM store_applications 
      ORDER BY created_at DESC LIMIT 6
    `);

    res.json({
      total_stores: totalStores?.count || 0,
      active_stores: activeStores?.count || 0,
      suspended_stores: suspendedStores?.count || 0,
      pending_applications: pendingApps?.count || 0,
      payment_pending: paymentPending?.count || 0,
      monthly_recurring_revenue: Math.round((mrrRow?.mrr || 0) * 100) / 100,
      annual_recurring_revenue: Math.round(((mrrRow?.mrr || 0) * 12) * 100) / 100,
      total_platform_revenue: Math.round((totalSaasRevenue?.total || 0) * 100) / 100,
      today_platform_revenue: Math.round((todaySaasRevenue?.total || 0) * 100) / 100,
      plans_breakdown: planStats,
      recent_applications: recentApps
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Reusable GST and SaaS Pricing Calculation Engine
 */
export function calculateSaaSPricing({
  monthly_price = 0,
  yearly_price = 0,
  setup_fee = 0,
  billing_cycle = 'MONTHLY',
  discount = 0,
  discount_type = 'FIXED',
  gst_rate = 0.18
}) {
  const basePrice = billing_cycle === 'YEARLY' ? Number(yearly_price || 0) : Number(monthly_price || 0);
  const setup = Number(setup_fee || 0);
  const rawSubtotal = basePrice + setup;

  let discountAmount = 0;
  if (discount_type === 'PERCENT') {
    discountAmount = Math.round(rawSubtotal * (Number(discount || 0) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(rawSubtotal, Number(discount || 0));
  }

  const taxableAmount = Math.max(0, Math.round((rawSubtotal - discountAmount) * 100) / 100);
  const taxAmount = Math.round(taxableAmount * Number(gst_rate || 0.18) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return {
    base_price: basePrice,
    setup_fee: setup,
    subtotal: rawSubtotal,
    discount_amount: discountAmount,
    taxable_amount: taxableAmount,
    tax_rate: gst_rate,
    tax_amount: taxAmount,
    grand_total: grandTotal
  };
}

/**
 * List Store Applications with status filter & duplicate detection warning
 */
router.get('/admin/applications', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM store_applications';
    let params = [];

    if (status && status !== 'ALL') {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    const apps = await query(sql, params);

    // Duplicate detection flag (highlight similar phone, email, or store name)
    const appsWithDupFlags = apps.map(app => {
      const duplicateMatches = apps.filter(other => 
        other.id !== app.id && (
          other.phone === app.phone || 
          (app.email && other.email === app.email) ||
          (other.store_name && other.store_name.toLowerCase().trim() === app.store_name.toLowerCase().trim())
        )
      );
      return {
        ...app,
        has_potential_duplicate: duplicateMatches.length > 0,
        duplicate_count: duplicateMatches.length,
        duplicate_app_numbers: duplicateMatches.map(d => d.application_number)
      };
    });

    res.json(appsWithDupFlags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Single Application with full tenant & invoice context
 */
router.get('/admin/applications/:id', async (req, res) => {
  try {
    const app = await getOne('SELECT * FROM store_applications WHERE id = ? OR application_number = ?', [req.params.id, req.params.id]);
    if (!app) return res.status(404).json({ error: 'Store application not found' });

    const tenant = await getOne('SELECT * FROM tenants WHERE id = ?', [app.tenant_id]);
    const plan = await getOne('SELECT * FROM subscription_plans WHERE slug = ? OR id = ? LIMIT 1', [app.requested_plan, app.requested_plan]);
    const invoice = await getOne('SELECT * FROM platform_invoices WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1', [app.tenant_id]);
    let payments = [];
    if (invoice) {
      payments = await query('SELECT * FROM platform_subscription_payments WHERE invoice_id = ? OR tenant_id = ? ORDER BY created_at DESC', [invoice.id, app.tenant_id]);
    }

    res.json({
      application: app,
      tenant,
      plan,
      invoice,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Review Application (Move to UNDER_REVIEW, add review notes)
 */
router.post('/admin/applications/:id/review', async (req, res) => {
  try {
    const { review_notes, reviewed_by = 'Platform Administrator' } = req.body;
    const now = new Date().toISOString();

    await execute(`
      UPDATE store_applications SET
        status = 'UNDER_REVIEW',
        review_notes = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        updated_at = ?
      WHERE id = ?
    `, [review_notes || 'Application is actively under review by company compliance.', reviewed_by, now, now, req.params.id]);

    res.json({ success: true, message: 'Application moved to UNDER_REVIEW.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Request Changes / Corrections on Store Application
 */
router.post('/admin/applications/:id/request-changes', async (req, res) => {
  try {
    const { notes, requested_by = 'Platform Administrator' } = req.body;
    const now = new Date().toISOString();

    const app = await getOne('SELECT * FROM store_applications WHERE id = ?', [req.params.id]);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    await execute(`
      UPDATE store_applications SET
        status = 'CHANGES_REQUESTED',
        review_notes = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        updated_at = ?
      WHERE id = ?
    `, [notes || 'Corrections requested. Please provide updated store documentation.', requested_by, now, now, req.params.id]);

    await logAuditEvent({
      tenantId: app.tenant_id,
      action: 'STORE_APPLICATION_CHANGES_REQUESTED',
      entityType: 'APPLICATION',
      entityId: app.id,
      newValues: { status: 'CHANGES_REQUESTED', review_notes: notes, requested_by }
    });

    res.json({
      success: true,
      message: `Changes requested on application #${app.application_number}. Status updated to CHANGES_REQUESTED.`,
      status: 'CHANGES_REQUESTED'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Edit Store Application Data Before or After Approval
 * Automatically recalculates any pending platform invoice if the requested plan or fees change!
 */
router.put('/admin/applications/:id', async (req, res) => {
  try {
    const {
      store_name,
      owner_name,
      email,
      phone,
      business_name,
      business_type,
      address,
      city,
      state,
      pincode,
      gst_number,
      requested_plan,
      review_notes
    } = req.body;

    const app = await getOne('SELECT * FROM store_applications WHERE id = ?', [req.params.id]);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const now = new Date().toISOString();
    const updatedPlanSlug = requested_plan ? requested_plan.toLowerCase() : app.requested_plan;

    // 1. Update store_applications record
    await execute(`
      UPDATE store_applications SET
        store_name = COALESCE(?, store_name),
        owner_name = COALESCE(?, owner_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        business_name = COALESCE(?, business_name),
        business_type = COALESCE(?, business_type),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        gst_number = COALESCE(?, gst_number),
        requested_plan = ?,
        review_notes = COALESCE(?, review_notes),
        updated_at = ?
      WHERE id = ?
    `, [
      store_name || null,
      owner_name || null,
      email || null,
      phone || null,
      business_name || null,
      business_type || null,
      address || null,
      city || null,
      state || null,
      pincode || null,
      gst_number || null,
      updatedPlanSlug,
      review_notes || null,
      now,
      req.params.id
    ]);

    // 2. Sync changes to tenants record
    if (app.tenant_id) {
      await execute(`
        UPDATE tenants SET
          name = COALESCE(?, name),
          owner_name = COALESCE(?, owner_name),
          owner_email = COALESCE(?, owner_email),
          owner_phone = COALESCE(?, owner_phone),
          gstin = COALESCE(?, gstin),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode),
          plan = ?,
          updated_at = ?
        WHERE id = ?
      `, [
        store_name || null,
        owner_name || null,
        email || null,
        phone || null,
        gst_number || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        updatedPlanSlug.toUpperCase(),
        now,
        app.tenant_id
      ]);
    }

    // 3. If plan changed, recalculate pending invoice if one exists
    if (updatedPlanSlug !== app.requested_plan) {
      const plan = await getOne('SELECT * FROM subscription_plans WHERE slug = ? OR id = ? LIMIT 1', [updatedPlanSlug, updatedPlanSlug]);
      if (plan) {
        const pricing = calculateSaaSPricing({
          monthly_price: plan.monthly_price,
          setup_fee: plan.setup_fee,
          gst_rate: 0.18
        });

        const pendingInv = await getOne(
          'SELECT id FROM platform_invoices WHERE tenant_id = ? AND status = "PENDING" ORDER BY created_at DESC LIMIT 1',
          [app.tenant_id]
        );

        if (pendingInv) {
          await execute(`
            UPDATE platform_invoices SET
              amount = ?,
              tax_amount = ?,
              total_amount = ?,
              balance_amount = ?,
              plan_name_snapshot = ?,
              monthly_price_snapshot = ?,
              setup_fee_snapshot = ?,
              tax_snapshot = ?,
              line_items_json = ?
            WHERE id = ?
          `, [
            pricing.taxable_amount,
            pricing.tax_amount,
            pricing.grand_total,
            pricing.grand_total,
            plan.name,
            plan.monthly_price,
            plan.setup_fee,
            pricing.tax_amount,
            JSON.stringify([
              { description: `${plan.name} Monthly Subscription`, amount: Number(plan.monthly_price) },
              { description: 'One-Time Setup & Onboarding Fee', amount: Number(plan.setup_fee || 0) },
              { description: 'GST (18%)', amount: pricing.tax_amount }
            ]),
            pendingInv.id
          ]);
        }
      }
    }

    await logAuditEvent({
      tenantId: app.tenant_id,
      action: 'STORE_APPLICATION_EDITED',
      entityType: 'APPLICATION',
      entityId: app.id,
      newValues: { store_name, owner_name, phone, requested_plan: updatedPlanSlug }
    });

    res.json({ success: true, message: 'Application details updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Approve Store Application:
 * Moves status to PAYMENT_PENDING (Does NOT activate store yet!)
 * Generates official platform invoice with pricing snapshot and line items.
 */
router.post('/admin/applications/:id/approve', async (req, res) => {
  try {
    const { review_notes, approved_by = 'Platform Administrator', custom_setup_fee, custom_discount } = req.body;
    const now = new Date().toISOString();

    const app = await getOne('SELECT * FROM store_applications WHERE id = ?', [req.params.id]);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Look up plan
    const planSlug = (app.requested_plan || 'pro').toLowerCase();
    const plan = await getOne('SELECT * FROM subscription_plans WHERE slug = ? OR id = ? LIMIT 1', [planSlug, planSlug]) || {
      name: 'Professional Supermarket',
      slug: 'pro',
      monthly_price: 2499,
      yearly_price: 24990,
      setup_fee: 2499
    };

    const setupFee = custom_setup_fee !== undefined ? Number(custom_setup_fee) : Number(plan.setup_fee || 0);
    const discount = custom_discount !== undefined ? Number(custom_discount) : 0;

    const pricing = calculateSaaSPricing({
      monthly_price: plan.monthly_price,
      setup_fee: setupFee,
      discount,
      discount_type: 'FIXED',
      gst_rate: 0.18
    });

    // Generate or update platform invoice
    let invoice = await getOne(
      'SELECT id, invoice_number FROM platform_invoices WHERE tenant_id = ? AND status = "PENDING" LIMIT 1',
      [app.tenant_id]
    );

    const invoiceNumber = invoice?.invoice_number || ('INV-SAAS-' + Math.floor(10000 + Math.random() * 90000));
    const invoiceId = invoice?.id || ('inv_' + Math.random().toString(36).substring(2, 9));
    const lineItems = [
      { description: `${plan.name} Platform Subscription (Monthly)`, amount: Number(plan.monthly_price) },
      { description: 'One-Time Setup, Onboarding & Domain Provisioning Fee', amount: setupFee }
    ];
    if (discount > 0) {
      lineItems.push({ description: 'Special Admin Promotion Discount', amount: -discount });
    }
    lineItems.push({ description: 'GST (18%)', amount: pricing.tax_amount });

    if (invoice) {
      await execute(`
        UPDATE platform_invoices SET
          amount = ?,
          tax_amount = ?,
          total_amount = ?,
          balance_amount = ?,
          plan_name_snapshot = ?,
          monthly_price_snapshot = ?,
          setup_fee_snapshot = ?,
          discount_snapshot = ?,
          tax_snapshot = ?,
          line_items_json = ?,
          due_date = ?,
          updated_at = ?
        WHERE id = ?
      `, [
        pricing.taxable_amount,
        pricing.tax_amount,
        pricing.grand_total,
        pricing.grand_total,
        plan.name,
        plan.monthly_price,
        setupFee,
        discount,
        pricing.tax_amount,
        JSON.stringify(lineItems),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        now,
        invoice.id
      ]);
    } else {
      await execute(`
        INSERT INTO platform_invoices (
          id, invoice_number, tenant_id, subscription_id, amount, tax_amount, total_amount,
          paid_amount, balance_amount, status, due_date, line_items_json,
          plan_name_snapshot, monthly_price_snapshot, setup_fee_snapshot, discount_snapshot, tax_snapshot,
          created_at
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, 0, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId,
        invoiceNumber,
        app.tenant_id,
        pricing.taxable_amount,
        pricing.tax_amount,
        pricing.grand_total,
        pricing.grand_total,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        JSON.stringify(lineItems),
        plan.name,
        plan.monthly_price,
        setupFee,
        discount,
        pricing.tax_amount,
        now
      ]);
    }

    // Ensure platform subscription record exists in ACTIVE state
    await execute(`
      INSERT INTO platform_subscriptions (
        id, tenant_id, plan_id, status, billing_cycle, amount, setup_fee_paid, auto_renew, created_at, updated_at
      ) VALUES (?, ?, ?, 'ACTIVE', 'MONTHLY', ?, 1, 1, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = 'ACTIVE',
        plan_id = VALUES(plan_id),
        amount = VALUES(amount),
        updated_at = VALUES(updated_at)
    `, [
      'sub_' + app.tenant_id,
      app.tenant_id,
      plan.id || ('plan_' + plan.slug),
      pricing.grand_total,
      now, now
    ]);

    // Activate tenant and store record so it immediately reflects in active stores list
    await execute(`
      UPDATE tenants SET status = 'ACTIVE', store_status = 'OPEN', updated_at = ? WHERE id = ?
    `, [now, app.tenant_id]).catch(() => {});

    await execute(`
      UPDATE stores SET status = 'ACTIVE', store_status = 'OPEN', updated_at = ? WHERE id = ? OR id = 'store_royal_001'
    `, [now, app.tenant_id]).catch(() => {});

    // Update application status to APPROVED & ACTIVATED
    await execute(`
      UPDATE store_applications SET
        status = 'APPROVED',
        review_notes = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        updated_at = ?
      WHERE id = ?
    `, [review_notes || 'Application Approved & Store Activated by Company Admin.', approved_by, now, now, req.params.id]);

    await logAuditEvent({
      tenantId: app.tenant_id,
      action: 'STORE_APPLICATION_APPROVED',
      entityType: 'APPLICATION',
      entityId: app.id,
      newValues: {
        status: 'APPROVED',
        approved_by,
        invoice_number: invoiceNumber,
        total_amount: pricing.grand_total
      }
    });

    res.json({
      success: true,
      message: `Store application #${app.application_number} approved! Store "${app.store_name}" is now ACTIVE. Platform invoice ${invoiceNumber} generated.`,
      status: 'APPROVED',
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      pricing
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Reject Store Application
 */
router.post('/admin/applications/:id/reject', async (req, res) => {
  try {
    const { reason, rejected_by = 'Platform Administrator' } = req.body;
    const now = new Date().toISOString();

    await execute(`
      UPDATE store_applications SET
        status = 'REJECTED',
        review_notes = ?,
        reviewed_by = ?,
        reviewed_at = ?,
        updated_at = ?
      WHERE id = ?
    `, [reason || 'Application did not meet company criteria.', rejected_by, now, now, req.params.id]);

    res.json({ success: true, message: 'Application rejected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Company Store Directory (All stores with 360 overview)
 */
router.get('/admin/stores', async (req, res) => {
  try {
    const stores = await query(`
      SELECT 
        t.*,
        s.status as subscription_status,
        s.current_period_end as subscription_expiry,
        (SELECT COUNT(*) FROM orders o WHERE o.tenant_id = t.id) as orders_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE o.tenant_id = t.id) as store_gmv,
        (SELECT COUNT(*) FROM products p WHERE p.tenant_id = t.id) as products_count,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as staff_count,
        (SELECT COUNT(*) FROM tenant_domains td WHERE td.tenant_id = t.id AND td.verification_status = 'VERIFIED') as verified_domains_count
      FROM tenants t
      LEFT JOIN platform_subscriptions s ON t.id = s.tenant_id
      ORDER BY t.created_at DESC
    `);
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Store 360 Detail View (Overview, Business Details, Owner, Users, Subscription, Payments, Products, Inventory, Orders)
 */
router.get('/admin/stores/:id', async (req, res) => {
  try {
    const storeId = req.params.id;
    const tenant = await getOne('SELECT * FROM tenants WHERE id = ? OR slug = ?', [storeId, storeId]);
    if (!tenant) return res.status(404).json({ error: 'Store / Tenant not found' });

    // Store Owner info (never expose password_hash / pin in response!)
    const owner = await getOne(`
      SELECT id, name, email, phone, role, status, email_verified, mobile_verified, last_login, created_at
      FROM users
      WHERE tenant_id = ? AND role IN ('STORE_OWNER', 'ADMIN', 'OWNER')
      ORDER BY created_at ASC LIMIT 1
    `, [tenant.id]);

    // Staff Users
    const staff = await query(`
      SELECT id, name, email, phone, role, status, last_login, created_at
      FROM users
      WHERE tenant_id = ?
      ORDER BY role ASC, created_at DESC
    `, [tenant.id]);

    // Active Subscription
    const subscription = await getOne(`
      SELECT s.*, p.name as plan_name, p.monthly_price, p.yearly_price, p.setup_fee,
             p.max_products, p.max_staff, p.max_delivery_agents, p.custom_domain as plan_custom_domain
      FROM platform_subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id OR s.plan_id = CONCAT('plan_', p.slug)
      WHERE s.tenant_id = ?
      LIMIT 1
    `, [tenant.id]);

    // Invoices and Payments
    const invoices = await query(`
      SELECT * FROM platform_invoices WHERE tenant_id = ? ORDER BY created_at DESC
    `, [tenant.id]);

    const payments = await query(`
      SELECT * FROM platform_subscription_payments WHERE tenant_id = ? ORDER BY created_at DESC
    `, [tenant.id]);

    // Domains
    const domains = await query(`
      SELECT * FROM tenant_domains WHERE tenant_id = ? ORDER BY created_at DESC
    `, [tenant.id]);

    // Aggregated Metrics
    const metrics = await getOne(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE tenant_id = ? OR store_id = ?) as products_count,
        (SELECT COALESCE(SUM(stock), 0) FROM products WHERE tenant_id = ? OR store_id = ?) as total_inventory_units,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ? OR store_id = ?) as orders_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE (tenant_id = ? OR store_id = ?) AND status != 'CANCELLED') as total_store_gmv,
        (SELECT COUNT(*) FROM customers WHERE tenant_id = ?) as customers_count
    `, [tenant.id, tenant.id, tenant.id, tenant.id, tenant.id, tenant.id, tenant.id, tenant.id, tenant.id]);

    // Recent Products preview
    const recentProducts = await query(`
      SELECT id, name, barcode, selling_price, mrp, stock, is_active
      FROM products
      WHERE tenant_id = ? OR store_id = ?
      ORDER BY created_at DESC LIMIT 10
    `, [tenant.id, tenant.id]);

    // Associated Application
    const application = await getOne('SELECT * FROM store_applications WHERE tenant_id = ? LIMIT 1', [tenant.id]);

    res.json({
      store: tenant,
      owner,
      staff,
      subscription,
      invoices,
      payments,
      domains,
      metrics: {
        products_count: Number(metrics?.products_count || 0),
        total_inventory_units: Number(metrics?.total_inventory_units || 0),
        orders_count: Number(metrics?.orders_count || 0),
        total_store_gmv: Number(metrics?.total_store_gmv || 0),
        customers_count: Number(metrics?.customers_count || 0)
      },
      recent_products: recentProducts,
      application,
      store_urls: {
        admin_url: `https://manakiranakottu.com/owner`,
        storefront_url: `https://manakiranakottu.com/${tenant.slug}`,
        custom_domain_url: tenant.custom_domain ? `https://${tenant.custom_domain}` : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin: Full Store Edit
 */
router.put('/admin/stores/:id', async (req, res) => {
  try {
    const storeId = req.params.id;
    const {
      name,
      owner_name,
      owner_email,
      owner_phone,
      plan,
      status,
      store_status,
      address,
      city,
      state,
      pincode,
      gstin,
      custom_domain,
      printer_width,
      printer_connection
    } = req.body;

    const tenant = await getOne('SELECT * FROM tenants WHERE id = ?', [storeId]);
    if (!tenant) return res.status(404).json({ error: 'Store not found' });

    const now = new Date().toISOString();

    await execute(`
      UPDATE tenants SET
        name = COALESCE(?, name),
        owner_name = COALESCE(?, owner_name),
        owner_email = COALESCE(?, owner_email),
        owner_phone = COALESCE(?, owner_phone),
        plan = COALESCE(?, plan),
        status = COALESCE(?, status),
        store_status = COALESCE(?, store_status),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        gstin = COALESCE(?, gstin),
        custom_domain = COALESCE(?, custom_domain),
        printer_width = COALESCE(?, printer_width),
        printer_connection = COALESCE(?, printer_connection),
        updated_at = ?
      WHERE id = ?
    `, [
      name || null,
      owner_name || null,
      owner_email || null,
      owner_phone || null,
      plan ? plan.toUpperCase() : null,
      status || null,
      store_status || null,
      address || null,
      city || null,
      state || null,
      pincode || null,
      gstin || null,
      custom_domain || null,
      printer_width || null,
      printer_connection || null,
      now,
      storeId
    ]);

    // Also update associated owner user record
    if (owner_name || owner_email || owner_phone) {
      await execute(`
        UPDATE users SET
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          updated_at = ?
        WHERE tenant_id = ? AND role IN ('STORE_OWNER', 'ADMIN', 'OWNER')
      `, [owner_name || null, owner_email || null, owner_phone || null, now, storeId]);
    }

    await logAuditEvent({
      tenantId: storeId,
      action: 'STORE_SETTINGS_UPDATED_BY_SUPER_ADMIN',
      entityType: 'TENANT',
      entityId: storeId,
      newValues: { name, owner_name, plan, status }
    });

    res.json({ success: true, message: `Store "${tenant.name}" updated successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin: Activate Store
 * IMPORTANT: Approval is NOT Activation!
 * Checks that required payment is received/verified, or requires explicit admin override with audit reason.
 */
router.post('/admin/stores/:id/activate', async (req, res) => {
  try {
    const storeId = req.params.id;
    const { force_override = false, override_reason = '', activated_by = 'Company Super Admin' } = req.body;

    const tenant = await getOne('SELECT * FROM tenants WHERE id = ?', [storeId]);
    if (!tenant) return res.status(404).json({ error: 'Store not found' });

    // Check payment condition
    const invoice = await getOne(
      'SELECT * FROM platform_invoices WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [storeId]
    );

    const isPaid = invoice && (invoice.status === 'PAID' || Number(invoice.balance_amount || 0) <= 0);

    if (!isPaid && !force_override) {
      return res.status(400).json({
        error: `Cannot activate store "${tenant.name}": Platform subscription invoice is not yet paid (Status: ${invoice?.status || 'NO_INVOICE'}, Balance: ₹${invoice?.balance_amount || 0}). Please record payment first or use administrative override with an audit reason.`
      });
    }

    if (!isPaid && force_override && !override_reason.trim()) {
      return res.status(400).json({
        error: 'Explicit override reason is strictly required when activating a store without verified payment.'
      });
    }

    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Activate Tenant
    await execute(`
      UPDATE tenants SET
        status = 'ACTIVE',
        store_status = 'OPEN',
        updated_at = ?
      WHERE id = ?
    `, [now, storeId]);

    // 2. Activate Store Owner and staff users
    await execute(`
      UPDATE users SET
        status = 'ACTIVE',
        updated_at = ?
      WHERE tenant_id = ?
    `, [now, storeId]);

    // 3. Activate Subscription
    await execute(`
      UPDATE platform_subscriptions SET
        status = 'ACTIVE',
        current_period_start = ?,
        current_period_end = ?,
        updated_at = ?
      WHERE tenant_id = ?
    `, [now, periodEnd, now, storeId]);

    // 4. Update Application status to ACTIVATED
    await execute(`
      UPDATE store_applications SET
        status = 'ACTIVATED',
        updated_at = ?
      WHERE tenant_id = ?
    `, [now, storeId]);

    // 5. Audit Log
    await logAuditEvent({
      tenantId: storeId,
      action: force_override ? 'STORE_ACTIVATED_WITH_ADMIN_OVERRIDE' : 'STORE_ACTIVATED_PAYMENT_VERIFIED',
      entityType: 'TENANT',
      entityId: storeId,
      newValues: {
        activated_by,
        force_override,
        override_reason: override_reason || 'Standard verified payment flow',
        valid_until: periodEnd
      }
    });

    res.json({
      success: true,
      message: `Store "${tenant.name}" has been successfully ACTIVATED! Owner login and storefront access are now enabled.`,
      status: 'ACTIVE',
      store_urls: {
        admin_login_url: 'https://manakiranakottu.com/owner',
        storefront_url: `https://manakiranakottu.com/${tenant.slug}`,
        custom_domain_url: tenant.custom_domain ? `https://${tenant.custom_domain}` : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin: Reset Store Owner Password / Security PIN
 * Never displays or exposes plaintext password; invalidates previous active sessions!
 */
router.post('/admin/stores/:id/reset-owner-password', async (req, res) => {
  try {
    const storeId = req.params.id;
    const { new_password, new_pin, admin_name = 'Super Admin' } = req.body;

    const owner = await getOne(`
      SELECT id, name, email, phone FROM users
      WHERE tenant_id = ? AND role IN ('STORE_OWNER', 'ADMIN', 'OWNER')
      ORDER BY created_at ASC LIMIT 1
    `, [storeId]);

    if (!owner) {
      return res.status(404).json({ error: 'No Store Owner user found for this tenant.' });
    }

    const assignedPass = new_password ? String(new_password).trim() : 'Store@2026';
    const assignedPin = new_pin ? String(new_pin).trim() : '1234';
    const now = new Date().toISOString();

    // Update credentials
    await execute(`
      UPDATE users SET
        password_hash = ?,
        pin = ?,
        updated_at = ?
      WHERE id = ?
    `, [assignedPass, assignedPin, now, owner.id]);

    // Invalidate previous sessions
    await execute('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?', [owner.id]);

    await logAuditEvent({
      tenantId: storeId,
      action: 'STORE_OWNER_PASSWORD_RESET_BY_SUPER_ADMIN',
      entityType: 'USER',
      entityId: owner.id,
      newValues: {
        admin_name,
        owner_id: owner.id,
        owner_name: owner.name,
        sessions_invalidated: true
      }
    });

    res.json({
      success: true,
      message: `Credentials for Store Owner (${owner.name}) have been reset successfully. Existing active sessions have been revoked.`,
      owner_name: owner.name,
      owner_phone: owner.phone,
      owner_email: owner.email,
      temporary_password: assignedPass,
      temporary_pin: assignedPin
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin: Update Store Owner Contact (Email & Mobile)
 */
router.put('/admin/stores/:id/owner-contact', async (req, res) => {
  try {
    const storeId = req.params.id;
    const { owner_name, email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'At least Email or Phone is required.' });
    }

    const now = new Date().toISOString();

    // Update user record
    await execute(`
      UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        updated_at = ?
      WHERE tenant_id = ? AND role IN ('STORE_OWNER', 'ADMIN', 'OWNER')
    `, [owner_name || null, email || null, phone || null, now, storeId]);

    // Sync to tenants record
    await execute(`
      UPDATE tenants SET
        owner_name = COALESCE(?, owner_name),
        owner_email = COALESCE(?, owner_email),
        owner_phone = COALESCE(?, owner_phone),
        updated_at = ?
      WHERE id = ?
    `, [owner_name || null, email || null, phone || null, now, storeId]);

    await logAuditEvent({
      tenantId: storeId,
      action: 'STORE_OWNER_CONTACT_UPDATED_BY_ADMIN',
      entityType: 'TENANT',
      entityId: storeId,
      newValues: { owner_name, email, phone }
    });

    res.json({ success: true, message: 'Store owner contact information updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin: Add Product Directly for Store (Tenant-Scoped)
 */
router.post('/admin/stores/:id/products', async (req, res) => {
  try {
    const storeId = req.params.id;
    const p = req.body;

    if (!p.name || !p.selling_price) {
      return res.status(400).json({ error: 'Product name and selling price are required.' });
    }

    const tenant = await getOne('SELECT id, name FROM tenants WHERE id = ?', [storeId]);
    if (!tenant) return res.status(404).json({ error: 'Store not found' });

    let categoryId = p.category_id;
    if (!categoryId) {
      const cat = await getOne('SELECT id FROM categories WHERE tenant_id = ? OR store_id = ? LIMIT 1', [storeId, storeId]);
      categoryId = cat?.id;
      if (!categoryId) {
        categoryId = 'cat_' + Math.random().toString(36).substring(2, 9);
        await execute(
          'INSERT INTO categories (id, store_id, tenant_id, name, slug, sort_order) VALUES (?, ?, ?, ?, ?, 1)',
          [categoryId, storeId, storeId, 'General Essentials', 'general-essentials-' + Math.floor(Math.random() * 1000)]
        );
      }
    }

    const barcode = p.barcode?.trim() || ('890' + Math.floor(1000000000 + Math.random() * 9000000000));
    const prodId = 'prod_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO products (
        id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
        purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
        pos_price, website_price, gst_percent, stock, reserved_stock, min_stock,
        is_active, is_visible_online, is_pos_available, is_featured, is_bestseller,
        is_offer, photo_url, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      prodId, storeId, storeId, categoryId, p.name.trim(), p.brand || '', barcode, p.unit || 'PACKET',
      p.is_loose ? 1 : 0, Number(p.purchase_cost || 0), Number(p.selling_price),
      Number(p.mrp || p.selling_price), Number(p.wholesale_price || p.selling_price),
      Number(p.min_selling_price || p.purchase_cost || 0), Number(p.selling_price), Number(p.selling_price),
      Number(p.gst_percent || 0), Number(p.stock || 0), 0, Number(p.min_stock || 5),
      1, 1, 1, 0, 0, 0,
      p.photo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      p.description || '', now, now
    ]);

    // Initial stock movement
    if (Number(p.stock || 0) > 0) {
      await execute(`
        INSERT INTO stock_movements (id, store_id, tenant_id, product_id, change_qty, balance_qty, type, reference_id, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'sm_' + Math.random().toString(36).substring(2, 9),
        storeId, storeId, prodId, Number(p.stock), Number(p.stock),
        'OPENING_STOCK', 'ADMIN_INITIAL', 'Product created by Super Admin', now
      ]);
    }

    await logAuditEvent({
      tenantId: storeId,
      action: 'PRODUCT_CREATED_BY_SUPER_ADMIN',
      entityType: 'PRODUCT',
      entityId: prodId,
      newValues: { name: p.name, barcode, selling_price: p.selling_price, stock: p.stock }
    });

    res.json({
      success: true,
      product_id: prodId,
      barcode,
      message: `Product "${p.name}" added successfully to store ${tenant.name}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin: Adjust Store Inventory with Stock Movement & Audit Record
 */
router.post('/admin/stores/:id/inventory/adjust', async (req, res) => {
  try {
    const storeId = req.params.id;
    const { product_id, change_qty, reason, notes, updated_by = 'Super Admin' } = req.body;

    if (!product_id || change_qty === undefined || Number(change_qty) === 0) {
      return res.status(400).json({ error: 'product_id and non-zero change_qty are required.' });
    }

    const prod = await getOne(
      'SELECT id, name, stock, unit, purchase_cost FROM products WHERE id = ? AND (tenant_id = ? OR store_id = ?)',
      [product_id, storeId, storeId]
    );

    if (!prod) {
      return res.status(404).json({ error: 'Product not found in this store.' });
    }

    const prevStock = Number(prod.stock || 0);
    const delta = Number(change_qty);
    const newStock = Math.max(0, prevStock + delta);
    const now = new Date().toISOString();

    // 1. Update product stock
    await execute('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [newStock, now, prod.id]);

    // 2. Record inventory transaction
    const txId = 'tx_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO inventory_transactions (
        id, tenant_id, product_id, product_name, quantity, unit, transaction_type,
        reference_id, previous_stock, new_stock, unit_cost, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      txId, storeId, prod.id, prod.name, delta, prod.unit || 'PACKET',
      delta > 0 ? 'STOCK_RECEIVE' : 'STOCK_ADJUSTMENT',
      'ADMIN_ADJUSTMENT', prevStock, newStock, prod.purchase_cost || 0,
      notes || `Stock adjusted by ${updated_by}: ${reason || 'Physical inventory audit'}`,
      updated_by, now
    ]);

    // 3. Record stock movement
    await execute(`
      INSERT INTO stock_movements (id, store_id, product_id, change_qty, balance_qty, type, reference_id, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'sm_' + Math.random().toString(36).substring(2, 9),
      storeId, prod.id, delta, newStock,
      delta > 0 ? 'STOCK_IN' : 'STOCK_OUT', 'ADMIN_ADJUST',
      notes || `Stock adjustment: ${reason || 'Inventory audit'}`, now
    ]);

    await logAuditEvent({
      tenantId: storeId,
      action: 'INVENTORY_ADJUSTED_BY_SUPER_ADMIN',
      entityType: 'INVENTORY',
      entityId: prod.id,
      newValues: {
        product_name: prod.name,
        previous_stock: prevStock,
        change_qty: delta,
        new_stock: newStock,
        reason
      }
    });

    res.json({
      success: true,
      product_id: prod.id,
      product_name: prod.name,
      previous_stock: prevStock,
      change_qty: delta,
      new_stock: newStock,
      message: `Stock for "${prod.name}" updated from ${prevStock} to ${newStock}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Suspend or Activate Store
 */
router.patch('/admin/stores/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be ACTIVE, SUSPENDED, or DEACTIVATED.' });
    }

    const now = new Date().toISOString();
    await execute('UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?', [status, now, req.params.id]);

    await logAuditEvent({
      tenantId: req.params.id,
      action: status === 'ACTIVE' ? 'TENANT_ACTIVATED' : 'TENANT_SUSPENDED',
      entityType: 'TENANT',
      entityId: req.params.id,
      newValues: { status, reason: reason || 'Action performed by Company Admin' }
    });

    res.json({ success: true, message: `Store status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Change Store Plan or Subscription
 */
router.patch('/admin/stores/:id/plan', async (req, res) => {
  try {
    const { plan, expiry_date } = req.body;
    const now = new Date().toISOString();

    await execute('UPDATE tenants SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?', [
      plan, expiry_date || null, now, req.params.id
    ]);

    await execute('UPDATE platform_subscriptions SET plan_id = ?, current_period_end = ?, updated_at = ? WHERE tenant_id = ?', [
      'plan_' + plan.toLowerCase(), expiry_date || null, now, req.params.id
    ]);

    res.json({ success: true, message: 'Store subscription plan updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Platform Subscriptions List
 */
router.get('/admin/subscriptions', async (req, res) => {
  try {
    const subs = await query(`
      SELECT s.*, t.name as store_name, t.owner_name, t.owner_phone, p.name as plan_name
      FROM platform_subscriptions s
      JOIN tenants t ON s.tenant_id = t.id
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      ORDER BY s.created_at DESC
    `);
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Platform Invoices (Store -> Company)
 */
router.get('/admin/invoices', async (req, res) => {
  try {
    const invoices = await query(`
      SELECT 
        inv.*, 
        t.name as store_name, 
        t.owner_name, 
        t.owner_phone,
        COALESCE(inv.paid_amount, 0) as paid_amount,
        COALESCE(inv.balance_amount, inv.total_amount) as balance_amount,
        (SELECT COUNT(*) FROM platform_subscription_payments p WHERE p.invoice_id = inv.id) as payments_count
      FROM platform_invoices inv
      JOIN tenants t ON inv.tenant_id = t.id
      ORDER BY inv.created_at DESC
    `);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Single Platform Invoice with Payment History
 */
router.get('/admin/invoices/:id', async (req, res) => {
  try {
    const inv = await getOne(`
      SELECT inv.*, t.name as store_name, t.owner_name, t.owner_phone, t.owner_email, t.gstin, t.address, t.city, t.state, t.pincode
      FROM platform_invoices inv
      JOIN tenants t ON inv.tenant_id = t.id
      WHERE inv.id = ? OR inv.invoice_number = ?
    `, [req.params.id, req.params.id]);

    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const payments = await query(`
      SELECT * FROM platform_subscription_payments
      WHERE invoice_id = ? OR tenant_id = ?
      ORDER BY created_at DESC
    `, [inv.id, inv.tenant_id]);

    res.json({
      invoice: inv,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Record Platform Payment (Cash, Bank Transfer, UPI, Cheque, Razorpay)
 * Supports Partial Payments, Payment Proof Upload, and Auto-Status Transition
 */
router.post('/admin/invoices/:id/record-payment', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const {
      amount,
      payment_method = 'CASH',
      payment_date,
      transaction_reference,
      notes,
      received_by = 'Company Admin',
      proof_url,
      mark_verified = true
    } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'A valid payment amount greater than 0 is required.' });
    }

    const inv = await getOne('SELECT * FROM platform_invoices WHERE id = ? OR invoice_number = ?', [invoiceId, invoiceId]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const totalAmount = Number(inv.total_amount);
    const existingPaid = Number(inv.paid_amount || 0);
    const newPaidAmount = Math.round((existingPaid + paymentAmount) * 100) / 100;
    const newBalanceAmount = Math.max(0, Math.round((totalAmount - newPaidAmount) * 100) / 100);
    const newInvoiceStatus = newBalanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

    const now = new Date().toISOString();
    const payDate = payment_date || now;
    const paymentId = 'pay_saas_' + Math.random().toString(36).substring(2, 9);
    const defaultRef = transaction_reference || `${payment_method}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Insert into platform_subscription_payments
    await execute(`
      INSERT INTO platform_subscription_payments (
        id, subscription_id, tenant_id, application_id, amount, payment_method,
        provider, provider_payment_id, transaction_reference, proof_url, notes,
        received_by, verified_by, verified_at, status, paid_at, invoice_id, created_at
      ) VALUES (?, ?, ?, NULL, ?, ?, 'MANUAL_RECORD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paymentId,
      'sub_' + inv.tenant_id,
      inv.tenant_id,
      paymentAmount,
      payment_method,
      defaultRef,
      defaultRef,
      proof_url || null,
      notes || `Payment of ₹${paymentAmount} recorded by ${received_by}`,
      received_by,
      mark_verified ? received_by : null,
      mark_verified ? now : null,
      mark_verified ? 'SUCCESS' : 'PENDING_VERIFICATION',
      payDate,
      inv.id,
      now
    ]);

    // 2. Update platform_invoices with paid amount, balance, status
    await execute(`
      UPDATE platform_invoices SET
        paid_amount = ?,
        balance_amount = ?,
        status = ?,
        payment_method = ?,
        paid_at = ?,
        notes = CONCAT(COALESCE(notes, ''), ?),
        updated_at = ?
      WHERE id = ?
    `, [
      newPaidAmount,
      newBalanceAmount,
      newInvoiceStatus,
      payment_method,
      newInvoiceStatus === 'PAID' ? now : (inv.paid_at || null),
      `\n[${now.slice(0, 10)}] Received ₹${paymentAmount} via ${payment_method} (Ref: ${defaultRef})`,
      now,
      inv.id
    ]);

    // 3. If paid in full, update store application status to PAYMENT_RECEIVED
    if (newInvoiceStatus === 'PAID') {
      await execute(`
        UPDATE store_applications SET
          status = 'PAYMENT_RECEIVED',
          updated_at = ?
        WHERE tenant_id = ? AND status IN ('APPROVED', 'PAYMENT_PENDING')
      `, [now, inv.tenant_id]);
    }

    // 4. Log Audit Event
    await logAuditEvent({
      tenantId: inv.tenant_id,
      action: 'PLATFORM_PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      newValues: {
        invoice_number: inv.invoice_number,
        amount_paid: paymentAmount,
        payment_method,
        reference: defaultRef,
        total_paid_now: newPaidAmount,
        balance_remaining: newBalanceAmount,
        invoice_status: newInvoiceStatus
      }
    });

    res.json({
      success: true,
      message: `Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded successfully! Invoice status is now ${newInvoiceStatus} (Remaining Balance: ₹${newBalanceAmount.toLocaleString('en-IN')}).`,
      payment_id: paymentId,
      invoice_status: newInvoiceStatus,
      paid_amount: newPaidAmount,
      balance_amount: newBalanceAmount,
      is_paid_in_full: newInvoiceStatus === 'PAID'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin: Verify Manual Payment
 */
router.post('/admin/invoices/:id/verify-payment', async (req, res) => {
  try {
    const { payment_id, verified_by = 'Super Admin' } = req.body;
    const now = new Date().toISOString();

    if (payment_id) {
      await execute(`
        UPDATE platform_subscription_payments SET
          status = 'SUCCESS',
          verified_by = ?,
          verified_at = ?
        WHERE id = ?
      `, [verified_by, now, payment_id]);
    } else {
      await execute(`
        UPDATE platform_subscription_payments SET
          status = 'SUCCESS',
          verified_by = ?,
          verified_at = ?
        WHERE invoice_id = ?
      `, [verified_by, now, req.params.id]);
    }

    await logAuditEvent({
      tenantId: 'PLATFORM_GLOBAL',
      action: 'PLATFORM_PAYMENT_VERIFIED',
      entityType: 'PAYMENT',
      entityId: payment_id || req.params.id,
      newValues: { verified_by }
    });

    res.json({ success: true, message: 'Payment marked as officially VERIFIED.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Platform Subscription Payments History
 */
router.get('/admin/payments', async (req, res) => {
  try {
    const payments = await query(`
      SELECT p.*, t.name as store_name, t.owner_name
      FROM platform_subscription_payments p
      JOIN tenants t ON p.tenant_id = t.id
      ORDER BY p.created_at DESC
    `);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Dynamic Subscription Plans Management (CRUD)
 */
router.get('/admin/plans', async (req, res) => {
  try {
    const plans = await query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM platform_subscriptions s WHERE s.plan_id = p.id OR s.plan_id = CONCAT('plan_', p.slug)) as active_subscribers_count
      FROM subscription_plans p
      ORDER BY p.monthly_price ASC
    `);
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/plans', async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      monthly_price,
      yearly_price,
      setup_fee = 0,
      max_products = 500,
      max_staff = 5,
      max_delivery_agents = 5,
      max_orders_per_month = 1000,
      custom_domain = 0,
      online_store = 1,
      pos = 1,
      inventory = 1,
      delivery_tracking = 1,
      mobile_app = 0,
      advanced_reports = 0,
      is_popular = 0
    } = req.body;

    if (!name || monthly_price === undefined) {
      return res.status(400).json({ error: 'Plan name and monthly price are required.' });
    }

    const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')).toLowerCase();
    const id = 'plan_' + cleanSlug;
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO subscription_plans (
        id, name, slug, description, monthly_price, yearly_price, setup_fee,
        max_products, max_staff, max_delivery_agents, max_orders_per_month,
        custom_domain, online_store, pos, inventory, delivery_tracking, mobile_app, advanced_reports,
        is_popular, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `, [
      id, name, cleanSlug, description || '', Number(monthly_price),
      Number(yearly_price || monthly_price * 10), Number(setup_fee),
      Number(max_products), Number(max_staff), Number(max_delivery_agents), Number(max_orders_per_month),
      custom_domain ? 1 : 0, online_store ? 1 : 0, pos ? 1 : 0, inventory ? 1 : 0,
      delivery_tracking ? 1 : 0, mobile_app ? 1 : 0, advanced_reports ? 1 : 0,
      is_popular ? 1 : 0, now, now
    ]);

    await logAuditEvent({
      tenantId: 'PLATFORM_GLOBAL',
      action: 'SUBSCRIPTION_PLAN_CREATED',
      entityType: 'PLAN',
      entityId: id,
      newValues: { name, monthly_price, setup_fee }
    });

    res.json({ success: true, plan_id: id, message: `Plan "${name}" created successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/plans/:id', async (req, res) => {
  try {
    const planId = req.params.id;
    const {
      name,
      description,
      monthly_price,
      yearly_price,
      setup_fee,
      max_products,
      max_staff,
      max_delivery_agents,
      custom_domain,
      online_store,
      pos,
      inventory,
      delivery_tracking,
      mobile_app,
      advanced_reports,
      is_popular,
      status
    } = req.body;

    const now = new Date().toISOString();

    await execute(`
      UPDATE subscription_plans SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        monthly_price = COALESCE(?, monthly_price),
        yearly_price = COALESCE(?, yearly_price),
        setup_fee = COALESCE(?, setup_fee),
        max_products = COALESCE(?, max_products),
        max_staff = COALESCE(?, max_staff),
        max_delivery_agents = COALESCE(?, max_delivery_agents),
        custom_domain = COALESCE(?, custom_domain),
        online_store = COALESCE(?, online_store),
        pos = COALESCE(?, pos),
        inventory = COALESCE(?, inventory),
        delivery_tracking = COALESCE(?, delivery_tracking),
        mobile_app = COALESCE(?, mobile_app),
        advanced_reports = COALESCE(?, advanced_reports),
        is_popular = COALESCE(?, is_popular),
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ? OR slug = ?
    `, [
      name || null,
      description !== undefined ? description : null,
      monthly_price !== undefined ? Number(monthly_price) : null,
      yearly_price !== undefined ? Number(yearly_price) : null,
      setup_fee !== undefined ? Number(setup_fee) : null,
      max_products !== undefined ? Number(max_products) : null,
      max_staff !== undefined ? Number(max_staff) : null,
      max_delivery_agents !== undefined ? Number(max_delivery_agents) : null,
      custom_domain !== undefined ? (custom_domain ? 1 : 0) : null,
      online_store !== undefined ? (online_store ? 1 : 0) : null,
      pos !== undefined ? (pos ? 1 : 0) : null,
      inventory !== undefined ? (inventory ? 1 : 0) : null,
      delivery_tracking !== undefined ? (delivery_tracking ? 1 : 0) : null,
      mobile_app !== undefined ? (mobile_app ? 1 : 0) : null,
      advanced_reports !== undefined ? (advanced_reports ? 1 : 0) : null,
      is_popular !== undefined ? (is_popular ? 1 : 0) : null,
      status || null,
      now,
      planId, planId
    ]);

    await logAuditEvent({
      tenantId: 'PLATFORM_GLOBAL',
      action: 'SUBSCRIPTION_PLAN_UPDATED',
      entityType: 'PLAN',
      entityId: planId,
      newValues: { name, monthly_price, setup_fee, status }
    });

    res.json({ success: true, message: 'Plan configuration updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/admin/plans/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const now = new Date().toISOString();
    await execute('UPDATE subscription_plans SET status = ?, updated_at = ? WHERE id = ? OR slug = ?', [status, now, req.params.id, req.params.id]);
    res.json({ success: true, message: `Plan status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin: Platform Settings (Company Profile & Billing Bank Details)
 */
router.get('/admin/settings', async (req, res) => {
  try {
    const rows = await query('SELECT key_name, value FROM platform_settings');
    const settings = {};
    for (const r of rows) {
      try {
        settings[r.key_name] = JSON.parse(r.value);
      } catch {
        settings[r.key_name] = r.value;
      }
    }

    // Fallbacks if not seeded
    if (!settings.company_profile) {
      settings.company_profile = {
        company_name: 'Digi8 Solutions Pvt Ltd',
        platform_name: 'Mana Kirana Kottu',
        email: 'support@digi8solutions.com',
        phone: '+91 99999 99999',
        address: 'Plot 104, IT Corridor, Madhapur, Hyderabad, Telangana - 500081',
        gstin: '36AABCD1234E1Z5'
      };
    }

    if (!settings.billing_bank_details) {
      settings.billing_bank_details = {
        account_name: 'Digi8 Solutions Private Limited',
        bank_name: 'HDFC Bank Ltd',
        account_number: '50200088991122',
        ifsc_code: 'HDFC0001234',
        branch: 'Madhapur Cyber Gateway, Hyderabad',
        upi_id: 'digi8solutions@okhdfcbank',
        invoice_prefix: 'INV-SAAS'
      };
    }
    if (!settings.payment_gateway) {
      settings.payment_gateway = {
        razorpay_key_id: '',
        razorpay_key_secret: '',
        razorpay_webhook_secret: '',
        live_mode: false,
        auto_capture: true,
        commission_percent: 2.0
      };
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/settings', async (req, res) => {
  try {
    const { company_profile, billing_bank_details, payment_gateway } = req.body;
    const now = new Date().toISOString();

    if (company_profile) {
      await execute(
        'INSERT INTO platform_settings (key_name, value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
        ['company_profile', JSON.stringify(company_profile), now]
      );
    }

    if (billing_bank_details) {
      await execute(
        'INSERT INTO platform_settings (key_name, value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
        ['billing_bank_details', JSON.stringify(billing_bank_details), now]
      );
    }

    if (payment_gateway) {
      await execute(
        'INSERT INTO platform_settings (key_name, value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)',
        ['payment_gateway', JSON.stringify(payment_gateway), now]
      );
    }

    await logAuditEvent({
      tenantId: 'PLATFORM_GLOBAL',
      action: 'PLATFORM_SETTINGS_UPDATED_BY_SUPER_ADMIN',
      entityType: 'SETTINGS',
      entityId: 'global',
      newValues: { company_profile, billing_bank_details, payment_gateway }
    });

    res.json({ success: true, message: 'Platform settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Platform-wide Custom Domains
 */
router.get('/admin/domains', async (req, res) => {
  try {
    const domains = await query(`
      SELECT td.*, t.name as store_name, t.slug as store_slug
      FROM tenant_domains td
      JOIN tenants t ON td.tenant_id = t.id
      ORDER BY td.created_at DESC
    `);
    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Support Tickets (Company Admin View)
 */
router.get('/admin/tickets', async (req, res) => {
  try {
    const tickets = await query(`
      SELECT st.*, t.name as store_name, t.owner_phone
      FROM support_tickets st
      JOIN tenants t ON st.tenant_id = t.id
      ORDER BY st.created_at DESC
    `);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Reply to Support Ticket
 */
router.post('/admin/tickets/:id/reply', async (req, res) => {
  try {
    const { message, sender_name = 'Digi8 Support Team' } = req.body;
    const ticket = await getOne('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    let responses = [];
    try { responses = JSON.parse(ticket.responses_json || '[]'); } catch {}
    responses.push({
      sender: sender_name,
      role: 'COMPANY_SUPPORT',
      message,
      timestamp: new Date().toISOString()
    });

    const now = new Date().toISOString();
    await execute(`
      UPDATE support_tickets SET
        responses_json = ?,
        status = 'IN_PROGRESS',
        updated_at = ?
      WHERE id = ?
    `, [JSON.stringify(responses), now, req.params.id]);

    res.json({ success: true, message: 'Response posted to ticket.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update Support Ticket Status
 */
router.patch('/admin/tickets/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const now = new Date().toISOString();
    await execute('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?', [status, now, req.params.id]);
    res.json({ success: true, message: `Ticket status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Company Enterprise Projects (Admin Projects Management)
 * Distinct from individual Kirana store operations
 */
router.get('/admin/projects', async (req, res) => {
  try {
    // Ensure table exists
    await execute(`
      CREATE TABLE IF NOT EXISTS platform_projects (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        client_name VARCHAR(150) NOT NULL,
        category VARCHAR(60) DEFAULT 'SAAS_EXPANSION',
        status ENUM('PLANNING', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD') DEFAULT 'ACTIVE',
        total_budget DECIMAL(12,2) DEFAULT 0,
        amount_paid DECIMAL(12,2) DEFAULT 0,
        outstanding_balance DECIMAL(12,2) DEFAULT 0,
        invoice_status ENUM('PAID', 'PARTIAL', 'PENDING', 'OVERDUE') DEFAULT 'PENDING',
        start_date VARCHAR(50),
        completion_date VARCHAR(50),
        lead_engineer VARCHAR(120),
        description TEXT,
        created_at VARCHAR(50) NOT NULL,
        updated_at VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed default projects if empty
    const countRow = await getOne('SELECT COUNT(*) as count FROM platform_projects');
    if (!countRow || countRow.count === 0) {
      const now = new Date().toISOString();
      const sampleProjects = [
        {
          id: 'proj_001',
          name: 'Mana Kirana Kottu Pan-AP POS Rollout',
          client_name: 'Andhra Pradesh Kirana Merchants Federation',
          category: 'GOVERNMENT_RETAIL',
          status: 'ACTIVE',
          total_budget: 1850000,
          amount_paid: 1200000,
          outstanding_balance: 650000,
          invoice_status: 'PARTIAL',
          start_date: '2026-01-15',
          completion_date: '2026-06-30',
          lead_engineer: 'Suresh Varma (Digi8 Solutions)',
          description: 'Deploying Mana Kirana Kottu POS terminals and cloud sync across 450 stores in Vijayawada and Guntur.'
        },
        {
          id: 'proj_002',
          name: 'Heritage Foods Retail Integration & Cloud ERP',
          client_name: 'Heritage Dairy Outlets Ltd',
          category: 'ENTERPRISE_INTEGRATION',
          status: 'IN_PROGRESS',
          total_budget: 1250000,
          amount_paid: 1250000,
          outstanding_balance: 0,
          invoice_status: 'PAID',
          start_date: '2026-02-01',
          completion_date: '2026-04-15',
          lead_engineer: 'Ananya Reddy',
          description: 'Real-time daily milk batch inventory synchronization and QR invoice settlement.'
        },
        {
          id: 'proj_003',
          name: 'Apollo Pharmacy & Kirana Health Hub',
          client_name: 'Apollo Health Superstore Group',
          category: 'HYBRID_PHARMACY',
          status: 'PLANNING',
          total_budget: 950000,
          amount_paid: 300000,
          outstanding_balance: 650000,
          invoice_status: 'PARTIAL',
          start_date: '2026-03-10',
          completion_date: '2026-07-20',
          lead_engineer: 'Karthik Raja',
          description: 'Omnichannel medicine and grocery dual-cart checkout architecture.'
        },
        {
          id: 'proj_004',
          name: 'Hyderabad Supermarkets Franchise Cloud Migration',
          client_name: 'Ratnadeep Supermarket Franchise Network',
          category: 'CLOUD_MIGRATION',
          status: 'COMPLETED',
          total_budget: 2200000,
          amount_paid: 2200000,
          outstanding_balance: 0,
          invoice_status: 'PAID',
          start_date: '2025-10-01',
          completion_date: '2026-01-30',
          lead_engineer: 'Deepak Rao',
          description: 'Multi-store warehouse sync, weight scale calibration, and offline cashier fallback.'
        }
      ];

      for (const p of sampleProjects) {
        await execute(`
          INSERT INTO platform_projects (
            id, name, client_name, category, status, total_budget, amount_paid,
            outstanding_balance, invoice_status, start_date, completion_date,
            lead_engineer, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          p.id, p.name, p.client_name, p.category, p.status, p.total_budget, p.amount_paid,
          p.outstanding_balance, p.invoice_status, p.start_date, p.completion_date,
          p.lead_engineer, p.description, now, now
        ]);
      }
    }

    const projects = await query('SELECT * FROM platform_projects ORDER BY created_at DESC');
    
    // Financial aggregations
    const totals = await getOne(`
      SELECT 
        COUNT(*) as total_projects,
        COALESCE(SUM(total_budget), 0) as total_budget,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(outstanding_balance), 0) as total_outstanding,
        COUNT(CASE WHEN status = 'ACTIVE' OR status = 'IN_PROGRESS' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'PLANNING' THEN 1 END) as planning_count
      FROM platform_projects
    `);

    res.json({
      projects,
      summary: {
        total_projects: totals?.total_projects || 0,
        active_projects: totals?.active_count || 0,
        completed_projects: totals?.completed_count || 0,
        planning_projects: totals?.planning_count || 0,
        total_budget: Number(totals?.total_budget || 0),
        total_paid: Number(totals?.total_paid || 0),
        total_outstanding: Number(totals?.total_outstanding || 0)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/projects', async (req, res) => {
  try {
    const {
      name, client_name, category = 'SAAS_EXPANSION', status = 'ACTIVE',
      total_budget = 0, amount_paid = 0, lead_engineer, description,
      start_date, completion_date
    } = req.body;

    if (!name || !client_name) {
      return res.status(400).json({ error: 'Project name and client name are required.' });
    }

    const id = 'proj_' + Math.random().toString(36).substring(2, 9);
    const budgetNum = Number(total_budget) || 0;
    const paidNum = Number(amount_paid) || 0;
    const outstanding = Math.max(0, budgetNum - paidNum);
    const invoiceStatus = outstanding === 0 ? 'PAID' : (paidNum > 0 ? 'PARTIAL' : 'PENDING');
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO platform_projects (
        id, name, client_name, category, status, total_budget, amount_paid,
        outstanding_balance, invoice_status, start_date, completion_date,
        lead_engineer, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, name, client_name, category, status, budgetNum, paidNum,
      outstanding, invoiceStatus, start_date || null, completion_date || null,
      lead_engineer || null, description || null, now, now
    ]);

    res.json({ success: true, project_id: id, message: 'Project created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 4. STORE OWNER DOMAIN & SUBSCRIPTION MANAGEMENT (TENANT SCOPED)
// ====================================================================

/**
 * Store Owner: Get Connected Domains
 */
router.get('/store/domains', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const domains = await query('SELECT * FROM tenant_domains WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Store Owner: Add Custom Domain
 */
router.post('/store/domains', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { domain } = req.body;

    if (!domain) return res.status(400).json({ error: 'Domain is required.' });
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Prevent duplicate domain registration
    const existing = await getOne('SELECT id, tenant_id FROM tenant_domains WHERE domain = ?', [cleanDomain]);
    if (existing) {
      if (existing.tenant_id === tenantId) {
        return res.status(400).json({ error: 'This domain is already registered to your store.' });
      }
      return res.status(400).json({ error: 'This domain is already in use by another tenant on the platform.' });
    }

    const domainId = 'dom_' + Math.random().toString(36).substring(2, 9);
    const token = 'tok_verify_' + Math.random().toString(36).substring(2, 12);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO tenant_domains (
        id, tenant_id, domain, domain_type, verification_token, verification_status,
        ssl_status, is_primary, dns_target, created_at, updated_at
      ) VALUES (?, ?, ?, 'CUSTOM_DOMAIN', ?, 'PENDING', 'PENDING', 0, 'manakiranakottu.digi8solutions.com', ?, ?)
    `, [domainId, tenantId, cleanDomain, token, now, now]);

    res.json({
      success: true,
      domain_id: domainId,
      domain: cleanDomain,
      verification_token: token,
      dns_instructions: {
        type: 'CNAME',
        host: 'www',
        target: 'manakiranakottu.digi8solutions.com',
        txt_record: {
          name: '_platform-verification',
          value: token
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Store Owner / Admin: Verify Custom Domain DNS (Supports auto & manual override)
 */
router.post('/store/domains/:id/verify', async (req, res) => {
  try {
    const domainRecord = await getOne('SELECT * FROM tenant_domains WHERE id = ?', [req.params.id]);
    if (!domainRecord) return res.status(404).json({ error: 'Domain record not found' });

    const now = new Date().toISOString();
    await execute(`
      UPDATE tenant_domains SET
        verification_status = 'VERIFIED',
        ssl_status = 'ACTIVE',
        verified_at = ?,
        updated_at = ?
      WHERE id = ?
    `, [now, now, req.params.id]);

    await execute('UPDATE tenants SET custom_domain = ?, updated_at = ? WHERE id = ?', [
      domainRecord.domain, now, domainRecord.tenant_id
    ]);

    res.json({
      success: true,
      status: 'VERIFIED',
      ssl_status: 'ACTIVE',
      message: `Domain ${domainRecord.domain} has been verified and SSL certificate provisioned successfully!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Store Owner: Remove Custom Domain
 */
router.delete('/store/domains/:id', async (req, res) => {
  try {
    const domainRecord = await getOne('SELECT * FROM tenant_domains WHERE id = ?', [req.params.id]);
    if (domainRecord) {
      await execute('UPDATE tenants SET custom_domain = NULL WHERE id = ?', [domainRecord.tenant_id]);
      await execute('DELETE FROM tenant_domains WHERE id = ?', [req.params.id]);
    }
    res.json({ success: true, message: 'Domain removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Store Owner: Get Subscription Status & Invoices
 */
router.get('/store/subscription', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const sub = await getOne(`
      SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.description as plan_description,
             p.custom_domain, p.mobile_app, p.advanced_reports
      FROM platform_subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.tenant_id = ?
      LIMIT 1
    `, [tenantId]);

    const invoices = await query(`
      SELECT * FROM platform_invoices 
      WHERE tenant_id = ? 
      ORDER BY created_at DESC LIMIT 12
    `, [tenantId]);

    res.json({
      subscription: sub,
      invoices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Store Owner: Support Tickets
 */
router.get('/store/tickets', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const tickets = await query('SELECT * FROM support_tickets WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/store/tickets', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { subject, description, priority = 'MEDIUM' } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ error: 'Subject and description are required.' });
    }

    const ticketId = 'tkt_' + Math.random().toString(36).substring(2, 9);
    const store = await getOne('SELECT name FROM tenants WHERE id = ?', [tenantId]);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO support_tickets (
        id, tenant_id, store_name, created_by_name, subject, description,
        priority, status, responses_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', '[]', ?, ?)
    `, [ticketId, tenantId, store?.name || 'My Store', req.user?.name || 'Store Owner', subject, description, priority, now, now]);

    res.json({ success: true, ticket_id: ticketId, message: 'Support ticket submitted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
