import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db, { initDatabase, query, getOne, execute } from './db.js';
import { paymentService } from './payment/paymentService.js';
import { deliveryService } from './delivery/deliveryService.js';
import { notificationService } from './notifications/notificationService.js';
import platformRoutes from './platform/platformRoutes.js';
import phase6Routes from './routes/phase6Routes.js';
import customerRoutes from './routes/customerRoutes.js';
import { whatsappService } from './services/whatsappService.js';
import { resolveTenant, logAuditEvent } from './tenant/tenantMiddleware.js';
import { tokenService } from './auth/tokenService.js';
import { optionalAuth } from './auth/authMiddleware.js';
import { barcodeService } from './services/barcodeService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
// Raw body capture for HMAC webhook signature verification (Razorpay, Stripe, etc.)
app.use(express.json({
  limit: '15mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

// Structured backend request logging
app.use((req, res, next) => {
  const start = Date.now();
  const reqId = 'req_' + Math.random().toString(36).substring(2, 8);
  req.reqId = reqId;
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    if (res.statusCode >= 400 || req.method !== 'GET') {
      console.log(`[${new Date().toISOString()}] [${reqId}] ${req.method} ${req.originalUrl} ${res.statusCode} (${elapsed}ms)`);
    }
  });
  next();
});

// Multi-Tenant Context Resolution & Platform Routes
app.use(resolveTenant);
app.use(optionalAuth);
app.use('/api/platform', platformRoutes);
app.use('/api', phase6Routes);
app.use('/api', customerRoutes);

// Health Check direct aliases for load balancers, monitoring & CI/CD probes
app.get(['/health', '/api/health'], (req, res, next) => {
  req.url = '/health';
  platformRoutes(req, res, next);
});

// Store connected SSE clients for real-time broadcasts
const sseClients = new Set();

function broadcastEvent(eventType, payload, targetTenantId = null, targetChannel = null) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      // If targetTenantId is specified, restrict to clients of that tenant (or platform admins)
      if (targetTenantId && client.tenantId && client.tenantId !== targetTenantId && client.role !== 'PLATFORM_ADMIN') {
        continue;
      }
      // If targetChannel is specified, restrict to clients on that channel
      if (targetChannel && client.channel && client.channel !== targetChannel) {
        continue;
      }
      client.res.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Wire real-time broadcaster into Phase 3 domain services
paymentService.setBroadcaster(broadcastEvent);
deliveryService.setBroadcaster(broadcastEvent);
notificationService.setBroadcaster(broadcastEvent);


// ----------------------------------------------------
// Real-time Server-Sent Events (SSE) with Multi-Tenant Scoping
// ----------------------------------------------------
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const tenantId = req.query.tenant_id || req.headers['x-tenant-id'] || req.tenant?.id || null;
  const channel = req.query.channel || null;
  const role = req.query.role || null;

  const client = { id: Date.now(), res, tenantId, channel, role };
  sseClients.add(client);

  // Send initial ping with tenant connection handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', tenantId, clients: sseClients.size })}\n\n`);

  req.on('close', () => {
    sseClients.delete(client);
  });
});

