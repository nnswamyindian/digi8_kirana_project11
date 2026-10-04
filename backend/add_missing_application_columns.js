import { query } from './db.js';

async function addMissingColumns() {
  try {
    console.log('[Migration] Checking and adding missing columns to store_applications...');
    
    // Check existing columns
    const cols = await query('DESCRIBE store_applications');
    const existing = new Set(cols.map(c => c.Field));

    if (!existing.has('pan_number')) {
      console.log('Adding pan_number...');
      await query('ALTER TABLE store_applications ADD COLUMN pan_number VARCHAR(30) NULL AFTER gst_number');
    }

    if (!existing.has('whatsapp_number')) {
      console.log('Adding whatsapp_number...');
      await query('ALTER TABLE store_applications ADD COLUMN whatsapp_number VARCHAR(20) NULL AFTER pan_number');
    }

    if (!existing.has('store_category')) {
      console.log('Adding store_category...');
      await query("ALTER TABLE store_applications ADD COLUMN store_category VARCHAR(100) DEFAULT 'Kirana & Supermarket' AFTER whatsapp_number");
    }

    if (!existing.has('country')) {
      console.log('Adding country...');
      await query("ALTER TABLE store_applications ADD COLUMN country VARCHAR(50) DEFAULT 'India' AFTER store_category");
    }

    console.log('[Migration] All columns successfully verified & added to store_applications!');

    // Describe again to verify
    const updatedCols = await query('DESCRIBE store_applications');
    console.log('Updated columns:', updatedCols.map(c => c.Field));
  } catch (err) {
    console.error('[Migration] Error:', err);
  } finally {
    process.exit(0);
  }
}

addMissingColumns();
