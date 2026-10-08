import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING END-TO-END VERIFICATION: UPI & IMAGE FIXES');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert(healthRes.ok, `Server health check returned HTTP ${healthRes.status}`);
  } catch (err) {
    assert(false, `Server health check connection failed: ${err.message}`);
    return;
  }

  // TEST 2: GET /api/store for Royal Kirana (store_royal_001)
  console.log('\n--- 1. TESTING STORE UPI PERSISTENCE (Royal Kirana) ---');
  let royalStore = await fetch(`${BASE_URL}/api/store`, {
    headers: { 'x-tenant-id': 'store_royal_001' }
  }).then(r => r.json());
  assert(royalStore && royalStore.id, 'Retrieved store profile for store_royal_001');

  // TEST 3: Update UPI ID to royalkirana@upi for Royal Kirana
  const updateRoyalRes = await fetch(`${BASE_URL}/api/store`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_royal_001'
    },
    body: JSON.stringify({
      ...royalStore,
      upi_id: 'royalkirana@upi'
    })
  });
  const updateRoyalData = await updateRoyalRes.json();
  assert(updateRoyalRes.ok && updateRoyalData.success, 'Successfully saved Store Details with upi_id = royalkirana@upi');

  // TEST 4: Immediate GET /api/store reload check
  const reloadedRoyal = await fetch(`${BASE_URL}/api/store`, {
    headers: { 'x-tenant-id': 'store_royal_001' }
  }).then(r => r.json());
  assert(reloadedRoyal.upi_id === 'royalkirana@upi', `Store Details reloads with persisted upi_id = "${reloadedRoyal.upi_id}" (expected royalkirana@upi)`);

  // TEST 5: Verify Payment Settings reflects same UPI
  const paySettingsRoyal = await fetch(`${BASE_URL}/api/payments/settings`, {
    headers: { 'x-tenant-id': 'store_royal_001' }
  }).then(r => r.json());
  assert(paySettingsRoyal.store_upi_id === 'royalkirana@upi', `Payment Settings synchronized: store_upi_id = "${paySettingsRoyal.store_upi_id}"`);

  // TEST 6: Multi-tenant Isolation Test with Store B (store_fresh_002)
  console.log('\n--- 2. TESTING MULTI-TENANT ISOLATION (Store A vs Store B) ---');
  let freshStore = await fetch(`${BASE_URL}/api/store`, {
    headers: { 'x-tenant-id': 'store_fresh_002' }
  }).then(r => r.json());

  await fetch(`${BASE_URL}/api/store`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_fresh_002'
    },
    body: JSON.stringify({
      ...freshStore,
      upi_id: 'freshmart@upi'
    })
  });

  const checkRoyalAfterB = await fetch(`${BASE_URL}/api/store`, {
    headers: { 'x-tenant-id': 'store_royal_001' }
  }).then(r => r.json());

  const checkFreshAfterB = await fetch(`${BASE_URL}/api/store`, {
    headers: { 'x-tenant-id': 'store_fresh_002' }
  }).then(r => r.json());

  assert(checkRoyalAfterB.upi_id === 'royalkirana@upi', `Store A (Royal) preserves "royalkirana@upi" isolated from Store B`);
  assert(checkFreshAfterB.upi_id === 'freshmart@upi', `Store B (Fresh Mart) preserves "freshmart@upi" isolated from Store A`);

  // TEST 7: Image Upload via Multipart FormData (Gallery/File)
  console.log('\n--- 3. TESTING PRODUCT IMAGE UPLOAD (Multipart & Base64) ---');
  // Create a 1x1 valid PNG buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const formData = new FormData();
  const blob = new Blob([samplePngBuffer], { type: 'image/png' });
  formData.append('image', blob, 'sample_milk.png');

  const uploadMultipartRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'x-tenant-id': 'store_royal_001' },
    body: formData
  });

  const uploadMultipartData = await uploadMultipartRes.json();
  assert(
    uploadMultipartRes.ok && uploadMultipartData.success && uploadMultipartData.url.startsWith('/uploads/'),
    `Multipart image upload succeeded with permanent URL: ${uploadMultipartData.url}`
  );

  // TEST 8: Image Upload via Base64 JSON (Camera Photo)
  const base64DataUrl = `data:image/png;base64,${samplePngBuffer.toString('base64')}`;
  const uploadBase64Res = await fetch(`${BASE_URL}/api/products/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_royal_001'
    },
    body: JSON.stringify({
      image: base64DataUrl,
      filename: 'camera_capture.png'
    })
  });
  const uploadBase64Data = await uploadBase64Res.json();
  assert(
    uploadBase64Res.ok && uploadBase64Data.success && uploadBase64Data.url.startsWith('/uploads/'),
    `Camera / Base64 image upload succeeded with permanent URL: ${uploadBase64Data.url}`
  );

  // TEST 9: Verify image file actually exists on filesystem and is accessible via HTTP
  const staticFileRes = await fetch(`${BASE_URL}${uploadMultipartData.url}`);
  assert(staticFileRes.ok, `Uploaded image is publicly accessible via HTTP GET at ${uploadMultipartData.url}`);

  // TEST 10: Create Product with uploaded image and verify in database
  console.log('\n--- 4. TESTING PRODUCT CREATION WITH IMAGE & POS DISPLAY ---');
  const uniqueBarcode = '890' + Math.floor(1000000000 + Math.random() * 9000000000);
  const newProductPayload = {
    name: 'Amul Taaza Fresh Milk 1L',
    category_id: 'cat_dairy_001',
    brand: 'Amul',
    barcode: uniqueBarcode,
    unit: 'PACKET',
    is_loose: 0,
    purchase_cost: 68,
    selling_price: 74,
    mrp: 75,
    stock: 50,
    min_stock: 5,
    photo_url: uploadMultipartData.url,
    description: 'Pure pasteurised toned milk packet'
  };

  const createProdRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'store_royal_001'
    },
    body: JSON.stringify(newProductPayload)
  });
  const createProdData = await createProdRes.json();
  assert(createProdRes.ok && createProdData.success, `Created product with uploaded image (id: ${createProdData.id})`);

  // TEST 11: GET /api/products returns product with permanent image URL
  const productsList = await fetch(`${BASE_URL}/api/products`, {
    headers: { 'x-tenant-id': 'store_royal_001' }
  }).then(r => r.json());

  const savedProduct = productsList.find(p => p.id === createProdData.id || p.barcode === uniqueBarcode);
  assert(
    savedProduct && savedProduct.photo_url === uploadMultipartData.url,
    `Product in database contains permanent image URL: ${savedProduct?.photo_url}`
  );

  // TEST 12: Invalid File Upload Rejected with 400 JSON (never raw HTML error)
  console.log('\n--- 5. TESTING ERROR HANDLING & JSON CONTRACT ---');
  const badFormData = new FormData();
  const textBlob = new Blob(['Not an image'], { type: 'text/plain' });
  badFormData.append('image', textBlob, 'malicious.txt');

  const badUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'x-tenant-id': 'store_royal_001' },
    body: badFormData
  });
  const badUploadContentType = badUploadRes.headers.get('content-type') || '';
  const badUploadData = await badUploadRes.json().catch(() => null);

  assert(
    badUploadRes.status === 400 && badUploadContentType.includes('application/json') && badUploadData && badUploadData.error,
    `Invalid file extension properly rejected with HTTP 400 JSON error: "${badUploadData?.error}"`
  );

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL ACCEPTANCE CRITERIA SATISFIED END-TO-END!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
