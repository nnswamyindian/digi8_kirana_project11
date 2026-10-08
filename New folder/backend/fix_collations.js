import { query } from './db.js';

async function fixCollations() {
  try {
    console.log('[Collation Fix] Fetching all tables in kirana_saas_db...');
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'kirana_saas_db' AND TABLE_TYPE = 'BASE TABLE'
    `);

    for (const row of tables) {
      const table = row.TABLE_NAME;
      console.log(`Converting table ${table} to utf8mb4_unicode_ci...`);
      await query(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }

    console.log('[Collation Fix] Successfully converted all tables to utf8mb4_unicode_ci!');

    // Test the problematic query
    const res = await query(`
      SELECT st.*, t.name as store_name, t.owner_phone 
      FROM support_tickets st 
      JOIN tenants t ON st.tenant_id = t.id
    `);
    console.log('[Collation Fix] Test query result rows:', res.length);
  } catch (err) {
    console.error('[Collation Fix] Error:', err);
  } finally {
    process.exit(0);
  }
}

fixCollations();
