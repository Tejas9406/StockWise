/**
 * StockWise End-to-End API Test Suite
 * Tests Auth, RBAC, Core Operations, Phase 2 AI & Phase 3 Decision Intelligence
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  const res = await fetch(url, options);
  const elapsed = Date.now() - start;
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // text
  }
  return { status: res.status, ok: res.ok, data: json, elapsed };
}

async function runTests() {
  console.log('====================================================');
  console.log('StockWise End-to-End System Integration Test');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${title} ${extra ? `(${extra})` : ''}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${title} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  // 1. Health checks
  console.log('--- 1. Service Health Checks ---');
  try {
    const fHealth = await fetch('http://localhost:8000/health').then(r => r.json());
    assert('FastAPI Microservice Health', fHealth.status === 'healthy', `v${fHealth.version} - ${fHealth.capabilities.length} capabilities`);
  } catch (err) {
    assert('FastAPI Microservice Health', false, err.message);
  }

  // 2. Authentication: Manager, Warehouse, Store
  console.log('\n--- 2. Authentication & JWT Tokens ---');
  let managerToken = '';
  let warehouseToken = '';
  let storeToken = '';

  const mgrLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@stockwise.ai', password: 'password123' }),
  });
  const mTok = mgrLogin.data?.data?.token || mgrLogin.data?.token;
  assert('Manager Login (DISTRIBUTION_MANAGER)', mgrLogin.ok && mTok, `${mgrLogin.elapsed}ms`);
  managerToken = mTok;

  const whLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'warehouse1@stockwise.ai', password: 'password123' }),
  });
  const wTok = whLogin.data?.data?.token || whLogin.data?.token;
  assert('Warehouse Staff Login (WAREHOUSE)', whLogin.ok && wTok, `${whLogin.elapsed}ms`);
  warehouseToken = wTok;

  const stLogin = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'store1@stockwise.ai', password: 'password123' }),
  });
  const sTok = stLogin.data?.data?.token || stLogin.data?.token;
  assert('Store Manager Login (STORE_MANAGER)', stLogin.ok && sTok, `${stLogin.elapsed}ms`);
  storeToken = sTok;

  const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  // 3. Operational Data Endpoints
  console.log('\n--- 3. Operational Data (PostgreSQL Source of Truth) ---');
  const prods = await request('/products', { headers: authHeaders(managerToken) });
  const prodList = prods.data?.data || prods.data;
  assert('GET /products', prods.ok && Array.isArray(prodList), `${prodList?.length || 0} products`);

  const whs = await request('/warehouses', { headers: authHeaders(managerToken) });
  const whList = whs.data?.data || whs.data;
  assert('GET /warehouses', whs.ok && Array.isArray(whList), `${whList?.length || 0} warehouses`);

  const stores = await request('/stores', { headers: authHeaders(managerToken) });
  const storeList = stores.data?.data || stores.data;
  assert('GET /stores', stores.ok && Array.isArray(storeList), `${storeList?.length || 0} stores`);

  const inv = await request('/inventory', { headers: authHeaders(managerToken) });
  const invList = inv.data?.data || inv.data;
  assert('GET /inventory', inv.ok && Array.isArray(invList), `${invList?.length || 0} positions`);

  const transfers = await request('/transfers', { headers: authHeaders(managerToken) });
  const transList = transfers.data?.data || transfers.data;
  assert('GET /transfers', transfers.ok && Array.isArray(transList), `${transList?.length || 0} transfers`);

  // 4. Phase 2 AI Endpoints
  console.log('\n--- 4. Phase 2 Core AIML Intelligence Endpoints ---');
  const forecast = await request('/ai/forecast?horizon=7', { headers: authHeaders(managerToken) });
  assert('GET /ai/forecast (GBR ML Demand)', forecast.ok && (forecast.data?.forecast || forecast.data?.forecasts), `${forecast.elapsed}ms`);

  const risk = await request('/ai/risk', { headers: authHeaders(managerToken) });
  assert('GET /ai/risk (Stockout & Excess Prediction)', risk.ok && risk.data?.success, `${risk.elapsed}ms`);

  const expiry = await request('/ai/expiry', { headers: authHeaders(managerToken) });
  assert('GET /ai/expiry (FEFO Batch Priority)', expiry.ok && expiry.data?.success, `${expiry.elapsed}ms`);

  const recs = await request('/ai/recommendations', { headers: authHeaders(managerToken) });
  const recList = recs.data?.data || recs.data?.recommendations;
  assert('GET /ai/recommendations (AI Allocation Planner)', recs.ok && Array.isArray(recList), `${recList?.length || 0} recs`);

  const comp = await request('/ai/comparison', { headers: authHeaders(managerToken) });
  assert('GET /ai/comparison (Baseline vs AI Heuristic)', comp.ok && comp.data?.comparison, `${comp.elapsed}ms`);

  const models = await request('/ai/models', { headers: authHeaders(managerToken) });
  const modelList = models.data?.models || models.data?.data;
  assert('GET /ai/models (Model Registry & Benchmarks)', models.ok && Array.isArray(modelList), `${modelList?.length || 0} models`);

  // 5. Phase 3 Decision Intelligence & Continuous Learning
  console.log('\n--- 5. Phase 3 Decision Intelligence Endpoints ---');
  const sim = await request('/ai/simulation', {
    method: 'POST',
    headers: authHeaders(managerToken),
    body: JSON.stringify({
      scenario_name: 'E2E Automated Verification Scenario',
      description: 'Verifying What-If PuLP MILP solver perturbation',
      parameters: [{ param_type: 'demand_multiplier', target_scope: 'ALL', value: 1.5, label: '+50% Demand' }],
    }),
  });
  assert('POST /ai/simulation (What-If PuLP Solver)', sim.ok && sim.data?.simulation?.scenario, `${sim.elapsed}ms - Delta: ${sim.data?.simulation?.delta?.allocated_units_change || 0} units`);

  const scens = await request('/ai/scenarios', { headers: authHeaders(managerToken) });
  assert('GET /ai/scenarios (Scenario History)', scens.ok && Array.isArray(scens.data?.data), `${scens.data?.count || 0} scenarios persisted`);

  const drift = await request('/ai/drift', { headers: authHeaders(managerToken) });
  assert('GET /ai/drift (Concept Drift Detection)', drift.ok && drift.data?.drift?.metrics, `Drift: ${drift.data?.drift?.metrics?.drift_severity}`);

  const impact = await request('/ai/impact', { headers: authHeaders(managerToken) });
  assert('GET /ai/impact (Business Impact & ROI)', impact.ok && impact.data?.impact, `Acceptance Rate: ${impact.data?.impact?.recommendations?.acceptance_rate}%`);

  const alerts = await request('/ai/alerts', { headers: authHeaders(managerToken) });
  assert('GET /ai/alerts (Real-Time Proactive Anomaly Detection)', alerts.ok && Array.isArray(alerts.data?.alerts), `${alerts.data?.count || 0} alerts`);

  const outcomes = await request('/ai/outcomes', { headers: authHeaders(managerToken) });
  assert('GET /ai/outcomes (Continuous Learning Outcomes)', outcomes.ok && Array.isArray(outcomes.data?.data), `${outcomes.data?.summary?.total_outcomes || 0} outcomes logged`);

  // 6. Role-Based Access Control (RBAC) Verification
  console.log('\n--- 6. Security & RBAC Enforcement Checks ---');
  const unauthTest = await request('/ai/simulation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert('Unauthenticated access denied (401)', unauthTest.status === 401, `Status ${unauthTest.status}`);

  const rbacTest = await request('/ai/simulation', {
    method: 'POST',
    headers: authHeaders(warehouseToken), // Warehouse cannot run manager simulations
    body: JSON.stringify({ parameters: [{ param_type: 'demand_multiplier', target_scope: 'ALL', value: 1.2 }] }),
  });
  assert('Non-manager forbidden on manager actions (403)', rbacTest.status === 403, `Status ${rbacTest.status}`);

  console.log('\n====================================================');
  console.log(`Test Execution Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
