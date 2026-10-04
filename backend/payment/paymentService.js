import { query, getOne, execute } from '../db.js';
import { razorpayAdapter } from './razorpayAdapter.js';
import { upiAdapter } from './upiAdapter.js';
import { manualPaymentAdapter } from './manualAdapter.js';

/**
 * Unified Payment Service
 * Single source of truth for all payment processing, gateway abstractions,
 * verification, doorstep collections, refunds, and reconciliation.
 */
export class PaymentService {
  constructor() {
    this.razorpay = razorpayAdapter;
    this.upi = upiAdapter;
    this.manual = manualPaymentAdapter;
    this.broadcastFn = null;
  }

  setBroadcaster(fn) {
    this.broadcastFn = fn;
  }

  broadcast(event, data) {
    if (typeof this.broadcastFn === 'function') {
      try {
        this.broadcastFn(event, data);
      } catch (e) {
        console.error('[PaymentService Broadcast Error]:', e);
      }
    }
  }

  /**
   * Create Online Prepaid / Gateway Payment Order
   */
  async createOnlinePayment({ orderId, method = 'RAZORPAY' }) {
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw new Error('Order not found');

    const tenantId = order.tenant_id || order.store_id || 'store_royal_001';
    const transactionId = 'txn_' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    if (method === 'RAZORPAY') {
      const razorpayOrder = await this.razorpay.createOrder({
        orderId: order.id,
        orderNumber: order.order_number,
        amount: order.total_amount,
        currency: 'INR',
        tenantId
      });

      // Record transaction as PENDING
      await execute(`
        INSERT INTO payment_transactions (
          id, order_id, tenant_id, customer_id, amount, currency, method, provider,
          provider_order_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        transactionId, order.id, tenantId, order.customer_id, order.total_amount, 'INR',
        'RAZORPAY', 'RAZORPAY', razorpayOrder.provider_order_id, 'PENDING', now, now
      ]);

      await execute('UPDATE orders SET payment_transaction_id = ?, updated_at = ? WHERE id = ?', [transactionId, now, order.id]);

      return {
        success: true,
        transaction_id: transactionId,
        provider: 'RAZORPAY',
        key_id: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpay_order_id: razorpayOrder.provider_order_id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone
      };
    }

    if (method === 'UPI') {
      const upiData = await this.upi.generateDynamicQR({
        orderId: order.id,
        orderNumber: order.order_number,
        amount: order.total_amount,
        tenantId
      });

      await execute(`
        INSERT INTO payment_transactions (
          id, order_id, tenant_id, customer_id, amount, currency, method, provider,
          transaction_reference, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        transactionId, order.id, tenantId, order.customer_id, order.total_amount, 'INR',
        'UPI', 'STORE_UPI', `UPI-ORD-${order.order_number}`, 'PENDING', now, now
      ]);

      await execute('UPDATE orders SET payment_transaction_id = ?, updated_at = ? WHERE id = ?', [transactionId, now, order.id]);

      return {
        success: true,
        transaction_id: transactionId,
        ...upiData
      };
    }

    throw new Error(`Unsupported online payment method: ${method}`);
  }

  /**
   * Verify Razorpay Payment Server-Side
   */
  async verifyRazorpayPayment({ orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw new Error('Order not found');

    // 1. Cryptographic HMAC Signature Verification
    const verification = await this.razorpay.verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!verification.verified) {
      throw new Error(verification.error || 'Payment signature verification failed.');
    }

    const now = new Date().toISOString();
    let transaction = await getOne('SELECT * FROM payment_transactions WHERE order_id = ? AND provider_order_id = ?', [orderId, razorpay_order_id]);

    if (!transaction) {
      transaction = await getOne('SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1', [orderId]);
    }

    const txnId = transaction?.id || ('txn_' + Math.random().toString(36).substring(2, 10));

    if (transaction) {
      await execute(`
        UPDATE payment_transactions SET
          provider_payment_id = ?,
          status = 'PAID',
          verified_at = ?,
          updated_at = ?
        WHERE id = ?
      `, [razorpay_payment_id, now, now, transaction.id]);
    } else {
      await execute(`
        INSERT INTO payment_transactions (
          id, order_id, customer_id, amount, currency, method, provider,
          provider_payment_id, provider_order_id, status, verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        txnId, order.id, order.customer_id, order.total_amount, 'INR',
        'RAZORPAY', 'RAZORPAY', razorpay_payment_id, razorpay_order_id, 'PAID', now, now, now
      ]);
    }

    // 2. Mark order payment_status = PAID
    await execute('UPDATE orders SET payment_status = "PAID", payment_transaction_id = ?, updated_at = ? WHERE id = ?', [txnId, now, order.id]);

    // 3. Financial audit record
    await execute(`
      INSERT INTO payment_audits (id, order_id, store_id, amount, payment_method, paid_by_user_name, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'pay_' + Math.random().toString(36).substring(2, 9),
      order.id, order.store_id, order.total_amount, 'RAZORPAY',
      order.customer_name, `Online prepaid verified via Razorpay ID: ${razorpay_payment_id}`, now
    ]);

    // 4. Status history
    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'osh_' + Math.random().toString(36).substring(2, 9),
      order.id, order.status, 'PAID',
      `Payment of ₹${order.total_amount} verified online (Txn: ${razorpay_payment_id})`,
      'Razorpay Gateway', now
    ]);

