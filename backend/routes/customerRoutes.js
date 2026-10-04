import express from 'express';
import { query, getOne, execute } from '../db.js';
import { tokenService } from '../auth/tokenService.js';
import { logAuditEvent } from '../tenant/tenantMiddleware.js';

const router = express.Router();

/**
 * 1. TENANT RESOLVER ENDPOINT (Public)
 * Resolves a store tenant by slug, id, custom domain, or subdomain.
 */
router.get('/tenant/resolve', async (req, res) => {
  try {
    const identifier = req.query.identifier || req.query.slug || req.query.tenant || req.headers['x-tenant-id'] || req.headers['x-tenant-slug'];
    const customHost = (req.query.host || req.headers['x-custom-domain'] || req.headers['x-forwarded-host'] || req.headers['host'] || '').split(':')[0].toLowerCase();

    let tenant = null;

    if (identifier) {
      tenant = await getOne(
        'SELECT * FROM tenants WHERE id = ? OR slug = ? OR custom_domain = ? LIMIT 1',
        [identifier, identifier, identifier]
      );
    }

    if (!tenant && customHost && !['localhost', '127.0.0.1'].includes(customHost)) {
      // Check custom domains table
      try {
        tenant = await getOne(
          `SELECT t.* FROM tenant_domains td 
           JOIN tenants t ON td.tenant_id = t.id 
           WHERE td.domain = ? AND td.verification_status = 'VERIFIED' AND td.ssl_status = 'ACTIVE' 
           LIMIT 1`,
          [customHost]
        );
      } catch (e) {
        // Fallback
      }

      if (!tenant) {
        tenant = await getOne('SELECT * FROM tenants WHERE custom_domain = ? LIMIT 1', [customHost]);
      }
    }

    // Subdomain check (e.g. royalkirana.digi8apnakirana.com)
    if (!tenant && customHost) {
      const parts = customHost.split('.');
      if (parts.length > 2 && !['api', 'www', 'stores', 'platform', 'app'].includes(parts[0])) {
        tenant = await getOne('SELECT * FROM tenants WHERE slug = ? OR id = ? LIMIT 1', [parts[0], parts[0]]);
      }
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Store not found on Digi8 Apna Kirana platform.',
        identifier: identifier || customHost
      });
    }

    // Sanitize and return public store data
    const isSuspended = tenant.status === 'SUSPENDED';
    const isStorefrontEnabled = tenant.is_storefront_enabled === undefined || tenant.is_storefront_enabled === 1 || tenant.is_storefront_enabled === true;

    res.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        tagline: tenant.tagline,
        owner_name: tenant.owner_name,
        phone: tenant.phone || tenant.owner_phone,
        email: tenant.email || tenant.owner_email,
        address: tenant.address,
        city: tenant.city,
        state: tenant.state,
        pincode: tenant.pincode,
        country: tenant.country || 'India',
        logo_url: tenant.logo_url,
        banner_url: tenant.banner_url,
        primary_color: tenant.primary_color || '#16a34a',
        secondary_color: tenant.secondary_color || '#0f766e',
        button_color: tenant.button_color || '#15803d',
        status: tenant.status,
        is_suspended: isSuspended,
        is_storefront_enabled: isStorefrontEnabled,
        custom_domain: tenant.custom_domain,
        min_order_value: tenant.min_order_value || 199,
        delivery_charge: tenant.delivery_charge || 30,
        free_delivery_above: tenant.free_delivery_above || 499,
        estimated_delivery_mins: tenant.estimated_delivery_mins || '30-45 mins',
        store_status: tenant.store_status || 'OPEN',
        opening_time: tenant.opening_time || '07:30',
        closing_time: tenant.closing_time || '22:30',
        operating_days: tenant.operating_days || 'All 7 Days',
        currency_symbol: tenant.currency_symbol || '₹'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. CUSTOMER REGISTRATION (Tenant-Scoped)
 * Customers create an account for a specific store.
 */
router.post('/auth/customer/register', async (req, res) => {
  try {
    const { name, phone, email, password, address, city, pincode, store_id, tenant_id } = req.body;
    const tenantId = store_id || tenant_id || req.tenant?.id || req.headers['x-tenant-id'] || 'store_royal_001';

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, Mobile Number, and Password are required.' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number.' });
    }

    // Check if customer already exists for this tenant
    const existing = await getOne(
      'SELECT id, phone, name, password, email, address, credit_balance, total_spent, orders_count FROM customers WHERE (tenant_id = ? OR store_id = ?) AND phone = ?',
      [tenantId, tenantId, cleanPhone]
    );

    const fullAddress = address ? `${address}${city ? ', ' + city : ''}${pincode ? ' - ' + pincode : ''}` : '';
    let customerId = existing ? existing.id : ('cust_' + Math.random().toString(36).substring(2, 9));
    const now = new Date().toISOString();

    if (existing && existing.password) {
      return res.status(400).json({
        error: `An account with mobile ${cleanPhone} is already registered. Please sign in with your password.`
      });
    }

    if (existing && !existing.password) {
      // Customer was added at billing counter or seed data; activate account with chosen password
      await execute(`
        UPDATE customers SET
          name = COALESCE(NULLIF(?, ''), name),
          password = ?,
          email = COALESCE(NULLIF(?, ''), email),
          address = COALESCE(NULLIF(?, ''), address),
          status = 'ACTIVE'
        WHERE id = ?
      `, [name.trim(), password.trim(), email ? email.trim() : null, fullAddress || null, existing.id]);
    } else {
      await execute(`
        INSERT INTO customers (
          id, store_id, tenant_id, name, phone, email, address,
          password, status, credit_balance, total_spent, orders_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, 0, 0, ?)
      `, [
        customerId,
        tenantId,
        tenantId,
        name.trim(),
        cleanPhone,
        email ? email.trim() : '',
        fullAddress,
        password.trim(),
        now
      ]);
    }

    const token = tokenService.generateToken({
      userId: customerId,
      customerId,
      tenantId,
      role: 'CUSTOMER',
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : ''
    });

    res.json({
      success: true,
      message: 'Account created successfully! Welcome to the store.',
      token,
      customer: {
        id: customerId,
        tenant_id: tenantId,
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : '',
        address: fullAddress,
        credit_balance: existing?.credit_balance || 0,
        total_spent: existing?.total_spent || 0,
        orders_count: existing?.orders_count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. CUSTOMER LOGIN (Tenant-Scoped)
 * Authenticates shoppers against the store's customer database.
 */
router.post('/auth/customer/login', async (req, res) => {
  try {
    const { phone, password, pin, store_id, tenant_id } = req.body;
    const tenantId = store_id || tenant_id || req.tenant?.id || req.headers['x-tenant-id'] || 'store_royal_001';

    if (!phone || (!password && !pin)) {
      return res.status(400).json({ error: 'Mobile number and Password/PIN are required.' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const cleanSecret = String(password || pin).trim();

    // Find customer for this tenant
    const customer = await getOne(
      `SELECT * FROM customers 
       WHERE (tenant_id = ? OR store_id = ?) AND phone = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, tenantId, cleanPhone]
    );

    if (!customer) {
      return res.status(401).json({
        error: 'No customer account found for this mobile number at this store. Please register.'
      });
    }

    // Match password / pin or allow default pin 1234 if password not set yet
    const validPassword = (customer.password && customer.password === cleanSecret) ||
                          (customer.pin && customer.pin === cleanSecret) ||
                          (!customer.password && !customer.pin && (cleanSecret === '1234' || cleanSecret === 'password123'));

    if (!validPassword) {
      return res.status(401).json({
        error: 'Incorrect password or PIN. Please try again.'
      });
    }

    const token = tokenService.generateToken({
      userId: customer.id,
      customerId: customer.id,
      tenantId,
      role: 'CUSTOMER',
      name: customer.name,
      phone: customer.phone,
      email: customer.email || ''
    });

    res.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        tenant_id: customer.tenant_id || tenantId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        credit_balance: customer.credit_balance || 0,
        total_spent: customer.total_spent || 0,
        orders_count: customer.orders_count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. CURRENT CUSTOMER PROFILE
 */
router.get('/customer/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });

    const token = tokenService.extractToken(authHeader);
    const decoded = tokenService.verifyToken(token);
    if (!decoded || decoded.role !== 'CUSTOMER') {
      return res.status(401).json({ error: 'Invalid customer token' });
    }

    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [decoded.customerId || decoded.userId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const customerData = {
      id: customer.id,
      tenant_id: customer.tenant_id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      credit_balance: customer.credit_balance || 0,
      total_spent: customer.total_spent || 0,
      orders_count: customer.orders_count || 0
    };

    res.json({
      success: true,
      customer: customerData,
      ...customerData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. CUSTOMER ORDER HISTORY
 */
router.get('/customer/orders', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });

    const token = tokenService.extractToken(authHeader);
    const decoded = tokenService.verifyToken(token);
    if (!decoded || decoded.role !== 'CUSTOMER') {
      return res.status(401).json({ error: 'Invalid customer session' });
    }

    const tenantId = decoded.tenantId || req.tenant?.id || 'store_royal_001';
    const phone = decoded.phone;
    const customerId = decoded.customerId || decoded.userId;

    const orders = await query(`
      SELECT * FROM orders 
      WHERE (tenant_id = ? OR store_id = ?) 
        AND (customer_id = ? OR customer_phone = ?)
      ORDER BY created_at DESC 
      LIMIT 50
    `, [tenantId, tenantId, customerId, phone]);

    // Attach items
    const ordersWithItems = await Promise.all(orders.map(async ord => {
      const items = await query('SELECT * FROM order_items WHERE order_id = ?', [ord.id]);
      return {
        ...ord,
        items
      };
    }));

    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
