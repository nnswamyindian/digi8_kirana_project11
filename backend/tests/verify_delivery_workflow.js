import assert from 'assert';
import { initDatabase, query, getOne, execute } from '../db.js';
import { paymentService } from '../payment/paymentService.js';
import { upiAdapter } from '../payment/upiAdapter.js';

async function runDeliveryTests() {
  console.log('====================================================');
  console.log('DELIVERY WORKFLOW & STATUS UPDATES TEST');
  console.log('====================================================\n');

  await initDatabase();

  const tenantId = 'store_royal_001';
  const riderId = 'usr_royal_rider';
  const riderName = 'Raju Rider (Delivery Partner)';
  const now = new Date().toISOString();

  // 1. Create a test delivery order
  const orderId = 'ord_deliv_' + Math.random().toString(36).substring(2, 8);
  const orderNumber = 'GR-88001';
  const totalAmount = 350.00;

  await execute(`
    INSERT INTO orders (
      id, store_id, tenant_id, order_number, invoice_number, order_type, status,
      customer_id, customer_name, customer_phone, delivery_address,
      subtotal, discount, delivery_charge, gst_amount, total_amount,
      payment_status, payment_method, assigned_delivery_boy_id, assigned_delivery_boy_name,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'ONLINE_DELIVERY', 'ASSIGNED',
      NULL, 'Suresh Reddy', '9848011223', 'Flat 402, Sai Residency, Madhapur',
      325, 0, 25, 16.25, ?,
      'PENDING', 'CASH', ?, ?,
      'Ring doorbell twice', ?, ?
    )
  `, [
    orderId, tenantId, tenantId, orderNumber, 'INV-88001',
    totalAmount, riderId, riderName, now, now
  ]);

  console.log('--- 1. Order Assignment & Retrieval ---');
  const riderOrders = await query(`
    SELECT * FROM orders 
    WHERE (assigned_delivery_boy_id = ? OR (assigned_delivery_boy_id IS NULL AND (store_id = ? OR tenant_id = ?)))
      AND order_type = 'ONLINE_DELIVERY'
      AND status IN ('ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED')
  `, [riderId, tenantId, tenantId]);

  assert(riderOrders.some(o => o.id === orderId), 'Order must appear in rider deliveries');
  console.log(`✓ Rider assigned orders retrieved: found ${riderOrders.length} order(s).`);

  // 2. Dynamic UPI QR Generation based on store UPI
  console.log('\n--- 2. Dynamic Store UPI QR Generation ---');
  const royalQR = await upiAdapter.generateDynamicQR({
    orderId,
    orderNumber,
    amount: totalAmount,
    tenantId: 'store_royal_001'
  });

  assert.strictEqual(royalQR.success, true, 'QR generation must succeed');
  assert.strictEqual(royalQR.upi_id, 'royalkirana@upi', 'Must use store_royal_001 UPI ID');
  assert.strictEqual(Number(royalQR.amount), totalAmount, 'QR amount must match order total');
  assert(royalQR.upi_url.includes('royalkirana%40upi') || royalQR.upi_url.includes('royalkirana@upi'), 'UPI URL must contain store UPI');
  assert(royalQR.qr_code_data_url.startsWith('data:image/png;base64,'), 'QR data URL must be high-res PNG');
  console.log(`✓ Royal Kirana dynamic QR generated: UPI ID: "${royalQR.upi_id}", Amount: ₹${royalQR.amount}`);

  // Test Store B (Fresh Mart) UPI isolation
  const freshQR = await upiAdapter.generateDynamicQR({
    orderId: 'ord_fresh_test',
    orderNumber: 'GR-88002',
    amount: 520.00,
    tenantId: 'store_fresh_002'
  });
  const freshSettings = await getOne('SELECT * FROM payment_settings WHERE tenant_id = ?', ['store_fresh_002']);
  const expectedFreshUPI = freshSettings?.store_upi_id || freshSettings?.upi_id || '9666252024@sbi';
  assert.strictEqual(freshQR.upi_id, expectedFreshUPI, `Must use store_fresh_002 UPI ID (${expectedFreshUPI})`);
  console.log(`✓ Fresh Mart dynamic QR verified: UPI ID: "${freshQR.upi_id}" (Isolated from Store A)`);

  // 3. Status Transitions: ASSIGNED -> ACCEPTED -> OUT_FOR_DELIVERY
  console.log('\n--- 3. Delivery Agent Status Transitions ---');
  await execute('UPDATE orders SET status = "ACCEPTED", updated_at = ? WHERE id = ?', [now, orderId]);
  let checkOrder = await getOne('SELECT status, payment_status FROM orders WHERE id = ?', [orderId]);
  assert.strictEqual(checkOrder.status, 'ACCEPTED');

  await execute('UPDATE orders SET status = "OUT_FOR_DELIVERY", updated_at = ? WHERE id = ?', [now, orderId]);
  checkOrder = await getOne('SELECT status, payment_status FROM orders WHERE id = ?', [orderId]);
  assert.strictEqual(checkOrder.status, 'OUT_FOR_DELIVERY');
  console.log('✓ Status transitions to ACCEPTED and OUT_FOR_DELIVERY verified.');

  // 4. Doorstep Cash Collection
  console.log('\n--- 4. Doorstep Cash Collection & Tables ---');
  const cashRes = await paymentService.recordDeliveryCashCollection({
    orderId,
    agentId: riderId,
    agentName: riderName,
    amountCollected: totalAmount,
    customerTendered: 500,
    changeReturned: 150,
    notes: 'Collected cash at doorstep'
  });

  assert.strictEqual(cashRes.success, true);
  assert.strictEqual(cashRes.change_returned, 150);

  const savedCollection = await getOne('SELECT * FROM delivery_cash_collections WHERE order_id = ?', [orderId]);
  assert(savedCollection, 'Cash collection record must exist in delivery_cash_collections');
  assert.strictEqual(Number(savedCollection.amount_collected), totalAmount);
  assert.strictEqual(Number(savedCollection.change_returned), 150);

  checkOrder = await getOne('SELECT status, payment_status FROM orders WHERE id = ?', [orderId]);
  assert.strictEqual(checkOrder.payment_status, 'PAID', 'Order payment status must be updated to PAID');
  console.log('✓ Doorstep cash collection recorded and payment_status set to PAID.');

  // 5. Final Status: DELIVERED
  console.log('\n--- 5. Final Delivery Completion ---');
  await execute('UPDATE orders SET status = "DELIVERED", updated_at = ? WHERE id = ?', [now, orderId]);
  checkOrder = await getOne('SELECT status, payment_status FROM orders WHERE id = ?', [orderId]);
  assert.strictEqual(checkOrder.status, 'DELIVERED');
  assert.strictEqual(checkOrder.payment_status, 'PAID');
  console.log('✓ Order status finalized as DELIVERED & PAID.');

  console.log('\n====================================================');
  console.log('ALL DELIVERY WORKFLOW TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runDeliveryTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
