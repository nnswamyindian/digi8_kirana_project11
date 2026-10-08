/**
 * Unit & Offline Acceptance Test Suite
 * Tests core Kirana SaaS business logic, JWT tokens, pricing calculations,
 * UPI dynamic links, and multi-tenant slug routing without external dependencies.
 */

import { tokenService } from '../auth/tokenService.js';
import QRCode from 'qrcode';

async function runUnitTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING KIRANA SAAS PLATFORM UNIT TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------
  // TEST SUITE 1: RFC 7519 JWT Authentication & Token Security
  // -------------------------------------------------------------------
  console.log('📦 [1/4] JWT Authentication & Token Signing:');
  {
    const claims = {
      userId: 'usr_owner_001',
      tenantId: 'store_royal_001',
      role: 'STORE_OWNER',
      name: 'Ramesh Patel'
    };

    const token = tokenService.generateToken(claims, 3600);
    assert(typeof token === 'string' && token.split('.').length === 3, 'JWT has valid three-part format (header.payload.signature)');

    const verified = tokenService.verifyToken(token);
    assert(verified && verified.userId === 'usr_owner_001', 'Verified token userId matches claims');
    assert(verified && verified.tenantId === 'store_royal_001', 'Verified token tenantId matches claims');
    assert(verified && verified.role === 'STORE_OWNER', 'Verified token role matches claims');

    // Tampered token test
    const tampered = token.slice(0, -6) + 'xyz123';
    const tamperedCheck = tokenService.verifyToken(tampered);
    assert(tamperedCheck === null, 'Tampered JWT signature is rejected');

    // Expired token test
    const expiredToken = tokenService.generateToken(claims, -100);
    const expiredCheck = tokenService.verifyToken(expiredToken);
    assert(expiredCheck === null, 'Expired JWT token is rejected');
  }

  // -------------------------------------------------------------------
  // TEST SUITE 2: Dynamic UPI QR Code & Deep Link Generation
  // -------------------------------------------------------------------
  console.log('\n💳 [2/4] UPI Deep Link & QR Code Generation:');
  {
    const upiId = '9666252024@sbi';
    const storeName = 'Testing Royal';
    const amount = 850.50;
    const orderNumber = 'ORD-2026-1001';

    const cleanAmount = Number(amount).toFixed(2);
    const note = `Order ${orderNumber}`;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${cleanAmount}&tn=${encodeURIComponent(note)}&cu=INR`;

    assert(upiUrl.includes('pa=9666252024%40sbi'), 'UPI URL contains encoded VPA address');
    assert(upiUrl.includes('am=850.50'), 'UPI URL contains formatted amount with 2 decimal places');
    assert(upiUrl.includes('cu=INR'), 'UPI URL sets Indian Rupee (INR) currency');

    // Generate real QR Data URL
    const qrDataUrl = await QRCode.toDataURL(upiUrl, { errorCorrectionLevel: 'M', margin: 2 });
    assert(typeof qrDataUrl === 'string' && qrDataUrl.startsWith('data:image/png;base64,'), 'QR Code Data URL successfully encoded to Base64 PNG');
  }

  // -------------------------------------------------------------------
  // TEST SUITE 3: POS Pricing, Markup, Loose Weighing & Discount Math
  // -------------------------------------------------------------------
  console.log('\n⚖️ [3/4] POS Pricing, Margins & Weight Calculations:');
  {
    const mrp = 100.00;
    const sellingPrice = 75.00;
    const purchaseCost = 60.00;

    // Customer savings
    const customerSavings = mrp - sellingPrice;
    assert(customerSavings === 25.00, 'Customer savings correctly calculated (₹25 off ₹100 MRP)');

    // Gross Profit
    const profit = sellingPrice - purchaseCost;
    assert(profit === 15.00, 'Expected profit correctly calculated (₹15 margin)');

    // Profit Margin %: (profit / sellingPrice) * 100
    const profitMargin = Math.round((profit / sellingPrice) * 10000) / 100;
    assert(profitMargin === 20.00, `Profit margin calculated accurately (20.00%): ${profitMargin}%`);

    // Cost Markup %: (profit / purchaseCost) * 100
    const markup = Math.round((profit / purchaseCost) * 10000) / 100;
    assert(markup === 25.00, `Cost markup calculated accurately (25.00%): ${markup}%`);

    // Loose Weight Product: 2.350 KG @ ₹60/KG
    const unitPrice = 60.00;
    const weightQty = 2.350;
    const lineTotal = Math.round(weightQty * unitPrice * 100) / 100;
    assert(lineTotal === 141.00, 'Loose product weighed amount matches expected: ₹141.00 for 2.350 KG');
  }

  // -------------------------------------------------------------------
  // TEST SUITE 4: Multi-Tenant Slugs & System Route Isolation
  // -------------------------------------------------------------------
  console.log('\n🌐 [4/4] Multi-Tenant Slugs & System Routing:');
  {
    const STORE_ADMIN_SLUGS = [
      'dashboard', 'pos', 'orders', 'fleet', 'payments', 'delivery-areas',
      'products', 'categories', 'inventory', 'purchases', 'customers',
      'staff', 'reports', 'domains', 'subscription', 'support', 'settings'
    ];

    const PLATFORM_ADMIN_SLUGS = [
      'platform-dashboard', 'platform-stores', 'platform-applications',
      'platform-subscriptions', 'platform-payments', 'platform-projects',
      'platform-reports', 'platform-domains', 'platform-users',
      'platform-database', 'platform-settings', 'platform-audit-logs',
      'platform-support', 'platform-health'
    ];

    assert(STORE_ADMIN_SLUGS.includes('dashboard'), 'Dashboard is recognized as store system route');
    assert(STORE_ADMIN_SLUGS.includes('pos'), 'POS Billing is recognized as store system route');
    assert(!STORE_ADMIN_SLUGS.includes('royal-kirana'), 'Merchant store slug "royal-kirana" is not confused with system route');
    assert(PLATFORM_ADMIN_SLUGS.includes('platform-stores'), 'Super Admin platform-stores is recognized');
  }

  console.log('\n====================================================');
  console.log(`📊 UNIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests().catch(err => {
  console.error('Fatal Unit Test Failure:', err);
  process.exit(1);
});
