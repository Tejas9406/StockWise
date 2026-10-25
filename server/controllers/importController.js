import { parse } from 'csv-parse/sync';
import { query } from '../config/db.js';
import { runExpiryAutomationScan } from '../services/automationService.js';

// ─── Default Templates & Column Synonyms ──────────────────────────────────────

const TEMPLATES = {
  RETAILER_STOCK: {
    headers: ['store_name', 'store_code', 'product_name', 'product_sku', 'category', 'quantity', 'daily_sales', 'batch_number', 'expiry_date', 'selling_price'],
    sampleRows: [
      ['Metro Supermart - Downtown', 'STR-001', 'Fresh Whole Milk 1L', 'MILK-1L', 'Dairy', '120', '45', 'BAT-MLK-09', '2026-11-05', '2.50'],
      ['Suburban Daily Fresh', 'STR-002', 'Organic Whole Wheat Bread', 'BREAD-WHT', 'Bakery', '80', '25', 'BAT-BRD-12', '2026-11-02', '2.20'],
      ['Kothrud Hypermarket', 'STR-003', 'Alphonso Mango Juice 1L', 'JUICE-MNG-1L', 'Beverages', '210', '35', 'BAT-MJ-25Z', '2026-11-14', '3.20'],
      ['Apex Retail - Baner', 'STR-004', 'Farm Fresh Eggs 12pk', 'EGG-12PK', 'Dairy', '95', '20', 'BAT-EGG-04', '2026-11-15', '3.50'],
      ['City Mart Express', 'STR-005', 'Digestive Wholewheat Biscuits', 'BIS-WHT-200G', 'Snacks', '350', '60', 'BAT-BIS-88', '2026-12-10', '1.80'],
    ],
  },
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
  product_sku: ['product_sku', 'sku', 'item_code', 'product_code', 'productcode', 'productsku', 'item_id'],
  product_name: ['product_name', 'productname', 'item_name', 'item', 'product', 'description', 'title'],
  store_code: ['store_code', 'store', 'store_id', 'storecode', 'retail_store', 'storeid', 'code'],
  store_name: ['store_name', 'storename', 'retailer', 'retailer_name', 'retail_outlet', 'shop'],
  quantity: ['quantity', 'qty', 'units', 'count', 'amount', 'volume', 'stock', 'current_stock', 'inventory'],
  daily_sales: ['daily_sales', 'dailysales', 'sales', 'velocity', 'daily_velocity', 'demand', 'avg_sales'],
  revenue: ['revenue', 'sales_amount', 'total_amount', 'value'],
  location_type: ['location_type', 'locationtype', 'type', 'entity_type'],
  location_code: ['location_code', 'locationcode', 'code', 'facility_code', 'site_code'],
  reserved_quantity: ['reserved_quantity', 'reserved', 'allocated', 'hold_qty'],
  sku: ['sku', 'product_sku', 'item_code', 'code'],
  name: ['name', 'product_name', 'item_name', 'facility_name', 'title'],
  category: ['category', 'product_category', 'department', 'family', 'group'],
  unit: ['unit', 'uom', 'unit_of_measure', 'measurement'],
  unitCost: ['unitcost', 'cost', 'unit_cost', 'cost_price', 'cogs'],
  sellingPrice: ['sellingprice', 'price', 'selling_price', 'mrp', 'retail_price', 'rate'],
  minSafetyStock: ['minsafetystock', 'safety_stock', 'min_stock', 'minimum_stock'],
  reorderPoint: ['reorderpoint', 'reorder_point', 'reorder_level', 'rop'],
  shelfLifeDays: ['shelflifedays', 'shelf_life', 'shelf_life_days', 'expiry_period'],
  batchNumber: ['batchnumber', 'batch_number', 'batch_id', 'lot_number', 'batch_no', 'lot'],
  manufacturingDate: ['manufacturingdate', 'mfg_date', 'mfgdate', 'production_date'],
  expiryDate: ['expirydate', 'expiry_date', 'exp_date', 'expiration_date', 'expiry', 'best_before'],
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
    const template = TEMPLATES[upperType] || TEMPLATES.RETAILER_STOCK;

    const csvContent = [
      template.headers.join(','),
      ...template.sampleRows.map((row) => row.join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=StockWise_${upperType || 'RETAILER'}_Template.csv`);
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
    const upperType = (datasetType || 'RETAILER_STOCK').toUpperCase();
    const template = TEMPLATES[upperType] || TEMPLATES.RETAILER_STOCK;

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

    // Query active records from PostgreSQL for reference
    const [prodRes, whRes, storeRes] = await Promise.all([
      query('SELECT sku, name FROM products'),
      query('SELECT code, name FROM warehouses'),
      query('SELECT code, name FROM stores'),
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
      let message = 'Valid row ready for automatic database allocation';

      // Validation for all-in-one retailer stock or individual sets
      const sku = mappedRow.product_sku || mappedRow.sku;
      const storeCode = mappedRow.store_code || mappedRow.code;
      const quantity = mappedRow.quantity !== undefined ? mappedRow.quantity : mappedRow.daily_sales;

      if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) < 0)) {
        status = 'ERROR';
        message = `Quantity '${quantity}' must be a non-negative number.`;
      }

      if (mappedRow.date && isNaN(new Date(mappedRow.date).getTime())) {
        status = 'ERROR';
        message = `Invalid date '${mappedRow.date}'. Use YYYY-MM-DD.`;
      }

      if (status !== 'ERROR') {
        const notices = [];
        if (storeCode && !activeStoreCodes.has(storeCode.toUpperCase())) {
          notices.push(`Store '${storeCode}' will be automatically created in database`);
        }
        if (sku && !activeSkus.has(sku.toUpperCase())) {
          notices.push(`SKU '${sku}' will be automatically created in product catalog`);
        }
        if (notices.length > 0) {
          status = 'WARNING';
          message = notices.join('; ');
          warningRows++;
          validRows++;
        } else {
          validRows++;
        }
        normalizedRows.push(mappedRow);
      } else {
        invalidRows++;
      }

      rowResults.push({
        rowNumber,
        status,
        message,
        data: mappedRow,
      });
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

// ─── 3. Confirm & Persist Import with Dynamic Auto-Allocation ─────────────────

export const confirmImport = async (req, res, next) => {
  try {
    const { datasetType, filename, rows } = req.body;
    const upperType = (datasetType || 'RETAILER_STOCK').toUpperCase();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided to import.' });
    }

    // Preload stores, products, warehouses
    const [prodRes, whRes, storeRes] = await Promise.all([
      query('SELECT id, sku, name FROM products'),
      query('SELECT id, code, name FROM warehouses'),
      query('SELECT id, code, name FROM stores'),
    ]);

    const storeMap = new Map();
    storeRes.rows.forEach((s) => {
      storeMap.set(s.code.toUpperCase(), s.id);
      storeMap.set(s.name.toUpperCase(), s.id);
    });

    const warehouseMap = new Map();
    whRes.rows.forEach((w) => {
      warehouseMap.set(w.code.toUpperCase(), w.id);
      warehouseMap.set(w.name.toUpperCase(), w.id);
    });

    const productMap = new Map();
    prodRes.rows.forEach((p) => {
      productMap.set(p.sku.toUpperCase(), p.id);
      productMap.set(p.name.toUpperCase(), p.id);
    });

    let newStoresCreated = 0;
    let newProductsCreated = 0;
    let importedRows = 0;
    let failedRows = 0;
    const failures = [];

    // Helper: Dynamic Store allocation
    async function getOrCreateStore(rawCode, rawName) {
      const codeKey = (rawCode || '').trim().toUpperCase();
      const nameKey = (rawName || '').trim().toUpperCase();
      if (codeKey && storeMap.has(codeKey)) return storeMap.get(codeKey);
      if (nameKey && storeMap.has(nameKey)) return storeMap.get(nameKey);

      const cleanName = (rawName || rawCode || `Retail Store ${Date.now().toString().slice(-4)}`).trim();
      const cleanCode = (rawCode || `STR-${cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-3)}`).trim().toUpperCase();

      const insertRes = await query(
        `INSERT INTO stores (name, code, location, address, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code, name`,
        [cleanName, cleanCode, 'Retail Distribution Hub', 'Retail Commercial Outlet']
      );
      const newId = insertRes.rows[0].id;
      storeMap.set(cleanCode, newId);
      storeMap.set(cleanName.toUpperCase(), newId);
      newStoresCreated++;
      return newId;
    }

    // Helper: Dynamic Product allocation
    async function getOrCreateProduct(rawSku, rawName, category, price) {
      const skuKey = (rawSku || '').trim().toUpperCase();
      const nameKey = (rawName || '').trim().toUpperCase();
      if (skuKey && productMap.has(skuKey)) return productMap.get(skuKey);
      if (nameKey && productMap.has(nameKey)) return productMap.get(nameKey);

      const cleanName = (rawName || rawSku || `FMCG Product ${Date.now().toString().slice(-4)}`).trim();
      const cleanSku = (rawSku || `SKU-${cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-3)}`).trim().toUpperCase();
      const cat = (category || 'General FMCG').trim();
      const sellingPrice = parseFloat(price) || 50.0;
      const unitCost = Math.round(sellingPrice * 0.7 * 100) / 100;

      const insertRes = await query(
        `INSERT INTO products (name, sku, category, unit, unit_cost, selling_price, min_safety_stock, reorder_point, shelf_life_days, is_active)
         VALUES ($1, $2, $3, 'units', $4, $5, 20, 50, 60, true)
         ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, sku, name`,
        [cleanName, cleanSku, cat, unitCost, sellingPrice]
      );
      const newId = insertRes.rows[0].id;
      productMap.set(cleanSku, newId);
      productMap.set(cleanName.toUpperCase(), newId);
      newProductsCreated++;
      return newId;
    }

    // Process each uploaded row
    for (const row of rows) {
      try {
        const rawSku = row.product_sku || row.sku;
        const rawProdName = row.product_name || row.name;
        const rawStoreCode = row.store_code || row.code || row.location_code;
        const rawStoreName = row.store_name || row.name;

        // Auto-allocate product
        const productId = await getOrCreateProduct(rawSku, rawProdName, row.category, row.sellingPrice || row.price);

        // Auto-allocate store (or find warehouse if location_type === 'WAREHOUSE')
        let storeId = null;
        let warehouseId = null;

        if (row.location_type === 'WAREHOUSE') {
          warehouseId = warehouseMap.get((rawStoreCode || '').toUpperCase()) || 1;
        } else {
          storeId = await getOrCreateStore(rawStoreCode, rawStoreName);
        }

        // 1. Inventory Position Upsert
        const quantity = parseInt(row.quantity || '0', 10);
        if (storeId) {
          await query(
            `INSERT INTO inventory (product_id, location_type, store_id, quantity, reserved_quantity)
             VALUES ($1, 'STORE', $2, $3, 0)
             ON CONFLICT (product_id, store_id)
             DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = NOW()`,
            [productId, storeId, quantity]
          );
        } else if (warehouseId) {
          await query(
            `INSERT INTO inventory (product_id, location_type, warehouse_id, quantity, reserved_quantity)
             VALUES ($1, 'WAREHOUSE', $2, $3, 0)
             ON CONFLICT (product_id, warehouse_id)
             DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, updated_at = NOW()`,
            [productId, warehouseId, quantity]
          );
        }

        // 2. Batch & Expiry Allocation
        const batchNum = row.batchNumber || row.batch_number;
        const expiryDate = row.expiryDate || row.expiry_date;
        if (batchNum || expiryDate) {
          const exp = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 45 * 86400000);
          const bNum = batchNum || `BAT-${Date.now().toString().slice(-6)}`;
          await query(
            `INSERT INTO batches (product_id, store_id, warehouse_id, batch_number, quantity, manufacturing_date, expiry_date)
             VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '10 days', $6)`,
            [productId, storeId, warehouseId, bNum, quantity, exp]
          );
        }

        // 3. Sales Record (if daily sales or sales dataset)
        const salesQty = parseInt(row.daily_sales || (upperType === 'SALES' ? row.quantity : 0), 10);
        if (salesQty > 0 && storeId) {
          const saleDate = row.date ? new Date(row.date) : new Date();
          const revenue = parseFloat(row.revenue || 0) || salesQty * 45;
          await query(
            `INSERT INTO sales_records (product_id, store_id, date, quantity, revenue)
             VALUES ($1, $2, $3, $4, $5)`,
            [productId, storeId, saleDate, salesQty, revenue]
          );
        }

        importedRows++;
      } catch (rowErr) {
        failedRows++;
        failures.push(`Row failed: ${rowErr.message}`);
      }
    }

    // Record import metadata in data_imports table
    await query(
      `INSERT INTO data_imports (dataset_type, filename, total_rows, valid_rows, imported_rows, failed_rows, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        upperType,
        filename || 'retailer_dataset.csv',
        rows.length,
        importedRows,
        importedRows,
        failedRows,
        failedRows === 0 ? 'COMPLETED' : importedRows > 0 ? 'PARTIAL' : 'FAILED',
        JSON.stringify({ newStoresCreated, newProductsCreated, failures: failures.slice(0, 10) }),
      ]
    );

    // Dynamic Pipeline Re-trigger:
    // 1. Trigger automated expiry scanner
    runExpiryAutomationScan().catch((err) => console.error('[Post-Import Expiry Scan Error]:', err.message));

    // 2. Auto-generate replenishment recommendations for low-stock stores
    try {
      const primaryWarehouseId = whRes.rows[0]?.id || 1;
      const storeInventories = await query(`
        SELECT i.product_id, i.store_id, i.quantity, p.reorder_point, p.min_safety_stock, p.name as product_name
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.location_type = 'STORE' AND i.quantity <= p.reorder_point
      `);

      for (const inv of storeInventories.rows) {
        const needed = (inv.reorder_point * 2) - inv.quantity;
        if (needed > 0) {
          await query(`
            INSERT INTO ai_recommendations 
              (product_id, source_warehouse_id, destination_type, destination_id, quantity, transport_cost, expected_demand, reason, status, priority)
            VALUES ($1, $2, 'STORE', $3, $4, 45.0, $5, $6, 'PENDING', $7)
            ON CONFLICT DO NOTHING
          `, [
            inv.product_id,
            primaryWarehouseId,
            inv.store_id,
            needed,
            needed + inv.min_safety_stock,
            `Dynamic Replenishment: ${inv.product_name} store stock (${inv.quantity}) breached reorder point (${inv.reorder_point}).`,
            inv.quantity <= inv.min_safety_stock ? 'CRITICAL' : 'HIGH',
          ]);
        }
      }
    } catch (recErr) {
      console.warn('[Post-Import Recommendation Generator Notice]:', recErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully ingested ${importedRows} records. Auto-allocated ${newStoresCreated} new store(s) and ${newProductsCreated} new product(s) dynamically!`,
      data: {
        datasetType: upperType,
        totalRows: rows.length,
        importedRows,
        failedRows,
        newStoresCreated,
        newProductsCreated,
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
       LEFT JOIN users u ON di.imported_by = u.id
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

    const healthSummary = [
      {
        datasetType: 'RETAILER_STOCK',
        label: 'Retailer Stock & Velocity',
        rowCount: inventoryCount,
        lastUpdated: now,
        lastImport: importMap.get('RETAILER_STOCK')?.lastImportAt || null,
        status: inventoryCount > 0 ? 'HEALTHY' : 'ACTION_REQUIRED',
        warnings: inventoryCount === 0 ? ['Upload a retailer CSV to seed live inventory & sales.'] : [],
        ready: inventoryCount > 0,
      },
      {
        datasetType: 'SALES',
        label: 'Sales History',
        rowCount: salesCount,
        lastUpdated: latestSale ? latestSale.date : null,
        lastImport: importMap.get('SALES')?.lastImportAt || null,
        status: salesCount > 0 ? 'HEALTHY' : 'WARNING',
        warnings: salesCount === 0 ? ['No sales records recorded yet.'] : [],
        ready: salesCount > 0,
      },
      {
        datasetType: 'PRODUCTS',
        label: 'Product Catalog',
        rowCount: productCount,
        lastUpdated: importMap.get('PRODUCTS')?.lastImportAt || null,
        lastImport: importMap.get('PRODUCTS')?.lastImportAt || null,
        status: 'HEALTHY',
        warnings: [],
        ready: productCount > 0,
      },
      {
        datasetType: 'LOCATIONS',
        label: 'Warehouses & Stores',
        rowCount: warehouseCount + storeCount,
        details: `${warehouseCount} Warehouses, ${storeCount} Stores`,
        lastUpdated: importMap.get('LOCATIONS')?.lastImportAt || null,
        lastImport: importMap.get('LOCATIONS')?.lastImportAt || null,
        status: 'HEALTHY',
        warnings: [],
        ready: warehouseCount > 0 && storeCount > 0,
      },
      {
        datasetType: 'BATCHES',
        label: 'Batches & Expiry (FEFO)',
        rowCount: batchCount,
        details: `${expiringBatchesCount} near expiry (< 30 days)`,
        lastUpdated: importMap.get('BATCHES')?.lastImportAt || null,
        lastImport: importMap.get('BATCHES')?.lastImportAt || null,
        status: 'HEALTHY',
        warnings: expiringBatchesCount > 0 ? [`${expiringBatchesCount} batch(es) nearing expiry within 30 days.`] : [],
        ready: true,
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        datasets: healthSummary,
        readyForPlanning: true,
        lastImportOverview: lastImports,
        overallStatus: 'READY',
        systemNotice: 'PostgreSQL operational database connected. Dynamic Ingestion pipeline ready for real retailer CSV uploads.',
      },
    });
  } catch (error) {
    next(error);
  }
};

// Route aliases
export const getCsvTemplate = downloadTemplate;
export const previewAndValidate = previewAndValidateCsv;

export default {
  downloadTemplate,
  previewAndValidateCsv,
  confirmImport,
  getImportHistory,
  getDataHealth,
  getCsvTemplate,
  previewAndValidate,
};
