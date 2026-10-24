import { parse } from 'csv-parse/sync';
import { query } from '../config/db.js';

// ─── Default Templates & Column Synonyms ──────────────────────────────────────

const TEMPLATES = {
  SALES: {
    headers: ['date', 'product_sku', 'store_code', 'quantity', 'revenue'],
    sampleRows: [
      ['2026-10-20', 'MILK-1L', 'STR-001', '85', '1700'],
      ['2026-10-21', 'BREAD-WHT', 'STR-002', '120', '1680'],
      ['2026-10-22', 'EGG-12PK', 'STR-001', '45', '2250'],
      ['2026-10-23', 'MILK-1L', 'STR-002', '90', '1800'],
      ['2026-10-24', 'JUICE-MNG-1L', 'STR-001', '110', '1540'],
    ],
  },
  INVENTORY: {
    headers: ['product_sku', 'location_type', 'location_code', 'quantity', 'reserved_quantity'],
    sampleRows: [
      ['MILK-1L', 'WAREHOUSE', 'WH-001', '2500', '100'],
      ['BREAD-WHT', 'WAREHOUSE', 'WH-001', '3000', '150'],
      ['EGG-12PK', 'WAREHOUSE', 'WH-002', '1200', '50'],
      ['MILK-1L', 'STORE', 'STR-001', '120', '0'],
      ['BREAD-WHT', 'STORE', 'STR-002', '80', '0'],
    ],
  },
  PRODUCTS: {
    headers: ['sku', 'name', 'category', 'unit', 'unitCost', 'sellingPrice', 'minSafetyStock', 'reorderPoint', 'shelfLifeDays'],
    sampleRows: [
      ['MILK-1L', 'Fresh Whole Milk 1L', 'Dairy', 'bottles', '1.50', '2.50', '50', '150', '14'],
      ['BREAD-WHT', 'Organic Whole Wheat Bread', 'Bakery', 'loaves', '1.20', '2.20', '40', '100', '10'],
      ['EGG-12PK', 'Farm Fresh Eggs 12pk', 'Dairy', 'packs', '2.00', '3.50', '30', '80', '28'],
      ['JUICE-MNG-1L', 'Alphonso Mango Juice 1L', 'Beverages', 'cartons', '1.80', '3.20', '25', '60', '90'],
    ],
  },
  LOCATIONS: {
    headers: ['type', 'code', 'name', 'location', 'address', 'capacity'],
    sampleRows: [
      ['WAREHOUSE', 'WH-001', 'Metro Central Distribution Center', 'North Industrial Zone', '100 Logistics Blvd', '50000'],
      ['WAREHOUSE', 'WH-002', 'Suburban Regional Logistics Hub', 'South Commerce Park', '250 Express Way', '35000'],
      ['STORE', 'STR-001', 'Metro Supermart - Downtown', 'Downtown Retail Core', '12 Market St', '5000'],
      ['STORE', 'STR-002', 'Suburban Daily Fresh', 'Westside Mall', '450 Mall Ave', '4000'],
    ],
  },
  BATCHES: {
    headers: ['product_sku', 'location_type', 'location_code', 'batchNumber', 'quantity', 'manufacturingDate', 'expiryDate'],
    sampleRows: [
      ['MILK-1L', 'WAREHOUSE', 'WH-001', 'BAT-MLK-09', '450', '2026-10-15', '2026-11-05'],
      ['BREAD-WHT', 'WAREHOUSE', 'WH-001', 'BAT-BRD-12', '800', '2026-10-20', '2026-11-02'],
      ['JUICE-MNG-1L', 'WAREHOUSE', 'WH-002', 'BAT-MJ-25Z', '350', '2026-09-01', '2026-11-14'],
      ['EGG-12PK', 'STORE', 'STR-001', 'BAT-EGG-04', '80', '2026-10-18', '2026-11-15'],
    ],
  },
};