// ----------------------------------------------------
// PRODUCT IMAGE UPLOAD SERVICE (Camera, Gallery & Files)
// ----------------------------------------------------
app.post('/api/upload', async (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image data provided. Please select or take a photo.' });
    }

    // Match Base64 Data URL
    const match = image.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image format. Supported formats: JPG, JPEG, PNG, WEBP' });
    }

    let ext = match[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return res.status(400).json({ error: `Unsupported image format (${ext}). Supported: JPG, JPEG, PNG, WEBP` });
    }

    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size exceeds maximum limit of 10MB. Please use a smaller image.' });
    }

    const safeName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${safeName}`;
    console.log(`[Upload Success]: Saved image to ${filePath} -> ${imageUrl}`);

    res.json({
      success: true,
      url: imageUrl,
      filename: safeName,
      size_bytes: buffer.length
    });
  } catch (err) {
    console.error('[Upload Error]:', err);
    res.status(500).json({ error: 'Unable to upload image. Please try again.' });
  }
});

// ----------------------------------------------------
// 1. STORE PROFILE & SETTINGS
// ----------------------------------------------------
app.get('/api/store', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    let store = await getOne('SELECT * FROM tenants WHERE id = ?', [tenantId]);
    if (!store) {
      store = await getOne('SELECT * FROM stores WHERE id = ?', [tenantId]);
    }
    if (!store) {
      store = await getOne('SELECT * FROM stores LIMIT 1');
    }

    if (store) {
      if (!store.phone && store.owner_phone) {
        store.phone = store.owner_phone;
      }
      if (!store.upi_id) {
        const fallbackStore = await getOne('SELECT upi_id FROM stores WHERE id = ? OR id = "store_royal_001" LIMIT 1', [tenantId]);
        const paySettings = await getOne('SELECT store_upi_id FROM payment_settings WHERE tenant_id = ? OR id = "default" LIMIT 1', [tenantId]);
        store.upi_id = fallbackStore?.upi_id || paySettings?.store_upi_id || 'apnakirana@okhdfcbank';
      }
    }

    res.json(store);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/store', async (req, res) => {
  try {
    const s = req.body;
    const tenantId = req.tenant?.id || s.id || 'store_royal_001';
    const now = new Date().toISOString();
    const activeUpi = s.upi_id || 'apnakirana@okhdfcbank';

    // Update in stores table
    await execute(`
      UPDATE stores SET
        name = ?, tagline = ?, owner_name = ?, phone = ?, email = ?, address = ?,
        gstin = ?, upi_id = ?, min_order_value = ?, delivery_charge = ?,
        free_delivery_above = ?, estimated_delivery_mins = ?, store_status = ?,
        opening_time = ?, closing_time = ?, operating_days = ?, logo_url = ?,
        printer_width = ?, printer_connection = ?,
        primary_color = ?, secondary_color = ?, button_color = ?,
        cashier_max_discount = ?, manager_max_discount = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      s.name, s.tagline, s.owner_name, s.phone, s.email, s.address,
      s.gstin, activeUpi, s.min_order_value, s.delivery_charge,
      s.free_delivery_above, s.estimated_delivery_mins, s.store_status,
      s.opening_time, s.closing_time, s.operating_days, s.logo_url,
      s.printer_width, s.printer_connection,
      s.primary_color || '#16a34a', s.secondary_color || '#0f766e', s.button_color || '#15803d',
      Number(s.cashier_max_discount) || 5, Number(s.manager_max_discount) || 20,
      now, tenantId
    ]);

    // Update in tenants table
    await execute(`
      UPDATE tenants SET
        name = ?, tagline = ?, owner_name = ?, owner_phone = ?, owner_email = ?, address = ?,
        gstin = ?, upi_id = ?, min_order_value = ?, delivery_charge = ?, free_delivery_above = ?,
        estimated_delivery_mins = ?, store_status = ?, opening_time = ?, closing_time = ?,
        operating_days = ?, logo_url = ?, printer_width = ?, printer_connection = ?,
        primary_color = ?, secondary_color = ?, button_color = ?,
        cashier_max_discount = ?, manager_max_discount = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      s.name, s.tagline, s.owner_name, s.phone, s.email, s.address,
      s.gstin, activeUpi, s.min_order_value, s.delivery_charge, s.free_delivery_above,
      s.estimated_delivery_mins, s.store_status, s.opening_time, s.closing_time,
      s.operating_days, s.logo_url, s.printer_width, s.printer_connection,
      s.primary_color || '#16a34a', s.secondary_color || '#0f766e', s.button_color || '#15803d',
      Number(s.cashier_max_discount) || 5, Number(s.manager_max_discount) || 20,
      now, tenantId
    ]);

    // Also synchronize payment_settings store_upi_id
    if (activeUpi) {
      await execute(`
        UPDATE payment_settings SET store_upi_id = ?, updated_at = ?
        WHERE tenant_id = ? OR id = 'default'
      `, [activeUpi, now, tenantId]).catch(() => {});
    }

    broadcastEvent('store_updated', { ...s, upi_id: activeUpi, id: tenantId }, tenantId);
    res.json({ success: true, message: 'Store profile & branding updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. CATEGORIES (Tenant-Scoped)
// ----------------------------------------------------
app.get('/api/categories', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const categories = await query('SELECT * FROM categories WHERE (tenant_id = ? OR store_id = ?) ORDER BY sort_order ASC, name ASC', [tenantId, tenantId]);
    // Also attach product counts
    const counts = await query('SELECT category_id, COUNT(*) as count FROM products WHERE (tenant_id = ? OR store_id = ?) AND is_active = 1 GROUP BY category_id', [tenantId, tenantId]);
    const countMap = Object.fromEntries(counts.map(c => [c.category_id, c.count]));
    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      product_count: countMap[cat.id] || 0
    }));
    res.json(categoriesWithCount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, icon, image_url, sort_order } = req.body;
    const tenantId = req.tenant?.id || 'store_royal_001';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = 'cat_' + Math.random().toString(36).substring(2, 9);

    await execute(`
      INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, image_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, tenantId, tenantId, name, slug, icon || '🛍️', image_url || '', sort_order || 0]);

    broadcastEvent('category_added', { id, name }, tenantId);
    res.json({ success: true, id, name, slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { name, icon, image_url, sort_order } = req.body;
    const tenantId = req.tenant?.id || 'store_royal_001';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await execute(`
      UPDATE categories SET name = ?, slug = ?, icon = ?, image_url = ?, sort_order = ?
      WHERE id = ? AND (tenant_id = ? OR store_id = ?)
    `, [name, slug, icon, image_url, sort_order || 0, req.params.id, tenantId, tenantId]);

    broadcastEvent('category_updated', { id: req.params.id, name }, tenantId);
    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    await execute('DELETE FROM categories WHERE id = ? AND (tenant_id = ? OR store_id = ?)', [req.params.id, tenantId, tenantId]);
    broadcastEvent('category_deleted', { id: req.params.id }, tenantId);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. PRODUCTS (Tenant-Scoped Database Single Source of Truth)
// ----------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const { search, category_id, category_slug, channel, low_stock, out_of_stock, featured, bestseller, offer } = req.query;
    const tenantId = req.tenant?.id || 'store_royal_001';
    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.tenant_id = ? OR p.store_id = ?)
    `;
    const params = [tenantId, tenantId];

    // Filter by channel
    if (channel === 'website') {
      sql += ' AND p.is_active = 1 AND p.is_visible_online = 1';
    } else if (channel === 'pos') {
      sql += ' AND p.is_active = 1 AND p.is_pos_available = 1';
    }

    if (search) {
      sql += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.barcode LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (category_slug) {
      sql += ' AND c.slug = ?';
      params.push(category_slug);
    }

    if (low_stock === 'true') {
      sql += ' AND p.stock <= p.min_stock AND p.stock > 0';
    }

    if (out_of_stock === 'true') {
      sql += ' AND (p.stock - p.reserved_stock) <= 0';
    }

    if (featured === 'true') {
      sql += ' AND p.is_featured = 1';
    }

    if (bestseller === 'true') {
      sql += ' AND p.is_bestseller = 1';
    }

    if (offer === 'true') {
      sql += ' AND p.is_offer = 1';
    }

    sql += ' ORDER BY p.name ASC';
    const products = await query(sql, params);

    // Compute dynamic fields
    const enriched = products.map(p => ({
      ...p,
      available_stock: Math.max(0, p.stock - (p.reserved_stock || 0)),
      is_in_stock: (p.stock - (p.reserved_stock || 0)) > 0,
      savings_amount: Math.max(0, p.mrp - p.selling_price),
      savings_percent: p.mrp > 0 ? Math.round(((p.mrp - p.selling_price) / p.mrp) * 100) : 0,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dedicated Barcode Lookup Endpoint (Registered explicitly before /api/products/:id)
app.get('/api/products/barcode/:barcode', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const barcode = req.params.barcode.trim();
    const result = await barcodeService.lookup(barcode, tenantId, req.user);
    res.json(result);
  } catch (err) {
    console.error('[Barcode Lookup Route Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await getOne(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Fetch price history
    const history = await query('SELECT * FROM price_history WHERE product_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({
      ...product,
      available_stock: Math.max(0, product.stock - (product.reserved_stock || 0)),
      price_history: history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if barcode already exists on another product
app.post('/api/products/check-barcode', async (req, res) => {
  try {
    const { barcode, exclude_id } = req.body;
    if (!barcode || !barcode.trim()) return res.json({ exists: false });

    let sql = 'SELECT id, name, brand FROM products WHERE barcode = ?';
    const params = [barcode.trim()];
    if (exclude_id) {
      sql += ' AND id != ?';
      params.push(exclude_id);
    }

    const match = await getOne(sql, params);
    if (match) {
      return res.json({
        exists: true,
        product_id: match.id,
        product_name: match.name,
        message: `This barcode is already assigned to: ${match.name}. Please use another barcode.`
      });
    }

    res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const p = req.body;

    // Validate duplicate barcode if barcode is supplied
    if (p.barcode && p.barcode.trim()) {
      const existing = await getOne('SELECT id, name FROM products WHERE barcode = ?', [p.barcode.trim()]);
      if (existing) {
        return res.status(400).json({
          error: `This barcode is already assigned to: ${existing.name}. Please use another barcode.`
        });
      }
    }

    const store = await getOne('SELECT id FROM stores LIMIT 1');
    const id = 'prod_' + Math.random().toString(36).substring(2, 9);
    const barcode = p.barcode?.trim() || ('890' + Math.floor(1000000000 + Math.random() * 9000000000));
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO products (
        id, store_id, category_id, name, brand, barcode, unit, is_loose,
        purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
        pos_price, website_price, gst_percent, stock, reserved_stock, min_stock,
        is_active, is_visible_online, is_pos_available, is_featured, is_bestseller,
        is_offer, photo_url, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, store.id, p.category_id, p.name, p.brand || '', barcode, p.unit || 'PACKET',
      p.is_loose ? 1 : 0, Number(p.purchase_cost) || 0, Number(p.selling_price) || 0,
      Number(p.mrp) || Number(p.selling_price) || 0, Number(p.wholesale_price) || Number(p.selling_price),
      Number(p.min_selling_price) || Number(p.purchase_cost), Number(p.selling_price), Number(p.selling_price),
      Number(p.gst_percent) || 0, Number(p.stock) || 0, 0, Number(p.min_stock) || 5,
      p.is_active !== undefined ? (p.is_active ? 1 : 0) : 1,
      p.is_visible_online !== undefined ? (p.is_visible_online ? 1 : 0) : 1,
      p.is_pos_available !== undefined ? (p.is_pos_available ? 1 : 0) : 1,
      p.is_featured ? 1 : 0, p.is_bestseller ? 1 : 0, p.is_offer ? 1 : 0,
      p.photo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      p.description || '', now, now
    ]);

    // Initial price history
    await execute(`
      INSERT INTO price_history (id, product_id, old_price, new_price, changed_by, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['ph_' + Math.random().toString(36).substring(2, 9), id, p.selling_price, p.selling_price, 'Owner', 'Product created', now]);

    // Initial stock movement
    if (Number(p.stock) > 0) {
      await execute(`
        INSERT INTO stock_movements (id, store_id, product_id, change_qty, balance_qty, type, reference_id, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, ['sm_' + Math.random().toString(36).substring(2, 9), store.id, id, Number(p.stock), Number(p.stock), 'OPENING_STOCK', 'INITIAL', 'Opening stock on product creation', now]);
    }

    broadcastEvent('product_created', { id, name: p.name, price: p.selling_price });
    res.json({ success: true, id, barcode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product details
app.put('/api/products/:id', async (req, res) => {
  try {
    const p = req.body;
    const existing = await getOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const now = new Date().toISOString();
    const newPrice = Number(p.selling_price);

    // Validate duplicate barcode if barcode changed
    if (p.barcode && p.barcode.trim()) {
      const barcodeExisting = await getOne('SELECT id, name FROM products WHERE barcode = ? AND id != ?', [p.barcode.trim(), req.params.id]);
      if (barcodeExisting) {
        return res.status(400).json({
          error: `This barcode is already assigned to: ${barcodeExisting.name}. Please use another barcode.`
        });
      }
    }

    // If price changed, record price history
    if (newPrice !== existing.selling_price) {
      await execute(`
        INSERT INTO price_history (id, product_id, old_price, new_price, changed_by, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['ph_' + Math.random().toString(36).substring(2, 9), req.params.id, existing.selling_price, newPrice, 'Owner', 'Price edited via product form', now]);
    }

    await execute(`
      UPDATE products SET
        category_id = ?, name = ?, brand = ?, barcode = ?, unit = ?, is_loose = ?,
        purchase_cost = ?, selling_price = ?, mrp = ?, wholesale_price = ?, min_selling_price = ?,
        pos_price = ?, website_price = ?, gst_percent = ?, stock = ?, min_stock = ?,
        is_active = ?, is_visible_online = ?, is_pos_available = ?, is_featured = ?,
        is_bestseller = ?, is_offer = ?, photo_url = ?, description = ?, updated_at = ?
      WHERE id = ?
    `, [
      p.category_id, p.name, p.brand, p.barcode, p.unit, p.is_loose ? 1 : 0,
      Number(p.purchase_cost), newPrice, Number(p.mrp), Number(p.wholesale_price), Number(p.min_selling_price),
      newPrice, newPrice, Number(p.gst_percent), Number(p.stock), Number(p.min_stock),
      p.is_active ? 1 : 0, p.is_visible_online ? 1 : 0, p.is_pos_available ? 1 : 0,
      p.is_featured ? 1 : 0, p.is_bestseller ? 1 : 0, p.is_offer ? 1 : 0,
      p.photo_url, p.description, now, req.params.id
    ]);

    broadcastEvent('product_updated', { id: req.params.id, name: p.name, selling_price: newPrice });
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRITICAL: Inline Price Update (Reflects everywhere immediately!)
app.patch('/api/products/:id/price', async (req, res) => {
  try {
    const { selling_price, mrp, reason } = req.body;
    const existing = await getOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const newPrice = Number(selling_price);
    const newMrp = mrp !== undefined ? Number(mrp) : existing.mrp;
    const now = new Date().toISOString();

    await execute(`
      UPDATE products SET
        selling_price = ?, pos_price = ?, website_price = ?, mrp = ?, updated_at = ?
      WHERE id = ?
    `, [newPrice, newPrice, newPrice, newMrp, now, req.params.id]);

    // Add to price history
    await execute(`
      INSERT INTO price_history (id, product_id, old_price, new_price, changed_by, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['ph_' + Math.random().toString(36).substring(2, 9), req.params.id, existing.selling_price, newPrice, 'Owner', reason || 'Direct price update', now]);

    // Audit log
    await execute(`
      INSERT INTO audit_logs (id, store_id, action, entity_type, entity_id, details, user_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'aud_' + Math.random().toString(36).substring(2, 9),
      existing.store_id,
      'PRICE_CHANGE',
      'PRODUCT',
      req.params.id,
      `Price of ${existing.name} changed from ₹${existing.selling_price} to ₹${newPrice}`,
      'Store Owner',
      now
    ]);

    // Real-time broadcast to Website and POS!
    broadcastEvent('price_changed', {
      product_id: req.params.id,
      name: existing.name,
      old_price: existing.selling_price,
      new_price: newPrice,
      mrp: newMrp
    });

    res.json({
      success: true,
      message: `Price updated from ₹${existing.selling_price} to ₹${newPrice}`,
      product_id: req.params.id,
      old_price: existing.selling_price,
      new_price: newPrice
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Price Update (e.g. +5% or +₹5/KG for category or selected items)
app.post('/api/products/bulk-price', async (req, res) => {
  try {
    const { category_id, product_ids, adjustment_type, value, reason } = req.body;
    // adjustment_type: 'PERCENTAGE' (e.g. +5 or -5) or 'FIXED' (e.g. +5 or -5)
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (product_ids && product_ids.length > 0) {
      sql += ` AND id IN (${product_ids.map(() => '?').join(',')})`;
      params.push(...product_ids);
    } else if (category_id) {
      sql += ' AND category_id = ?';
      params.push(category_id);
    }

    const items = await query(sql, params);
    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const item of items) {
      let newPrice = item.selling_price;
      const numVal = Number(value);
      if (adjustment_type === 'PERCENTAGE') {
        newPrice = Math.round(item.selling_price * (1 + numVal / 100));
      } else {
        newPrice = Math.max(1, item.selling_price + numVal);
      }

      if (newPrice !== item.selling_price) {
        await execute(`
          UPDATE products SET selling_price = ?, pos_price = ?, website_price = ?, updated_at = ?
          WHERE id = ?
        `, [newPrice, newPrice, newPrice, now, item.id]);

        await execute(`
          INSERT INTO price_history (id, product_id, old_price, new_price, changed_by, reason, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, ['ph_' + Math.random().toString(36).substring(2, 9), item.id, item.selling_price, newPrice, 'Owner', reason || 'Bulk price update', now]);

        updatedCount++;
      }
    }

    broadcastEvent('bulk_price_updated', { updatedCount, timestamp: now });
    res.json({ success: true, updatedCount, message: `Successfully updated ${updatedCount} products!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete / Deactivate Product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await execute('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    broadcastEvent('product_deleted', { id: req.params.id });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. INVENTORY & STOCK MANAGEMENT
// ----------------------------------------------------
app.get('/api/inventory', async (req, res) => {
  try {
    const products = await query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name ASC
    `);

    let totalStockQty = 0;
    let totalStockCost = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const items = products.map(p => {
      const avail = Math.max(0, p.stock - (p.reserved_stock || 0));
      totalStockQty += p.stock;
      totalStockCost += p.stock * p.purchase_cost;
      totalRetailValue += p.stock * p.selling_price;

      if (avail <= 0) outOfStockCount++;
      else if (p.stock <= p.min_stock) lowStockCount++;

      return {
        ...p,
        available_stock: avail,
        cost_value: p.stock * p.purchase_cost,
        retail_value: p.stock * p.selling_price,
        gross_profit_potential: (p.stock * p.selling_price) - (p.stock * p.purchase_cost),
      };
    });

    res.json({
      valuation: {
        total_items: products.length,
        total_stock_qty: Math.round(totalStockQty * 1000) / 1000,
        total_cost_value: Math.round(totalStockCost),
        total_retail_value: Math.round(totalRetailValue),
        potential_gross_margin: Math.round(totalRetailValue - totalStockCost),
        margin_percent: totalRetailValue > 0 ? Math.round(((totalRetailValue - totalStockCost) / totalRetailValue) * 100) : 0,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
      },
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Stock Adjustment
app.post('/api/inventory/adjust', async (req, res) => {
  try {
    const { product_id, adjustment_type, quantity, reason } = req.body;
    // adjustment_type: 'ADD' or 'REMOVE' or 'SET'
    const product = await getOne('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let newStock = product.stock;
    const qty = Number(quantity);

    if (adjustment_type === 'ADD') newStock += qty;
    else if (adjustment_type === 'REMOVE') newStock = Math.max(0, newStock - qty);
    else if (adjustment_type === 'SET') newStock = Math.max(0, qty);

    const now = new Date().toISOString();
    await execute('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [newStock, now, product_id]);

    const changeQty = newStock - product.stock;
    await execute(`
      INSERT INTO stock_movements (id, store_id, product_id, change_qty, balance_qty, type, reference_id, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'sm_' + Math.random().toString(36).substring(2, 9),
      product.store_id,
      product_id,
      changeQty,
      newStock,
      'MANUAL_ADJUSTMENT',
      reason || 'Inventory audit',
      `Adjusted from ${product.stock} to ${newStock} ${product.unit}. Reason: ${reason || 'N/A'}`,
      now
    ]);

    broadcastEvent('stock_updated', { product_id, new_stock: newStock });
    res.json({ success: true, old_stock: product.stock, new_stock: newStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. PURCHASES & SUPPLIERS
// ----------------------------------------------------
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, phone, company, gstin, address } = req.body;
    const store = await getOne('SELECT id FROM stores LIMIT 1');
    const id = 'supp_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO suppliers (id, store_id, name, phone, company, gstin, address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, store.id, name, phone, company, gstin, address]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchases', async (req, res) => {
  try {
    const purchases = await query(`
      SELECT p.*, s.name as supplier_name, s.company as supplier_company
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.created_at DESC
    `);
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { supplier_id, invoice_no, items, notes } = req.body;
    // items: [{ product_id, quantity, unit_cost }]
    const store = await getOne('SELECT id FROM stores LIMIT 1');
    const purchaseId = 'pur_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    let totalCost = 0;
    for (const item of items) {
      totalCost += Number(item.quantity) * Number(item.unit_cost);
    }

    await execute(`
      INSERT INTO purchases (id, store_id, supplier_id, invoice_no, total_cost, payment_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [purchaseId, store.id, supplier_id, invoice_no, totalCost, 'PAID', notes || '', now]);

    // Update stock and purchase items
    for (const item of items) {
      const prod = await getOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (prod) {
        const addedQty = Number(item.quantity);
        const newStock = prod.stock + addedQty;
        const newCost = Number(item.unit_cost);

        await execute(`
          INSERT INTO purchase_items (id, purchase_id, product_id, product_name, quantity, unit_cost, total_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'pi_' + Math.random().toString(36).substring(2, 9),
          purchaseId, item.product_id, prod.name, addedQty, newCost, addedQty * newCost
        ]);

        // Update product stock and purchase cost
        await execute(`
          UPDATE products SET stock = ?, purchase_cost = ?, updated_at = ? WHERE id = ?
        `, [newStock, newCost, now, item.product_id]);

        // Stock movement log
        await execute(`
          INSERT INTO stock_movements (id, store_id, product_id, change_qty, balance_qty, type, reference_id, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'sm_' + Math.random().toString(36).substring(2, 9),
          store.id, item.product_id, addedQty, newStock, 'PURCHASE_INTAKE', purchaseId,
          `Stock intake from Supplier (Invoice #${invoice_no || 'N/A'})`, now
        ]);
      }
    }

    broadcastEvent('stock_updated', { purchase_id: purchaseId });
    res.json({ success: true, purchase_id: purchaseId, total_cost: totalCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. ORDERS (POS & ONLINE COMMERCE)
// ----------------------------------------------------
app.get('/api/orders', async (req, res) => {
  try {
    const { type, status, search, limit } = req.query;
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND order_type = ?';
      params.push(type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (order_number LIKE ? OR invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t, t);
    }

    sql += ' ORDER BY created_at DESC';
    if (limit) {
      sql += ` LIMIT ${Number(limit)}`;
    }

    const orders = await query(sql, params);

    // Attach items to each order
    const enriched = await Promise.all(orders.map(async o => {
      const items = await query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
      return { ...o, items };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await getOne('SELECT * FROM orders WHERE id = ? OR order_number = ?', [req.params.id, req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const status_history = await query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
    const payment_audits = await query('SELECT * FROM payment_audits WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
    res.json({ ...order, items, status_history, payment_audits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id/history', async (req, res) => {
  try {
    const status_history = await query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC', [req.params.id]);
    const payment_audits = await query('SELECT * FROM payment_audits WHERE order_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json({ status_history, payment_audits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POS Transaction Billing (Immediate stock reduction & invoice creation)
// POS Transaction Billing (Product-level discounts, Manager approval & Server-side financial calculations)
app.post('/api/orders/pos', async (req, res) => {
  try {
    const { items, customer, discount, payment_method, notes, cashier_id, cashier_name, manager_approval } = req.body;
    const tenantId = req.tenant?.id || 'store_royal_001';
    const store = req.tenant || (await getOne('SELECT * FROM tenants WHERE id = ?', [tenantId])) || (await getOne('SELECT * FROM stores LIMIT 1'));
    const now = new Date().toISOString();

    const cashierMaxPct = Number(store.cashier_max_discount) || 5;
    const managerMaxPct = Number(store.manager_max_discount) || 20;

    // Auto-generate invoice and order number with tenant-scoping
    const countRow = await getOne('SELECT COUNT(*) as count FROM orders WHERE tenant_id = ? OR store_id = ?', [tenantId, tenantId]);
    const nextSeq = (countRow?.count || 0) + 1;
    const invPrefix = store.invoice_prefix || 'INV';
    const invoiceNumber = `${invPrefix}-${String(nextSeq).padStart(6, '0')}`;
    const orderNumber = `POS-${1000 + nextSeq}`;
    const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);

    // Automatic Tenant-Scoped Customer Capture & Lookup
    let resolvedCustomerId = customer?.id || null;
    let resolvedCustomerName = customer?.name || req.body.customer_name || 'Walk-in Customer';
    let resolvedCustomerPhone = customer?.phone || req.body.customer_phone || '';

    if (resolvedCustomerPhone && resolvedCustomerPhone.trim().length >= 10) {
      const cleanPhone = resolvedCustomerPhone.replace(/[^0-9]/g, '');
      const existingCust = await getOne(
        'SELECT * FROM customers WHERE (tenant_id = ? OR store_id = ?) AND (phone LIKE ? OR phone LIKE ?) LIMIT 1',
        [tenantId, tenantId, `%${cleanPhone.slice(-10)}`, cleanPhone]
      );
      if (existingCust) {
        resolvedCustomerId = existingCust.id;
        if (!resolvedCustomerName || resolvedCustomerName === 'Walk-in Customer') {
          resolvedCustomerName = existingCust.name;
        }
      } else {
        resolvedCustomerId = 'cust_' + Math.random().toString(36).substring(2, 9);
        await execute(`
          INSERT INTO customers (id, store_id, tenant_id, name, phone, email, address, credit_balance, total_spent, orders_count, created_at)
          VALUES (?, ?, ?, ?, ?, '', '', 0, 0, 0, ?)
        `, [resolvedCustomerId, tenantId, tenantId, resolvedCustomerName, resolvedCustomerPhone.trim(), now]);
      }
    }

    let subtotalGross = 0;
    let totalItemDiscounts = 0;
    let totalTaxable = 0;
    let totalTax = 0;
    const processedItems = [];

    // Server-Authoritative calculation per line item
    for (const item of items) {
      const prod = await getOne('SELECT * FROM products WHERE id = ? AND (tenant_id = ? OR store_id = ?)', [item.product_id, tenantId, tenantId]);
      const qty = Math.max(0.001, Number(item.quantity) || 1);
      const originalPrice = prod ? Number(prod.selling_price) : Number(item.unit_price);
      let unitPrice = Number(item.unit_price) || originalPrice;
      const costPrice = Number(item.cost_price || (prod ? prod.purchase_cost : 0));
      const minSellingPrice = Number(prod ? prod.min_selling_price : 0) || costPrice;
      const manualAdjusted = Boolean(item.manual_price_adjusted || (Math.abs(unitPrice - originalPrice) > 0.01));

      // Minimum Selling Price & Below Cost check
      if (unitPrice < minSellingPrice || unitPrice < costPrice) {
        const mgrPin = (manager_approval && manager_approval.approved_by_pin) || item.manager_pin;
        if (!mgrPin && !Boolean(store.allow_selling_below_cost)) {
          return res.status(403).json({
            error: `Selling price ₹${unitPrice} for "${item.product_name || 'item'}" is below the allowed minimum/cost of ₹${minSellingPrice}. Manager approval required.`,
            requires_manager_approval: true,
            item_name: item.product_name,
            unit_price: unitPrice,
            min_price: minSellingPrice
          });
        }
      }

      const lineGross = Math.round(qty * originalPrice * 100) / 100;
      subtotalGross += lineGross;

      // Calculate line discount
      let dType = item.discount_type || 'NONE';
      let dVal = Number(item.discount_value) || 0;
      let lineDiscount = 0;

      // If price was manually negotiated/reduced
      if (manualAdjusted && unitPrice < originalPrice) {
        dType = 'FIXED';
        lineDiscount = Math.round(qty * (originalPrice - unitPrice) * 100) / 100;
        dVal = lineDiscount;
      } else if (dType === 'PERCENT') {
        const pct = Math.min(100, Math.max(0, dVal));
        lineDiscount = Math.round(((lineGross * pct) / 100) * 100) / 100;
      } else if (dType === 'FIXED') {
        lineDiscount = Math.min(lineGross, Math.round(dVal * 100) / 100);
      }

      const discountPct = lineGross > 0 ? (lineDiscount / lineGross) * 100 : 0;

      // Enforce Discount Authority / Manager Approval
      if (discountPct > cashierMaxPct) {
        const mgrPin = (manager_approval && manager_approval.approved_by_pin) || item.manager_pin;
        if (!mgrPin) {
          return res.status(403).json({
            error: `Discount of ${discountPct.toFixed(1)}% on ${item.product_name || 'item'} exceeds cashier limit of ${cashierMaxPct}%. Manager PIN approval is required.`,
            requires_manager_approval: true,
            item_name: item.product_name,
            discount_percent: discountPct,
            cashier_limit_percent: cashierMaxPct,
            manager_limit_percent: managerMaxPct
          });
        }

        // Validate Manager PIN
        const manager = await getOne(
          'SELECT id, name, role FROM users WHERE (tenant_id = ? OR store_id = ? OR role = "PLATFORM_ADMIN") AND pin = ? AND role IN ("MANAGER", "SUB_ADMIN", "STORE_OWNER", "OWNER", "PLATFORM_ADMIN")',
          [tenantId, tenantId, String(mgrPin).trim()]
        );
        if (!manager) {
          return res.status(401).json({ error: 'Invalid Manager PIN for discount authorization.' });
        }
        item.approval_data = JSON.stringify({
          approved_by_id: manager.id,
          approved_by_name: manager.name,
          approved_role: manager.role,
          discount_amount: lineDiscount,
          discount_percent: discountPct,
          reason: item.discount_reason || 'CUSTOMER_NEGOTIATION',
          approved_at: now
        });
      }

      totalItemDiscounts += lineDiscount;
      const taxable = Math.max(0, lineGross - lineDiscount);
      totalTaxable += taxable;

      const gstRate = Number(item.gst_percent || (prod ? prod.gst_percent : 0)) || 0;
      const tax = Math.round(((taxable * gstRate) / 100) * 100) / 100;
      totalTax += tax;

      const lineFinal = Math.round((taxable + tax) * 100) / 100;
      const grossProfitLine = Math.round((lineFinal - (qty * costPrice)) * 100) / 100;

      processedItems.push({
        id: 'item_' + Math.random().toString(36).substring(2, 9),
        order_id: orderId,
        tenant_id: tenantId,
        product_id: item.product_id,
        product_name: item.product_name || (prod ? prod.name : 'Unknown Product'),
        unit: item.unit || (prod ? prod.unit : 'PACKET'),
        quantity: qty,
        unit_price: unitPrice,
        cost_price: costPrice,
        cost_snapshot: costPrice,
        gross_profit: grossProfitLine,
        gross_amount: lineGross,
        discount_type: dType,
        discount_value: dVal,
        discount_amount: lineDiscount,
        taxable_amount: taxable,
        gst_percent: gstRate,
        tax_amount: tax,
        total_price: lineFinal,
        manual_price_adjusted: manualAdjusted ? 1 : 0,
        original_unit_price: originalPrice,
        discount_reason: item.discount_reason || (manualAdjusted ? 'CUSTOMER_NEGOTIATION' : null),
        approval_data: item.approval_data || null,
        prod_ref: prod
      });
    }

    const billLevelDiscount = Math.max(0, Number(discount) || 0);
    const overallDiscount = totalItemDiscounts + billLevelDiscount;
    const finalBillTotal = Math.max(0, Math.round((subtotalGross - overallDiscount + totalTax) * 100) / 100);

    // Save order
    await execute(`
      INSERT INTO orders (
        id, store_id, tenant_id, order_number, invoice_number, order_type, status,
        customer_id, customer_name, customer_phone, delivery_address,
        subtotal, discount, delivery_charge, gst_amount, total_amount,
        payment_status, payment_method, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId, tenantId, tenantId, orderNumber, invoiceNumber, 'POS', 'DELIVERED',
      resolvedCustomerId, resolvedCustomerName, resolvedCustomerPhone || 'N/A', 'Store Checkout Counter',
      subtotalGross, overallDiscount, 0, totalTax, finalBillTotal,
      'PAID', payment_method || 'CASH', notes || '', now, now
    ]);

    // Save order items & deduct physical stock immediately
    for (const pit of processedItems) {
      await execute(`
        INSERT INTO order_items (
          id, order_id, tenant_id, product_id, product_name, unit, quantity,
          unit_price, cost_price, cost_snapshot, gross_profit, gross_amount, discount_type, discount_value,
          discount_amount, taxable_amount, gst_percent, tax_amount, total_price,
          manual_price_adjusted, original_unit_price, discount_reason, approval_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        pit.id, orderId, tenantId, pit.product_id, pit.product_name, pit.unit,
        pit.quantity, pit.unit_price, pit.cost_price, pit.cost_snapshot, pit.gross_profit,
        pit.gross_amount, pit.discount_type, pit.discount_value, pit.discount_amount,
        pit.taxable_amount, pit.gst_percent, pit.tax_amount, pit.total_price,
        pit.manual_price_adjusted, pit.original_unit_price, pit.discount_reason,
        pit.approval_data
      ]);

      if (pit.prod_ref) {
        const previousStock = Number(pit.prod_ref.stock) || 0;
        const newStock = Math.max(0, previousStock - pit.quantity);
        await execute('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [newStock, now, pit.prod_ref.id]);

        // Stock movement
        await execute(`
          INSERT INTO stock_movements (id, store_id, tenant_id, product_id, change_qty, balance_qty, type, reference_id, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'sm_' + Math.random().toString(36).substring(2, 9),
          tenantId, tenantId, pit.prod_ref.id, -pit.quantity, newStock, 'POS_SALE', orderId,
          `POS Bill #${invoiceNumber}`, now
        ]);

        // Inventory Transaction (Phase 6 audit trail)
        await execute(`
          INSERT INTO inventory_transactions (
            id, tenant_id, product_id, product_name, quantity, unit, transaction_type,
            reference_id, previous_stock, new_stock, unit_cost, notes, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'tx_' + Math.random().toString(36).substring(2, 9),
          tenantId, pit.prod_ref.id, pit.product_name, -pit.quantity, pit.unit, 'SALE',
          invoiceNumber, previousStock, newStock, pit.cost_price,
          `POS Sale Invoice #${invoiceNumber}`, cashier_name || 'Cashier', now
        ]);
      }
    }

    // Customer credit / spending update if customer attached
    if (resolvedCustomerId) {
      if (payment_method === 'CREDIT') {
        const newBalance = (customer?.credit_balance || 0) + finalBillTotal;
        await execute('UPDATE customers SET credit_balance = ?, total_spent = total_spent + ?, orders_count = orders_count + 1 WHERE id = ?', [newBalance, finalBillTotal, resolvedCustomerId]);
        await execute(`
          INSERT INTO customer_ledger (id, customer_id, store_id, tenant_id, type, amount, balance_after, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['led_' + Math.random().toString(36).substring(2, 9), resolvedCustomerId, tenantId, tenantId, 'DEBIT_PURCHASE', finalBillTotal, newBalance, `POS Bill #${invoiceNumber}`, now]);
      } else {
        await execute('UPDATE customers SET total_spent = total_spent + ?, orders_count = orders_count + 1 WHERE id = ?', [finalBillTotal, resolvedCustomerId]);
      }
    }

    // Log audit trail for discounts if any were granted
    if (overallDiscount > 0) {
      await logAuditEvent({
        tenantId,
        userId: cashier_id || null,
        userName: cashier_name || 'Cashier',
        action: 'POS_DISCOUNT_APPLIED',
        entityType: 'ORDER',
        entityId: orderId,
        newValues: {
          invoice_number: invoiceNumber,
          total_discount: overallDiscount,
          item_discounts: totalItemDiscounts,
          bill_discount: billLevelDiscount,
          manager_approval: manager_approval ? manager_approval.approved_by_name : null
        }
      });
    }

    broadcastEvent('pos_sale_completed', {
      order_id: orderId,
      invoice_number: invoiceNumber,
      total_amount: finalBillTotal,
      tenant_id: tenantId
    }, tenantId);

    // Auto WhatsApp trigger if store has auto send enabled
    if (store.whatsapp_auto_send && resolvedCustomerPhone && resolvedCustomerPhone.length >= 10) {
      whatsappService.sendInvoice({
        orderId,
        tenantId,
        customerPhoneOverride: resolvedCustomerPhone
      }).catch(waErr => {
        console.warn('[Auto WhatsApp Dispatch Notice]:', waErr.message);
      });
    }

    res.json({
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      invoice_number: invoiceNumber,
      subtotal: subtotalGross,
      discount_amount: overallDiscount,
      tax_amount: totalTax,
      total_amount: finalBillTotal,
      customer_id: resolvedCustomerId,
      customer_name: resolvedCustomerName,
      customer_phone: resolvedCustomerPhone,
      created_at: now
    });
  } catch (err) {
    console.error('[POS Sale Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Online Customer Checkout (Reserves stock, validates delivery PIN code, emits real-time alert)
app.post('/api/orders/online', async (req, res) => {
  try {
    const {
      items,
      customer_name,
      customer_phone,
      delivery_address,
      delivery_mode,
      payment_method,
      notes,
      pincode,
      area,
      landmark,
      latitude,
      longitude
    } = req.body;

    const store = await getOne('SELECT * FROM stores LIMIT 1');
    const now = new Date().toISOString();

    const countRow = await getOne('SELECT COUNT(*) as count FROM orders');
    const nextSeq = (countRow.count || 0) + 1;
    const orderNumber = `GR-${10200 + nextSeq}`;
    const invoiceNumber = `INV-${String(nextSeq).padStart(6, '0')}`;
    const orderId = 'ord_' + Math.random().toString(36).substring(2, 9);

    let subtotal = 0;
    let gstAmount = 0;

    // Check available stock & calculate total
    for (const item of items) {
      const prod = await getOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (!prod) return res.status(400).json({ error: `Product not found: ${item.product_id}` });

      const avail = Math.max(0, prod.stock - (prod.reserved_stock || 0));
      const reqQty = Number(item.quantity);

      if (avail < reqQty) {
        return res.status(400).json({
          error: `Insufficient stock for ${prod.name}. Available: ${avail} ${prod.unit}, Requested: ${reqQty} ${prod.unit}`
        });
      }

      const lineTotal = reqQty * prod.selling_price; // Centralized price
      subtotal += lineTotal;
      if (prod.gst_percent) {
        gstAmount += (lineTotal * prod.gst_percent) / 100;
      }
    }

    // Delivery fee and area validation
    let deliveryCharge = 0;
    let deliveryAreaId = null;
    let resolvedArea = area || '';
    let pickupCode = null;

    if (delivery_mode === 'PICKUP') {
      deliveryCharge = 0;
      pickupCode = String(Math.floor(1000 + Math.random() * 9000));
    } else {
      // Validate customer's PIN code against configured delivery areas
      if (!pincode || !String(pincode).trim()) {
        return res.status(400).json({ error: 'PIN Code is required for home delivery.' });
      }

      const cleanPin = String(pincode).trim();
      const activeAreas = await query('SELECT * FROM delivery_areas WHERE is_active = 1');
      
      const matchedArea = activeAreas.find(a => {
        const pins = a.pincodes.split(/[\s,]+/).map(p => p.trim());
        return pins.includes(cleanPin);
      });

      if (!matchedArea) {
        return res.status(400).json({
          error: 'Sorry, home delivery is currently unavailable in your area. You can choose "Collect From Store" for pickup.'
        });
      }

      deliveryAreaId = matchedArea.id;
      resolvedArea = resolvedArea || matchedArea.area_name;

      // Minimum order validation for this delivery area
      if (matchedArea.min_order_value && subtotal < matchedArea.min_order_value) {
        return res.status(400).json({
          error: `Minimum order for ${matchedArea.area_name} is ₹${matchedArea.min_order_value}. Current item subtotal is ₹${subtotal.toFixed(2)}.`
        });
      }

      // Free delivery calculation (Zone specific threshold takes precedence, otherwise fallback to store)
      const freeThreshold = matchedArea.free_delivery_above !== null && matchedArea.free_delivery_above !== undefined
        ? matchedArea.free_delivery_above
        : store.free_delivery_above;

      if (freeThreshold && subtotal >= freeThreshold) {
        deliveryCharge = 0;
      } else {
        deliveryCharge = matchedArea.delivery_charge !== undefined ? matchedArea.delivery_charge : store.delivery_charge;
      }
    }

    // COD Validation against payment_settings
    const paySettings = await getOne('SELECT * FROM payment_settings WHERE id = "default"');
    if (payment_method === 'COD') {
      if (paySettings && !paySettings.cod_enabled) {
        return res.status(400).json({ error: 'Cash on Delivery is currently disabled by store. Please choose an online payment method.' });
      }
      if (paySettings && paySettings.cod_max_order && subtotal > paySettings.cod_max_order) {
        return res.status(400).json({ error: `Maximum allowable order value for Cash on Delivery is ₹${paySettings.cod_max_order}. Please choose an online payment method.` });
      }
      if (paySettings && paySettings.cod_min_order && subtotal < paySettings.cod_min_order) {
        return res.status(400).json({ error: `Minimum order value for Cash on Delivery is ₹${paySettings.cod_min_order}.` });
      }
    }

    const totalAmount = subtotal + deliveryCharge;
    // PHASE 3 RULE: Payment status is PENDING upon order creation; marked PAID only upon server-side verification
    const initialPaymentStatus = 'PENDING';

    // Create Order
    await execute(`
      INSERT INTO orders (
        id, store_id, order_number, invoice_number, order_type, status,
        customer_id, customer_name, customer_phone, delivery_address,
        subtotal, discount, delivery_charge, gst_amount, total_amount,
        payment_status, payment_method, notes, delivery_area_id, area,
        pincode, landmark, latitude, longitude, pickup_code, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId, store.id, orderNumber, invoiceNumber,
      delivery_mode === 'PICKUP' ? 'ONLINE_PICKUP' : 'ONLINE_DELIVERY',
      'NEW',
      null, customer_name, customer_phone,
      delivery_mode === 'PICKUP' ? 'Store Counter Pickup' : (delivery_address || 'Home Delivery'),
      subtotal, 0, deliveryCharge, gstAmount, totalAmount,
      initialPaymentStatus, payment_method || 'UPI',
      notes || '', deliveryAreaId, resolvedArea,
      pincode || '', landmark || '',
      latitude || null, longitude || null, pickupCode,
      now, now
    ]);

    // Save order items & RESERVE STOCK
    for (const item of items) {
      const prod = await getOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
      const qty = Number(item.quantity);
      const lineTotal = qty * prod.selling_price;

      await execute(`
        INSERT INTO order_items (id, order_id, product_id, product_name, unit, quantity, unit_price, cost_price, discount, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'item_' + Math.random().toString(36).substring(2, 9),
        orderId, prod.id, prod.name, prod.unit, qty, prod.selling_price, prod.purchase_cost, 0, lineTotal
      ]);

      // Stock Reservation: reserve stock so POS or other customers don't oversell!
      const newReserved = (prod.reserved_stock || 0) + qty;
      await execute('UPDATE products SET reserved_stock = ?, updated_at = ? WHERE id = ?', [newReserved, now, prod.id]);
    }

    // Insert into Order Status History
    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'osh_' + Math.random().toString(36).substring(2, 9),
      orderId,
      'NEW',
      initialPaymentStatus,
      delivery_mode === 'PICKUP' ? 'Order placed for store pickup' : `Home delivery order placed for ${resolvedArea || 'Local Area'} (PIN: ${pincode})`,
      customer_name,
      now
    ]);

    // Phase 3: Create In-App Notification
    await notificationService.createNotification({
      type: 'ORDER_CREATED',
      title: `New Online Order #${orderNumber}`,
      message: `${customer_name} placed an order worth ₹${totalAmount.toFixed(2)} (${payment_method})`,
      entityType: 'order',
      entityId: orderId,
      storeId: store.id
    });

    // Broadcast new order to Store Dashboard with audio chime trigger!
    broadcastEvent('new_online_order', {
      order_id: orderId,
      order_number: orderNumber,
      customer_name,
      customer_phone,
      total_amount: totalAmount,
      created_at: now
    });

    // If online Razorpay payment selected, prepare gateway payload
    let onlinePaymentData = null;
    if (payment_method === 'RAZORPAY') {
      try {
        onlinePaymentData = await paymentService.createOnlinePayment({
          orderId,
          method: 'RAZORPAY'
        });
      } catch (gateErr) {
        console.warn('[Online Payment Init Warning]:', gateErr.message);
      }
    } else if (payment_method === 'UPI') {
      try {
        onlinePaymentData = await paymentService.createOnlinePayment({
          orderId,
          method: 'UPI'
        });
      } catch (gateErr) {
        console.warn('[UPI Init Warning]:', gateErr.message);
      }
    }

    res.json({
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      invoice_number: invoiceNumber,
      total_amount: totalAmount,
      delivery_charge: deliveryCharge,
      payment_status: initialPaymentStatus,
      payment_method: payment_method || 'UPI',
      payment_data: onlinePaymentData,
      estimated_delivery_mins: store.estimated_delivery_mins,
      pickup_code: pickupCode
    });
  } catch (err) {
    console.error('[Online Order Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Order Status (Workflow: NEW -> ACCEPTED -> PREPARING -> READY -> ASSIGNED -> OUT_FOR_DELIVERY -> DELIVERED / CANCELLED)
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status, updated_by, notes } = req.body;
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const now = new Date().toISOString();
    const oldStatus = order.status;

    // FULFILLMENT DEDUCTION: When order is ACCEPTED or DELIVERED, deduct from physical stock and release reservation
    if (['ACCEPTED', 'DELIVERED'].includes(status) && !['ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(oldStatus)) {
      const items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        const prod = await getOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          const newReserved = Math.max(0, (prod.reserved_stock || 0) - item.quantity);
          await execute('UPDATE products SET stock = ?, reserved_stock = ?, updated_at = ? WHERE id = ?', [newStock, newReserved, now, prod.id]);

          await execute(`
            INSERT INTO stock_movements (id, store_id, product_id, change_qty, balance_qty, type, reference_id, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'sm_' + Math.random().toString(36).substring(2, 9),
            order.store_id, prod.id, -item.quantity, newStock, 'ONLINE_ORDER_FULFILLED', order.id,
            `Order #${order.order_number} confirmed & stock deducted`, now
          ]);
        }
      }
    }

    // CANCELLATION: Release reserved stock or restore physical stock
    if (status === 'CANCELLED' && oldStatus !== 'CANCELLED') {
      const items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        const prod = await getOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (prod) {
          if (['NEW'].includes(oldStatus)) {
            const newReserved = Math.max(0, (prod.reserved_stock || 0) - item.quantity);
            await execute('UPDATE products SET reserved_stock = ?, updated_at = ? WHERE id = ?', [newReserved, now, prod.id]);
          } else {
            const newStock = prod.stock + item.quantity;
            await execute('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [newStock, now, prod.id]);
          }
        }
      }
    }

    await execute('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [status, now, order.id]);

    // Phase 3: Delivery Tracking & Notifications Lifecycle
    if (status === 'OUT_FOR_DELIVERY') {
      if (order.assigned_delivery_boy_id) {
        try {
          await deliveryService.startTrackingSession({
            orderId: order.id,
            agentId: order.assigned_delivery_boy_id,
            agentName: order.assigned_delivery_boy_name || 'Delivery Partner',
            latitude: order.latitude,
            longitude: order.longitude
          });
        } catch (trkErr) {
          console.warn('[Start Tracking Session Warning]:', trkErr.message);
        }
      }

      await notificationService.createNotification({
        type: 'DELIVERY_STARTED',
        title: `Order #${order.order_number} Out For Delivery`,
        message: `${order.assigned_delivery_boy_name || 'Delivery Partner'} has started delivery to ${order.customer_name}`,
        entityType: 'order',
        entityId: order.id,
        storeId: order.store_id
      });
    } else if (status === 'DELIVERED') {
      try {
        await deliveryService.endTrackingSession(order.id, 'COMPLETED');
      } catch (e) {
        console.warn('[End Tracking Session Warning]:', e.message);
      }

      await notificationService.createNotification({
        type: 'ORDER_DELIVERED',
        title: `Order #${order.order_number} Delivered`,
        message: `Order successfully handed over to ${order.customer_name}`,
        entityType: 'order',
        entityId: order.id,
        storeId: order.store_id
      });
    } else if (status === 'CANCELLED') {
      try {
        await deliveryService.endTrackingSession(order.id, 'CANCELLED');
      } catch (e) {
        console.warn('[Cancel Tracking Session Warning]:', e.message);
      }
    }

    // Record Status History
    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'osh_' + Math.random().toString(36).substring(2, 9),
      order.id,
      status,
      order.payment_status,
      notes || `Order status updated from ${oldStatus} to ${status}`,
      updated_by || 'Staff',
      now
    ]);

    broadcastEvent('order_status_updated', {
      order_id: order.id,
      order_number: order.order_number,
      old_status: oldStatus,
      new_status: status
    });

    res.json({ success: true, order_id: order.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// COD PAYMENT WORKFLOW: MARK AS PAID (SECTIONS 26-32)
// ----------------------------------------------------
app.patch('/api/orders/:id/payment', async (req, res) => {
  try {
    const { amount, payment_method, paid_by_user_id, paid_by_user_name, notes } = req.body;
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const now = new Date().toISOString();
    const finalAmount = amount !== undefined ? Number(amount) : order.total_amount;
    const method = payment_method || 'CASH';
    const collectorName = paid_by_user_name || 'Authorized Staff';
    const txnId = 'txn_' + Math.random().toString(36).substring(2, 9);

    // 1. Central update of payment status & transaction ID
    await execute('UPDATE orders SET payment_status = ?, payment_transaction_id = ?, updated_at = ? WHERE id = ?', ['PAID', txnId, now, order.id]);

    // 2. Insert into unified payment_transactions table
    await execute(`
      INSERT INTO payment_transactions (
        id, order_id, customer_id, amount, currency, method, provider,
        status, collected_by, collected_by_id, collected_at, verified_at, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'INR', ?, 'MANUAL', 'PAID', ?, ?, ?, ?, ?, ?, ?)
    `, [
      txnId, order.id, order.customer_id, finalAmount, method, collectorName,
      paid_by_user_id || null, now, now, JSON.stringify({ notes: notes || 'Payment marked as PAID' }), now, now
    ]);

    // 3. Audit Trail Record in payment_audits
    const auditId = 'pay_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO payment_audits (id, order_id, store_id, amount, payment_method, paid_by_user_id, paid_by_user_name, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      auditId, order.id, order.store_id, finalAmount, method,
      paid_by_user_id || null, collectorName, notes || 'COD payment collected & verified', now
    ]);

    // 4. Status History Entry
    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'osh_' + Math.random().toString(36).substring(2, 9),
      order.id,
      order.status,
      'PAID',
      `Payment of ₹${finalAmount} collected via ${method} by ${collectorName}`,
      collectorName,
      now
    ]);

    // 5. Automatic Real-time Synchronization across owner dashboard & delivery boy app
    broadcastEvent('order_payment_updated', {
      order_id: order.id,
      order_number: order.order_number,
      payment_status: 'PAID',
      amount: finalAmount,
      payment_method: method,
      collected_by: collectorName,
      paid_at: now
    });

    broadcastEvent('order_updated', {
      order_id: order.id,
      payment_status: 'PAID'
    });

    res.json({
      success: true,
      message: 'Payment recorded and order marked as PAID',
      order_id: order.id,
      payment_status: 'PAID',
      transaction_id: txnId,
      paid_at: now,
      collected_by: collectorName
    });
  } catch (err) {
    console.error('[Mark Paid Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Assign Delivery Boy to Order (Section 20-21)
app.patch('/api/orders/:id/assign-delivery', async (req, res) => {
  try {
    const { delivery_boy_id, delivery_boy_name, assigned_by } = req.body;
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const now = new Date().toISOString();
    let newStatus = order.status;
    if (['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status)) {
      newStatus = 'ASSIGNED';
    }

    await execute(`
      UPDATE orders SET
        assigned_delivery_boy_id = ?,
        assigned_delivery_boy_name = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `, [delivery_boy_id, delivery_boy_name, newStatus, now, order.id]);

    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'osh_' + Math.random().toString(36).substring(2, 9),
      order.id,
      newStatus,
      order.payment_status,
      `Order assigned to delivery boy: ${delivery_boy_name}`,
      assigned_by || 'Store Manager',
      now
    ]);

    broadcastEvent('order_assigned', {
      order_id: order.id,
      order_number: order.order_number,
      delivery_boy_id,
      delivery_boy_name,
      status: newStatus,
      updated_at: now
    });

    broadcastEvent('order_updated', { order_id: order.id, status: newStatus });

    res.json({
      success: true,
      order_id: order.id,
      assigned_delivery_boy_name: delivery_boy_name,
      status: newStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delivery Boy: View assigned orders (Section 17-18)
app.get('/api/orders/delivery-boy/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const orders = await query(`
      SELECT * FROM orders
      WHERE (assigned_delivery_boy_id = ? OR assigned_delivery_boy_id IS NULL)
        AND order_type = 'ONLINE_DELIVERY'
        AND status IN ('ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED')
      ORDER BY
        CASE
          WHEN status = 'OUT_FOR_DELIVERY' THEN 1
          WHEN status = 'ASSIGNED' THEN 2
          WHEN status = 'READY' THEN 3
          WHEN status = 'PREPARING' THEN 4
          WHEN status = 'ACCEPTED' THEN 5
          ELSE 6
        END,
        created_at DESC
    `, [userId]);

    const enriched = await Promise.all(orders.map(async o => {
      const items = await query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
      return { ...o, items };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Counter Pickup Verification (Section 68)
app.post('/api/orders/verify-pickup', async (req, res) => {
  try {
    const { order_id, pickup_code } = req.body;
    const order = await getOne('SELECT * FROM orders WHERE id = ? OR order_number = ?', [order_id, order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.pickup_code && String(order.pickup_code).trim() !== String(pickup_code).trim()) {
      return res.status(400).json({ error: `Invalid pickup code for Order #${order.order_number}` });
    }

    const now = new Date().toISOString();
    await execute("UPDATE orders SET status = 'DELIVERED', payment_status = 'PAID', updated_at = ? WHERE id = ?", [now, order.id]);

    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, 'DELIVERED', 'PAID', 'Verified 4-digit pickup code and collected at store counter', 'Cashier', ?)
    `, ['osh_' + Math.random().toString(36).substring(2, 9), order.id, now]);

    broadcastEvent('order_status_updated', {
      order_id: order.id,
      order_number: order.order_number,
      new_status: 'DELIVERED',
      payment_status: 'PAID'
    });

    res.json({ success: true, message: 'Pickup code verified! Order handed over.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DELIVERY SERVICE AREA MANAGEMENT (SECTIONS 2-9)
// ----------------------------------------------------
app.get('/api/delivery-areas', async (req, res) => {
  try {
    const areas = await query('SELECT * FROM delivery_areas ORDER BY area_name ASC');
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delivery-areas', async (req, res) => {
  try {
    const { area_name, pincodes, delivery_charge, min_order_value, estimated_delivery, is_active } = req.body;
    if (!area_name || !pincodes) {
      return res.status(400).json({ error: 'Area name and at least one PIN code are required' });
    }
    const store = await getOne('SELECT id FROM stores LIMIT 1');
    const id = 'area_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO delivery_areas (id, store_id, area_name, pincodes, delivery_charge, min_order_value, estimated_delivery, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, store.id, area_name.trim(), pincodes.trim(),
      delivery_charge !== undefined ? Number(delivery_charge) : 30,
      min_order_value !== undefined ? Number(min_order_value) : 199,
      estimated_delivery || '30–45 minutes',
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      now, now
    ]);

    broadcastEvent('delivery_areas_updated', { id, area_name });
    res.json({ success: true, id, message: 'Delivery area created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/delivery-areas/:id', async (req, res) => {
  try {
    const { area_name, pincodes, delivery_charge, min_order_value, estimated_delivery, is_active } = req.body;
    const now = new Date().toISOString();

    await execute(`
      UPDATE delivery_areas SET
        area_name = ?, pincodes = ?, delivery_charge = ?, min_order_value = ?,
        estimated_delivery = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `, [
      area_name.trim(), pincodes.trim(),
      Number(delivery_charge) || 0,
      Number(min_order_value) || 0,
      estimated_delivery || '30–45 minutes',
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      now, req.params.id
    ]);

    broadcastEvent('delivery_areas_updated', { id: req.params.id });
    res.json({ success: true, message: 'Delivery area updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/delivery-areas/:id', async (req, res) => {
  try {
    await execute('DELETE FROM delivery_areas WHERE id = ?', [req.params.id]);
    broadcastEvent('delivery_areas_updated', { id: req.params.id });
    res.json({ success: true, message: 'Delivery area deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delivery-areas/validate-pincode', async (req, res) => {
  try {
    const { pincode } = req.body;
    if (!pincode) return res.status(400).json({ error: 'PIN Code is required' });
    const cleanPin = String(pincode).trim();
    const activeAreas = await query('SELECT * FROM delivery_areas WHERE is_active = 1');

    const matched = activeAreas.find(a => {
      const pins = a.pincodes.split(/[\s,]+/).map(p => p.trim());
      return pins.includes(cleanPin);
    });

    if (matched) {
      return res.json({
        serviceable: true,
        area: matched,
        message: 'Delivery available in your area'
      });
    }

    res.json({
      serviceable: false,
      message: 'Sorry, home delivery is currently unavailable in your area.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// USERS & ROLES: OWNER, SUB-ADMIN, DELIVERY BOY (SECTIONS 15-25)
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, pin, password } = req.body;
    const credential = pin || password;
    if (!phone || !credential) {
      return res.status(400).json({ error: 'Mobile number and Security PIN/Password are required' });
    }

    const cleanPhone = String(phone).trim();
    const cleanSecret = String(credential).trim();

    // Check user: match phone and pin
    const user = await getOne('SELECT * FROM users WHERE phone = ? AND pin = ? AND status = "ACTIVE"', [cleanPhone, cleanSecret]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid mobile number or PIN. Please verify your credentials.' });
    }

    const isPlatformAdmin = user.role === 'PLATFORM_ADMIN';
    let userTenant = null;

    if (!isPlatformAdmin) {
      const tenantId = user.tenant_id || user.store_id || req.tenant?.id || 'store_royal_001';
      userTenant = await getOne('SELECT * FROM tenants WHERE id = ?', [tenantId]);
    }

    let permissions = [];
    try {
      permissions = JSON.parse(user.permissions || '[]');
    } catch {
      permissions = [];
    }

    await logAuditEvent({
      tenantId: userTenant?.id || 'platform',
      userId: user.id,
      userName: user.name,
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
      newValues: { role: user.role, is_platform_admin: isPlatformAdmin }
    });

    const token = tokenService.generateToken({
      userId: user.id,
      tenantId: user.tenant_id || user.store_id || 'store_royal_001',
      name: user.name,
      phone: user.phone,
      role: user.role,
      permissions
    });

    res.json({
      success: true,
      token,
      is_platform_admin: isPlatformAdmin,
      user: {
        id: user.id,
        tenant_id: user.tenant_id || user.store_id || null,
        name: user.name,
        phone: user.phone,
        role: user.role,
        permissions,
        status: user.status,
        availability: user.availability,
        photo_url: user.photo_url,
        address: user.address,
        emergency_contact: user.emergency_contact
      },
      tenant: userTenant
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify & Hydrate Authenticated Session via Token
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    const token = tokenService.extractToken(authHeader);
    const decoded = tokenService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const user = await getOne('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    let permissions = [];
    try { permissions = JSON.parse(user.permissions || '[]'); } catch {}
    res.json({
      user: {
        id: user.id,
        tenant_id: user.tenant_id || user.store_id || null,
        name: user.name,
        phone: user.phone,
        role: user.role,
        permissions,
        status: user.status,
        availability: user.availability,
        photo_url: user.photo_url,
        address: user.address
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const isPlatformAdmin = req.headers['x-admin-role'] === 'PLATFORM_ADMIN';
    let sql = isPlatformAdmin
      ? 'SELECT id, store_id, tenant_id, name, phone, role, permissions, photo_url, address, emergency_contact, status, availability, created_at, updated_at FROM users ORDER BY created_at ASC'
      : 'SELECT id, store_id, tenant_id, name, phone, role, permissions, photo_url, address, emergency_contact, status, availability, created_at, updated_at FROM users WHERE (tenant_id = ? OR store_id = ?) ORDER BY created_at ASC';
    const params = isPlatformAdmin ? [] : [tenantId, tenantId];

    const users = await query(sql, params);
    const parsed = users.map(u => ({
      ...u,
      permissions: (() => { try { return JSON.parse(u.permissions); } catch { return []; } })()
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, phone, pin, role, permissions, photo_url, address, emergency_contact, status, availability } = req.body;
    if (!name || !phone || !pin || !role) {
      return res.status(400).json({ error: 'Name, phone, PIN, and role are required' });
    }

    const tenantId = req.tenant?.id || 'store_royal_001';
    const existing = await getOne('SELECT id FROM users WHERE phone = ? AND (tenant_id = ? OR store_id = ?)', [phone.trim(), tenantId, tenantId]);
    if (existing) {
      return res.status(400).json({ error: `A user account with phone ${phone} already exists in this store.` });
    }

    const id = 'usr_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO users (id, store_id, tenant_id, name, phone, pin, role, permissions, photo_url, address, emergency_contact, status, availability, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, tenantId, tenantId, name.trim(), phone.trim(), pin.trim(), role,
      JSON.stringify(permissions || []), photo_url || '', address || '',
      emergency_contact || '', status || 'ACTIVE', availability || 'ONLINE', now, now
    ]);

    broadcastEvent('users_updated', { id, role, name, tenant_id: tenantId }, tenantId);
    res.json({ success: true, id, message: 'User account created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, phone, pin, role, permissions, photo_url, address, emergency_contact, status, availability } = req.body;
    const existing = await getOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const now = new Date().toISOString();

    await execute(`
      UPDATE users SET
        name = ?, phone = ?, pin = ?, role = ?, permissions = ?,
        photo_url = ?, address = ?, emergency_contact = ?, status = ?,
        availability = ?, updated_at = ?
      WHERE id = ?
    `, [
      name || existing.name,
      phone || existing.phone,
      pin || existing.pin,
      role || existing.role,
      permissions ? JSON.stringify(permissions) : existing.permissions,
      photo_url !== undefined ? photo_url : existing.photo_url,
      address !== undefined ? address : existing.address,
      emergency_contact !== undefined ? emergency_contact : existing.emergency_contact,
      status || existing.status,
      availability || existing.availability,
      now, req.params.id
    ]);

    broadcastEvent('users_updated', { id: req.params.id });
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id/availability', async (req, res) => {
  try {
    const { availability } = req.body;
    if (!['ONLINE', 'OFFLINE', 'BUSY'].includes(availability)) {
      return res.status(400).json({ error: 'Invalid availability state' });
    }
    const now = new Date().toISOString();
    await execute('UPDATE users SET availability = ?, updated_at = ? WHERE id = ?', [availability, now, req.params.id]);
    broadcastEvent('delivery_boy_status_updated', { id: req.params.id, availability });
    res.json({ success: true, availability });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    broadcastEvent('users_updated', { id: req.params.id });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hardware Device Status (Section 56-58)
app.get('/api/hardware/status', async (req, res) => {
  try {
    const store = await getOne('SELECT printer_width, printer_connection FROM stores LIMIT 1');
    res.json({
      thermal_printer: {
        status: 'CONNECTED',
        width: store?.printer_width || '80mm',
        connection: store?.printer_connection || 'BROWSER_DIRECT'
      },
      barcode_scanner: {
        status: 'CONNECTED',
        mode: 'KEYBOARD_EMULATION_HID',
        last_heartbeat: new Date().toISOString()
      },
      weighing_scale: {
        status: 'CONNECTED',
        mode: 'SIMULATED_SERIAL',
        unit: 'KG'
      },
      cash_drawer: {
        status: 'CONNECTED',
        trigger_pin: 'RJ11_PRINTER_KICK'
      },
      customer_display: {
        status: 'CONNECTED',
        mode: 'BROWSER_SECOND_SCREEN'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. CUSTOMERS & KHATA LEDGER
// ----------------------------------------------------
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await query('SELECT * FROM customers ORDER BY name ASC');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, email, address, credit_balance } = req.body;
    const store = await getOne('SELECT id FROM stores LIMIT 1');
    const id = 'cust_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO customers (id, store_id, name, phone, email, address, credit_balance, total_spent, orders_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, store.id, name, phone, email || '', address || '', Number(credit_balance) || 0, 0, 0, now]);

    res.json({ success: true, id, name, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id/ledger', async (req, res) => {
  try {
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const ledger = await query('SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC', [customer.id]);
    res.json({ customer, ledger });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/:id/ledger', async (req, res) => {
  try {
    const { type, amount, notes } = req.body;
    // type: 'PAYMENT_RECEIVED' (reduces credit balance) or 'CREDIT_GIVEN' (increases credit balance)
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const numAmt = Number(amount);
    let newBalance = customer.credit_balance;
    if (type === 'PAYMENT_RECEIVED') {
      newBalance = Math.max(0, newBalance - numAmt);
    } else {
      newBalance += numAmt;
    }

    const now = new Date().toISOString();
    await execute('UPDATE customers SET credit_balance = ? WHERE id = ?', [newBalance, customer.id]);

    await execute(`
      INSERT INTO customer_ledger (id, customer_id, store_id, type, amount, balance_after, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'led_' + Math.random().toString(36).substring(2, 9),
      customer.id, customer.store_id, type, numAmt, newBalance, notes || '', now
    ]);

    res.json({ success: true, new_balance: newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. REPORTS & ANALYTICS
// ----------------------------------------------------
app.get('/api/reports/dashboard', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const today = new Date().toISOString().split('T')[0];
    const allSales = await query('SELECT order_type, payment_method, status, total_amount, created_at FROM orders WHERE (tenant_id = ? OR store_id = ?) AND status != "CANCELLED"', [tenantId, tenantId]);

    let totalSales = 0;
    let posSales = 0;
    let onlineSales = 0;
    let todaySales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    let creditSales = 0;

    for (const s of allSales) {
      const amt = s.total_amount;
      totalSales += amt;
      if (s.order_type === 'POS') posSales += amt;
      else onlineSales += amt;

      if (s.created_at.startsWith(today)) todaySales += amt;

      if (s.payment_method === 'CASH') cashSales += amt;
      else if (s.payment_method === 'UPI') upiSales += amt;
      else if (s.payment_method === 'CARD') cardSales += amt;
      else if (s.payment_method === 'CREDIT') creditSales += amt;
    }

    // Top Selling Items for this tenant
    const topItems = await query(`
      SELECT oi.product_name, oi.unit, SUM(oi.quantity) as total_qty, SUM(oi.total_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE (o.tenant_id = ? OR o.store_id = ?)
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `, [tenantId, tenantId]);

    // Counts
    const orderCount = await getOne('SELECT COUNT(*) as count FROM orders WHERE tenant_id = ? OR store_id = ?', [tenantId, tenantId]);
    const customerCount = await getOne('SELECT COUNT(*) as count FROM customers WHERE tenant_id = ? OR store_id = ?', [tenantId, tenantId]);
    const lowStockCount = await getOne('SELECT COUNT(*) as count FROM products WHERE (tenant_id = ? OR store_id = ?) AND stock <= min_stock AND stock > 0', [tenantId, tenantId]);
    const outOfStockCount = await getOne('SELECT COUNT(*) as count FROM products WHERE (tenant_id = ? OR store_id = ?) AND (stock - reserved_stock) <= 0', [tenantId, tenantId]);

    res.json({
      summary: {
        total_sales: Math.round(totalSales),
        today_sales: Math.round(todaySales),
        pos_sales: Math.round(posSales),
        online_sales: Math.round(onlineSales),
        orders_count: orderCount?.count || 0,
        customers_count: customerCount?.count || 0,
        low_stock_count: lowStockCount?.count || 0,
        out_of_stock_count: outOfStockCount?.count || 0,
      },
      payment_methods: {
        cash: Math.round(cashSales),
        upi: Math.round(upiSales),
        card: Math.round(cardSales),
        credit: Math.round(creditSales),
      },
      top_items: topItems,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed Discount Reporting (By Product, Reason, Employee, Date)
app.get('/api/reports/discounts', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const today = new Date().toISOString().split('T')[0];

    // Today's total discount
    const todayRow = await getOne(`
      SELECT 
        COALESCE(SUM(oi.discount_amount), 0) as item_discounts,
        (SELECT COALESCE(SUM(o.discount), 0) FROM orders o WHERE (o.tenant_id = ? OR o.store_id = ?) AND o.created_at LIKE ?) as bill_discounts
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE (o.tenant_id = ? OR o.store_id = ?) AND o.created_at LIKE ?
    `, [tenantId, tenantId, `${today}%`, tenantId, tenantId, `${today}%`]);

    const totalToday = (todayRow?.item_discounts || 0) + (todayRow?.bill_discounts || 0);

    // Breakdown by product
    const byProduct = await query(`
      SELECT oi.product_name, COUNT(*) as bills_count, SUM(oi.discount_amount) as total_discount
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE (o.tenant_id = ? OR o.store_id = ?) AND oi.discount_amount > 0
      GROUP BY oi.product_name
      ORDER BY total_discount DESC
      LIMIT 10
    `, [tenantId, tenantId]);

    // Breakdown by reason
    const byReason = await query(`
      SELECT COALESCE(oi.discount_reason, 'CUSTOMER_NEGOTIATION') as reason, COUNT(*) as count, SUM(oi.discount_amount) as total_discount
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE (o.tenant_id = ? OR o.store_id = ?) AND oi.discount_amount > 0
      GROUP BY oi.discount_reason
      ORDER BY total_discount DESC
    `, [tenantId, tenantId]);

    // Recent discount audit items with manager approvals
    const itemsWithApproval = await query(`
      SELECT oi.product_name, oi.discount_amount, oi.discount_type, oi.discount_value, oi.approval_data, oi.discount_reason, o.order_number, o.created_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE (o.tenant_id = ? OR o.store_id = ?) AND oi.discount_amount > 0
      ORDER BY o.created_at DESC
      LIMIT 25
    `, [tenantId, tenantId]);

    res.json({
      today_discounts: Math.round(totalToday * 100) / 100,
      total_discounts_given: Math.round(totalToday * 100) / 100,
      today_item_discounts: Math.round((todayRow?.item_discounts || 0) * 100) / 100,
      today_bill_discounts: Math.round((todayRow?.bill_discounts || 0) * 100) / 100,
      by_product: byProduct,
      by_reason: byReason,
      recent_discount_items: itemsWithApproval.map(item => ({
        ...item,
        approval: (() => { try { return JSON.parse(item.approval_data); } catch { return null; } })()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. THERMAL PRINTER ESC/POS TEST & CONFIG
// ----------------------------------------------------
app.post('/api/printer/test', async (req, res) => {
  try {
    const store = await getOne('SELECT * FROM stores LIMIT 1');
    const testReceipt = {
      store_name: store.name,
      address: store.address,
      phone: store.phone,
      gstin: store.gstin,
      invoice_no: 'TEST-000001',
      date: new Date().toLocaleString('en-IN'),
      cashier: 'Owner Terminal',
      items: [
        { name: 'India Gate Basmati Rice', qty: '1.500 KG', rate: '₹92.00', amount: '₹138.00' },
        { name: 'Tata Salt Iodized 1kg', qty: '1 PACKET', rate: '₹28.00', amount: '₹28.00' },
        { name: 'Amul Pure Ghee 500ml', qty: '1 TIN', rate: '₹345.00', amount: '₹345.00' },
      ],
      subtotal: '₹511.00',
      discount: '₹11.00',
      total: '₹500.00',
      payment_method: 'UPI',
      upi_id: store.upi_id,
      footer: 'Thank you for shopping at ' + store.name + '!\nVisit Again • Save More Every Day',
    };

    res.json({
      success: true,
      message: 'ESC/POS Test Receipt formatted successfully',
      data: testReceipt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// PHASE 3: ADVANCED PAYMENT ARCHITECTURE & RAZORPAY APIS
// ====================================================

// 1. Create Razorpay Payment Order
app.post('/api/payments/razorpay/create-order', async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    const result = await paymentService.createOnlinePayment({
      orderId: order_id,
      method: 'RAZORPAY'
    });

    res.json(result);
  } catch (err) {
    console.error('[Create Razorpay Order Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Server-side Razorpay Signature Verification
app.post('/api/payments/razorpay/verify', async (req, res) => {
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: 'Missing payment verification credentials' });
    }

    const result = await paymentService.verifyRazorpayPayment({
      orderId: order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    await notificationService.createNotification({
      type: 'PAYMENT_SUCCESS',
      title: 'Payment Received (Razorpay)',
      message: `Online payment of ₹${result.amount || ''} verified for Order #${order_id}`,
      entityType: 'order',
      entityId: order_id
    });

    res.json(result);
  } catch (err) {
    console.error('[Verify Razorpay Payment Error]:', err);
    res.status(400).json({ error: err.message });
  }
});

// 3. Webhook Handler with HMAC Signature Verification & Idempotency
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const eventPayload = req.body;

    const result = await paymentService.handleWebhook({
      rawBody,
      signature,
      eventPayload
    });

    res.json(result);
  } catch (err) {
    console.error('[Payment Webhook Error]:', err);
    res.status(400).json({ error: err.message });
  }
});

// 4. Generate Dynamic NPCI UPI QR
app.post('/api/payments/dynamic-qr', async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    const result = await paymentService.createOnlinePayment({
      orderId: order_id,
      method: 'UPI'
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Static Store UPI QR
app.get('/api/payments/static-qr', async (req, res) => {
  try {
    const result = await paymentService.upi.getStaticStoreQR();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Initiate Gateway / Store Refund
app.post('/api/payments/refund', async (req, res) => {
  try {
    const { order_id, amount, reason, initiated_by } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    const result = await paymentService.processRefund({
      orderId: order_id,
      amount,
      reason,
      initiatedBy: initiated_by
    });

    await notificationService.createNotification({
      type: 'REFUND_CREATED',
      title: 'Refund Processed',
      message: `Refund of ₹${result.refund_amount} processed for Order #${order_id}`,
      entityType: 'order',
      entityId: order_id
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Payment Settings (Owner Configuration - Keys are masked in GET for security)
app.get('/api/payments/settings', async (req, res) => {
  try {
    const settings = await getOne('SELECT * FROM payment_settings WHERE id = "default"');
    const store = await getOne('SELECT * FROM stores LIMIT 1');

    if (!settings) {
      return res.json({
        razorpay_enabled: 0,
        razorpay_test_mode: 1,
        razorpay_key_id: '',
        razorpay_key_secret_masked: '',
        store_upi_id: store?.upi_id || 'apnakirana@okhdfcbank',
        store_upi_name: store?.name || 'Apna Kirana',
        cod_enabled: 1,
        cod_min_order: 0,
        cod_max_order: 10000,
        online_payment_enabled: 1,
        cash_enabled: 1,
        upi_enabled: 1,
        card_enabled: 1
      });
    }

    const maskedSecret = settings.razorpay_key_secret
      ? (settings.razorpay_key_secret.length > 8
          ? settings.razorpay_key_secret.substring(0, 4) + '••••••••' + settings.razorpay_key_secret.slice(-4)
          : '••••••••')
      : '';

    res.json({
      ...settings,
      razorpay_key_secret: maskedSecret,
      razorpay_key_secret_masked: maskedSecret,
      has_key_secret: Boolean(settings.razorpay_key_secret)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/payments/settings', async (req, res) => {
  try {
    const existing = await getOne('SELECT * FROM payment_settings WHERE id = "default"');
    const now = new Date().toISOString();

    const {
      razorpay_enabled,
      razorpay_test_mode,
      razorpay_key_id,
      razorpay_key_secret,
      razorpay_webhook_secret,
      store_upi_id,
      store_upi_name,
      store_upi_qr_url,
      cod_enabled,
      cod_min_order,
      cod_max_order,
      online_payment_enabled,
      cash_enabled,
      upi_enabled,
      card_enabled
    } = req.body;

    // Only update key secret if user supplied a new unmasked secret
    let finalSecret = existing?.razorpay_key_secret || '';
    if (razorpay_key_secret && !razorpay_key_secret.includes('••••')) {
      finalSecret = razorpay_key_secret;
    }

    let finalWebhook = existing?.razorpay_webhook_secret || '';
    if (razorpay_webhook_secret && !razorpay_webhook_secret.includes('••••')) {
      finalWebhook = razorpay_webhook_secret;
    }

    await execute(`
      UPDATE payment_settings SET
        razorpay_enabled = ?,
        razorpay_test_mode = ?,
        razorpay_key_id = ?,
        razorpay_key_secret = ?,
        razorpay_webhook_secret = ?,
        store_upi_id = ?,
        store_upi_name = ?,
        store_upi_qr_url = ?,
        cod_enabled = ?,
        cod_min_order = ?,
        cod_max_order = ?,
        online_payment_enabled = ?,
        cash_enabled = ?,
        upi_enabled = ?,
        card_enabled = ?,
        updated_at = ?
      WHERE id = "default"
    `, [
      razorpay_enabled !== undefined ? (razorpay_enabled ? 1 : 0) : existing.razorpay_enabled,
      razorpay_test_mode !== undefined ? (razorpay_test_mode ? 1 : 0) : existing.razorpay_test_mode,
      razorpay_key_id !== undefined ? razorpay_key_id : existing.razorpay_key_id,
      finalSecret,
      finalWebhook,
      store_upi_id !== undefined ? store_upi_id : existing.store_upi_id,
      store_upi_name !== undefined ? store_upi_name : existing.store_upi_name,
      store_upi_qr_url !== undefined ? store_upi_qr_url : existing.store_upi_qr_url,
      cod_enabled !== undefined ? (cod_enabled ? 1 : 0) : existing.cod_enabled,
      cod_min_order !== undefined ? Number(cod_min_order) : existing.cod_min_order,
      cod_max_order !== undefined ? Number(cod_max_order) : existing.cod_max_order,
      online_payment_enabled !== undefined ? (online_payment_enabled ? 1 : 0) : existing.online_payment_enabled,
      cash_enabled !== undefined ? (cash_enabled ? 1 : 0) : existing.cash_enabled,
      upi_enabled !== undefined ? (upi_enabled ? 1 : 0) : existing.upi_enabled,
      card_enabled !== undefined ? (card_enabled ? 1 : 0) : existing.card_enabled,
      now
    ]);

    broadcastEvent('payment_settings_updated', { updated_at: now });

    res.json({ success: true, message: 'Payment settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Payments Reconciliation & Audit
app.get('/api/payments/reconciliation', async (req, res) => {
  try {
    const data = await paymentService.getPaymentReconciliation(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Payment Transactions for an Order
app.get('/api/payments/orders/:orderId/transactions', async (req, res) => {
  try {
    const transactions = await query(`
      SELECT * FROM payment_transactions
      WHERE order_id = ?
      ORDER BY created_at DESC
    `, [req.params.orderId]);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// PHASE 3: DOORSTEP PAYMENT COLLECTION & CASH HANDOVER
// ====================================================

// 10. Record Doorstep Cash Collection
app.post('/api/delivery/cash-collection', async (req, res) => {
  try {
    const {
      order_id,
      agent_id,
      agent_name,
      amount_collected,
      customer_tendered,
      change_returned,
      latitude,
      longitude,
      device_info,
      notes
    } = req.body;

    if (!order_id || !agent_id) {
      return res.status(400).json({ error: 'order_id and agent_id are required' });
    }

    const result = await paymentService.recordDeliveryCashCollection({
      orderId: order_id,
      agentId: agent_id,
      agentName: agent_name || 'Delivery Partner',
      amountCollected: amount_collected,
      customerTendered: customer_tendered,
      changeReturned: change_returned,
      latitude,
      longitude,
      deviceInfo: device_info,
      notes
    });

    await notificationService.createNotification({
      type: 'PAYMENT_SUCCESS',
      title: 'Doorstep Cash Collected',
      message: `${agent_name || 'Delivery Partner'} collected ₹${result.amount_collected} cash for Order #${order_id}`,
      entityType: 'order',
      entityId: order_id
    });

    res.json(result);
  } catch (err) {
    console.error('[Delivery Cash Collection Error]:', err);
    res.status(400).json({ error: err.message });
  }
});

// 11. Delivery Agent Cash Summary
app.get('/api/delivery/cash-summary/:agentId', async (req, res) => {
  try {
    const summary = await paymentService.getAgentCashSummary(req.params.agentId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Confirm Cash Handover Session
app.post('/api/delivery/cash-handover', async (req, res) => {
  try {
    const { agent_id, agent_name, received_amount, notes, approved_by } = req.body;
    if (!agent_id || received_amount === undefined) {
      return res.status(400).json({ error: 'agent_id and received_amount are required' });
    }

    const result = await paymentService.confirmCashHandover({
      agentId: agent_id,
      agentName: agent_name,
      receivedAmount: received_amount,
      notes,
      approvedBy: approved_by || 'Store Owner'
    });

    if (Math.abs(result.difference) > 0) {
      await notificationService.createNotification({
        type: 'CASH_MISMATCH',
        title: 'Cash Handover Discrepancy',
        message: `Handover mismatch of ₹${result.difference} for agent ${agent_name || agent_id}`,
        entityType: 'handover',
        entityId: result.handover_id
      });
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 13. Recent Cash Handovers
app.get('/api/delivery/handover-history', async (req, res) => {
  try {
    const handovers = await query(`
      SELECT * FROM cash_handover_sessions
      ORDER BY handover_time DESC
      LIMIT 50
    `);
    res.json(handovers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// PHASE 3: LIVE DELIVERY TRACKING & OPERATIONS APIS
// ====================================================

// 14. Start Tracking Session
app.post('/api/delivery/start-tracking', async (req, res) => {
  try {
    const { order_id, agent_id, agent_name, latitude, longitude } = req.body;
    if (!order_id || !agent_id) {
      return res.status(400).json({ error: 'order_id and agent_id are required' });
    }

    const session = await deliveryService.startTrackingSession({
      orderId: order_id,
      agentId: agent_id,
      agentName: agent_name || 'Delivery Partner',
      latitude,
      longitude
    });

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Send Live Location Breadcrumb
app.post('/api/delivery/location', async (req, res) => {
  try {
    const { agent_id, order_id, latitude, longitude, accuracy, speed, heading } = req.body;
    if (!agent_id || !latitude || !longitude) {
      return res.status(400).json({ error: 'agent_id, latitude, and longitude are required' });
    }

    const result = await deliveryService.updateLocation({
      agentId: agent_id,
      orderId: order_id,
      latitude,
      longitude,
      accuracy,
      speed,
      heading
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Get Live Tracking Details (Customer & Owner View)
app.get('/api/delivery/tracking/:orderId', async (req, res) => {
  try {
    const details = await deliveryService.getTrackingDetails(req.params.orderId);
    res.json(details);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 17. Record Failed Delivery Attempt
app.post('/api/delivery/failed', async (req, res) => {
  try {
    const { order_id, agent_id, agent_name, reason, notes } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    const result = await deliveryService.recordDeliveryFailure({
      orderId: order_id,
      agentId: agent_id,
      agentName: agent_name,
      reason,
      notes
    });

    await notificationService.createNotification({
      type: 'DELIVERY_FAILED',
      title: `Delivery Failed: Order #${order_id}`,
      message: `Reason: ${reason || 'Customer Unavailable'}. Notes: ${notes || 'None'}`,
      entityType: 'order',
      entityId: order_id
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 18. Live Active Delivery Agents for Owner Dashboard
app.get('/api/delivery/active-agents', async (req, res) => {
  try {
    const agents = await query(`
      SELECT
        u.id, u.name, u.phone, u.availability, u.status, u.photo_url,
        (SELECT COUNT(o.id) FROM orders o WHERE o.assigned_delivery_boy_id = u.id AND o.status IN ('ASSIGNED', 'OUT_FOR_DELIVERY', 'ACCEPTED', 'PREPARING', 'READY')) as active_orders_count,
        (SELECT o.id FROM orders o WHERE o.assigned_delivery_boy_id = u.id AND o.status = 'OUT_FOR_DELIVERY' LIMIT 1) as current_order_id,
        (SELECT o.order_number FROM orders o WHERE o.assigned_delivery_boy_id = u.id AND o.status = 'OUT_FOR_DELIVERY' LIMIT 1) as current_order_number,
        (SELECT o.delivery_address FROM orders o WHERE o.assigned_delivery_boy_id = u.id AND o.status = 'OUT_FOR_DELIVERY' LIMIT 1) as current_order_address,
        (SELECT SUM(dcc.amount_collected) FROM delivery_cash_collections dcc WHERE dcc.agent_id = u.id AND dcc.handover_status = 'PENDING') as pending_cash_held,
        (SELECT dts.current_lat FROM delivery_tracking_sessions dts WHERE dts.agent_id = u.id AND dts.status = 'ACTIVE' LIMIT 1) as current_lat,
        (SELECT dts.current_lng FROM delivery_tracking_sessions dts WHERE dts.agent_id = u.id AND dts.status = 'ACTIVE' LIMIT 1) as current_lng,
        (SELECT dts.updated_at FROM delivery_tracking_sessions dts WHERE dts.agent_id = u.id AND dts.status = 'ACTIVE' LIMIT 1) as location_updated_at
      FROM users u
      WHERE u.role = 'DELIVERY_BOY' AND u.status = 'ACTIVE'
      ORDER BY active_orders_count DESC, u.name ASC
    `);

    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// PHASE 3: NOTIFICATION APIS
// ====================================================

// 19. Notifications List
app.get('/api/notifications', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const notifs = await notificationService.getNotifications({ limit });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 20. Notification Unread Count
app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 21. Mark Single Notification Read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const result = await notificationService.markAsRead(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 22. Mark All Notifications Read
app.post('/api/notifications/mark-all-read', async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Production Static File Serving & Single Page App (SPA) Routing
// ----------------------------------------------------
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    // Only handle non-API GET routes with SPA index.html fallback
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

// Startup & Database Initializer
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Kirana Central Database & API Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization error:', err);
});
