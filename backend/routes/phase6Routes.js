import express from 'express';
import { query, getOne, execute, isMySQL } from '../db.js';
import { generateSampleExcelBuffer, validateImportFile, executeBulkImport } from '../services/excelImportService.js';
import { whatsappService } from '../services/whatsappService.js';
import { analyticsService } from '../services/analyticsService.js';
import { logAuditEvent } from '../tenant/tenantMiddleware.js';
import { barcodeService, logBarcodeAudit } from '../services/barcodeService.js';

const router = express.Router();

// ----------------------------------------------------
// 1. BULK PRODUCT EXCEL TEMPLATE & IMPORT
// ----------------------------------------------------

// Download official 4-sheet Excel template
router.get('/products/import/template', (req, res) => {
  try {
    const buffer = generateSampleExcelBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="grocery_product_bulk_upload_template.xlsx"');
    res.send(buffer);
  } catch (err) {
    console.error('[Template Generation Error]:', err);
    res.status(500).json({ error: 'Failed to generate Excel template: ' + err.message });
  }
});

// Validate uploaded Excel file (from Base64 or raw body)
router.post('/products/import/validate', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    let fileBuffer = null;

    if (req.body.fileBase64) {
      const base64Data = req.body.fileBase64.replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else if (req.rawBody) {
      fileBuffer = Buffer.from(req.rawBody);
    } else {
      return res.status(400).json({ error: 'No Excel file data received. Please select an .xlsx or .xls file.' });
    }

    if (fileBuffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 15MB.' });
    }

    const validationResult = await validateImportFile(fileBuffer, tenantId);
    res.json(validationResult);
  } catch (err) {
    console.error('[Excel Validate Error]:', err);
    res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

// Confirm and execute bulk import
router.post('/products/import/confirm', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { rows, mode } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No validated product rows provided for import.' });
    }

    const result = await executeBulkImport(rows, tenantId, mode || 'CREATE_AND_UPDATE', req.user);
    res.json(result);
  } catch (err) {
    console.error('[Bulk Import Confirm Error]:', err);
    res.status(500).json({ error: 'Bulk import failed: ' + err.message });
  }
});

// ----------------------------------------------------
// 2. INTELLIGENT BARCODE SCAN-TO-BILL, AUTO-RECOGNITION & CREATION
// ----------------------------------------------------

