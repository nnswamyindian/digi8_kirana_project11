import { initDatabase, getPool, ensureDatabaseExists } from '../db.js';

async function main() {
  console.log('================================================================');
  console.log('🚀 KIRANA SAAS PLATFORM - ENTERPRISE MYSQL INITIALIZATION');
  console.log('================================================================\n');

  try {
    console.log('[1/3] Ensuring MySQL database exists...');
    await ensureDatabaseExists();

    console.log('[2/3] Initializing schema, tables, and multi-tenant seed data...');
    await initDatabase();

    console.log('[3/3] Database verification completed successfully!\n');
    console.log('----------------------------------------------------------------');
    console.log('✅ Enterprise MySQL Database Ready');
    console.log('   - Tenant 001: Apna Kirana & Supermarket (Slug: royal-kirana)');
    console.log('   - Tenant 002: Fresh Mart Superstore (Slug: fresh-mart)');
    console.log('   - Central Admin: Phone 9999999999 | PIN 9999');
    console.log('   - Royal Kirana Owner: Phone 9876543210 | PIN 1234');
    console.log('   - Fresh Mart Owner: Phone 9848012345 | PIN 1234');
    console.log('----------------------------------------------------------------\n');

    const pool = getPool();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Initialization failed with error:', err.message);
    process.exit(1);
  }
}

main();
