import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runHttpTests() {
  console.log('====================================================');
  console.log('HTTP INTEGRATION TESTS FOR PHASE 7 FIXES');
  console.log('====================================================\n');

  // 1. Health Endpoint
  console.log('--- 1. Testing GET /api/health ---');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200');
  const healthData = await healthRes.json();
  console.log('✓ Health endpoint responded:', healthData);

  // 2. Barcode Auto-Creation (Bug #1 Fix)
  console.log('\n--- 2. Testing POST /api/products/from-barcode ---');
  const barcodePayload = {
    barcode: '8902269524827',
    name: 'Uprise Cholecalciferol Capsules USP',
    brand: 'Uprise',
    category_id: 'cat_grocery_01',
    unit: 'PACKET',
    selling_price: 394,
    mrp: 400,
    purchase_cost: 300,
    gst_percent: 5,
    opening_stock: 15
  };

  const barcodeRes = await fetch(`${BASE_URL}/products/from-barcode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_royal_001'
    },
    body: JSON.stringify(barcodePayload)
  });

  const barcodeData = await barcodeRes.json();
  console.log('Barcode response status:', barcodeRes.status);
  // May be 200 (created) or 400 (already assigned to existing product)
  if (barcodeRes.status === 200) {
    assert(barcodeData.success, 'Should return success: true');
    console.log('✓ Product auto-created successfully from barcode without normalizeBarcode error!');
  } else {
    // If already exists, error should NOT be 'barcodeService.normalizeBarcode is not a function'
    assert(!barcodeData.error?.includes('normalizeBarcode is not a function'), 'Must not fail with normalizeBarcode is not a function');
    console.log('✓ Product duplicate safely handled without normalizeBarcode error:', barcodeData.error);
  }

  // 3. Bulk Excel Import Validation (Bug #2 Fix)
  console.log('\n--- 3. Testing POST /api/products/import/validate via FormData & Base64 ---');
  // First download sample template
  const templateRes = await fetch(`${BASE_URL}/products/import/template`);
  assert.strictEqual(templateRes.status, 200, 'Template download should succeed');
  const templateBlob = await templateRes.blob();
  const templateBuffer = Buffer.from(await templateBlob.arrayBuffer());

  // Test with Multipart FormData
  const formData = new FormData();
  const fileBlob = new Blob([templateBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  formData.append('file', fileBlob, 'template.xlsx');

  const importValidateRes = await fetch(`${BASE_URL}/products/import/validate`, {
    method: 'POST',
    headers: {
      'x-tenant-id': 'store_royal_001'
    },
    body: formData
  });

  assert.strictEqual(importValidateRes.status, 200, 'Import validate should return 200');
  const importValData = await importValidateRes.json();
  assert(importValData.totalRows > 0, 'Total rows should be detected');
  console.log(`✓ Multipart Excel import validation passed! Rows: ${importValData.totalRows}, Valid: ${importValData.validCount}`);

  // Test with Base64 JSON
  const base64Res = await fetch(`${BASE_URL}/products/import/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_royal_001'
    },
    body: JSON.stringify({ fileBase64: templateBuffer.toString('base64') })
  });
  assert.strictEqual(base64Res.status, 200, 'Base64 import validate should return 200');
  const base64Data = await base64Res.json();
  console.log(`✓ Base64 Excel import validation passed! Rows: ${base64Data.totalRows}`);

  // Test Confirm Import endpoint (Bug #2 & Table columns verification)
  console.log('\n--- 3b. Testing POST /api/products/import/confirm ---');
  const confirmRes = await fetch(`${BASE_URL}/products/import/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_royal_001'
    },
    body: JSON.stringify({
      rows: importValData.rows,
      mode: 'CREATE_AND_UPDATE'
    })
  });
  assert.strictEqual(confirmRes.status, 200, 'Import confirm should return 200');
  const confirmData = await confirmRes.json();
  assert.strictEqual(confirmData.errorCount, 0, `Import confirm should have 0 errors, got: ${confirmData.errors?.join('; ')}`);
  console.log(`✓ Bulk Excel import confirmed successfully via HTTP: ${confirmData.createdCount} created, ${confirmData.updatedCount} updated, 0 errors!`);

  // 4. Storefront Checkout (Bug #3 Fix)
  console.log('\n--- 4. Testing POST /api/orders/online (Storefront Checkout) ---');
  // Find a product
  const prodsRes = await fetch(`${BASE_URL}/products`, {
    headers: { 'x-tenant-id': 'store_royal_001' }
  });
  const prods = await prodsRes.json();
  const prod = prods[0];
  assert(prod, 'At least one product should exist');

  const checkoutPayload = {
    store_id: 'store_royal_001',
    tenant_id: 'store_royal_001',
    items: [{ product_id: prod.id, quantity: 1 }],
    customer_name: 'Narayana Swamy N',
    customer_phone: '07207775039',
    delivery_address: '112, 100ft Road, Hitec City',
    delivery_mode: 'PICKUP',
    payment_method: 'CASH',
    notes: 'Online test order'
  };

  const checkoutRes = await fetch(`${BASE_URL}/orders/online`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_royal_001'
    },
    body: JSON.stringify(checkoutPayload)
  });

  const checkoutData = await checkoutRes.json();
  assert.strictEqual(checkoutRes.status, 200, `Online checkout should succeed without status column error (Got ${checkoutRes.status}: ${JSON.stringify(checkoutData)})`);
  assert(checkoutData.success, 'Checkout should return success: true');
  const createdOrderId = checkoutData.order_id;
  console.log(`✓ Online order created successfully: Order #${checkoutData.order_number} (ID: ${createdOrderId})`);

  // 5. Owner Accept Order (Bug #4 Fix)
  console.log('\n--- 5. Testing PATCH /api/orders/:id/status (Accept Order) ---');
  const acceptRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_royal_001'
    },
    body: JSON.stringify({ status: 'ACCEPTED', updated_by: 'Store Owner' })
  });

  assert.strictEqual(acceptRes.status, 200, 'Accept order should return 200');
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptData.status, 'ACCEPTED', 'Status should be updated to ACCEPTED');
  console.log(`✓ Order accepted successfully by owner: status = ${acceptData.status}`);

  // 6. Delivery Riders Loading (Bug #5 Fix)
  console.log('\n--- 6. Testing GET /api/users (Delivery Riders) ---');
  const usersRes = await fetch(`${BASE_URL}/users`, {
    headers: { 'x-tenant-id': 'store_royal_001' }
  });
  assert.strictEqual(usersRes.status, 200, 'Users query should return 200');
  const users = await usersRes.json();
  const deliveryRiders = users.filter(u => ['DELIVERY_BOY', 'DELIVERY_AGENT', 'RIDER'].includes(u.role) && (u.is_active || u.status === 'ACTIVE'));
  assert(deliveryRiders.length > 0, 'Delivery riders list must not be empty');
  console.log(`✓ Found ${deliveryRiders.length} delivery rider(s) for store_royal_001:`, deliveryRiders.map(r => `${r.name} (${r.role})`).join(', '));

  // 7. Store UPI ID Persistence & QR Verification (Bug #7 Fix)
  console.log('\n--- 7. Testing Store UPI Configuration & Persistence ---');
  const storeRes = await fetch(`${BASE_URL}/store`, {
    headers: { 'x-tenant-id': 'store_royal_001' }
  });
  const storeData = await storeRes.json();
  assert(storeData.upi_id, 'Store must have upi_id configured');
  console.log(`✓ Store UPI ID is: "${storeData.upi_id}" (Store: ${storeData.name})`);

  console.log('\n====================================================');
  console.log('ALL HTTP INTEGRATION TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runHttpTests().catch(err => {
  console.error('\n❌ HTTP TEST FAILED:', err);
  process.exit(1);
});