// GET /products/barcode/:barcode — 3-Level Barcode Lookup (Tenant -> Global Master -> External Provider)
router.get('/products/barcode/:barcode', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const barcode = req.params.barcode.trim();
    const result = await barcodeService.lookup(barcode, tenantId, req.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /products/from-barcode — Auto product creation from recognized barcode or quick-create
router.post('/products/from-barcode', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const p = req.body;
    const cleanBarcode = barcodeService.normalizeBarcode(p.barcode);

    if (!cleanBarcode) {
      return res.status(400).json({ error: 'Valid barcode is required.' });
    }
    if (!p.name || !p.name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    // Duplicate check strictly for this tenant
    const existing = await getOne(`
      SELECT id, name FROM products 
      WHERE (tenant_id = ? OR store_id = ?) AND barcode = ?
      LIMIT 1
    `, [tenantId, tenantId, cleanBarcode]);

    if (existing) {
      await logBarcodeAudit(tenantId, tenantId, 'BARCODE_DUPLICATE_REJECTED', cleanBarcode, {
        existing_id: existing.id,
        existing_name: existing.name
      }, req.user?.name);
      return res.status(400).json({
        error: `This barcode is already assigned to "${existing.name}". Please pick another barcode or update that product.`
      });
    }

    // Resolve or map Category
    let categoryId = p.category_id;
    if (!categoryId) {
      const catMatch = await getOne(`
        SELECT id FROM categories 
        WHERE (tenant_id = ? OR store_id = ?) 
          AND (LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?))
        LIMIT 1
      `, [tenantId, tenantId, p.category_name || 'Grocery', (p.category_name || 'grocery').toLowerCase().replace(/\s+/g, '-')]);

      if (catMatch) {
        categoryId = catMatch.id;
      } else {
        const defaultCat = await getOne(`
          SELECT id FROM categories WHERE (tenant_id = ? OR store_id = ?) LIMIT 1
        `, [tenantId, tenantId]);
        categoryId = defaultCat?.id || 'cat_grocery_01';
      }
    }

    const id = 'prod_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const purchaseCost = Number(p.purchase_cost) || 0;
    const sellingPrice = Number(p.selling_price) || Number(p.mrp) || 0;
    const mrp = Number(p.mrp) || sellingPrice;
    const gstPercent = Number(p.gst_percent) || 0;
    const openingStock = Math.max(0, Number(p.opening_stock) || Number(p.stock) || 0);
    const minStock = Number(p.min_stock) || 5;

    await execute(`
      INSERT INTO products (
        id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
        purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
        pos_price, website_price, gst_percent, stock, reserved_stock, min_stock,
        is_active, is_visible_online, is_pos_available, is_featured, is_bestseller,
        is_offer, photo_url, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, tenantId, tenantId, categoryId, p.name.trim(), p.brand?.trim() || '', cleanBarcode, p.unit || 'PACKET',
      p.is_loose ? 1 : 0, purchaseCost, sellingPrice, mrp, Number(p.wholesale_price) || sellingPrice,
      Number(p.min_selling_price) || purchaseCost, sellingPrice, sellingPrice, gstPercent, openingStock, 0, minStock,
      1, 1, 1, 0, 0, 0,
      p.photo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      p.description || '', now, now
    ]);

    // Initial price history
    await execute(`
      INSERT INTO price_history (id, product_id, old_price, new_price, changed_by, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['ph_' + Math.random().toString(36).substring(2, 9), id, sellingPrice, sellingPrice, req.user?.name || 'POS Cashier', 'Initial price on barcode creation', now]);

    // Initial stock movement if opening stock > 0
    if (openingStock > 0) {
      await execute(`
        INSERT INTO stock_movements (id, store_id, tenant_id, product_id, change_qty, balance_qty, type, reference_id, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, ['sm_' + Math.random().toString(36).substring(2, 9), tenantId, tenantId, id, openingStock, openingStock, 'OPENING_STOCK', 'INITIAL', 'Opening stock on product creation via barcode scan', now]);
    }

    await logBarcodeAudit(tenantId, tenantId, 'PRODUCT_CREATED_FROM_BARCODE', id, {
      barcode: cleanBarcode,
      name: p.name,
      selling_price: sellingPrice,
      opening_stock: openingStock
    }, req.user?.name);

    // Retrieve the complete product record with category name
    const createdProduct = await getOne(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]);

    res.json({
      success: true,
      message: `Product "${p.name}" created and added to store catalog`,
      product: {
        ...createdProduct,
        available_stock: openingStock,
        is_in_stock: openingStock > 0,
        stock_status: openingStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /products/assign-barcode — Assigns a scanned barcode to an existing store product
router.post('/products/assign-barcode', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { product_id, barcode } = req.body;
    const cleanBarcode = barcodeService.normalizeBarcode(barcode);

    if (!cleanBarcode) {
      return res.status(400).json({ error: 'Valid barcode is required.' });
    }
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required.' });
    }

    // Check if barcode already belongs to another product in this tenant
    const existing = await getOne(`
      SELECT id, name FROM products 
      WHERE (tenant_id = ? OR store_id = ?) AND barcode = ? AND id != ?
      LIMIT 1
    `, [tenantId, tenantId, cleanBarcode, product_id]);

    if (existing) {
      return res.status(400).json({
        error: `This barcode is already assigned to "${existing.name}". Please pick another product or clear its barcode first.`
      });
    }

    const now = new Date().toISOString();
    await execute(`
      UPDATE products 
      SET barcode = ?, updated_at = ?
      WHERE id = ? AND (tenant_id = ? OR store_id = ?)
    `, [cleanBarcode, now, product_id, tenantId, tenantId]);

    await logBarcodeAudit(tenantId, tenantId, 'BARCODE_ASSIGNED', product_id, {
      barcode: cleanBarcode,
      product_id
    }, req.user?.name);

    const updated = await getOne(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [product_id]);

    res.json({
      success: true,
      message: `Barcode ${cleanBarcode} assigned to "${updated.name}" successfully`,
      product: {
        ...updated,
        available_stock: Math.max(0, (Number(updated.stock) || 0) - (updated.reserved_stock || 0)),
        is_in_stock: (Number(updated.stock) || 0) > 0,
        stock_status: (Number(updated.stock) || 0) <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /products/search-for-barcode — Search unbarcoded or all store products to assign scanned barcode
router.get('/products/search-for-barcode', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const q = (req.query.q || '').trim();

    let sql = `
      SELECT p.id, p.name, p.brand, p.barcode, p.sku, p.unit, p.selling_price, p.mrp, p.stock, p.photo_url, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.tenant_id = ? OR p.store_id = ?)
    `;
    const params = [tenantId, tenantId];

    if (q) {
      sql += ` AND (p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)`;
      const term = `%${q}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY p.name ASC LIMIT 25`;
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /products/barcode/:barcode/price-stock — Bulk price & stock update by barcode
router.put('/products/barcode/:barcode/price-stock', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const barcode = req.params.barcode.trim();
    const { new_cost, new_selling_price, new_mrp, set_stock, add_stock } = req.body;

    const prod = await getOne(
      'SELECT * FROM products WHERE (barcode = ? OR sku = ?) AND (tenant_id = ? OR store_id = ?) LIMIT 1',
      [barcode, barcode, tenantId, tenantId]
    );

    if (!prod) return res.status(404).json({ error: `Product with barcode "${barcode}" not found.` });

    const now = new Date().toISOString();
    const updates = [];
    const params = [];

    const oldCost = Number(prod.purchase_cost);
    const oldSelling = Number(prod.selling_price);
    const oldMrp = Number(prod.mrp);
    const oldStock = Number(prod.stock);

    const newCost = (new_cost !== undefined && new_cost !== null) ? parseFloat(new_cost) : oldCost;
    const newSelling = (new_selling_price !== undefined && new_selling_price !== null) ? parseFloat(new_selling_price) : oldSelling;
    const newMrp = (new_mrp !== undefined && new_mrp !== null) ? parseFloat(new_mrp) : oldMrp;

    let newStock = oldStock;
    if (set_stock !== undefined && set_stock !== null) {
      newStock = parseFloat(set_stock);
    } else if (add_stock !== undefined && add_stock !== null) {
      newStock = oldStock + parseFloat(add_stock);
    }

    await execute(`
      UPDATE products SET
        purchase_cost = ?, selling_price = ?, pos_price = ?, website_price = ?, mrp = ?, stock = ?, updated_at = ?
      WHERE id = ?
    `, [newCost, newSelling, newSelling, newSelling, newMrp, newStock, now, prod.id]);

    // Record price history if price changed
    if (newCost !== oldCost || newSelling !== oldSelling) {
      await execute(`
        INSERT INTO product_price_history (
          id, tenant_id, product_id, old_purchase_price, new_purchase_price,
          old_selling_price, new_selling_price, old_mrp, new_mrp, changed_by, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'pph_' + Math.random().toString(36).substring(2, 9),
        tenantId, prod.id, oldCost, newCost, oldSelling, newSelling, oldMrp, newMrp,
        req.user?.name || 'Bulk Update', 'Bulk price & stock update via CSV', now
      ]);
    }

    // Record stock transaction if stock changed
    if (newStock !== oldStock) {
      await execute(`
        INSERT INTO inventory_transactions (
          id, tenant_id, product_id, product_name, quantity, unit, transaction_type,
          reference_id, previous_stock, new_stock, unit_cost, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'tx_' + Math.random().toString(36).substring(2, 9),
        tenantId, prod.id, prod.name,
        Math.abs(newStock - oldStock), prod.unit,
        add_stock !== undefined ? 'STOCK_RECEIVE' : 'ADJUSTMENT',
        'BULK_CSV_UPDATE', oldStock, newStock, newCost,
        'Bulk price & stock update via CSV upload',
        req.user?.name || 'Bulk Update', now
      ]);
    }

    res.json({ success: true, message: `Updated: ${prod.name}` });
  } catch (err) {
    console.error('[Bulk Price-Stock Update Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. BARCODE-BASED STOCK RECEIVING
// ----------------------------------------------------
router.post('/inventory/receive', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const {
      product_id,
      barcode,
      received_quantity,
      purchase_price,
      update_purchase_cost,
      update_selling_price,
      new_selling_price,
      supplier_id,
      supplier_name,
      invoice_no,
      notes
    } = req.body;

    const qty = parseFloat(received_quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Received quantity must be greater than 0.' });
    }

    let prod = null;
    if (product_id) {
      prod = await getOne('SELECT * FROM products WHERE id = ? AND (tenant_id = ? OR store_id = ?)', [product_id, tenantId, tenantId]);
    } else if (barcode) {
      prod = await getOne('SELECT * FROM products WHERE barcode = ? AND (tenant_id = ? OR store_id = ?)', [barcode.trim(), tenantId, tenantId]);
    }

    if (!prod) {
      return res.status(404).json({ error: 'Product not found for stock receiving.' });
    }

    const previousStock = Number(prod.stock) || 0;
    const newStock = previousStock + qty;
    const now = new Date().toISOString();

    const newPurchaseCost = (purchase_price !== undefined && purchase_price !== null && !isNaN(parseFloat(purchase_price)))
      ? parseFloat(purchase_price)
      : Number(prod.purchase_cost);

    let finalSellingPrice = Number(prod.selling_price);
    if (update_selling_price && new_selling_price && !isNaN(parseFloat(new_selling_price))) {
      finalSellingPrice = parseFloat(new_selling_price);
    }

    const effectiveCost = update_purchase_cost ? newPurchaseCost : Number(prod.purchase_cost);

    // Update product stock and optionally cost/price
    await execute(`
      UPDATE products SET
        stock = ?,
        purchase_cost = ?,
        selling_price = ?,
        pos_price = ?,
        website_price = ?,
        updated_at = ?
      WHERE id = ?
    `, [newStock, effectiveCost, finalSellingPrice, finalSellingPrice, finalSellingPrice, now, prod.id]);

    // Record in inventory_transactions
    const txId = 'tx_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO inventory_transactions (
        id, tenant_id, product_id, product_name, quantity, unit, transaction_type,
        reference_id, previous_stock, new_stock, unit_cost, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      txId, tenantId, prod.id, prod.name, qty, prod.unit, 'STOCK_RECEIVE',
      invoice_no || 'RECEIVE_COUNTER', previousStock, newStock, newPurchaseCost,
      notes || `Stock received from ${supplier_name || 'Supplier'} (Inv #${invoice_no || 'N/A'})`,
      req.user?.name || 'Stock Manager', now
    ]);

    // Record purchase price history
    if (update_purchase_cost && newPurchaseCost !== Number(prod.purchase_cost)) {
      await execute(`
        INSERT INTO product_purchase_price_history (
          id, tenant_id, product_id, purchase_price, quantity, supplier_id,
          supplier_name, purchase_invoice_id, effective_date, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'ppph_' + Math.random().toString(36).substring(2, 9),
        tenantId, prod.id, newPurchaseCost, qty, supplier_id || null,
        supplier_name || 'Supplier', invoice_no || null, now,
        req.user?.name || 'Stock Manager', now
      ]);
    }

    // Record price history if selling price changed
    if (finalSellingPrice !== Number(prod.selling_price)) {
      await execute(`
        INSERT INTO product_price_history (
          id, tenant_id, product_id, old_purchase_price, new_purchase_price,
          old_selling_price, new_selling_price, old_mrp, new_mrp, changed_by, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'pph_' + Math.random().toString(36).substring(2, 9),
        tenantId, prod.id, prod.purchase_cost, effectiveCost,
        prod.selling_price, finalSellingPrice, prod.mrp, Math.max(prod.mrp, finalSellingPrice),
        req.user?.name || 'Stock Manager', 'Selling price adjusted during stock intake', now
      ]);
    }

    res.json({
      success: true,
      transaction_id: txId,
      product_id: prod.id,
      product_name: prod.name,
      previous_stock: previousStock,
      received_quantity: qty,
      new_stock: newStock,
      purchase_cost: effectiveCost,
      selling_price: finalSellingPrice
    });
  } catch (err) {
    console.error('[Stock Receive Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. INVENTORY TRANSACTIONS & STOCK HISTORY
// ----------------------------------------------------
router.get('/inventory/history/:productId', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const transactions = await query(`
      SELECT * FROM inventory_transactions
      WHERE product_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 100
    `, [req.params.productId, tenantId]);

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventory/transactions', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { type, limit } = req.query;

    let sql = 'SELECT * FROM inventory_transactions WHERE (tenant_id = ? OR tenant_id IS NULL)';
    const params = [tenantId];

    if (type) {
      sql += ' AND transaction_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit ? parseInt(limit) : 50);

    const txs = await query(sql, params);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Price history for product
router.get('/products/:id/price-history', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const history = await query(`
      SELECT * FROM product_price_history
      WHERE product_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
      ORDER BY created_at DESC
    `, [req.params.id, tenantId]);

    const purchaseHistory = await query(`
      SELECT * FROM product_purchase_price_history
      WHERE product_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
      ORDER BY created_at DESC
    `, [req.params.id, tenantId]);

    res.json({
      price_history: history,
      purchase_history: purchaseHistory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. CUSTOMER QUICK LOOKUP AT POS
// ----------------------------------------------------
router.get('/customers/lookup/:mobile', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const rawMobile = req.params.mobile.replace(/[^0-9]/g, '');

    const customer = await getOne(`
      SELECT * FROM customers
      WHERE (tenant_id = ? OR store_id = ?)
        AND (phone LIKE ? OR phone LIKE ?)
      LIMIT 1
    `, [tenantId, tenantId, `%${rawMobile}`, rawMobile]);

    if (!customer) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        credit_balance: Number(customer.credit_balance) || 0,
        orders_count: Number(customer.orders_count) || 0,
        total_spent: Number(customer.total_spent) || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. WHATSAPP INVOICE DISPATCH & AUDIT
// ----------------------------------------------------
router.post('/invoices/:id/send-whatsapp', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { phone } = req.body;

    const result = await whatsappService.sendInvoice({
      orderId: req.params.id,
      tenantId,
      customerPhoneOverride: phone || null
    });

    res.json(result);
  } catch (err) {
    console.error('[WhatsApp Send Error]:', err);
    res.status(400).json({ error: err.message });
  }
});

router.get('/invoices/:id/whatsapp-logs', async (req, res) => {
  try {
    const logs = await whatsappService.getOrderWhatsAppLogs(req.params.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /invoices/:id/pdf - Printable & downloadable official store invoice
router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const order = await getOne(
      'SELECT * FROM orders WHERE (id = ? OR order_number = ? OR invoice_number = ?) AND (tenant_id = ? OR store_id = ?)',
      [req.params.id, req.params.id, req.params.id, tenantId, tenantId]
    );

    if (!order) return res.status(404).send('<h2>Invoice not found</h2>');

    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const tenant = (await getOne('SELECT * FROM tenants WHERE id = ?', [tenantId])) ||
                   (await getOne('SELECT * FROM stores LIMIT 1'));

    const isPaid = order.payment_status === 'PAID';
    const totalAmount = Number(order.total_amount).toFixed(2);
    const subtotal = Number(order.subtotal).toFixed(2);
    const discount = Number(order.discount).toFixed(2);
    const gstAmount = Number(order.gst_amount || 0).toFixed(2);

    const upiPayUrl = `upi://pay?pa=${encodeURIComponent(tenant?.upi_id || 'apnakirana@okhdfcbank')}&pn=${encodeURIComponent(tenant?.name || 'Kirana Store')}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('Invoice ' + order.invoice_number)}`;

    const showLogo = tenant?.invoice_show_logo !== 0 && tenant?.logo_url;
    const showGst = tenant?.invoice_show_gst !== 0 && tenant?.gstin;
    const showAddress = tenant?.invoice_show_address !== 0;
    const showPhone = tenant?.invoice_show_phone !== 0;
    const showCustomerName = tenant?.invoice_show_customer_name !== 0;
    const showCustomerMobile = tenant?.invoice_show_customer_mobile !== 0;
    const showDiscount = tenant?.invoice_show_discount !== 0;
    const showTax = tenant?.invoice_show_tax !== 0;
    const footerMsg = tenant?.invoice_footer_message || 'Thank you for shopping with us! Visit again.';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${order.invoice_number}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #f8fafc; color: #1e293b; padding: 24px; display: flex; justify-content: center; }
    .invoice-card { background: #fff; width: 100%; max-width: 680px; padding: 32px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
    .store-logo { max-height: 54px; max-width: 140px; object-fit: contain; margin-bottom: 8px; border-radius: 6px; }
    .store-name { font-size: 1.35rem; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .store-details { font-size: 0.8rem; color: #64748b; line-height: 1.4; margin-top: 4px; }
    .invoice-title { text-align: right; }
    .invoice-badge { display: inline-block; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    .invoice-meta { font-size: 0.8rem; color: #64748b; margin-top: 4px; line-height: 1.4; }
    .customer-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; font-size: 0.85rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 0.75rem; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .summary-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; border-top: 2px solid #f1f5f9; padding-top: 16px; }
    .qr-container { text-align: center; }
    .paid-stamp { display: inline-block; padding: 8px 18px; border: 3px solid #16a34a; color: #16a34a; font-weight: 900; font-size: 1.3rem; border-radius: 8px; transform: rotate(-5deg); text-transform: uppercase; letter-spacing: 2px; }
    .totals-table { width: 280px; }
    .totals-table div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem; }
    .totals-table .grand-total { font-size: 1.15rem; font-weight: 800; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 4px; color: #0f172a; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 0.8rem; color: #64748b; line-height: 1.5; }
    .actions { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }
    .btn { padding: 10px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; border: none; font-size: 0.85rem; }
    .btn-print { background: #16a34a; color: white; }
    .btn-close { background: #e2e8f0; color: #334155; }
    @media print {
      body { background: white; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        ${showLogo ? `<img src="${tenant.logo_url}" class="store-logo" alt="Store Logo" />` : ''}
        <div class="store-name">${tenant?.name || 'Kirana Store'}</div>
        <div class="store-details">
          ${showAddress && tenant?.address ? `<div>${tenant.address}</div>` : ''}
          ${showPhone && tenant?.phone ? `<div>Phone: ${tenant.phone}</div>` : ''}
          ${showGst && tenant?.gstin ? `<div><strong>GSTIN:</strong> ${tenant.gstin}</div>` : ''}
        </div>
      </div>
      <div class="invoice-title">
        <div class="invoice-badge">TAX INVOICE</div>
        <div class="invoice-meta">
          <div><strong>Invoice No:</strong> ${order.invoice_number}</div>
          <div><strong>Order Ref:</strong> ${order.order_number}</div>
          <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    </div>

    <div class="customer-box">
      <div>
        <span style="color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; display: block;">Customer Details:</span>
        <strong>${showCustomerName ? (order.customer_name || 'Walk-in Customer') : 'Valued Customer'}</strong>
        ${showCustomerMobile && order.customer_phone && order.customer_phone !== 'N/A' ? `<div style="color: #475569;">Mobile: ${order.customer_phone}</div>` : ''}
      </div>
      <div class="text-right">
        <span style="color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; display: block;">Payment:</span>
        <strong style="color: ${isPaid ? '#16a34a' : '#ea580c'};">${order.payment_method || 'CASH'} • ${order.payment_status}</strong>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 45%;">Item Description</th>
          <th class="text-center" style="width: 15%;">Qty</th>
          <th class="text-right" style="width: 15%;">Rate</th>
          ${showDiscount ? `<th class="text-right" style="width: 10%;">Disc</th>` : ''}
          <th class="text-right" style="width: 15%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td><strong>${it.product_name}</strong></td>
            <td class="text-center">${it.quantity} ${it.unit}</td>
            <td class="text-right">₹${Number(it.unit_price).toFixed(2)}</td>
            ${showDiscount ? `<td class="text-right" style="color: #16a34a;">${it.discount_amount > 0 ? '-₹' + Number(it.discount_amount).toFixed(2) : '-'}</td>` : ''}
            <td class="text-right"><strong>₹${Number(it.total_price).toFixed(2)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="qr-container">
        ${isPaid ? `
          <div class="paid-stamp">PAID</div>
          <div style="font-size: 0.75rem; color: #16a34a; font-weight: 700; margin-top: 6px;">Payment Confirmed</div>
        ` : `
          <div style="font-size: 0.75rem; font-weight: 700; margin-bottom: 4px; color: #0f172a;">SCAN TO PAY VIA UPI</div>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(upiPayUrl)}" alt="UPI QR" style="border: 1px solid #cbd5e1; border-radius: 4px;" />
          <div style="font-size: 0.65rem; color: #64748b; margin-top: 4px;">UPI ID: ${tenant?.upi_id || 'apnakirana@okhdfcbank'}</div>
        `}
      </div>

      <div class="totals-table">
        <div><span>Subtotal:</span> <span>₹${subtotal}</span></div>
        ${showDiscount && discount > 0 ? `<div style="color: #16a34a;"><span>Total Discount:</span> <span>-₹${discount}</span></div>` : ''}
        ${showTax && gstAmount > 0 ? `<div><span>Tax (Included GST):</span> <span>₹${gstAmount}</span></div>` : ''}
        <div class="grand-total"><span>Grand Total:</span> <span>₹${totalAmount}</span></div>
      </div>
    </div>

    <div class="footer">
      <div><strong>${footerMsg}</strong></div>
      <div>Terms: Goods once sold can be returned or exchanged within 2 days with original invoice.</div>
    </div>

    <div class="actions">
      <button class="btn btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn btn-close" onclick="window.close()">Close</button>
    </div>
  </div>

  ${req.query.print === 'true' ? '<script>window.onload = function() { window.print(); };</script>' : ''}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[Invoice Render Error]:', err);
    res.status(500).send('Error generating invoice: ' + err.message);
  }
});

// ----------------------------------------------------
// 7. INVOICE CUSTOMIZATION & SETTINGS
// ----------------------------------------------------
router.get('/store/invoice-settings', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const tenant = (await getOne('SELECT * FROM tenants WHERE id = ?', [tenantId])) ||
                   (await getOne('SELECT * FROM stores LIMIT 1'));

    res.json({
      invoice_prefix: tenant?.invoice_prefix || 'INV',
      invoice_show_logo: tenant?.invoice_show_logo !== undefined ? Boolean(tenant.invoice_show_logo) : true,
      invoice_show_gst: tenant?.invoice_show_gst !== undefined ? Boolean(tenant.invoice_show_gst) : true,
      invoice_show_address: tenant?.invoice_show_address !== undefined ? Boolean(tenant.invoice_show_address) : true,
      invoice_show_phone: tenant?.invoice_show_phone !== undefined ? Boolean(tenant.invoice_show_phone) : true,
      invoice_show_customer_name: tenant?.invoice_show_customer_name !== undefined ? Boolean(tenant.invoice_show_customer_name) : true,
      invoice_show_customer_mobile: tenant?.invoice_show_customer_mobile !== undefined ? Boolean(tenant.invoice_show_customer_mobile) : true,
      invoice_show_qr: tenant?.invoice_show_qr !== undefined ? Boolean(tenant.invoice_show_qr) : true,
      invoice_show_tax: tenant?.invoice_show_tax !== undefined ? Boolean(tenant.invoice_show_tax) : true,
      invoice_show_discount: tenant?.invoice_show_discount !== undefined ? Boolean(tenant.invoice_show_discount) : true,
      invoice_footer_message: tenant?.invoice_footer_message || 'Thank you for shopping with us! Visit again.',
      invoice_thank_you_message: tenant?.invoice_thank_you_message || 'Thank you for your visit!',
      printer_width: tenant?.printer_width || '80mm',
      printer_connection: tenant?.printer_connection || 'BROWSER_DIRECT',
      whatsapp_enabled: Boolean(tenant?.whatsapp_enabled),
      whatsapp_business_number: tenant?.whatsapp_business_number || '',
      whatsapp_phone_number_id: tenant?.whatsapp_phone_number_id || '',
      whatsapp_account_id: tenant?.whatsapp_account_id || '',
      whatsapp_access_token_configured: Boolean(tenant?.whatsapp_access_token && tenant.whatsapp_access_token.length > 5),
      whatsapp_template_name: tenant?.whatsapp_template_name || 'kirana_invoice_notification',
      whatsapp_auto_send: Boolean(tenant?.whatsapp_auto_send),
      allow_selling_below_cost: Boolean(tenant?.allow_selling_below_cost),
      allow_negative_inventory: Boolean(tenant?.allow_negative_inventory),
      minimum_margin_alert_percent: Number(tenant?.minimum_margin_alert_percent) || 10
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/store/invoice-settings', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const s = req.body;
    const now = new Date().toISOString();

    const existing = await getOne('SELECT whatsapp_access_token FROM tenants WHERE id = ?', [tenantId]);
    let finalAccessToken = existing?.whatsapp_access_token || '';
    if (s.whatsapp_access_token && !s.whatsapp_access_token.includes('••••')) {
      finalAccessToken = s.whatsapp_access_token;
    }

    const updates = [
      ['invoice_prefix', s.invoice_prefix || 'INV'],
      ['invoice_show_logo', s.invoice_show_logo ? 1 : 0],
      ['invoice_show_gst', s.invoice_show_gst ? 1 : 0],
      ['invoice_show_address', s.invoice_show_address ? 1 : 0],
      ['invoice_show_phone', s.invoice_show_phone ? 1 : 0],
      ['invoice_show_customer_name', s.invoice_show_customer_name ? 1 : 0],
      ['invoice_show_customer_mobile', s.invoice_show_customer_mobile ? 1 : 0],
      ['invoice_show_qr', s.invoice_show_qr ? 1 : 0],
      ['invoice_show_tax', s.invoice_show_tax ? 1 : 0],
      ['invoice_show_discount', s.invoice_show_discount ? 1 : 0],
      ['invoice_footer_message', s.invoice_footer_message || 'Thank you for shopping with us! Visit again.'],
      ['invoice_thank_you_message', s.invoice_thank_you_message || 'Thank you for your visit!'],
      ['printer_width', s.printer_width || '80mm'],
      ['printer_connection', s.printer_connection || 'BROWSER_DIRECT'],
      ['whatsapp_enabled', s.whatsapp_enabled ? 1 : 0],
      ['whatsapp_business_number', s.whatsapp_business_number || ''],
      ['whatsapp_phone_number_id', s.whatsapp_phone_number_id || ''],
      ['whatsapp_account_id', s.whatsapp_account_id || ''],
      ['whatsapp_access_token', finalAccessToken],
      ['whatsapp_template_name', s.whatsapp_template_name || 'kirana_invoice_notification'],
      ['whatsapp_auto_send', s.whatsapp_auto_send ? 1 : 0],
      ['allow_selling_below_cost', s.allow_selling_below_cost ? 1 : 0],
      ['allow_negative_inventory', s.allow_negative_inventory ? 1 : 0],
      ['minimum_margin_alert_percent', parseFloat(s.minimum_margin_alert_percent) || 10]
    ];

    for (const [col, val] of updates) {
      try {
        await execute(`UPDATE tenants SET ${col} = ?, updated_at = ? WHERE id = ?`, [val, now, tenantId]);
        await execute(`UPDATE stores SET ${col} = ?, updated_at = ? WHERE id = ?`, [val, now, tenantId]);
      } catch (e) {
        // Safe update
      }
    }

    res.json({ success: true, message: 'Invoice & WhatsApp settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. PHASE 6A FINANCIAL & REVENUE ANALYTICS APIS
// ----------------------------------------------------
router.get('/reports/revenue-analytics', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { range, from, to, channel, payment_method } = req.query;

    const data = await analyticsService.getRevenueReport({
      tenantId,
      range: range || 'this_month',
      fromDate: from,
      toDate: to,
      channel,
      paymentMethod: payment_method
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/product-profitability', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { range, from, to } = req.query;

    const data = await analyticsService.getProductProfitabilityReport({
      tenantId,
      range: range || 'this_month',
      fromDate: from,
      toDate: to
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/category-profitability', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const { range, from, to } = req.query;

    const data = await analyticsService.getCategoryProfitabilityReport({
      tenantId,
      range: range || 'this_month',
      fromDate: from,
      toDate: to
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/inventory-valuation', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const data = await analyticsService.getInventoryValuation(tenantId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/monthly-summary', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || 'store_royal_001';
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const data = await analyticsService.getMonthlySummary(tenantId, year);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