    // 5. Real-time broadcast
    this.broadcast('order_payment_updated', {
      order_id: order.id,
      order_number: order.order_number,
      payment_status: 'PAID',
      payment_method: 'RAZORPAY',
      amount: order.total_amount,
      provider_payment_id: razorpay_payment_id,
      verified_at: now
    });

    return {
      success: true,
      message: 'Razorpay payment successfully verified and recorded.',
      order_id: order.id,
      payment_status: 'PAID',
      provider_payment_id: razorpay_payment_id,
      verified_at: now
    };
  }

  /**
   * Delivery Agent Doorstep Cash Collection
   */
  async recordDeliveryCashCollection({
    orderId,
    agentId,
    agentName,
    amountCollected,
    customerTendered,
    changeReturned,
    latitude,
    longitude,
    deviceInfo,
    notes
  }) {
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw new Error('Order not found');

    if (order.payment_status === 'PAID') {
      throw new Error(`Order #${order.order_number} has already been marked as PAID.`);
    }

    const orderTotal = Number(order.total_amount);
    const collected = Number(amountCollected || orderTotal);
    const tendered = Number(customerTendered || collected);

    if (tendered < orderTotal) {
      throw new Error(`Tendered cash (₹${tendered}) cannot be less than order total (₹${orderTotal}).`);
    }

    const calculatedChange = Math.max(0, Math.round((tendered - orderTotal) * 100) / 100);
    const finalChange = changeReturned !== undefined ? Number(changeReturned) : calculatedChange;

    const now = new Date().toISOString();
    const txnId = 'txn_' + Math.random().toString(36).substring(2, 10);
    const collectionId = 'dcc_' + Math.random().toString(36).substring(2, 10);

    // 1. Insert into delivery_cash_collections
    await execute(`
      INSERT INTO delivery_cash_collections (
        id, order_id, payment_transaction_id, agent_id, agent_name,
        order_total, amount_collected, customer_tendered, change_returned,
        currency, payment_method, collected_at, latitude, longitude,
        device_info, notes, handover_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      collectionId, order.id, txnId, agentId, agentName,
      orderTotal, collected, tendered, finalChange,
      'INR', 'CASH', now, latitude || null, longitude || null,
      deviceInfo ? JSON.stringify(deviceInfo) : null, notes || 'Doorstep cash collected', 'PENDING'
    ]);

    // 2. Insert into payment_transactions
    await execute(`
      INSERT INTO payment_transactions (
        id, order_id, customer_id, amount, currency, method, provider,
        transaction_reference, status, collected_by, collected_by_id,
        collected_at, verified_at, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      txnId, order.id, order.customer_id, collected, 'INR',
      'CASH', 'MANUAL', collectionId, 'PAID', agentName, agentId,
      now, now, JSON.stringify({ tendered, change: finalChange, collectionId }), now, now
    ]);

    // 3. Update orders payment_status = PAID
    await execute(`
      UPDATE orders SET
        payment_status = 'PAID',
        payment_method = 'CASH',
        payment_transaction_id = ?,
        updated_at = ?
      WHERE id = ?
    `, [txnId, now, order.id]);

    // 4. Audit trail
    await execute(`
      INSERT INTO payment_audits (id, order_id, store_id, amount, payment_method, paid_by_user_id, paid_by_user_name, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'pay_' + Math.random().toString(36).substring(2, 9),
      order.id, order.store_id, collected, 'CASH',
      agentId, agentName,
      `Doorstep Cash: ₹${collected} (Tendered: ₹${tendered}, Change: ₹${finalChange})`,
      now
    ]);

    // 5. Order status history
    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'osh_' + Math.random().toString(36).substring(2, 9),
      order.id, order.status, 'PAID',
      `Cash collected by delivery partner ${agentName} at doorstep (₹${collected})`,
      agentName, now
    ]);

    // 6. Broadcast event
    this.broadcast('delivery_cash_collected', {
      order_id: order.id,
      order_number: order.order_number,
      collection_id: collectionId,
      agent_id: agentId,
      agent_name: agentName,
      amount: collected,
      change: finalChange,
      collected_at: now
    });

    this.broadcast('order_payment_updated', {
      order_id: order.id,
      order_number: order.order_number,
      payment_status: 'PAID',
      payment_method: 'CASH',
      collected_by: agentName,
      amount: collected,
      paid_at: now
    });

    return {
      success: true,
      message: `Cash of ₹${collected} recorded successfully. Change returned: ₹${finalChange}`,
      collection_id: collectionId,
      transaction_id: txnId,
      order_id: order.id,
      payment_status: 'PAID',
      order_total: orderTotal,
      amount_collected: collected,
      customer_tendered: tendered,
      change_returned: finalChange
    };
  }

  /**
   * Process Razorpay Webhook Event with Idempotency & Signature Verification
   */
  async handleWebhook({ rawBody, signature, eventPayload }) {
    // 1. Verify signature
    const isValid = await this.razorpay.verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      throw new Error('Invalid Razorpay webhook signature');
    }

    const eventId = eventPayload.event_id || eventPayload.id || `evt_${Math.random().toString(36).substring(2, 10)}`;
    const eventType = eventPayload.event;

    // 2. Idempotency Check: Don't process duplicate events
    const existing = await getOne('SELECT * FROM payment_webhook_events WHERE event_id = ?', [eventId]);
    if (existing && existing.processed === 1) {
      console.log(`[Webhook Idempotent]: Event ${eventId} already processed.`);
      return { success: true, duplicate: true, event_id: eventId };
    }

    const now = new Date().toISOString();
    if (!existing) {
      await execute(`
        INSERT INTO payment_webhook_events (id, provider, event_id, event_type, payload, signature, processed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `, ['pwe_' + Math.random().toString(36).substring(2, 9), 'RAZORPAY', eventId, eventType, JSON.stringify(eventPayload), signature, now]);
    }

    // 3. Process events
    if (eventType === 'payment.captured') {
      const payment = eventPayload.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      const paymentId = payment?.id;

      if (razorpayOrderId) {
        const order = await getOne(`
          SELECT * FROM orders
          WHERE id IN (SELECT order_id FROM payment_transactions WHERE provider_order_id = ?)
        `, [razorpayOrderId]);

        if (order && order.payment_status !== 'PAID') {
          await execute('UPDATE orders SET payment_status = "PAID", updated_at = ? WHERE id = ?', [now, order.id]);
          await execute(`
            UPDATE payment_transactions SET
              provider_payment_id = ?,
              status = 'PAID',
              verified_at = ?,
              updated_at = ?
            WHERE provider_order_id = ?
          `, [paymentId, now, now, razorpayOrderId]);

          this.broadcast('order_payment_updated', {
            order_id: order.id,
            order_number: order.order_number,
            payment_status: 'PAID',
            payment_method: 'RAZORPAY',
            amount: order.total_amount,
            paid_at: now
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      const payment = eventPayload.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      if (razorpayOrderId) {
        await execute(`
          UPDATE payment_transactions SET
            status = 'FAILED',
            failure_reason = ?,
            updated_at = ?
          WHERE provider_order_id = ?
        `, [payment?.error_description || 'Payment failed', now, razorpayOrderId]);
      }
    }

    // Mark webhook event as processed
    await execute('UPDATE payment_webhook_events SET processed = 1, processed_at = ? WHERE event_id = ?', [now, eventId]);

    return { success: true, processed: true, event_id: eventId };
  }

  /**
   * Process Refund
   */
  async processRefund({ orderId, amount, reason, initiatedBy }) {
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) throw new Error('Order not found');

    if (order.payment_status !== 'PAID') {
      throw new Error('Only PAID orders can be refunded.');
    }

    const refundAmount = amount ? Number(amount) : Number(order.total_amount);
    const isFullRefund = refundAmount >= Number(order.total_amount);
    const newPaymentStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    const now = new Date().toISOString();

    const transaction = await getOne('SELECT * FROM payment_transactions WHERE order_id = ? AND status = "PAID" ORDER BY created_at DESC LIMIT 1', [orderId]);

    // If online Razorpay payment, call gateway refund API
    let gatewayRefund = null;
    if (transaction?.provider === 'RAZORPAY' && transaction?.provider_payment_id) {
      gatewayRefund = await this.razorpay.initiateRefund({
        paymentId: transaction.provider_payment_id,
        amount: refundAmount,
        notes: { reason: reason || 'Customer requested refund', order_id: orderId }
      });
    }

    // Record refund transaction
    const refundTxnId = 'txn_ref_' + Math.random().toString(36).substring(2, 9);
    await execute(`
      INSERT INTO payment_transactions (
        id, order_id, customer_id, amount, currency, method, provider,
        provider_payment_id, transaction_reference, status, collected_by,
        metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      refundTxnId, order.id, order.customer_id, refundAmount, 'INR',
      transaction?.method || 'CASH', transaction?.provider || 'MANUAL',
      gatewayRefund?.refund_id || null, `REFUND-${order.order_number}`, newPaymentStatus,
      initiatedBy || 'Store Owner', JSON.stringify({ reason, isFullRefund, gatewayRefund }),
      now, now
    ]);

    await execute('UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?', [newPaymentStatus, now, order.id]);

    await execute(`
      INSERT INTO payment_audits (id, order_id, store_id, amount, payment_method, paid_by_user_name, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'pay_' + Math.random().toString(36).substring(2, 9),
      order.id, order.store_id, refundAmount, transaction?.method || 'CASH',
      initiatedBy || 'Store Owner', `Refund of ₹${refundAmount} processed (${reason || 'Standard Refund'})`, now
    ]);

    await execute(`
      INSERT INTO order_status_history (id, order_id, status, payment_status, notes, updated_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'osh_' + Math.random().toString(36).substring(2, 9),
      order.id, order.status, newPaymentStatus,
      `Refund of ₹${refundAmount} approved by ${initiatedBy || 'Store Owner'}. Reason: ${reason || 'N/A'}`,
      initiatedBy || 'Store Owner', now
    ]);

    this.broadcast('order_payment_updated', {
      order_id: order.id,
      order_number: order.order_number,
      payment_status: newPaymentStatus,
      refund_amount: refundAmount,
      refund_id: refundTxnId,
      refunded_at: now
    });

    return {
      success: true,
      message: `Refund of ₹${refundAmount} processed successfully.`,
      order_id: order.id,
      payment_status: newPaymentStatus,
      refund_amount: refundAmount,
      gateway_refund: gatewayRefund
    };
  }

  /**
   * Cash Handover: Agent Summary
   */
  async getAgentCashSummary(agentId) {
    const collections = await query(`
      SELECT * FROM delivery_cash_collections
      WHERE agent_id = ?
      ORDER BY collected_at DESC
    `, [agentId]);

    let totalCollected = 0;
    let pendingHandover = 0;
    let handedOver = 0;
    const pendingCollections = [];

    for (const c of collections) {
      totalCollected += c.amount_collected;
      if (c.handover_status === 'PENDING') {
        pendingHandover += c.amount_collected;
        pendingCollections.push(c);
      } else {
        handedOver += c.amount_collected;
      }
    }

    const handovers = await query(`
      SELECT * FROM cash_handover_sessions
      WHERE agent_id = ?
      ORDER BY handover_time DESC
      LIMIT 10
    `, [agentId]);

    return {
      agent_id: agentId,
      total_cash_collected: totalCollected,
      pending_handover: pendingHandover,
      handed_over: handedOver,
      pending_orders_count: pendingCollections.length,
      pending_collections: pendingCollections,
      recent_handovers: handovers
    };
  }

  /**
   * Confirm Cash Handover Session (Owner approves agent's cash)
   */
  async confirmCashHandover({ agentId, agentName, receivedAmount, notes, approvedBy }) {
    const summary = await this.getAgentCashSummary(agentId);
    const expected = Number(summary.pending_handover);
    const received = Number(receivedAmount);
    const difference = Math.round((received - expected) * 100) / 100;
    const now = new Date().toISOString();
    const handoverId = 'hnd_' + Math.random().toString(36).substring(2, 9);

    await execute(`
      INSERT INTO cash_handover_sessions (
        id, agent_id, agent_name, expected_amount, received_amount,
        difference, orders_count, approved_by, notes, handover_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
    `, [
      handoverId, agentId, agentName || summary.pending_collections[0]?.agent_name || 'Delivery Partner',
      expected, received, difference, summary.pending_orders_count,
      approvedBy || 'Store Owner', notes || '', now
    ]);

    // Mark pending collections as HANDED_OVER
    await execute(`
      UPDATE delivery_cash_collections SET
        handover_id = ?,
        handover_status = 'HANDED_OVER'
      WHERE agent_id = ? AND handover_status = 'PENDING'
    `, [handoverId, agentId]);

    this.broadcast('cash_handover_completed', {
      handover_id: handoverId,
      agent_id: agentId,
      agent_name: agentName,
      expected_amount: expected,
      received_amount: received,
      difference,
      approved_by: approvedBy,
      handover_time: now
    });

    return {
      success: true,
      message: `Cash handover of ₹${received} confirmed successfully. Difference: ₹${difference}`,
      handover_id: handoverId,
      expected_amount: expected,
      received_amount: received,
      difference
    };
  }

  /**
   * Payments Reconciliation Summary & Breakdown
   */
  async getPaymentReconciliation({ startDate, endDate, method, agentId } = {}) {
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || (today + 'T23:59:59');

    const transactions = await query(`
      SELECT pt.*, o.order_number, o.customer_name
      FROM payment_transactions pt
      LEFT JOIN orders o ON o.id = pt.order_id
      WHERE pt.created_at >= ? AND pt.created_at <= ?
      ORDER BY pt.created_at DESC
    `, [start, end]);

    let total = 0;
    let cash = 0;
    let upi = 0;
    let razorpay = 0;
    let card = 0;
    let credit = 0;
    let refunded = 0;

    for (const t of transactions) {
      if (t.status === 'PAID') {
        total += t.amount;
        if (t.method === 'CASH') cash += t.amount;
        else if (t.method === 'UPI') upi += t.amount;
        else if (t.method === 'RAZORPAY') razorpay += t.amount;
        else if (t.method === 'CARD') card += t.amount;
        else if (t.method === 'CREDIT') credit += t.amount;
      } else if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(t.status)) {
        refunded += t.amount;
      }
    }

    // Agent cash breakdown
    const agentCollections = await query(`
      SELECT
        agent_id, agent_name,
        COUNT(id) as orders_count,
        SUM(amount_collected) as total_cash,
        SUM(CASE WHEN handover_status = 'PENDING' THEN amount_collected ELSE 0 END) as pending_cash,
        SUM(CASE WHEN handover_status = 'HANDED_OVER' THEN amount_collected ELSE 0 END) as handed_over_cash
      FROM delivery_cash_collections
      WHERE collected_at >= ? AND collected_at <= ?
      GROUP BY agent_id, agent_name
    `, [start, end]);

    const handovers = await query(`
      SELECT * FROM cash_handover_sessions
      WHERE handover_time >= ? AND handover_time <= ?
      ORDER BY handover_time DESC
    `, [start, end]);

    return {
      summary: {
        total_collected: Math.round(total),
        cash: Math.round(cash),
        upi: Math.round(upi),
        razorpay: Math.round(razorpay),
        card: Math.round(card),
        credit: Math.round(credit),
        refunded: Math.round(refunded),
        net_revenue: Math.round(total - refunded)
      },
      agent_collections: agentCollections,
      handovers,
      recent_transactions: transactions.slice(0, 50)
    };
  }
}

export const paymentService = new PaymentService();