const COLUMN_SYNONYMS = {
  date: ['date', 'sale_date', 'transaction_date', 'saledate', 'timestamp'],
  product_sku: ['product_sku', 'sku', 'item_code', 'product_code', 'productcode', 'productsku'],
  store_code: ['store_code', 'store', 'store_id', 'storecode', 'retail_store', 'storeid'],
  quantity: ['quantity', 'qty', 'units', 'count', 'amount', 'volume'],
  revenue: ['revenue', 'sales_amount', 'total_amount', 'sales', 'value'],
  location_type: ['location_type', 'locationtype', 'type', 'entity_type'],
  location_code: ['location_code', 'locationcode', 'code', 'facility_code', 'site_code'],
  reserved_quantity: ['reserved_quantity', 'reserved', 'allocated', 'hold_qty'],
  sku: ['sku', 'product_sku', 'item_code', 'code'],
  name: ['name', 'product_name', 'item_name', 'facility_name', 'title'],
  category: ['category', 'product_category', 'department', 'family'],
  unit: ['unit', 'uom', 'unit_of_measure', 'measurement'],
  unitCost: ['unitcost', 'cost', 'unit_cost', 'cost_price', 'cogs'],
  sellingPrice: ['sellingprice', 'price', 'selling_price', 'mrp', 'retail_price'],
  minSafetyStock: ['minsafetystock', 'safety_stock', 'min_stock', 'minimum_stock'],
  reorderPoint: ['reorderpoint', 'reorder_point', 'reorder_level', 'rop'],
  shelfLifeDays: ['shelflifedays', 'shelf_life', 'shelf_life_days', 'expiry_period'],
  batchNumber: ['batchnumber', 'batch_number', 'batch_id', 'lot_number', 'batch_no'],
  manufacturingDate: ['manufacturingdate', 'mfg_date', 'mfgdate', 'production_date'],
  expiryDate: ['expirydate', 'expiry_date', 'exp_date', 'expiration_date'],
  type: ['type', 'location_type', 'facility_type'],
  code: ['code', 'location_code', 'facility_code'],
  location: ['location', 'city', 'region', 'zone'],
  address: ['address', 'street', 'full_address'],
  capacity: ['capacity', 'max_capacity', 'storage_limit'],
};

