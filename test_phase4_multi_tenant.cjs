/**
 * Phase 4 Multi-Tenant SaaS & POS Acceptance Test Suite
 * Tests tenant isolation, store registration, 10-step onboarding, POS item discounts, and audit logs.
 */

const http = require('http');

function apiRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'x-tenant-id': options.tenantId || 'store_royal_001'
    };

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...(options.headers || {}) }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 4 Multi-Tenant SaaS & POS Validation...\n');
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
    // 1. Health & Dual-Engine Check
    const health = await apiRequest('/api/platform/health');
    assert(health.status === 200 && (health.body.status === 'HEALTHY' || health.body.status === 'ok'), `Platform health check: ${health.body.status}`);
    assert(health.body.database_driver || health.body.database, `Database driver active: ${health.body.database_driver || health.body.database}`);

    // 2. Platform Stats
    const stats = await apiRequest('/api/platform/stats');
    assert(stats.status === 200 && stats.body.total_tenants >= 2, `Platform stats reports ${stats.body.total_tenants} tenants`);

    // 3. Multi-Tenant Isolation Test: Store 001 vs Store 002 Products
    const prod001 = await apiRequest('/api/products', { tenantId: 'store_royal_001' });
    const prod002 = await apiRequest('/api/products', { tenantId: 'store_fresh_002' });
    assert(Array.isArray(prod001.body), `Tenant 001 (Royal Kirana) returned ${prod001.body.length} products`);
    assert(Array.isArray(prod002.body), `Tenant 002 (Fresh Mart) returned ${prod002.body.length} products`);

    const hasCrossPollution = prod002.body.some(p => p.tenant_id !== 'store_fresh_002');
    assert(!hasCrossPollution, 'Tenant 002 product catalog contains ONLY Tenant 002 data (Zero cross-tenant pollution)');

    // 4. Store Registration
    const newStoreSlug = 'test-mart-' + Date.now();
    const uniquePhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
    const regResult = await apiRequest('/api/platform/register-store', {
      method: 'POST',
      body: {
        store_name: 'Test Supermart ' + Date.now().toString().slice(-4),
        owner_name: 'Test Owner',
        owner_phone: uniquePhone,
        owner_email: `test_${Date.now().toString().slice(-4)}@supermart.com`,
        pin: '5555',
        business_type: 'Supermarket',
        address: '123 Market Street',
        city: 'Hyderabad',
        pincode: '500001'
      }
    });
    const registeredTenantId = regResult.body.tenant_id || (regResult.body.tenant && regResult.body.tenant.id);
    assert(regResult.status === 200 && registeredTenantId, `Store Registration succeeded with tenant_id: ${registeredTenantId}`);

    // 5. 10-Step Onboarding Data Persistence
    const onbResult = await apiRequest('/api/platform/onboarding', {
      method: 'POST',
      tenantId: registeredTenantId,
      body: {
        tenant_id: registeredTenantId,
        step: 10,
        step_data: {
          brand_color: '#db2777',
          free_delivery_above: 499,
          initial_staff: {
            name: 'Demo Cashier',
            phone: '9' + Math.floor(100000000 + Math.random() * 900000000),
            pin: '1234',
            role: 'CASHIER'
          }
        }
      }
    });
    assert(onbResult.status === 200 && onbResult.body.success, 'Onboarding step 10 saved successfully');

    // 6. POS Item-Level Discount & Authoritative Financial Calculation
    const p1 = prod001.body[0] || { id: 'p1', name: 'Item 1', selling_price: 150, unit: 'KG' };
    const p2 = prod001.body[1] || { id: 'p2', name: 'Item 2', selling_price: 180, unit: 'PACK' };
    const p1Price = Number(p1.selling_price) || 150;
    const p2Price = Number(p2.selling_price) || 180;
    const p1Discount = 5;
    const p1Taxable = 2 * (p1Price - p1Discount);
    const p1Tax = (p1Taxable * (Number(p1.gst_percent) || 0)) / 100;
    const p2Taxable = 1 * p2Price;
    const p2Tax = (p2Taxable * (Number(p2.gst_percent) || 0)) / 100;
    const expectedTotal = Math.round((p1Taxable + p1Tax + p2Taxable + p2Tax) * 100) / 100;

    const posPayload = {
      items: [
        {
          product_id: p1.id,
          product_name: p1.name,
          unit: p1.unit || 'KG',
          quantity: 2,
          original_price: p1Price,
          unit_price: p1Price - p1Discount,
          discount_type: 'FLAT',
          discount_value: p1Discount,
          discount_amount: p1Discount * 2,
          discount_reason: 'Customer negotiation',
          manager_pin_approved: 1,
          manager_pin: '1234'
        },
        {
          product_id: p2.id,
          product_name: p2.name,
          unit: p2.unit || 'PACK',
          quantity: 1,
          original_price: p2Price,
          unit_price: p2Price,
          discount_type: 'FLAT',
          discount_value: 0,
          discount_amount: 0
        }
      ],
      payment_method: 'CASH',
      discount: 0,
      manager_approval: {
        approved_by_pin: '1234',
        approved_by_role: 'STORE_OWNER'
      }
    };

    const posSale = await apiRequest('/api/orders/pos', {
      method: 'POST',
      tenantId: 'store_royal_001',
      body: posPayload
    });

    assert(posSale.status === 200 && posSale.body.success, `POS Bill generated #${posSale.body.order_number || posSale.body.order_id}`);
    assert(posSale.body.total_amount === expectedTotal, `Authoritative total_amount verified: ₹${posSale.body.total_amount} (Expected: ₹${expectedTotal})`);

    // 7. Discount Reporting API
    const discReport = await apiRequest('/api/reports/discounts', { tenantId: 'store_royal_001' });
    assert(discReport.status === 200 && (discReport.body.total_discounts_given !== undefined || discReport.body.today_discounts !== undefined), `Discount reporting returns total discounts: ₹${discReport.body.total_discounts_given ?? discReport.body.today_discounts}`);

    // 8. Tenant Suspension & Un-suspension Lifecycle
    const suspRes = await apiRequest(`/api/platform/tenants/${registeredTenantId}/status`, {
      method: 'PUT',
      body: { status: 'suspended', reason: 'Audit test' }
    });
    assert(suspRes.status === 200, 'Tenant suspended by Platform Admin');

    const blockedReq = await apiRequest('/api/store', { tenantId: registeredTenantId });
    assert(blockedReq.status === 403 || (blockedReq.body && (blockedReq.body.status === 'SUSPENDED' || blockedReq.body.tenant_status === 'SUSPENDED')), 'Suspended tenant profile returns suspended status');

    const reactRes = await apiRequest(`/api/platform/tenants/${registeredTenantId}/status`, {
      method: 'PUT',
      body: { status: 'active' }
    });
    assert(reactRes.status === 200, 'Tenant re-activated successfully');

    console.log(`\n🏁 Test Results: ${passed} Passed, ${failed} Failed.`);
    if (failed === 0) {
      console.log('🎉 ALL PHASE 4 ACCEPTANCE TESTS PASSED SUCCESSFULLY!\n');
    }
  } catch (err) {
    console.error('Fatal test error:', err);
  }
}

runTests();
