/**
 * Verification Test Suite for System Recommendations:
 * 1. Native RFC 7519 JWT Token Generation & Verification
 * 2. Automated Schema Migrations Runner
 * 3. Token-based Session Verification (/api/auth/me)
 */

import { tokenService } from './server/auth/tokenService.js';
import { runMigrations } from './server/migrations/migrationManager.js';
import { initDatabase, query, getOne } from './server/db.js';

async function runRecommendationValidation() {
  console.log('🧪 Starting Verification Suite for Production Recommendations...\n');
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
    // ----------------------------------------------------
    // TEST 1: JWT Generation & Verification
    // ----------------------------------------------------
    console.log('[1/3] Testing JWT Authentication Service:');
    const samplePayload = {
      userId: 'usr_owner_001',
      tenantId: 'store_royal_001',
      role: 'STORE_OWNER',
      name: 'Ramesh Patel'
    };

    const token = tokenService.generateToken(samplePayload, 3600);
    assert(typeof token === 'string' && token.split('.').length === 3, 'JWT token format has 3 parts (header.payload.signature)');

    const verified = tokenService.verifyToken(token);
    assert(verified && verified.userId === 'usr_owner_001', 'Verified token payload matches original claims');
    assert(verified && verified.tenantId === 'store_royal_001', 'Verified tenant ID claim is correct');

    // Test tampering detection
    const tampered = token.slice(0, -4) + 'abcd';
    const tamperedResult = tokenService.verifyToken(tampered);
    assert(tamperedResult === null, 'Tampered token signature is correctly rejected');

    // Test expired token rejection
    const expiredToken = tokenService.generateToken(samplePayload, -10); // expired 10s ago
    const expiredResult = tokenService.verifyToken(expiredToken);
    assert(expiredResult === null, 'Expired token is correctly rejected');

    // ----------------------------------------------------
    // TEST 2: Schema Migrations Manager
    // ----------------------------------------------------
    console.log('\n[2/3] Testing Database Migrations Manager:');
    await initDatabase();
    await runMigrations();

    const migrationRecords = await query('SELECT * FROM schema_migrations');
    assert(Array.isArray(migrationRecords) && migrationRecords.length > 0, `Schema migrations recorded in DB (${migrationRecords.length} applied)`);

    const hasBaseline = migrationRecords.some(m => m.version.includes('001'));
    assert(hasBaseline, 'Baseline schema migration version recorded');

    // Re-running migrations should be completely idempotent
    await runMigrations();
    const secondCount = await query('SELECT COUNT(*) as cnt FROM schema_migrations');
    assert(secondCount[0].cnt === migrationRecords.length, 'Re-running migrations is 100% idempotent without duplicate entries');

    // ----------------------------------------------------
    // TEST 3: User Authentication & Token Hydration
    // ----------------------------------------------------
    console.log('\n[3/3] Testing User Lookup & Token Generation:');
    const ownerUser = await getOne('SELECT * FROM users WHERE phone = "9876543210" AND pin = "1234"');
    assert(ownerUser && ['OWNER', 'STORE_OWNER'].includes(ownerUser.role), 'Owner user found in database with active credentials');

    const authToken = tokenService.generateToken({
      userId: ownerUser.id,
      tenantId: ownerUser.tenant_id,
      name: ownerUser.name,
      phone: ownerUser.phone,
      role: ownerUser.role
    });

    const decodedSession = tokenService.verifyToken(authToken);
    assert(decodedSession && decodedSession.userId === ownerUser.id, 'Session claims verify successfully against DB user ID');

    console.log(`\n========================================`);
    console.log(`📊 Recommendation Validation: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runRecommendationValidation().then(() => {
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});

