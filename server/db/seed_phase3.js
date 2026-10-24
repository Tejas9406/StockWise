import { query } from '../config/db.js';

async function seedPhase3() {
  try {
    console.log('[Phase 3 Seed] Checking existing records...');
    const scCount = await query('SELECT COUNT(*) FROM scenarios');
    const doCount = await query('SELECT COUNT(*) FROM decision_outcomes');

    if (parseInt(scCount.rows[0].count) === 0) {
      console.log('[Phase 3 Seed] Inserting demo scenarios...');
      await query(
        `INSERT INTO scenarios 
          (scenario_name, description, parameters, baseline_result, scenario_result, delta, risk_assessment, recommendation, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          '🔥 Festive Surge Scenario (+80% Demand)',
          'Simulated Diwali peak period with 80% store demand increase across all retail nodes.',
          JSON.stringify([{ param_type: 'demand_multiplier', target_scope: 'ALL', value: 1.8, label: '+80% demand surge' }]),
          JSON.stringify({
            scenario_name: 'Current State (Baseline)',
            total_allocated_units: 320,
            unmet_demand_units: 0,
            stockout_mitigation_pct: 100,
            expiry_units_saved: 45,
            estimated_transport_cost: 48.0,
            solver_status: 'OPTIMAL',
          }),
          JSON.stringify({
            scenario_name: 'Festive Surge Scenario (+80%)',
            total_allocated_units: 540,
            unmet_demand_units: 36,
            stockout_mitigation_pct: 93.7,
            expiry_units_saved: 45,
            estimated_transport_cost: 81.0,
            solver_status: 'OPTIMAL',
          }),
          JSON.stringify({
            allocated_units_change: 220,
            unmet_demand_change: 36,
            stockout_mitigation_change_pct: -6.3,
            expiry_units_saved_change: 0,
            transport_cost_change: 33.0,
          }),
          'MEDIUM — Moderate supply chain stress under +80% surge. 36 units deficit at Store 2.',
          'Pre-position 50 extra safety stock units at North Regional Hub 48h prior to festive window.',
          1,
        ]
      );

      await query(
        `INSERT INTO scenarios 
          (scenario_name, description, parameters, baseline_result, scenario_result, delta, risk_assessment, recommendation, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          '🚛 Highway Disruption (35% Supply Loss)',
          'Simulated freight route blockage reducing warehouse available inventory by 35%.',
          JSON.stringify([{ param_type: 'supply_reduction', target_scope: 'ALL', value: 0.65, label: '35% supply disruption' }]),
          JSON.stringify({
            scenario_name: 'Current State (Baseline)',
            total_allocated_units: 320,
            unmet_demand_units: 0,
            stockout_mitigation_pct: 100,
            expiry_units_saved: 45,
            estimated_transport_cost: 48.0,
            solver_status: 'OPTIMAL',
          }),
          JSON.stringify({
            scenario_name: 'Highway Disruption',
            total_allocated_units: 240,
            unmet_demand_units: 80,
            stockout_mitigation_pct: 75.0,
            expiry_units_saved: 30,
            estimated_transport_cost: 36.0,
            solver_status: 'OPTIMAL',
          }),
          JSON.stringify({
            allocated_units_change: -80,
            unmet_demand_change: 80,
            stockout_mitigation_change_pct: -25.0,
            expiry_units_saved_change: -15,
            transport_cost_change: -12.0,
          }),
          'HIGH — Significant unmet demand. 80 units shortfall across critical FMCG lines.',
          'Trigger emergency secondary supplier protocol and prioritize Metro Supermart Downtown.',
          1,
        ]
      );
      console.log('[Phase 3 Seed] Scenarios seeded successfully.');
    }

    if (parseInt(doCount.rows[0].count) === 0) {
      console.log('[Phase 3 Seed] Inserting demo decision outcomes for continuous learning...');
      const demoOutcomes = [
        { rec_id: 1, pred: 84, actual: 80, acc: 95.2, stockout: false, waste: 0, notes: 'Accurate weekend surge forecast. Zero stockout.' },
        { rec_id: 2, pred: 90, actual: 95, acc: 94.4, stockout: false, waste: 0, notes: 'Slightly higher customer turnout. Safety buffer absorbed difference.' },
        { rec_id: 4, pred: 100, actual: 92, acc: 92.0, stockout: false, waste: 0, notes: 'Steady demand met seamlessly.' },
        { rec_id: 5, pred: 76, actual: 70, acc: 92.1, stockout: false, waste: 2, notes: 'FEFO batch sold rapidly, 2 units damaged in handling.' },
        { rec_id: 6, pred: 7, actual: 6, acc: 85.7, stockout: false, waste: 0, notes: 'Small batch re-order executed on schedule.' },
      ];

      for (const d of demoOutcomes) {
        await query(
          `INSERT INTO decision_outcomes 
            (recommendation_id, predicted_quantity, actual_quantity, accuracy_pct, stockout_occurred, expiry_waste_units, notes, recorded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [d.rec_id, d.pred, d.actual, d.acc, d.stockout, d.waste, d.notes, 1]
        );
      }
      console.log('[Phase 3 Seed] Decision outcomes seeded successfully.');
    }

    console.log('[Phase 3 Seed] Completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Phase 3 Seed] Error:', err.message);
    process.exit(1);
  }
}

seedPhase3();
