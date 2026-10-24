import { pool, runTransaction } from '../config/db.js';

export const seedPostgresDatabase = async () => {
  console.log('[PostgreSQL Seed] Purging and re-seeding database...');

  await runTransaction(async (client) => {
    // 1. Purge all operational tables in cascade order
    await client.query(`
      TRUNCATE TABLE 
        manager_feedback,
        ai_recommendations,
        optimization_runs,
        ml_models,
        approval_events,
        transfers,
        sales_records,
        batches,
        inventory,
        products,
        users,
        stores,
        warehouses,
        notifications,
        data_imports
      RESTART IDENTITY CASCADE;
    `);

    // 2. Insert Warehouses
    const whRes = await client.query(`
      INSERT INTO warehouses (name, code, location, address, capacity, is_active)
      VALUES 
        ('North Regional Hub', 'WH-001', 'Delhi NCR Logistics Zone', 'Plot 42, Udyog Vihar Phase 4, Gurgaon, Haryana 122016', 15000, true),
        ('Western Central Hub', 'WH-002', 'Bhiwandi Industrial Park, Mumbai', 'Warehouse Complex C-12, Bhiwandi, Maharashtra 421302', 20000, true)
      RETURNING id, code, name;
    `);
    const wh1Id = whRes.rows.find(w => w.code === 'WH-001').id;
    const wh2Id = whRes.rows.find(w => w.code === 'WH-002').id;

    // 3. Insert Stores
    const stRes = await client.query(`
      INSERT INTO stores (name, code, location, address, is_active)
      VALUES 
        ('Metro Supermart - Downtown', 'STORE-001', 'Connaught Place, New Delhi', 'Block B, Inner Circle, Connaught Place, New Delhi 110001', true),
        ('City Center Retail', 'STORE-002', 'Bandra West, Mumbai', 'Hill Road, Near Bandra Station, Mumbai 400050', true),
        ('Suburban Daily Fresh', 'STORE-003', 'Noida Sector 62', 'Electronic City Metro Complex, Noida, UP 201309', true)
      RETURNING id, code, name;
    `);
    const store1Id = stRes.rows.find(s => s.code === 'STORE-001').id;
    const store2Id = stRes.rows.find(s => s.code === 'STORE-002').id;
    const store3Id = stRes.rows.find(s => s.code === 'STORE-003').id;

    // 4. Insert Products
    const prRes = await client.query(`
      INSERT INTO products (name, sku, category, unit, unit_cost, selling_price, min_safety_stock, reorder_point, shelf_life_days, is_active)
      VALUES 
        ('Alphonso Mango Juice 1L', 'BEV-MJ-1L', 'Beverages', 'bottles', 45, 75, 30, 80, 90, true),
        ('Marie Gold Biscuits 200g', 'SNK-MGB-200G', 'Snacks', 'packs', 15, 30, 50, 120, 180, true),
        ('Pasteurized Toned Milk 1L', 'DRY-TM-1L', 'Dairy', 'pouches', 28, 36, 40, 90, 14, true),
        ('Chakki Whole Wheat Flour 5kg', 'STP-WWF-5KG', 'Staples', 'bags', 160, 240, 25, 60, 180, true),
        ('Sunflower Cooking Oil 1L', 'OIL-SFO-1L', 'Staples', 'pouches', 110, 155, 30, 75, 270, true),
        ('Assam Gold Tea Bags 100s', 'BEV-AGT-100S', 'Beverages', 'boxes', 140, 220, 20, 50, 365, true)
      RETURNING id, sku, name;
    `);
    const p1Id = prRes.rows.find(p => p.sku === 'BEV-MJ-1L').id;
    const p2Id = prRes.rows.find(p => p.sku === 'SNK-MGB-200G').id;
    const p3Id = prRes.rows.find(p => p.sku === 'DRY-TM-1L').id;
    const p4Id = prRes.rows.find(p => p.sku === 'STP-WWF-5KG').id;
    const p5Id = prRes.rows.find(p => p.sku === 'OIL-SFO-1L').id;
    const p6Id = prRes.rows.find(p => p.sku === 'BEV-AGT-100S').id;

    // 5. Insert Users (mapped to Firebase UIDs and roles)
    const userRes = await client.query(`
      INSERT INTO users (firebase_uid, name, email, role, warehouse_id, store_id, is_active)
      VALUES 
        ('firebase_uid_manager', 'Anita Sharma', 'manager@stockwise.ai', 'DISTRIBUTION_MANAGER', NULL, NULL, true),
        ('firebase_uid_warehouse1', 'Rajesh Kumar (WH-001)', 'warehouse1@stockwise.ai', 'WAREHOUSE', ${wh1Id}, NULL, true),
        ('firebase_uid_warehouse2', 'Vikram Joshi (WH-002)', 'warehouse2@stockwise.ai', 'WAREHOUSE', ${wh2Id}, NULL, true),
        ('firebase_uid_store1', 'Pooja Verma (Store 1)', 'store1@stockwise.ai', 'STORE_MANAGER', NULL, ${store1Id}, true),
        ('firebase_uid_store2', 'Suresh Patel (Store 2)', 'store2@stockwise.ai', 'STORE_MANAGER', NULL, ${store2Id}, true)
      RETURNING id, email, role;
    `);
    const managerId = userRes.rows.find(u => u.role === 'DISTRIBUTION_MANAGER').id;

    // 6. Insert Batches (with dates for FEFO)
    const now = new Date();
    const addDays = (d, days) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return copy.toISOString();
    };

    const btRes = await client.query(`
      INSERT INTO batches (product_id, warehouse_id, store_id, batch_number, quantity, manufacturing_date, expiry_date)
      VALUES 
        (${p1Id}, ${wh1Id}, NULL, 'BAT-MJ-26A', 350, '${addDays(now, -30)}', '${addDays(now, 60)}'),
        (${p1Id}, ${wh1Id}, NULL, 'BAT-MJ-25Z', 120, '${addDays(now, -70)}', '${addDays(now, 20)}'),
        (${p2Id}, ${wh1Id}, NULL, 'BAT-MGB-01', 800, '${addDays(now, -20)}', '${addDays(now, 160)}'),
        (${p3Id}, ${wh1Id}, NULL, 'BAT-MLK-09', 250, '${addDays(now, -3)}', '${addDays(now, 11)}'),
        (${p4Id}, ${wh2Id}, NULL, 'BAT-WWF-12', 400, '${addDays(now, -40)}', '${addDays(now, 140)}'),
        (${p5Id}, ${wh2Id}, NULL, 'BAT-SFO-04', 500, '${addDays(now, -60)}', '${addDays(now, 210)}')
      RETURNING id, batch_number;
    `);
    const batchMJ25Z = btRes.rows.find(b => b.batch_number === 'BAT-MJ-25Z').id;

    // 7. Insert Inventory (Warehouses + Stores)
    await client.query(`
      INSERT INTO inventory (product_id, location_type, warehouse_id, store_id, quantity, reserved_quantity)
      VALUES 
        -- Warehouse 1
        (${p1Id}, 'WAREHOUSE', ${wh1Id}, NULL, 470, 40),
        (${p2Id}, 'WAREHOUSE', ${wh1Id}, NULL, 800, 0),
        (${p3Id}, 'WAREHOUSE', ${wh1Id}, NULL, 250, 0),
        (${p6Id}, 'WAREHOUSE', ${wh1Id}, NULL, 180, 0),
        -- Warehouse 2
        (${p1Id}, 'WAREHOUSE', ${wh2Id}, NULL, 300, 0),
        (${p4Id}, 'WAREHOUSE', ${wh2Id}, NULL, 400, 0),
        (${p5Id}, 'WAREHOUSE', ${wh2Id}, NULL, 500, 0),
        -- Store 1 (Critical shortage on Mango Juice: 12 units vs safety 30)
        (${p1Id}, 'STORE', NULL, ${store1Id}, 12, 0),
        (${p2Id}, 'STORE', NULL, ${store1Id}, 85, 0),
        (${p3Id}, 'STORE', NULL, ${store1Id}, 18, 0),
        (${p4Id}, 'STORE', NULL, ${store1Id}, 45, 0),
        -- Store 2
        (${p1Id}, 'STORE', NULL, ${store2Id}, 65, 0),
        (${p2Id}, 'STORE', NULL, ${store2Id}, 110, 0),
        (${p5Id}, 'STORE', NULL, ${store2Id}, 50, 0),
        -- Store 3 (Severe shortage on Mango Juice: 5 units)
        (${p1Id}, 'STORE', NULL, ${store3Id}, 5, 0),
        (${p2Id}, 'STORE', NULL, ${store3Id}, 90, 0),
        (${p6Id}, 'STORE', NULL, ${store3Id}, 35, 0);
    `);

    // 8. Insert 14-Day Dated Sales Records for Moving Average & ML Training
    const salesValues = [];
    const baseDailySales = [
      { store: store1Id, prod: p1Id, base: 12 },
      { store: store1Id, prod: p2Id, base: 18 },
      { store: store1Id, prod: p3Id, base: 15 },
      { store: store2Id, prod: p1Id, base: 8 },
      { store: store2Id, prod: p2Id, base: 22 },
      { store: store3Id, prod: p1Id, base: 10 },
      { store: store3Id, prod: p2Id, base: 14 },
    ];

    for (let day = 14; day >= 0; day--) {
      const saleDate = addDays(now, -day);
      for (const item of baseDailySales) {
        const variance = Math.floor(Math.random() * 5) - 2;
        const qty = Math.max(2, item.base + variance);
        const rev = qty * 45;
        salesValues.push(`(${item.store}, ${item.prod}, '${saleDate}', ${qty}, ${rev})`);
      }
    }

    await client.query(`
      INSERT INTO sales_records (store_id, product_id, date, quantity, revenue)
      VALUES ${salesValues.join(',\n')};
    `);

    // 9. Insert Initial Transfers & Approval Events
    const trRes = await client.query(`
      INSERT INTO transfers (transfer_number, product_id, source_warehouse_id, destination_type, destination_id, quantity, batch_id, status, notes, created_by)
      VALUES 
        ('TR-2026-0001', ${p1Id}, ${wh1Id}, 'STORE', ${store1Id}, 40, ${batchMJ25Z}, 'APPROVED', 'Initial stockout replenishment', ${managerId}),
        ('TR-2026-0002', ${p2Id}, ${wh1Id}, 'STORE', ${store1Id}, 50, NULL, 'DISPATCHED', 'Regular shelf replenishment', ${managerId})
      RETURNING id, transfer_number;
    `);

    await client.query(`
      INSERT INTO approval_events (transfer_id, user_id, action, previous_value, new_value, reason, timestamp)
      VALUES 
        (${trRes.rows[0].id}, ${managerId}, 'CREATED', NULL, '{"status": "PENDING"}', 'AI recommendation approved into transfer', NOW() - INTERVAL '2 hours'),
        (${trRes.rows[0].id}, ${managerId}, 'APPROVED', '{"status": "PENDING"}', '{"status": "APPROVED"}', 'Transfer authorized for warehouse picking', NOW() - INTERVAL '1 hour');
    `);

    // 10. Insert Initial Data Imports
    await client.query(`
      INSERT INTO data_imports (dataset_type, filename, imported_by, total_rows, valid_rows, imported_rows, failed_rows, warning_rows, status, notes, created_at)
      VALUES 
        ('SALES', 'fmcg_sales_telemetry_oct2026.csv', ${managerId}, 150, 148, 148, 2, 3, 'IMPORTED', 'Initial sales stream ingested for baseline & ML models.', NOW() - INTERVAL '1 day'),
        ('INVENTORY', 'warehouse_stock_sync_q4.csv', ${managerId}, 18, 18, 18, 0, 0, 'IMPORTED', 'Multi-facility stock audit confirmed.', NOW() - INTERVAL '2 days'),
        ('BATCHES', 'production_lots_shelf_life.csv', ${managerId}, 6, 6, 6, 0, 1, 'IMPORTED', 'Batch expiry dates synced for FEFO engine.', NOW() - INTERVAL '3 days');
    `);

    // 11. Insert Initial ML Model Metadata
    await client.query(`
      INSERT INTO ml_models (model_name, model_version, training_date, training_range, features_used, validation_metrics, test_metrics, status)
      VALUES (
        'EnsembleGradientBoostingRegressor',
        'v2.1-ensemble',
        NOW(),
        'Last 14 days chronologically split (70% train / 15% val / 15% test)',
        '["sales_lag_1", "sales_lag_7", "rolling_mean_7", "rolling_std_7", "stock_coverage", "day_of_week"]',
        '{"wape": 8.4, "mae": 1.25, "rmse": 1.62}',
        '{"wape": 9.1, "mae": 1.38, "rmse": 1.74}',
        'ACTIVE'
      );
    `);

    // 12. Insert Sample AI Recommendations
    await client.query(`
      INSERT INTO ai_recommendations (product_id, source_warehouse_id, destination_type, destination_id, quantity, batch_id, transport_cost, expected_demand, reason, status, model_version, priority)
      VALUES 
        (${p1Id}, ${wh1Id}, 'STORE', ${store1Id}, 60, ${batchMJ25Z}, 15.00, 84, 'WHY THIS PLAN?
• Store Stock: 12 units (Coverage: 1.0 day, Critical Stockout Risk)
• ML Forecast Horizon Demand: 84 units
• Warehouse Stock: 430 available at North Regional Hub
• FEFO Optimization: Batch BAT-MJ-25Z expires in 20 days. Store velocity (10.1 units/day) ensures 100% sell-through before expiry.', 'PENDING', 'v2.1-ensemble', 'CRITICAL'),
        (${p3Id}, ${wh1Id}, 'STORE', ${store1Id}, 35, NULL, 12.50, 90, 'WHY THIS PLAN?
• Store Stock: 18 units (Coverage: 1.2 days)
• Safety Buffer: +20 units (2-day buffer)
• Replenishment Need: max(0, 90 + 20 - 18) = 92 units
• Feasible Allocation: Capped to warehouse available surplus.', 'PENDING', 'v2.1-ensemble', 'HIGH');
    `);

    // 13. Seed Role-Based Notifications
    await client.query(`
      INSERT INTO notifications (role, warehouse_id, store_id, title, message, type, link)
      VALUES 
        ('DISTRIBUTION_MANAGER', NULL, NULL, 'Phase 2 AIML Intelligence Active', 'Ensemble ML model v2.1 and PuLP constrained optimizer calibrated.', 'INFO', '/manager/recommendations'),
        ('WAREHOUSE', ${wh1Id}, NULL, 'Transfer TR-2026-0001 Ready for Picking', '40 units Alphonso Mango Juice ready on shelf BAT-MJ-25Z.', 'ACTION_REQUIRED', '/warehouse/pick-list'),
        ('STORE_MANAGER', NULL, ${store1Id}, 'Inbound Shipment Dispatched', 'Transfer TR-2026-0002 (50 units) departing warehouse.', 'INFO', '/store/incoming');
    `);
  });

  console.log('[PostgreSQL Seed] Successfully seeded Neon database with complete FMCG operational dataset!');
};

if (process.argv[1].endsWith('seedPg.js')) {
  seedPostgresDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[PostgreSQL Seed Error]:', err);
      process.exit(1);
    });
}
