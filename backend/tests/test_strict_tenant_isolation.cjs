const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting Strict Multi-Tenant Isolation & Role Security Verification...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Login as Store Owner 1 (Royal Kirana)
  let owner1Token = '';
  await test('Store Owner 1 Login (Royal Kirana: 9876543210)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210', pin: '1234' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.user.role === 'OWNER' || data.user.role === 'STORE_OWNER');
    assert.strictEqual(data.user.tenant_id, 'store_royal_001');
    owner1Token = data.token;
    assert.ok(owner1Token);
  });

  // 2. Login as Store Owner 2 (Fresh Mart)
  let owner2Token = '';
  await test('Store Owner 2 Login (Fresh Mart: 9848012345)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9848012345', pin: '1234' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.user.role === 'OWNER' || data.user.role === 'STORE_OWNER');
    assert.strictEqual(data.user.tenant_id, 'store_fresh_002');
    owner2Token = data.token;
    assert.ok(owner2Token);
  });

  // 3. Login as Central Platform Super Admin
  let platformAdminToken = '';
  await test('Platform Super Admin Login (9999999999 / 9999)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9999999999', pin: '9999' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.role, 'PLATFORM_ADMIN');
    platformAdminToken = data.token;
    assert.ok(platformAdminToken);
  });

  // 4. Store Owner 1 sees ONLY Store 1 Products
  await test('Store Owner 1 sees ONLY Store 1 Products (store_royal_001)', async () => {
    const res = await fetch(`${BASE_URL}/products`, {
      headers: { 'authorization': `Bearer ${owner1Token}` }
    });
    assert.strictEqual(res.status, 200);
    const products = await res.json();
    assert.ok(Array.isArray(products));
    assert.ok(products.length > 0);
    for (const p of products) {
      assert.strictEqual(p.tenant_id, 'store_royal_001', `Found unexpected product ${p.name} with tenant ${p.tenant_id}`);
    }
  });

  // 5. Store Owner 1 CANNOT breach isolation by passing x-tenant-id: store_fresh_002
  await test('Store Owner 1 spoofing x-tenant-id header is FORCED to store_royal_001', async () => {
    const res = await fetch(`${BASE_URL}/products`, {
      headers: {
        'authorization': `Bearer ${owner1Token}`,
        'x-tenant-id': 'store_fresh_002' // Attempt to breach into Fresh Mart!
      }
    });
    assert.strictEqual(res.status, 200);
    const products = await res.json();
    for (const p of products) {
      assert.strictEqual(p.tenant_id, 'store_royal_001', `Breach! Store Owner 1 accessed non-owned store item: ${p.name}`);
    }
  });

  // 6. Store Owner 2 sees ONLY Store 2 Products (store_fresh_002)
  await test('Store Owner 2 sees ONLY Store 2 Products (store_fresh_002)', async () => {
    const res = await fetch(`${BASE_URL}/products`, {
      headers: { 'authorization': `Bearer ${owner2Token}` }
    });
    assert.strictEqual(res.status, 200);
    const products = await res.json();
    assert.ok(Array.isArray(products));
    assert.ok(products.length > 0);
    for (const p of products) {
      assert.strictEqual(p.tenant_id, 'store_fresh_002', `Found unexpected product ${p.name} with tenant ${p.tenant_id}`);
    }
    const hasApple = products.some(p => p.name.includes('Shimla') || p.name.includes('Apple'));
    assert.ok(hasApple, 'Fresh Mart should have Shimla Apple');
  });

  // 7. Store Owner 1 is BLOCKED from accessing Platform Admin Tenants Directory
  await test('Store Owner 1 receives 403 when trying to access /api/platform/tenants', async () => {
    const res = await fetch(`${BASE_URL}/platform/tenants`, {
      headers: { 'authorization': `Bearer ${owner1Token}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // 8. Store Owner 2 is BLOCKED from accessing Platform Admin Applications Queue
  await test('Store Owner 2 receives 403 when trying to access /api/platform/admin/applications', async () => {
    const res = await fetch(`${BASE_URL}/platform/admin/applications`, {
      headers: { 'authorization': `Bearer ${owner2Token}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // 9. Platform Super Admin CAN access all registered stores via /api/platform/tenants
  await test('Platform Admin CAN access all registered stores via /api/platform/tenants', async () => {
    const res = await fetch(`${BASE_URL}/platform/tenants`, {
      headers: { 'authorization': `Bearer ${platformAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const tenants = await res.json();
    assert.ok(Array.isArray(tenants));
    assert.ok(tenants.length >= 2, `Expected at least 2 tenants, found ${tenants.length}`);
    const hasRoyal = tenants.some(t => t.id === 'store_royal_001');
    const hasFresh = tenants.some(t => t.id === 'store_fresh_002');
    assert.ok(hasRoyal, 'Platform Admin should see Royal Kirana');
    assert.ok(hasFresh, 'Platform Admin should see Fresh Mart');
  });

  // 10. Platform Super Admin CAN view Company Control Center Executive Dashboard stats
  await test('Platform Admin CAN view Company Control Center Executive Dashboard stats', async () => {
    const res = await fetch(`${BASE_URL}/platform/admin/dashboard-stats`, {
      headers: { 'authorization': `Bearer ${platformAdminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.total_stores >= 2, `Expected total_stores >= 2, got ${data.total_stores}`);
    assert.ok(typeof data.monthly_recurring_revenue === 'number');
  });

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
