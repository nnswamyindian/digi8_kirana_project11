import crypto from 'crypto';
import { getOne } from '../db.js';

/**
 * Razorpay Payment Gateway Adapter
 * Handles server-side order creation, HMAC signature verification,
 * webhooks, and refunds using Razorpay REST APIs & Node crypto.
 */
export class RazorpayAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  async getCredentials(tenantId = null) {
    let dbSettings = null;
    if (tenantId) {
      dbSettings = await getOne('SELECT * FROM payment_settings WHERE tenant_id = ?', [tenantId]);
    }
    if (!dbSettings) {
      dbSettings = await getOne('SELECT * FROM payment_settings WHERE id = "default"') || await getOne('SELECT * FROM payment_settings LIMIT 1');
    }
    const keyId = dbSettings?.razorpay_key_id || process.env.RAZORPAY_KEY_ID || 'rzp_test_kirana_demo';
    const keySecret = dbSettings?.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_kirana_demo_secret';
    const webhookSecret = dbSettings?.razorpay_webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_kirana_123';
    const isEnabled = Boolean(dbSettings?.razorpay_enabled);
    const isTestMode = Boolean(dbSettings?.razorpay_test_mode !== 0);

    return { keyId, keySecret, webhookSecret, isEnabled, isTestMode };
  }

  /**
   * Create Razorpay Order
   * Converts amount in INR to Paise (e.g. ₹100.50 -> 10050 paise)
   */
  async createOrder({ orderId, orderNumber, amount, currency = 'INR', receipt, tenantId = null }) {
    const creds = await this.getCredentials(tenantId);
    const amountInPaise = Math.round(Number(amount) * 100);

    // If keys are mock/demo, generate safe demo order response
    const isDemoKey = !creds.keyId || creds.keyId.includes('demo') || creds.keyId === 'rzp_test_kirana_demo';

    if (isDemoKey) {
      const mockRazorpayOrderId = `order_${Math.random().toString(36).substring(2, 12)}`;
      return {
        success: true,
        provider: 'RAZORPAY',
        provider_order_id: mockRazorpayOrderId,
        amount: amountInPaise,
        currency,
        key_id: creds.keyId,
        is_mock: true,
        notes: { local_order_id: orderId, order_number: orderNumber }
      };
    }

    // Call live Razorpay API
    const authHeader = 'Basic ' + Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: receipt || orderNumber || orderId,
        notes: {
          kirana_order_id: orderId,
          order_number: orderNumber
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.description || 'Razorpay order creation failed');
    }

    return {
      success: true,
      provider: 'RAZORPAY',
      provider_order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id: creds.keyId,
      is_mock: false
    };
  }

  /**
   * Verify Payment Signature
   * Signature = HMAC-SHA256(order_id + "|" + razorpay_payment_id, secret)
   */
  async verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const creds = await this.getCredentials();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { verified: false, error: 'Missing required Razorpay payment signature parameters' };
    }

    // Demo bypass for test keys
    const isDemoKey = !creds.keyId || creds.keyId.includes('demo') || creds.keyId === 'rzp_test_kirana_demo';
    if (isDemoKey) {
      return {
        verified: true,
        provider_payment_id: razorpay_payment_id,
        provider_order_id: razorpay_order_id,
        is_mock: true
      };
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', creds.keySecret)
      .update(payload)
      .digest('hex');

    const verified = expectedSignature === razorpay_signature;
    return {
      verified,
      provider_payment_id: razorpay_payment_id,
      provider_order_id: razorpay_order_id,
      error: verified ? null : 'Payment signature verification failed. Possible tampering detected.'
    };
  }

  /**
   * Verify Webhook Signature
   */
  async verifyWebhookSignature({ rawBody, signature }) {
    const creds = await this.getCredentials();
    if (!signature) return false;

    const isDemoKey = !creds.webhookSecret || creds.webhookSecret.includes('demo');
    if (isDemoKey) return true;

    const expectedSignature = crypto
      .createHmac('sha256', creds.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Initiate Refund (Full or Partial)
   */
  async initiateRefund({ paymentId, amount, notes = {} }) {
    const creds = await this.getCredentials();
    const isDemoKey = !creds.keyId || creds.keyId.includes('demo') || creds.keyId === 'rzp_test_kirana_demo';

    if (isDemoKey) {
      return {
        success: true,
        refund_id: `rfnd_${Math.random().toString(36).substring(2, 10)}`,
        payment_id: paymentId,
        amount: Math.round(Number(amount) * 100),
        status: 'processed',
        is_mock: true
      };
    }

    const authHeader = 'Basic ' + Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
    const payload = {
      amount: Math.round(Number(amount) * 100),
      notes
    };

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.description || 'Razorpay refund processing failed');
    }

    return {
      success: true,
      refund_id: data.id,
      payment_id: data.payment_id,
      amount: data.amount,
      status: data.status,
      is_mock: false
    };
  }
}

export const razorpayAdapter = new RazorpayAdapter();
