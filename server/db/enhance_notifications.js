import { query } from '../config/db.js';

async function migrate() {
  try {
    await query(`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'IN_APP';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_contact VARCHAR(255);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'DELIVERED';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_response JSONB;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);
    console.log('[Migration] Notifications table enhanced with multi-channel support!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]:', err.message);
    process.exit(1);
  }
}

migrate();
