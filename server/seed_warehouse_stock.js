import 'dotenv/config';
import { query } from './config/db.js';

async function seed() {
  for (const whId of [1, 2]) {
    for (let pId = 1; pId <= 11; pId++) {
      await query(
        `INSERT INTO inventory (product_id, warehouse_id, location_type, quantity, reserved_quantity)
         VALUES ($1, $2, 'WAREHOUSE', 600, 0)
         ON CONFLICT (product_id, warehouse_id) 
         DO UPDATE SET quantity = GREATEST(inventory.quantity, 600)`,
        [pId, whId]
      );
    }
  }
  console.log('Healthy warehouse stock seeded for all products in warehouses 1 and 2!');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
