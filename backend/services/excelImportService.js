import * as XLSX from 'xlsx';
import { query, getOne, execute, isMySQL } from '../db.js';
import { logAuditEvent } from '../tenant/tenantMiddleware.js';

export const VALID_UNITS = [
  'PIECE', 'KG', 'GRAM', 'LITRE', 'ML', 'PACKET', 'BOX', 'BOTTLE', 'DOZEN', 'BAG', 'BUNDLE'
];

export const SAMPLE_CATEGORIES = [
  'Rice', 'Oil', 'Sugar', 'Flour', 'Dal', 'Spices', 'Beverages',
  'Snacks', 'Dairy', 'Frozen', 'Personal Care', 'Cleaning', 'Household'
];

/**
 * Generates the official multi-sheet Excel bulk import template:
 * grocery_product_bulk_upload_template.xlsx
 */
export function generateSampleExcelBuffer() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Products
  const sampleProducts = [
    {
      'SKU': 'RICE001',
      'Barcode': '8901234567890',
      'Product Name': 'India Gate Basmati Rice 5KG',
      'Category': 'Rice',
      'Subcategory': 'Basmati',
      'Brand': 'India Gate',
      'Unit': 'PACKET',
      'Selling Price': 650,
      'Purchase Price': 590,
      'Wholesale Price': 620,
      'Tax %': 5,
      'Opening Stock': 25,
      'Minimum Stock': 5,
      'Maximum Stock': 100,
      'Reorder Level': 10,
      'Supplier': 'Delhi Agro Commodities',
      'HSN/SAC': '10063020',
      'Description': 'Premium aged royal basmati rice 5KG bag',
      'Status': 'ACTIVE'
    },
    {
      'SKU': 'OIL001',
      'Barcode': '8901234567891',
      'Product Name': 'Fortune Sunflower Oil 1L',
      'Category': 'Oil',
      'Subcategory': 'Cooking Oil',
      'Brand': 'Fortune',
      'Unit': 'LITRE',
      'Selling Price': 145,
      'Purchase Price': 125,
      'Wholesale Price': 138,
      'Tax %': 5,
      'Opening Stock': 40,
      'Minimum Stock': 10,
      'Maximum Stock': 200,
      'Reorder Level': 20,
      'Supplier': 'Adani Wilmar Distributor',
      'HSN/SAC': '15121910',
      'Description': 'Refined sunflower cooking oil pouch',
      'Status': 'ACTIVE'
    },
    {
      'SKU': 'SUG001',
      'Barcode': '8901234567892',
      'Product Name': 'Madhur Pure Sugar 1KG',
      'Category': 'Sugar',
      'Subcategory': 'Sweeteners',
      'Brand': 'Madhur',
      'Unit': 'KG',
      'Selling Price': 48,
      'Purchase Price': 42,
      'Wholesale Price': 45,
      'Tax %': 0,
      'Opening Stock': 100,
      'Minimum Stock': 20,
      'Maximum Stock': 500,
      'Reorder Level': 50,
      'Supplier': 'National Sugar Syndicate',
      'HSN/SAC': '17019990',
      'Description': 'Sulphur-free clean refined crystal sugar',
      'Status': 'ACTIVE'
    },
    {
      'SKU': 'DAL001',
      'Barcode': '8901234567893',
      'Product Name': 'Tata Sampann Toor Dal 1KG',
      'Category': 'Dal',
      'Subcategory': 'Pulses',
      'Brand': 'Tata Sampann',
      'Unit': 'KG',
      'Selling Price': 175,
      'Purchase Price': 150,
      'Wholesale Price': 165,
      'Tax %': 0,
      'Opening Stock': 30,
      'Minimum Stock': 8,
      'Maximum Stock': 150,
      'Reorder Level': 15,
      'Supplier': 'Tata Consumer Products',
      'HSN/SAC': '07136000',
      'Description': 'Unpolished high protein toor dal',
      'Status': 'ACTIVE'
    },
    {
      'SKU': 'ATTA001',
      'Barcode': '8901234567894',
      'Product Name': 'Aashirvaad Shudh Chakki Atta 10KG',
      'Category': 'Flour',
      'Subcategory': 'Wheat Flour',
      'Brand': 'Aashirvaad',
      'Unit': 'PACKET',
      'Selling Price': 440,
      'Purchase Price': 395,
      'Wholesale Price': 420,
      'Tax %': 0,
      'Opening Stock': 20,
      'Minimum Stock': 5,
      'Maximum Stock': 80,
      'Reorder Level': 10,
      'Supplier': 'ITC Distribution Hub',
      'HSN/SAC': '11010000',
      'Description': '100% whole wheat traditional stone chakki atta',
      'Status': 'ACTIVE'
    },
    {
      'SKU': 'TEA001',
      'Barcode': '8901234567895',
      'Product Name': 'Brooke Bond Red Label Tea 500G',
      'Category': 'Beverages',
      'Subcategory': 'Tea',
      'Brand': 'Brooke Bond',
      'Unit': 'PACKET',
      'Selling Price': 290,
      'Purchase Price': 255,
      'Wholesale Price': 275,
      'Tax %': 5,
      'Opening Stock': 35,
      'Minimum Stock': 10,
      'Maximum Stock': 120,
      'Reorder Level': 15,
      'Supplier': 'Hindustan Unilever Depot',
      'HSN/SAC': '09024020',
      'Description': 'Strong blended tea leaves with rich taste',
      'Status': 'ACTIVE'
    }
  ];

  const wsProducts = XLSX.utils.json_to_sheet(sampleProducts);
  // Column width hints
  wsProducts['!cols'] = [
    { wch: 12 }, // SKU
    { wch: 16 }, // Barcode
    { wch: 35 }, // Product Name
    { wch: 15 }, // Category
    { wch: 15 }, // Subcategory
    { wch: 15 }, // Brand
    { wch: 10 }, // Unit
    { wch: 14 }, // Selling Price
    { wch: 14 }, // Purchase Price
    { wch: 14 }, // Wholesale Price
    { wch: 8 },  // Tax %
    { wch: 14 }, // Opening Stock
    { wch: 14 }, // Minimum Stock
    { wch: 14 }, // Maximum Stock
    { wch: 14 }, // Reorder Level
    { wch: 25 }, // Supplier
    { wch: 12 }, // HSN/SAC
    { wch: 40 }, // Description
    { wch: 10 }, // Status
  ];
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');

  // Sheet 2: Categories
  const categoryData = SAMPLE_CATEGORIES.map(cat => ({
    'Category': cat,
    'Description': `Standard Grocery Category: ${cat}`
  }));
  const wsCategories = XLSX.utils.json_to_sheet(categoryData);
  wsCategories['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsCategories, 'Categories');

  // Sheet 3: Units
  const unitData = VALID_UNITS.map(u => ({
    'Unit': u,
    'Decimal Supported': ['KG', 'GRAM', 'LITRE', 'ML', 'DOZEN'].includes(u) ? 'YES' : 'NO',
    'Example Products': u === 'KG' ? 'Rice, Sugar, Vegetables, Dal'
      : u === 'LITRE' ? 'Cooking Oil, Milk, Fruit Juice'
      : u === 'PACKET' ? 'Biscuits, Atta, Chips'
      : u === 'BOTTLE' ? 'Shampoo, Ketchup, Soft Drinks'
      : u === 'DOZEN' ? 'Eggs, Bananas'
      : 'General Products'
  }));
  const wsUnits = XLSX.utils.json_to_sheet(unitData);
  wsUnits['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsUnits, 'Units');

  // Sheet 4: Instructions
  const instructions = [
    { 'Rule #': 1, 'Rule Description': 'Do not change or delete column header names in Sheet 1 (Products).' },
    { 'Rule #': 2, 'Rule Description': 'Barcode must be unique within your store. If product has no barcode, leave blank and the system will auto-generate.' },
    { 'Rule #': 3, 'Rule Description': 'SKU must be unique within your store.' },
    { 'Rule #': 4, 'Rule Description': 'Use numeric values for prices (Selling Price, Purchase Price, Wholesale Price, Tax %).' },
    { 'Rule #': 5, 'Rule Description': `Use valid units: ${VALID_UNITS.join(', ')}.` },
    { 'Rule #': 6, 'Rule Description': 'Quantity and stock may contain decimals for weight/volume units (KG, GRAM, LITRE, ML).' },
    { 'Rule #': 7, 'Rule Description': 'Leave optional fields blank. Do not type "N/A" or "None".' },
    { 'Rule #': 8, 'Rule Description': 'Do not use negative stock values unless explicitly enabled in store settings.' },
    { 'Rule #': 9, 'Rule Description': 'Duplicate products will be detected and flagged during validation before anything is saved.' },
    { 'Rule #': 10, 'Rule Description': 'Always review the preview report before confirming import to your live store catalog.' },
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 8 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Validates an uploaded Excel (.xlsx, .xls) or CSV buffer without modifying the database.
 */
export async function validateImportFile(buffer, tenantId) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames.includes('Products') ? 'Products' : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  if (!ws) {
    throw new Error('Excel workbook contains no readable sheets.');
  }

  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (rawRows.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      warningCount: 0,
      errorCount: 1,
      rows: [
        { row: 1, product: 'Empty File', problem: 'The uploaded file does not contain any product data rows.', status: 'ERROR' }
      ]
    };
  }

  // Preload existing tenant products for duplicate checks
  const existingProducts = await query(
    'SELECT id, name, barcode, sku FROM products WHERE tenant_id = ? OR store_id = ?',
    [tenantId, tenantId]
  );
  const existingBarcodeMap = new Map();
  const existingSkuMap = new Map();

  for (const p of existingProducts) {
    if (p.barcode) existingBarcodeMap.set(p.barcode.trim(), p);
    if (p.sku) existingSkuMap.set(p.sku.trim().toLowerCase(), p);
  }

  // Tracking within this Excel file
  const seenBarcodes = new Map();
  const seenSkus = new Map();

  const validatedRows = [];
  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNum = i + 2; // 1-based, row 1 is header

    // Standardize column keys
    const sku = String(r['SKU'] || r['sku'] || '').trim();
    const barcode = String(r['Barcode'] || r['barcode'] || '').trim();
    const name = String(r['Product Name'] || r['product_name'] || r['Name'] || r['name'] || '').trim();
    const category = String(r['Category'] || r['category'] || 'General').trim();
    const subcategory = String(r['Subcategory'] || r['subcategory'] || '').trim();
    const brand = String(r['Brand'] || r['brand'] || '').trim();
    const unitRaw = String(r['Unit'] || r['unit'] || 'PACKET').trim().toUpperCase();
    const unit = VALID_UNITS.includes(unitRaw) ? unitRaw : 'PACKET';

    const sellingPrice = parseFloat(r['Selling Price'] ?? r['selling_price'] ?? r['Price'] ?? 0);
    const purchasePrice = parseFloat(r['Purchase Price'] ?? r['purchase_price'] ?? r['Cost'] ?? 0);
    const wholesalePrice = parseFloat(r['Wholesale Price'] ?? r['wholesale_price'] ?? sellingPrice);
    const taxPercent = parseFloat(r['Tax %'] ?? r['tax_percent'] ?? r['GST %'] ?? 0);
    const openingStock = parseFloat(r['Opening Stock'] ?? r['opening_stock'] ?? r['Stock'] ?? 0);
    const minStock = parseFloat(r['Minimum Stock'] ?? r['minimum_stock'] ?? r['Min Stock'] ?? 5);
    const maxStock = parseFloat(r['Maximum Stock'] ?? r['maximum_stock'] ?? 1000);
    const reorderLevel = parseFloat(r['Reorder Level'] ?? r['reorder_level'] ?? 10);
    const supplier = String(r['Supplier'] || r['supplier'] || '').trim();
    const hsnSac = String(r['HSN/SAC'] || r['hsn_sac'] || '').trim();
    const description = String(r['Description'] || r['description'] || '').trim();
    const status = String(r['Status'] || r['status'] || 'ACTIVE').trim().toUpperCase();

    const problems = [];
    let isError = false;
    let isWarning = false;

    // Validation 1: Product Name is required
    if (!name) {
      problems.push('Missing product name (Required).');
      isError = true;
    }

    // Validation 2: Selling Price
    if (isNaN(sellingPrice) || sellingPrice <= 0) {
      problems.push('Selling price must be a positive number.');
      isError = true;
    }

    // Validation 3: Purchase Price
    if (isNaN(purchasePrice) || purchasePrice < 0) {
      problems.push('Purchase price cannot be negative.');
      isError = true;
    } else if (purchasePrice > sellingPrice && sellingPrice > 0) {
      problems.push(`Selling below cost warning (Cost: ₹${purchasePrice}, Selling: ₹${sellingPrice}).`);
      isWarning = true;
    } else if (purchasePrice === 0) {
      problems.push('Purchase cost is ₹0 (Warning).');
      isWarning = true;
    }

    // Validation 4: Unit validity
    if (!VALID_UNITS.includes(unitRaw)) {
      problems.push(`Invalid unit "${unitRaw}". Allowed: ${VALID_UNITS.join(', ')}.`);
      isError = true;
    }

    // Validation 5: Barcode uniqueness
    if (barcode) {
      if (seenBarcodes.has(barcode)) {
        problems.push(`Duplicate barcode "${barcode}" found in row ${seenBarcodes.get(barcode)}.`);
        isError = true;
      } else {
        seenBarcodes.set(barcode, rowNum);
        if (existingBarcodeMap.has(barcode)) {
          const existing = existingBarcodeMap.get(barcode);
          problems.push(`Barcode "${barcode}" already exists on product "${existing.name}". Will update if Update Mode selected.`);
          isWarning = true;
        }
      }
    }

    // Validation 6: SKU uniqueness
    if (sku) {
      const lowerSku = sku.toLowerCase();
      if (seenSkus.has(lowerSku)) {
        problems.push(`Duplicate SKU "${sku}" found in row ${seenSkus.get(lowerSku)}.`);
        isError = true;
      } else {
        seenSkus.set(lowerSku, rowNum);
        if (existingSkuMap.has(lowerSku)) {
          const existing = existingSkuMap.get(lowerSku);
          problems.push(`SKU "${sku}" already exists on product "${existing.name}".`);
          isWarning = true;
        }
      }
    }

    // Validation 7: Stock numbers
    if (isNaN(openingStock) || openingStock < 0) {
      problems.push('Opening stock cannot be negative.');
      isError = true;
    }

    if (isNaN(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      problems.push('Tax % must be between 0 and 100.');
      isError = true;
    }

    let rowStatus = 'VALID';
    if (isError) {
      rowStatus = 'ERROR';
      errorCount++;
    } else if (isWarning) {
      rowStatus = 'WARNING';
      warningCount++;
    } else {
      validCount++;
    }

    validatedRows.push({
      rowNumber: rowNum,
      sku: sku || ('SKU-' + (barcode || Math.floor(100000 + Math.random() * 900000))),
      barcode: barcode,
      name,
      category,
      subcategory,
      brand,
      unit,
      sellingPrice,
      purchasePrice,
      wholesalePrice,
      taxPercent,
      openingStock,
      minStock,
      maxStock,
      reorderLevel,
      supplier,
      hsnSac,
      description,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      problems,
      status: rowStatus
    });
  }

  return {
    totalRows: rawRows.length,
    validCount,
    warningCount,
    errorCount,
    rows: validatedRows
  };
}

/**
 * Executes the bulk import transactionally.
 * Mode: 'CREATE_ONLY' or 'CREATE_AND_UPDATE'
 */
export async function executeBulkImport(validatedRows, tenantId, mode = 'CREATE_AND_UPDATE', user = null) {
  const now = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  // Filter only importable rows (VALID or WARNING, not ERROR)
  const importableRows = validatedRows.filter(r => r.status !== 'ERROR');

  for (const r of importableRows) {
    try {
      // 1. Resolve Category
      let categoryId = null;
      if (r.category) {
        const catRow = await getOne(
          'SELECT id FROM categories WHERE (tenant_id = ? OR store_id = ?) AND LOWER(name) = ? LIMIT 1',
          [tenantId, tenantId, r.category.toLowerCase().trim()]
        );
        if (catRow) {
          categoryId = catRow.id;
        } else {
          // Create category on-the-fly for this tenant
          categoryId = 'cat_' + Math.random().toString(36).substring(2, 9);
          const catSlug = r.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          await execute(`
            INSERT INTO categories (id, store_id, tenant_id, name, slug, icon, sort_order)
            VALUES (?, ?, ?, ?, ?, '🛍️', 0)
          `, [categoryId, tenantId, tenantId, r.category.trim(), catSlug]);
        }
      }

      if (!categoryId) {
        const firstCat = await getOne('SELECT id FROM categories WHERE tenant_id = ? OR store_id = ? LIMIT 1', [tenantId, tenantId]);
        categoryId = firstCat?.id || 'cat_general';
      }

      // 2. Check for existing product match
      let existing = null;
      if (r.barcode) {
        existing = await getOne(
          'SELECT * FROM products WHERE (tenant_id = ? OR store_id = ?) AND barcode = ? LIMIT 1',
          [tenantId, tenantId, r.barcode.trim()]
        );
      }
      if (!existing && r.sku) {
        existing = await getOne(
          'SELECT * FROM products WHERE (tenant_id = ? OR store_id = ?) AND LOWER(sku) = ? LIMIT 1',
          [tenantId, tenantId, r.sku.trim().toLowerCase()]
        );
      }

      const isLoose = ['KG', 'GRAM', 'LITRE', 'ML'].includes(r.unit) ? 1 : 0;
      const barcode = r.barcode || ('890' + Math.floor(1000000000 + Math.random() * 9000000000));
      const sku = r.sku || barcode;
      const mrp = Math.max(r.sellingPrice, r.sellingPrice * 1.1);

      if (existing) {
        if (mode === 'CREATE_ONLY') {
          skippedCount++;
          continue;
        }

        // UPDATE EXISTING PRODUCT
        const oldSellingPrice = Number(existing.selling_price);
        const oldPurchasePrice = Number(existing.purchase_cost);

        await execute(`
          UPDATE products SET
            name = ?, category_id = ?, brand = ?, barcode = ?, sku = ?, unit = ?, is_loose = ?,
            purchase_cost = ?, selling_price = ?, mrp = ?, wholesale_price = ?, min_selling_price = ?,
            pos_price = ?, website_price = ?, gst_percent = ?, min_stock = ?, max_stock = ?,
            reorder_level = ?, supplier = ?, hsn_sac = ?, description = ?, is_active = ?,
            is_pos_available = ?, is_visible_online = ?, updated_at = ?
          WHERE id = ?
        `, [
          r.name, categoryId, r.brand || '', barcode, sku, r.unit, isLoose,
          r.purchasePrice, r.sellingPrice, mrp, r.wholesalePrice, r.purchasePrice,
          r.sellingPrice, r.sellingPrice, r.taxPercent, r.minStock, r.maxStock,
          r.reorderLevel, r.supplier || '', r.hsnSac || '', r.description || '',
          r.status === 'INACTIVE' ? 0 : 1,
          r.status === 'INACTIVE' ? 0 : 1,
          r.status === 'INACTIVE' ? 0 : 1,
          now, existing.id
        ]);

        // Record price history if changed
        if (r.sellingPrice !== oldSellingPrice || r.purchasePrice !== oldPurchasePrice) {
          await execute(`
            INSERT INTO product_price_history (
              id, tenant_id, product_id, old_purchase_price, new_purchase_price,
              old_selling_price, new_selling_price, old_mrp, new_mrp, changed_by, reason, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'pph_' + Math.random().toString(36).substring(2, 9),
            tenantId, existing.id, oldPurchasePrice, r.purchasePrice,
            oldSellingPrice, r.sellingPrice, existing.mrp, mrp,
            user?.name || 'Bulk Import', 'Bulk Excel update', now
          ]);
        }

        // If opening stock specified and user wants to adjust stock
        if (r.openingStock > 0 && r.openingStock !== existing.stock) {
          const diff = r.openingStock - existing.stock;
          await execute('UPDATE products SET stock = ? WHERE id = ?', [r.openingStock, existing.id]);
          await execute(`
            INSERT INTO inventory_transactions (
              id, tenant_id, product_id, product_name, quantity, unit, transaction_type,
              reference_id, previous_stock, new_stock, unit_cost, notes, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'tx_' + Math.random().toString(36).substring(2, 9),
            tenantId, existing.id, r.name, diff, r.unit, 'ADJUSTMENT',
            'EXCEL_BULK_UPDATE', existing.stock, r.openingStock, r.purchasePrice,
            'Stock updated via Excel bulk import', user?.name || 'Bulk Import', now
          ]);
        }

        updatedCount++;
      } else {
        // CREATE NEW PRODUCT
        const newProdId = 'prod_' + Math.random().toString(36).substring(2, 9);
        await execute(`
          INSERT INTO products (
            id, store_id, tenant_id, category_id, name, brand, barcode, sku, unit, is_loose,
            purchase_cost, selling_price, mrp, wholesale_price, min_selling_price,
            pos_price, website_price, gst_percent, stock, min_stock, max_stock, reorder_level,
            supplier, hsn_sac, barcode_type, allow_zero_stock_purchase,
            is_active, is_visible_online, is_pos_available, is_featured, is_bestseller, is_offer,
            photo_url, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUFACTURER', 'DISABLE_PURCHASE', 1, 1, 1, 0, 0, 0, ?, ?, ?, ?)
        `, [
          newProdId, tenantId, tenantId, categoryId, r.name, r.brand || '', barcode, sku, r.unit, isLoose,
          r.purchasePrice, r.sellingPrice, mrp, r.wholesalePrice, r.purchasePrice,
          r.sellingPrice, r.sellingPrice, r.taxPercent, r.openingStock, r.minStock, r.maxStock, r.reorderLevel,
          r.supplier || '', r.hsnSac || '',
          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
          r.description || '', now, now
        ]);

        // Initial Price History
        await execute(`
          INSERT INTO product_price_history (
            id, tenant_id, product_id, old_purchase_price, new_purchase_price,
            old_selling_price, new_selling_price, old_mrp, new_mrp, changed_by, reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'pph_' + Math.random().toString(36).substring(2, 9),
          tenantId, newProdId, r.purchasePrice, r.purchasePrice,
          r.sellingPrice, r.sellingPrice, mrp, mrp,
          user?.name || 'Bulk Import', 'Initial creation via Excel bulk import', now
        ]);

        // Initial Purchase Price History
        await execute(`
          INSERT INTO product_purchase_price_history (
            id, tenant_id, product_id, purchase_price, quantity, supplier_name,
            effective_date, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'ppph_' + Math.random().toString(36).substring(2, 9),
          tenantId, newProdId, r.purchasePrice, r.openingStock, r.supplier || 'Initial Supplier',
          now, user?.name || 'Bulk Import', now
        ]);

        // Opening Stock Inventory Transaction
        if (r.openingStock > 0) {
          await execute(`
            INSERT INTO inventory_transactions (
              id, tenant_id, product_id, product_name, quantity, unit, transaction_type,
              reference_id, previous_stock, new_stock, unit_cost, notes, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'tx_' + Math.random().toString(36).substring(2, 9),
            tenantId, newProdId, r.name, r.openingStock, r.unit, 'OPENING_STOCK',
            'INITIAL_IMPORT', 0, r.openingStock, r.purchasePrice,
            'Initial opening stock created via Excel bulk import', user?.name || 'Bulk Import', now
          ]);
        }

        createdCount++;
      }
    } catch (rowErr) {
      errors.push(`Row ${r.rowNumber} (${r.name}): ${rowErr.message}`);
    }
  }

  // Log Audit Event
  await logAuditEvent({
    tenantId,
    userId: user?.id || null,
    userName: user?.name || 'Store Owner',
    action: 'BULK_PRODUCT_IMPORT',
    entityType: 'PRODUCT',
    details: `Imported products: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${errors.length} failed.`
  });

  return {
    success: errors.length === 0,
    createdCount,
    updatedCount,
    skippedCount,
    errorCount: errors.length,
    errors
  };
}
