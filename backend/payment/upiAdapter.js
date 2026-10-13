import QRCode from 'qrcode';
import { getOne } from '../db.js';

/**
 * UPI & Dynamic QR Payment Adapter
 * Generates official NPCI UPI Deep Links and standard QR codes
 * compatible with Google Pay, PhonePe, Paytm, BHIM, and banking apps.
 */
export class UPIAdapter {
  async getStoreUPIConfig(tenantId = null) {
    let paySettings = null;
    let store = null;
    if (tenantId) {
      paySettings = await getOne('SELECT * FROM payment_settings WHERE tenant_id = ? OR id = ?', [tenantId, 'pay_' + tenantId]);
      store = await getOne('SELECT * FROM stores WHERE id = ? OR slug = ?', [tenantId, tenantId]);
      if (!store) {
        store = await getOne('SELECT * FROM tenants WHERE id = ? OR slug = ?', [tenantId, tenantId]);
      }
    } else {
      paySettings = await getOne('SELECT * FROM payment_settings WHERE tenant_id = "store_royal_001" OR id = "default" LIMIT 1');
      store = await getOne('SELECT * FROM stores WHERE id = "store_royal_001"') || await getOne('SELECT * FROM tenants WHERE id = "store_royal_001"');
    }

    const upiId = paySettings?.store_upi_id || paySettings?.upi_id || store?.upi_id || (tenantId === 'store_fresh_002' ? 'freshmart@okhdfcbank' : 'royalkirana@upi');
    const storeName = paySettings?.store_upi_name || paySettings?.upi_store_name || store?.name || (tenantId === 'store_fresh_002' ? 'Fresh Mart & Daily Needs' : 'Apna Kirana & Supermarket');
    const qrImageUrl = paySettings?.store_upi_qr_url || '';

    return { upiId, storeName, qrImageUrl };
  }

  /**
   * Generates dynamic NPCI compliant UPI URL and QR Code
   * e.g. upi://pay?pa=id&pn=name&am=850.00&tn=Order-GR-10245&cu=INR
   */
  async generateDynamicQR({ orderId, orderNumber, amount, tenantId = null }) {
    const config = await this.getStoreUPIConfig(tenantId);
    const cleanAmount = Number(amount).toFixed(2);
    const note = `Order ${orderNumber || orderId}`;

    const upiUrl = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.storeName)}&am=${cleanAmount}&tn=${encodeURIComponent(note)}&cu=INR`;

    // Generate high quality QR Data URL using qrcode package
    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiration

    return {
      success: true,
      provider: 'STORE_UPI',
      upi_id: config.upiId,
      store_name: config.storeName,
      amount: cleanAmount,
      upi_url: upiUrl,
      qr_code_data_url: qrDataUrl,
      order_id: orderId,
      order_number: orderNumber,
      expires_at: expiresAt
    };
  }

  /**
   * Static Store QR Code (counter or standard store QR)
   */
  async getStaticStoreQR() {
    const config = await this.getStoreUPIConfig();
    const upiUrl = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.storeName)}&cu=INR`;

    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return {
      upi_id: config.upiId,
      store_name: config.storeName,
      upi_url: upiUrl,
      qr_code_data_url: config.qrImageUrl || qrDataUrl
    };
  }
}

export const upiAdapter = new UPIAdapter();
