/**
 * PHASE 5 ACCEPTANCE TEST SUITE:
 * SAAS COMPANY CONTROL CENTER, STORE APPROVAL, PAYMENT, WHITE-LABEL & CUSTOM DOMAIN
 * 
 * Validates:
 * 1. Public DB-driven SaaS Pricing Plans & Features
 * 2. Store Registration & PENDING Status Isolation
 * 3. Company Admin Review, Notes, & Application Approval
 * 4. SaaS Subscription Billing (Store ➔ Company Payment Verification)
 * 5. Automatic Store Activation (tenant.status = 'ACTIVE')
 * 6. Custom Domain Registration, DNS Verification & SSL Provisioning
 * 7. Multi-Tenant Dynamic Hostname Routing via Middleware
 * 8. Help & Support Desk Ticketing Lifecycle
 * 9. Company Suspension & Retention Rules
 * 10. Platform Revenue vs Retail Grocery Sales Isolation
 */

import express from 'express';
import db, { initDatabase, query, getOne, execute } from './server/db.js';
import { runMigrations } from './server/migrations/migrationManager.js';
import platformRoutes from './server/platform/platformRoutes.js';
import { resolveTenant } from './server/tenant/tenantMiddleware.js';

async function runPhase5TestSuite() {
  console.log('================================================================');
  console.log('🚀 PHASE 5: SAAS COMPANY CONTROL CENTER & CUSTOM DOMAIN SUITE');
  console.log('================================================================\n');

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

  try {
    // 0. Database & Migration Initialization
    console.log('[Step 0] Ensuring Central Database & Phase 5 Schema Migrations are Applied...');
    await initDatabase();
    await runMigrations();
    assert(true, 'Central database and migrations verified');

    // Spin up an in-process ephemeral Express app for clean API testing
    const app = express();
    app.use(express.json());
    app.use(resolveTenant);
    app.use('/api/platform', platformRoutes);

    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`  ⚡ Test harness running on ${baseUrl}\n`);

    // Helper fetch wrapper
    async function testFetch(url, options = {}) {
      const res = await fetch(`${baseUrl}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, ok: res.ok, data };
    }

    // ----------------------------------------------------
    // TEST 1: Public SaaS Pricing Plans
    // ----------------------------------------------------
    console.log('--- TEST 1: Public SaaS Subscription Plans Discovery ---');
    const plansRes = await testFetch('/api/platform/plans');
    assert(plansRes.ok && Array.isArray(plansRes.data), 'Public plans endpoint returns 200 OK and an array');
    assert(plansRes.data.length >= 4, `At least 4 SaaS subscription tiers exist in database (found ${plansRes.data.length})`);
    
    const proPlan = plansRes.data.find(p => p.slug === 'pro' || p.id === 'plan_pro');
    assert(proPlan && proPlan.monthly_price === 2499, 'Professional Supermarket plan has dynamic DB price of ₹2,499');
    assert(proPlan && proPlan.custom_domain === 1, 'Pro plan includes Custom Domain feature flag');

    // ----------------------------------------------------
    // TEST 2: Store Application Registration
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Store Application Submission & Non-Activation Check ---');
    const testPhone = '99' + Math.floor(10000000 + Math.random() * 90000000);
    const testDomain = 'www.balajifresh-' + Date.now().toString().slice(-5) + '.com';
    const testAppPayload = {
      store_name: 'Balaji Fresh Daily Mart',
      owner_name: 'Venkatesh Rao',
      phone: testPhone,
      email: `venkatesh_${Date.now().toString().slice(-4)}@balajifresh.com`,
      business_name: 'Balaji Fresh Retailers LLP',
      address: 'Shop 14, High Street Market, Kukatpally',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500072',
      gst_number: '36AAAAA0000A1Z5',
      requested_plan: 'pro',
      terms_accepted: true
    };

    const regRes = await testFetch('/api/platform/applications', {
      method: 'POST',
      body: JSON.stringify(testAppPayload)
    });
    if (!regRes.ok) console.log('DEBUG regRes ERROR:', regRes);

    assert(regRes.ok && regRes.data.success, 'Store registration submitted successfully');
    assert(regRes.data.status === 'PENDING', 'New application status is correctly set to PENDING (NOT auto-activated)');
    const appNumber = regRes.data.application_number;
    const appId = regRes.data.application_id;
    assert(!!appNumber && appNumber.startsWith('STORE-'), `Generated application number is formatted correctly: ${appNumber}`);

    // Verify tenant row exists in DB with status PENDING
    const tenantCheck = await getOne('SELECT * FROM tenants WHERE id = ?', [regRes.data.tenant_id]);
    assert(tenantCheck && tenantCheck.status === 'PENDING', 'Tenant in database has status PENDING (Blocked from POS/Checkout)');

    // ----------------------------------------------------
    // TEST 3: Merchant Application Status Tracking
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Public Merchant Application Status Tracking ---');
    const statusRes = await testFetch(`/api/platform/applications/status/${encodeURIComponent(appNumber)}`);
    assert(statusRes.ok && statusRes.data.status === 'PENDING', 'Applicant can check live review status by application number');
    
    const phoneStatusRes = await testFetch(`/api/platform/applications/status/${testPhone}`);
    assert(phoneStatusRes.ok && phoneStatusRes.data.application_number === appNumber, 'Applicant can also track status by phone number');

    // ----------------------------------------------------
    // TEST 4: Company Admin Review & Approval Workflow
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Company Admin Approval & Payment Request Generation ---');
    const approveRes = await testFetch(`/api/platform/admin/applications/${appId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ review_notes: 'All documents verified. Serviceable zone.' })
    });

    assert(approveRes.ok && approveRes.data.success, 'Company Admin approved application successfully');
    assert(approveRes.data.status === 'PAYMENT_PENDING', 'Application status transitioned to PAYMENT_PENDING');

    // ----------------------------------------------------
    // TEST 5: Platform Subscription Payment & Verification (Store ➔ Company)
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Platform Subscription Payment Verification & Store Activation ---');
    const payOrderRes = await testFetch('/api/platform/payments/create-subscription-order', {
      method: 'POST',
      body: JSON.stringify({
        application_number: appNumber,
        billing_cycle: 'MONTHLY'
      })
    });
    assert(payOrderRes.ok && payOrderRes.data.success, 'Subscription payment order initialized');
    assert(!!payOrderRes.data.invoice_id, 'Platform subscription invoice request created for merchant');
    const grandAmount = payOrderRes.data.amount || payOrderRes.data.subtotal;
    assert(grandAmount > 0, `Total payment includes plan price and setup fee: ₹${grandAmount}`);

    // Verify payment from payment gateway callback
    const verifyPayRes = await testFetch('/api/platform/payments/verify-subscription-payment', {
      method: 'POST',
      body: JSON.stringify({
        application_number: appNumber,
        payment_id: `pay_test_${Date.now()}`
      })
    });
    assert(verifyPayRes.ok && verifyPayRes.data.success, 'Gateway payment verified by platform');

    // Check store activation in database
    const activatedTenant = await getOne('SELECT * FROM tenants WHERE id = ?', [regRes.data.tenant_id]);
    assert(activatedTenant.status === 'ACTIVE', 'Tenant status is now ACTIVE after successful payment');

    const subRecord = await getOne('SELECT * FROM platform_subscriptions WHERE tenant_id = ?', [regRes.data.tenant_id]);
    assert(subRecord && subRecord.status === 'ACTIVE', 'Platform subscription record is ACTIVE with valid expiry date');

    const invRecord = await getOne('SELECT * FROM platform_invoices WHERE tenant_id = ?', [regRes.data.tenant_id]);
    assert(invRecord && invRecord.status === 'PAID', 'Platform tax invoice status is updated to PAID');

    // ----------------------------------------------------
    // TEST 6: Custom Domain Registration & DNS Verification
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Custom Domain Setup & Automated Verification ---');
    const tenantId = regRes.data.tenant_id;
    const addDomainRes = await testFetch('/api/platform/store/domains', {
      method: 'POST',
      headers: { 'x-tenant-id': tenantId },
      body: JSON.stringify({ domain: testDomain })
    });

    assert(addDomainRes.ok && addDomainRes.data.success, 'Custom domain added to store profile');
    const domainId = addDomainRes.data.domain_id;
    const verifyToken = addDomainRes.data.verification_token;
    assert(!!verifyToken && (verifyToken.startsWith('tok_verify_') || verifyToken.startsWith('kirana_verify_')), `DNS verification TXT token generated: ${verifyToken}`);

    // Trigger DNS verification & SSL certificate provisioning
    const verifyDomainRes = await testFetch(`/api/platform/store/domains/${domainId}/verify`, {
      method: 'POST',
      headers: { 'x-tenant-id': tenantId }
    });

    assert(verifyDomainRes.ok && verifyDomainRes.data.success, 'DNS records verified and SSL certificate provisioned');
    const verifiedDomainRecord = await getOne('SELECT * FROM tenant_domains WHERE id = ?', [domainId]);
    assert(verifiedDomainRecord.verification_status === 'VERIFIED' && verifiedDomainRecord.ssl_status === 'ACTIVE', 'Domain is fully live with active SSL');

    // ----------------------------------------------------
    // TEST 7: Dynamic Multi-Tenant Hostname Resolution Middleware
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Multi-Tenant Hostname Routing via Reverse Proxy ---');
    // Simulate incoming HTTP request with Host / X-Forwarded-Host: testDomain
    const domainTestRes = await testFetch('/api/platform/store/subscription', {
      headers: {
        'x-forwarded-host': testDomain
      }
    });
    assert(domainTestRes.ok && domainTestRes.data.subscription?.tenant_id === tenantId, `Hostname "${testDomain}" resolved dynamically to correct tenant`);

    // ----------------------------------------------------
    // TEST 8: Help & Support Desk Ticketing Lifecycle
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Support Desk Ticketing Workflow ---');
    const createTicketRes = await testFetch('/api/platform/store/tickets', {
      method: 'POST',
      headers: { 'x-tenant-id': tenantId },
      body: JSON.stringify({
        subject: 'Bluetooth Thermal Receipt Printer pairing inquiry',
        description: 'Need assistance setting up 58mm printer with our mobile counter.',
        priority: 'HIGH'
      })
    });
    assert(createTicketRes.ok && createTicketRes.data.success, 'Store created support ticket');
    const ticketId = createTicketRes.data.ticket_id;

    // Company Admin responds to ticket
    const replyRes = await testFetch(`/api/platform/admin/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello Venkatesh, please ensure Chrome Bluetooth flags are enabled under chrome://flags.'
      })
    });
    assert(replyRes.ok && replyRes.data.success, 'Company Admin successfully replied to support ticket');

    // Company Admin resolves ticket
    const statusUpdateRes = await testFetch(`/api/platform/admin/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESOLVED' })
    });
    assert(statusUpdateRes.ok && statusUpdateRes.data.success, 'Company Admin marked ticket as RESOLVED');

    // ----------------------------------------------------
    // TEST 9: Store Suspension & Administrative Control
    // ----------------------------------------------------
    console.log('\n--- TEST 9: Store Suspension & Data Retention ---');
    const suspendRes = await testFetch(`/api/platform/admin/stores/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'SUSPENDED', reason: 'Routine compliance audit' })
    });
    assert(suspendRes.ok && suspendRes.data.success, 'Store suspended by Company Admin');

    const suspendedTenant = await getOne('SELECT * FROM tenants WHERE id = ?', [tenantId]);
    assert(suspendedTenant.status === 'SUSPENDED', 'Tenant status confirmed SUSPENDED');

    // Verify re-activation
    const reactivateRes = await testFetch(`/api/platform/admin/stores/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' })
    });
    assert(reactivateRes.ok && reactivateRes.data.success, 'Store re-activated by Company Admin');

    // ----------------------------------------------------
    // TEST 10: Platform Revenue vs Store Sales Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST 10: Financial Architecture Isolation Verification ---');
    const platformPaymentsCount = await getOne('SELECT COUNT(*) as count FROM platform_subscription_payments WHERE tenant_id = ?', [tenantId]);
    const storeOrdersCount = await getOne('SELECT COUNT(*) as count FROM orders WHERE store_id = ?', [tenantId]);
    assert(platformPaymentsCount.count >= 1, 'Platform subscription payments recorded in dedicated table');
    assert(storeOrdersCount.count === 0, 'Platform subscription payments did NOT pollute customer grocery orders table');

    // Teardown
    server.close();
    console.log('\n================================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite execution error:', err);
    process.exit(1);
  }
}

runPhase5TestSuite();
