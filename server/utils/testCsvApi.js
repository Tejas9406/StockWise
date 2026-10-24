const BASE_URL = 'http://localhost:5000/api';

const runCsvApiTests = async () => {
  console.log('================================================================');
  console.log('TESTING CSV IMPORT & DATA HEALTH HTTP API ENDPOINTS');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  };

  try {
    // 1. Login as Distribution Manager
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@stockwise.ai',
        password: 'password123',
      }),
    });

    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    assert(!!token, 'Manager logged in successfully and received JWT');

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Download Template
    const templateRes = await fetch(`${BASE_URL}/import/templates/SALES`, {
      headers: authHeaders,
    });
    const templateText = await templateRes.text();
    assert(templateRes.status === 200, 'GET /api/import/templates/SALES returned 200');
    assert(templateText.includes('product_sku'), 'Template contains expected header product_sku');

    // 3. Test Preview & Validate with Valid CSV
    const validCsvContent = `date,product_sku,store_code,quantity,revenue\n2026-10-24,BEV-MJ-1L,STORE-001,15,1125\n2026-10-24,SNK-MGB-200G,STORE-002,25,750`;

    const blobValid = new Blob([validCsvContent], { type: 'text/csv' });
    const formValid = new FormData();
    formValid.append('file', blobValid, 'test_sales_valid.csv');
    formValid.append('datasetType', 'SALES');

    const previewRes = await fetch(`${BASE_URL}/import/preview`, {
      method: 'POST',
      headers: authHeaders,
      body: formValid,
    });

    const previewJson = await previewRes.json();
    assert(previewRes.status === 200, 'POST /api/import/preview returned 200');
    assert(previewJson.data.validRows === 2, `Preview validated 2 valid rows (found ${previewJson.data.validRows})`);
    assert(previewJson.data.invalidRows === 0, 'Zero invalid rows in valid CSV');

    // 4. Test Preview with Invalid CSV (Negative qty, non-existent SKU)
    const invalidCsvContent = `date,product_sku,store_code,quantity,revenue\n2026-10-24,NON_EXISTENT_SKU,STORE-001,10,500\n2026-10-24,BEV-MJ-1L,STORE-001,-20,1000`;

    const blobInvalid = new Blob([invalidCsvContent], { type: 'text/csv' });
    const formInvalid = new FormData();
    formInvalid.append('file', blobInvalid, 'test_sales_invalid.csv');
    formInvalid.append('datasetType', 'SALES');

    const invalidPreviewRes = await fetch(`${BASE_URL}/import/preview`, {
      method: 'POST',
      headers: authHeaders,
      body: formInvalid,
    });

    const invalidJson = await invalidPreviewRes.json();
    assert(invalidPreviewRes.status === 200, 'POST /api/import/preview handled invalid rows gracefully');
    assert(invalidJson.data.invalidRows === 2, `Detected 2 invalid rows (found ${invalidJson.data.invalidRows})`);
    console.log('  Invalid row sample message:', invalidJson.data.rowResults[0]?.message);

    // 5. Test Confirm Import
    const confirmRes = await fetch(`${BASE_URL}/import/confirm`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetType: 'SALES',
        filename: 'test_sales_valid.csv',
        rows: previewJson.data.normalizedRows,
        columnMapping: previewJson.data.columnMapping,
      }),
    });

    const confirmJson = await confirmRes.json();
    assert(confirmRes.status === 200, 'POST /api/import/confirm returned 200');
    assert(confirmJson.data.importedRows === 2, '2 rows successfully persisted to MongoDB');

    // 6. Test Import History
    const historyRes = await fetch(`${BASE_URL}/import/history`, { headers: authHeaders });
    const historyJson = await historyRes.json();
    assert(historyRes.status === 200, 'GET /api/import/history returned 200');
    assert(historyJson.data.length >= 1, `Import history contains recorded imports (count: ${historyJson.data.length})`);

    // 7. Test Data Health
    const healthRes = await fetch(`${BASE_URL}/import/data-health`, { headers: authHeaders });
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/import/data-health returned 200');
    assert(healthJson.data.datasets.length === 5, 'Data health returns 5 core datasets');
    assert(healthJson.data.readyForPlanning === true, 'readyForPlanning evaluates to true');

    // 8. Test Demand Forecast Endpoint
    const forecastApiRes = await fetch(`${BASE_URL}/manager/forecast?windowDays=7&horizonDays=7`, { headers: authHeaders });
    const forecastJson = await forecastApiRes.json();
    assert(forecastApiRes.status === 200, 'GET /api/manager/forecast returned 200');
    assert(forecastJson.data.forecastGrid.length > 0, 'Forecast grid populated');
    assert(forecastJson.data.method.includes('Moving Average Baseline'), 'Method is Moving Average Baseline');

    // 9. Test Baseline Comparison Endpoint
    const compRes = await fetch(`${BASE_URL}/manager/baseline-comparison`, { headers: authHeaders });
    const compJson = await compRes.json();
    assert(compRes.status === 200, 'GET /api/manager/baseline-comparison returned 200');
    assert(compJson.data.summary.stockwise.feasibilityRate === '100%', 'Baseline comparison endpoint returns 100% feasibility');

    console.log('\n================================================================');
    console.log(`CSV & FORECAST API RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('API Test Error:', err);
    process.exit(1);
  }
};

runCsvApiTests();