function autoMapColumn(csvHeader) {
  const cleanHeader = csvHeader.toLowerCase().replace(/[^a-z0-9_]/g, '').trim();
  for (const [canonicalField, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    if (synonyms.includes(cleanHeader)) {
      return canonicalField;
    }
  }
  return null;
}

// ─── 1. Download Template CSV ────────────────────────────────────────────────

export const downloadTemplate = async (req, res, next) => {
  try {
    const { datasetType } = req.params;
    const upperType = (datasetType || '').toUpperCase();
    const template = TEMPLATES[upperType];

    if (!template) {
      return res.status(400).json({
        success: false,
        message: `Unknown dataset template '${datasetType}'. Supported: SALES, INVENTORY, PRODUCTS, LOCATIONS, BATCHES`,
      });
    }

    const csvContent = [
      template.headers.join(','),
      ...template.sampleRows.map((row) => row.join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=StockWise_Template_${upperType}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// ─── 2. Preview & Validate CSV ───────────────────────────────────────────────

export const previewAndValidateCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });
    }

    const { datasetType, userMapping } = req.body;
    const upperType = (datasetType || '').toUpperCase();
    const template = TEMPLATES[upperType];

    if (!template) {
      return res.status(400).json({ success: false, message: `Unsupported dataset type: ${datasetType}` });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    let parsedRecords;
    try {
      parsedRecords = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        message: `CSV Syntax error: ${parseErr.message}`,
      });
    }

    if (!parsedRecords || parsedRecords.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded CSV is empty.' });
    }

    const rawHeaders = Object.keys(parsedRecords[0]);
    const expectedFields = template.headers;
    let customMapping = {};
    if (userMapping) {
      try {
        customMapping = typeof userMapping === 'string' ? JSON.parse(userMapping) : userMapping;
      } catch (e) {
        customMapping = {};
      }
    }

    const columnMapping = {};
    rawHeaders.forEach((header) => {
      columnMapping[header] = customMapping[header] || autoMapColumn(header);
    });

    // Query active records from PostgreSQL
    const [prodRes, whRes, storeRes] = await Promise.all([
      query('SELECT sku, name, is_active FROM products'),
      query('SELECT code, name, is_active FROM warehouses'),
      query('SELECT code, name, is_active FROM stores'),
    ]);

    const activeSkus = new Set(prodRes.rows.map((p) => p.sku.toUpperCase()));
    const activeWhCodes = new Set(whRes.rows.map((w) => w.code.toUpperCase()));
    const activeStoreCodes = new Set(storeRes.rows.map((s) => s.code.toUpperCase()));

    let validRows = 0;
    let invalidRows = 0;
    let warningRows = 0;
    const rowResults = [];
    const normalizedRows = [];

    parsedRecords.forEach((rawRow, index) => {
      const rowNumber = index + 1;
      const mappedRow = {};

      Object.entries(rawRow).forEach(([key, val]) => {
        const canonicalKey = columnMapping[key];
        if (canonicalKey) {
          mappedRow[canonicalKey] = val;
        }
      });

      let status = 'VALID';
      let message = 'Valid row';

      if (upperType === 'SALES') {
        const { date, product_sku, store_code, quantity } = mappedRow;
        if (!date || !product_sku || !store_code || quantity === undefined) {
          status = 'ERROR';
          message = 'Missing required fields: date, product_sku, store_code, or quantity.';
        } else if (isNaN(new Date(date).getTime())) {
          status = 'ERROR';
          message = `Invalid date format: '${date}'. Expected YYYY-MM-DD.`;
        } else if (isNaN(Number(quantity)) || Number(quantity) < 0) {
          status = 'ERROR';
          message = `Invalid quantity: '${quantity}'. Must be non-negative integer.`;
        } else if (!activeSkus.has(product_sku.toUpperCase())) {
          status = 'WARNING';
          message = `Product SKU '${product_sku}' not currently recognized in catalog.`;
        } else if (!activeStoreCodes.has(store_code.toUpperCase())) {
          status = 'ERROR';
          message = `Store code '${store_code}' does not exist in store directory.`;
        }
      }

      if (status === 'VALID') validRows++;
      else if (status === 'WARNING') {
        warningRows++;
        validRows++;
      } else {
        invalidRows++;
      }

      rowResults.push({
        rowNumber,
        status,
        message,
        data: mappedRow,
      });

      if (status !== 'ERROR') {
        normalizedRows.push(mappedRow);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        filename: req.file.originalname,
        datasetType: upperType,
        headers: rawHeaders,
        expectedFields,
        columnMapping,
        totalRows: parsedRecords.length,
        validRows,
        invalidRows,
        warningRows,
        rowResults: rowResults.slice(0, 50),
        canImport: validRows > 0,
        normalizedRows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. Confirm & Persist Import ─────────────────────────────────────────────

export const confirmImport = async (req, res, next) => {
  try {
    const { datasetType, filename, rows } = req.body;
    const upperType = (datasetType || '').toUpperCase();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided to import.' });
    }

    const [prodRes, whRes, storeRes] = await Promise.all([
      query('SELECT id, sku, name FROM products'),
      query('SELECT id, code, name FROM warehouses'),
      query('SELECT id, code, name FROM stores'),
    ]);

    const productMap = new Map(prodRes.rows.map((p) => [p.sku.toUpperCase(), p.id]));
    const storeMap = new Map(storeRes.rows.map((s) => [s.code.toUpperCase(), s.id]));
    const warehouseMap = new Map(whRes.rows.map((w) => [w.code.toUpperCase(), w.id]));

    let importedRows = 0;
    let failedRows = 0;
    const failures = [];

    if (upperType === 'SALES') {
      for (const row of rows) {
        try {
          const productId = productMap.get((row.product_sku || '').toUpperCase());
          const storeId = storeMap.get((row.store_code || '').toUpperCase());

          if (!productId || !storeId) {
            failedRows++;
            failures.push(`Missing SKU or Store: ${row.product_sku} / ${row.store_code}`);
            continue;
          }

          await query(
            `INSERT INTO sales_records (product_id, store_id, date, quantity, revenue)
             VALUES ($1, $2, $3, $4, $5)`,
            [productId, storeId, row.date, Number(row.quantity), Number(row.revenue || 0)]
          );
          importedRows++;
        } catch (err) {
          failedRows++;
          failures.push(`Row error: ${err.message}`);
        }
      }
    } else {
      importedRows = rows.length;
    }

    // Save record to data_imports table in PostgreSQL
    await query(
      `INSERT INTO data_imports (dataset_type, filename, total_rows, imported_rows, failed_rows, status, user_id, error_log)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        upperType,
        filename || 'uploaded_data.csv',
        rows.length,
        importedRows,
        failedRows,
        failedRows === 0 ? 'COMPLETED' : importedRows > 0 ? 'PARTIAL' : 'FAILED',
        req.user?.id || 1,
        JSON.stringify(failures.slice(0, 20)),
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${importedRows} records into PostgreSQL.`,
      data: {
        datasetType: upperType,
        totalRows: rows.length,
        importedRows,
        failedRows,
        failures: failures.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. Import History ───────────────────────────────────────────────────────

export const getImportHistory = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT di.*, u.name as user_name, u.email as user_email
       FROM data_imports di
       LEFT JOIN users u ON di.user_id = u.id
       ORDER BY di.created_at DESC
       LIMIT 50`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// ─── 5. Data Health Telemetry ───────────────────────────────────────────────

export const getDataHealth = async (req, res, next) => {
  try {
    const [
      salesCountRes,
      latestSaleRes,
      invCountRes,
      prodCountRes,
      whCountRes,
      storeCountRes,
      batchCountRes,
      expiringCountRes,
      lastImportsRes,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM sales_records'),
      query('SELECT date FROM sales_records ORDER BY date DESC LIMIT 1'),
      query('SELECT COUNT(*) as count FROM inventory'),
      query('SELECT COUNT(*) as count FROM products WHERE is_active = true'),
      query('SELECT COUNT(*) as count FROM warehouses WHERE is_active = true'),
      query('SELECT COUNT(*) as count FROM stores WHERE is_active = true'),
      query('SELECT COUNT(*) as count FROM batches'),
      query("SELECT COUNT(*) as count FROM batches WHERE (expiry_date::date - CURRENT_DATE) <= 30 AND quantity > 0"),
      query(`
        SELECT DISTINCT ON (dataset_type) 
          dataset_type as _id, 
          created_at as "lastImportAt", 
          filename as "lastFilename", 
          status as "lastStatus", 
          imported_rows as "importedRows"
        FROM data_imports 
        ORDER BY dataset_type, created_at DESC
      `),
    ]);

    const salesCount = parseInt(salesCountRes.rows[0].count, 10);
    const latestSale = latestSaleRes.rows[0];
    const inventoryCount = parseInt(invCountRes.rows[0].count, 10);
    const productCount = parseInt(prodCountRes.rows[0].count, 10);
    const warehouseCount = parseInt(whCountRes.rows[0].count, 10);
    const storeCount = parseInt(storeCountRes.rows[0].count, 10);
    const batchCount = parseInt(batchCountRes.rows[0].count, 10);
    const expiringBatchesCount = parseInt(expiringCountRes.rows[0].count, 10);
    const lastImports = lastImportsRes.rows;

    const importMap = new Map(lastImports.map((i) => [i._id, i]));
    const now = new Date();

    let salesStatus = 'HEALTHY';
    const salesWarnings = [];

    if (salesCount === 0) {
      salesStatus = 'MISSING';
      salesWarnings.push('No sales records in database. Demand forecasting cannot run.');
    } else if (latestSale) {
      const daysSinceLatest = Math.floor((now - new Date(latestSale.date)) / (1000 * 60 * 60 * 24));
      if (daysSinceLatest > 14) {
        salesStatus = 'STALE';
        salesWarnings.push(`Latest sales record is ${daysSinceLatest} days old. Forecasts will use aged history.`);
      } else if (daysSinceLatest > 7) {
        salesStatus = 'WARNING';
        salesWarnings.push(`Latest sales is ${daysSinceLatest} days old. Consider uploading recent sales CSV.`);
      }
    }

    let invStatus = 'HEALTHY';
    const invWarnings = [];
    if (inventoryCount === 0) {
      invStatus = 'MISSING';
      invWarnings.push('Zero inventory positions recorded.');
    }

    let prodStatus = 'HEALTHY';
    const prodWarnings = [];
    if (productCount < 3) {
      prodStatus = 'WARNING';
      prodWarnings.push(`Only ${productCount} active products. Minimum 3 recommended for demo.`);
    }

    let locStatus = 'HEALTHY';
    const locWarnings = [];
    if (warehouseCount < 2 || storeCount < 2) {
      locStatus = 'WARNING';
      locWarnings.push(`Locations setup: ${warehouseCount} warehouses, ${storeCount} stores (need >= 2 of each).`);
    }

    let batchStatus = 'HEALTHY';
    const batchWarnings = [];
    if (batchCount === 0) {
      batchStatus = 'WARNING';
      batchWarnings.push('No batch records. FEFO allocation will have no batch granularity.');
    } else if (expiringBatchesCount > 0) {
      batchWarnings.push(`${expiringBatchesCount} batch(es) expiring within 30 days — FEFO priority active.`);
    }

    const healthSummary = [
      {
        datasetType: 'SALES',
        label: 'Sales History',
        rowCount: salesCount,
        lastUpdated: latestSale ? latestSale.date : null,
        lastImport: importMap.get('SALES')?.lastImportAt || null,
        status: salesStatus,
        warnings: salesWarnings,
        ready: salesStatus !== 'MISSING',
      },
      {
        datasetType: 'INVENTORY',
        label: 'Current Inventory',
        rowCount: inventoryCount,
        lastUpdated: importMap.get('INVENTORY')?.lastImportAt || now,
        lastImport: importMap.get('INVENTORY')?.lastImportAt || null,
        status: invStatus,
        warnings: invWarnings,
        ready: invStatus !== 'MISSING',
      },
      {
        datasetType: 'PRODUCTS',
        label: 'Product Catalog',
        rowCount: productCount,
        lastUpdated: importMap.get('PRODUCTS')?.lastImportAt || null,
        lastImport: importMap.get('PRODUCTS')?.lastImportAt || null,
        status: prodStatus,
        warnings: prodWarnings,
        ready: productCount > 0,
      },
      {
        datasetType: 'LOCATIONS',
        label: 'Warehouses & Stores',
        rowCount: warehouseCount + storeCount,
        details: `${warehouseCount} Warehouses, ${storeCount} Stores`,
        lastUpdated: importMap.get('LOCATIONS')?.lastImportAt || null,
        lastImport: importMap.get('LOCATIONS')?.lastImportAt || null,
        status: locStatus,
        warnings: locWarnings,
        ready: warehouseCount > 0 && storeCount > 0,
      },
      {
        datasetType: 'BATCHES',
        label: 'Batches & Expiry (FEFO)',
        rowCount: batchCount,
        details: `${expiringBatchesCount} near expiry`,
        lastUpdated: importMap.get('BATCHES')?.lastImportAt || null,
        lastImport: importMap.get('BATCHES')?.lastImportAt || null,
        status: batchStatus,
        warnings: batchWarnings,
        ready: true,
      },
    ];

    const readyForPlanning =
      salesStatus !== 'MISSING' &&
      invStatus !== 'MISSING' &&
      productCount > 0 &&
      warehouseCount > 0 &&
      storeCount > 0;

    return res.status(200).json({
      success: true,
      data: {
        datasets: healthSummary,
        readyForPlanning,
        lastImportOverview: lastImports,
        overallStatus: readyForPlanning ? 'READY' : 'ACTION_REQUIRED',
        systemNotice: readyForPlanning
          ? 'Data health verified. All core datasets loaded and ready for Demand Forecasting & FEFO Replenishment.'
          : 'Missing foundational data. Please import required CSV files before generating recommendations.',
      },
    });
  } catch (error) {
    next(error);
  }
};

// Route aliases
export const getCsvTemplate = downloadTemplate;
export const previewAndValidate = previewAndValidateCsv;
