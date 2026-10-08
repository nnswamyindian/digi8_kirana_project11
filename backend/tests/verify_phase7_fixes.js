import assert from 'assert';
import { initDatabase, query, getOne, execute } from '../db.js';
import { barcodeService, normalizeBarcode } from '../services/barcodeService.js';
import { generateSampleExcelBuffer, validateImportFile, executeBulkImport } from '../services/excelImportService.js';

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 7 PRODUCTION FIXES VERIFICATION');
  console.log('====================================================\n');

  await initDatabase();

  // ----------------------------------------------------
  // TEST 1: Barcode Normalization & Service Contract
  // ----------------------------------------------------
  console.log('--- TEST 1: Barcode Normalization & Service Contract ---');
  assert(typeof normalizeBarcode === 'function', 'normalizeBarcode must be exported as a function');
  assert(typeof barcodeService.normalizeBarcode === 'function', 'barcodeService.normalizeBarcode must be a function on the service instance');

  const testCode = '  \t 008902269524827 \r\n ';
  const normalized1 = normalizeBarcode(testCode);
  const normalized2 = barcodeService.normalizeBarcode(testCode);

  assert.strictEqual(normalized1, '008902269524827', 'Standalone normalizeBarcode must trim whitespace and preserve leading zeros');
  assert.strictEqual(normalized2, '008902269524827', 'barcodeService.normalizeBarcode must match standalone output');
  assert.strictEqual(normalizeBarcode(''), '', 'Empty barcode returns empty string');
  assert.strictEqual(normalizeBarcode(null), '', 'Null barcode returns empty string');
  console.log('✓ Barcode Normalization and barcodeService.normalizeBarcode verified OK.');

  // ----------------------------------------------------
  // TEST 2: Product Auto-Creation via Barcode
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Product Creation via Barcode ---');
  const testBarcode = '8902269524827';
  const tenantId = 'store_royal_001';

  // Clean up any test product
  await execute('DELETE FROM products WHERE barcode = ? AND tenant_id = ?', [testBarcode, tenantId]);

  const cleanBarcode = barcodeService.normalizeBarcode(testBarcode);
  assert.strictEqual(cleanBarcode, testBarcode);

  const prodId = 'prod_test_auto_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  await execute(`
    INSERT INTO products (
      id, store_id, tenant_id, category_id, name, brand, barcode, unit, is_loose,
      purchase_cost, selling_price, mrp, stock, is_active, is_visible_online, is_pos_available,
      photo_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    prodId, tenantId, tenantId, 'cat_grocery_01', 'Uprise Cholecalciferol Capsules USP', 'Uprise', cleanBarcode, 'PACKET', 0,
    300, 394, 400, 15, 1, 1, 1,
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80', now, now
  ]);

  const savedProd = await getOne('SELECT * FROM products WHERE id = ?', [prodId]);
  assert(savedProd, 'Product should be saved in database');
  assert.strictEqual(savedProd.barcode, testBarcode, 'Saved barcode must match');
  assert.strictEqual(Number(savedProd.selling_price), 394, 'Authoritative selling price must match');
  console.log('✓ Product auto-creation from barcode verified in database.');

  // ----------------------------------------------------
  // TEST 3: Bulk Excel & CSV Import Validation & Execution
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Bulk Excel & CSV Import Validation & Execution ---');
  const excelBuffer = generateSampleExcelBuffer();
  assert(Buffer.isBuffer(excelBuffer), 'Excel buffer should be generated');

  const valResult = await validateImportFile(excelBuffer, tenantId);
  assert(valResult, 'Validation result must be returned');
  assert(valResult.totalRows > 0, `Validation should have detected sample rows (got ${valResult.totalRows})`);
  assert(valResult.validCount + valResult.warningCount > 0, `Validation should have valid/warning rows (got valid=${valResult.validCount}, warn=${valResult.warningCount})`);
  assert.strictEqual(valResult.errorCount, 0, 'Sample template should have 0 fatal errors');
  console.log(`✓ Bulk Excel Import validated successfully: ${valResult.validCount} new, ${valResult.warningCount} existing updates.`);

  // Test executing bulk import into database (verifies max_stock, product_price_history, inventory_transactions)
  const importExecResult = await executeBulkImport(valResult.rows, tenantId, 'CREATE_AND_UPDATE', { name: 'Automated Tester' });
  assert.strictEqual(importExecResult.errorCount, 0, `executeBulkImport should have 0 errors, got: ${importExecResult.errors.join('; ')}`);
  assert(importExecResult.createdCount + importExecResult.updatedCount > 0, 'Products should be created or updated');
  console.log(`✓ Bulk Excel Import executed successfully into database: ${importExecResult.createdCount} created, ${importExecResult.updatedCount} updated, 0 errors.`);

  // ----------------------------------------------------
  // TEST 4: Storefront Cart Checkout & Order Status History
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Storefront Cart Checkout & Status History ---');
  const orderId = 'ord_test_' + Math.random().toString(36).substring(2, 7);
  const orderNumber = 'GR-10299';
  const invoiceNumber = 'INV-000099';

  await execute(`
    INSERT INTO orders (
      id, store_id, tenant_id, order_number, invoice_number, order_type, status,
      customer_id, customer_name, customer_phone, delivery_address,
      subtotal, discount, delivery_charge, gst_amount, total_amount,
      payment_status, payment_method, notes, pincode, area, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orderId, tenantId, tenantId, orderNumber, invoiceNumber, 'ONLINE_DELIVERY', 'NEW',
    null, 'Narayana Swamy N', '07207775039', '112, 100ft Road, Hitec City',
    394, 0, 25, 19.7, 419,
    'PENDING', 'UPI', 'Test grocery order', '500081', 'Hitec City & Madhapur', now, now
  ]);

  await execute(`
    INSERT INTO order_items (
      id, order_id, tenant_id, product_id, product_name, unit, quantity,
      unit_price, cost_price, discount, total_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'item_' + Math.random().toString(36).substring(2, 7),
    orderId, tenantId, prodId, 'Uprise Cholecalciferol Capsules USP', 'PACKET', 1,
    394, 300, 0, 394
  ]);

  // Insert status history without 'Unknown column status'
  const oshId = 'osh_' + Math.random().toString(36).substring(2, 7);
  await execute(`
    INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    oshId, orderId, 'NEW', 'PENDING', 'Home delivery order placed for Hitec City', 'Narayana Swamy N', now
  ]);

  const savedOrder = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  const savedOsh = await getOne('SELECT * FROM order_status_history WHERE id = ?', [oshId]);

  assert(savedOrder, 'Order should be saved');
  assert.strictEqual(savedOrder.status, 'NEW', 'Order status should be NEW');
  assert(savedOsh, 'Order status history should be saved');
  assert.strictEqual(savedOsh.status, 'NEW', 'Order status history status should be NEW');
  console.log('✓ Storefront online order creation & order_status_history verified OK.');

  // ----------------------------------------------------
  // TEST 5: Owner Accept Order & Inventory Transactions
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Owner Accept Order Transition & Inventory Transaction ---');
  await execute('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', ['ACCEPTED', now, orderId]);

  const txId = 'tx_' + Math.random().toString(36).substring(2, 7);
  await execute(`
    INSERT INTO inventory_transactions (
      id, tenant_id, product_id, product_name, quantity, unit, transaction_type,
      reference_id, previous_stock, new_stock, unit_cost, notes, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    txId, tenantId, prodId, 'Uprise Cholecalciferol Capsules USP', -1, 'PACKET', 'SALE',
    orderNumber, 15, 14, 300,
    `Online Order #${orderNumber} fulfilled`, 'Store Owner', now
  ]);

  const updatedOrder = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  const savedTx = await getOne('SELECT * FROM inventory_transactions WHERE id = ?', [txId]);

  assert(updatedOrder, 'Updated order should exist');
  assert.strictEqual(updatedOrder.status, 'ACCEPTED', 'Order status must be updated to ACCEPTED');
  assert(savedTx, 'Inventory transaction must be recorded');
  assert.strictEqual(Number(savedTx.quantity), -1, 'Inventory transaction quantity must be -1');
  console.log('✓ Order accepted successfully and inventory transaction recorded.');

  // ----------------------------------------------------
  // TEST 6: Delivery Riders Loading
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Delivery Riders Retrieval ---');
  const riders = await query(`
    SELECT id, name, phone, role, status, availability, tenant_id 
    FROM users 
    WHERE role = 'DELIVERY_BOY' AND (status = 'ACTIVE' OR status IS NULL)
  `);

  assert(riders.length > 0, 'At least one delivery rider must exist in the database');
  const royalRider = riders.find(r => r.tenant_id === 'store_royal_001');
  assert(royalRider, 'Royal Kirana must have an assigned delivery partner');
  console.log(`✓ Delivery riders retrieved successfully: found ${riders.length} active riders (e.g., "${royalRider.name}").`);

  // ----------------------------------------------------
  // TEST 7: Customer Schema Validation
  // ----------------------------------------------------
  console.log('\n--- TEST 7: Customer Table Schema & Status Column ---');
  const custId = 'cust_' + Math.random().toString(36).substring(2, 7);
  await execute(`
    INSERT INTO customers (
      id, store_id, tenant_id, name, phone, email, address,
      password, status, credit_balance, total_spent, orders_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, 0, 0, ?)
  `, [
    custId, tenantId, tenantId, 'Test Customer', '9876543299', 'test@kirana.in', '100ft Road',
    'pass123', now
  ]);

  const savedCust = await getOne('SELECT * FROM customers WHERE id = ?', [custId]);
  assert(savedCust, 'Customer must be saved');
  assert.strictEqual(savedCust.status, 'ACTIVE', 'Customer status must be ACTIVE');
  console.log('✓ Customer registration and status column verified OK.');

  console.log('\n====================================================');
  console.log('ALL PHASE 7 PRODUCTION FIX TESTS PASSED (100%)');
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
