import http from 'http';

const PORT = process.env.PORT || 5000;

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('=== DIGI8 APNA KIRANA: ALL-LOGIN VERIFICATION ===\n');
  let errors = 0;

  // 1. Customer Register & Login
  console.log('1. Testing Customer Registration & Login...');
  const custLoginRes = await postJson('/api/auth/customer/login', {
    phone: '9811223344',
    pin: '1234',
    store_id: 'store_royal_001'
  });
  console.log('   Customer Login Status:', custLoginRes.status);
  if (custLoginRes.body && custLoginRes.body.success && custLoginRes.body.token) {
    console.log('   ✅ Customer Token: GENERATED');
    console.log('   ✅ Customer Profile:', custLoginRes.body.customer.name, '| Phone:', custLoginRes.body.customer.phone);
    
    // Test Customer Profile API
    const meRes = await getJson('/api/customer/me', custLoginRes.body.token);
    const customerName = meRes.body?.name || meRes.body?.customer?.name;
    if (meRes.status === 200 && customerName) {
      console.log('   ✅ Customer /me API Status:', meRes.status, '| Name:', customerName);
    } else {
      console.error('   ❌ Customer /me API failed:', meRes.status);
      errors++;
    }
  } else {
    console.error('   ❌ Customer Login Error:', custLoginRes.body?.error || custLoginRes.body);
    errors++;
  }

  // 2. Store Owner / Staff Login
  console.log('\n2. Testing Store Owner / Staff Login...');
  const staffLoginRes = await postJson('/api/auth/login', {
    phone: '9876543210',
    pin: '1234'
  });
  console.log('   Staff/Owner Login Status:', staffLoginRes.status);
  if (staffLoginRes.body && staffLoginRes.body.token) {
    console.log('   ✅ Store User:', staffLoginRes.body.user?.name, '| Role:', staffLoginRes.body.user?.role, '| Tenant:', staffLoginRes.body.user?.tenant_id);
  } else {
    console.error('   ❌ Staff/Owner Error:', staffLoginRes.body?.error || staffLoginRes.body);
    errors++;
  }

  // 3. Delivery Agent / Rider Login
  console.log('\n3. Testing Delivery Boy / Rider Login...');
  const riderLoginRes = await postJson('/api/auth/login', {
    phone: '9876543213',
    pin: '1234'
  });
  console.log('   Delivery Boy Login Status:', riderLoginRes.status);
  if (riderLoginRes.body && riderLoginRes.body.token) {
    console.log('   ✅ Rider User:', riderLoginRes.body.user?.name, '| Role:', riderLoginRes.body.user?.role, '| Tenant:', riderLoginRes.body.user?.tenant_id);
  } else {
    console.error('   ❌ Rider Error:', riderLoginRes.body?.error || riderLoginRes.body);
    errors++;
  }

  // 4. Platform Super Admin Login
  console.log('\n4. Testing Platform Super Admin Login...');
  const adminLoginRes = await postJson('/api/auth/login', {
    phone: '9999999999',
    pin: '9999'
  });
  console.log('   Platform Super Admin Status:', adminLoginRes.status);
  if (adminLoginRes.body && adminLoginRes.body.token) {
    console.log('   ✅ Admin User:', adminLoginRes.body.user?.name, '| Role:', adminLoginRes.body.user?.role, '| is_platform_admin:', adminLoginRes.body.is_platform_admin);
  } else {
    console.error('   ❌ Platform Admin Error:', adminLoginRes.body?.error || adminLoginRes.body);
    errors++;
  }

  // 5. Tenant Resolution Test
  console.log('\n5. Testing Dynamic Tenant Resolution...');
  const resolveRes = await getJson('/api/tenant/resolve?slug=royal-kirana');
  if (resolveRes.status === 200 && resolveRes.body?.success) {
    console.log('   ✅ Slug royal-kirana Resolution:', resolveRes.status, resolveRes.body.tenant.name);
  } else {
    console.error('   ❌ Slug royal-kirana failed:', resolveRes.status);
    errors++;
  }

  const resolveMart = await getJson('/api/tenant/resolve?slug=fresh-mart');
  if (resolveMart.status === 200 && resolveMart.body?.success) {
    console.log('   ✅ Slug fresh-mart Resolution:', resolveMart.status, resolveMart.body.tenant.name);
  } else {
    console.error('   ❌ Slug fresh-mart failed:', resolveMart.status);
    errors++;
  }

  if (errors > 0) {
    console.error(`\n❌ VERIFICATION FAILED: ${errors} test(s) failed.`);
    process.exit(1);
  }

  console.log('\n=== ALL 4 LOGINS & TENANT RESOLUTION VERIFIED SUCCESSFULLY ===');
  process.exit(0);
}


runTests();
