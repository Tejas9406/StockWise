import { query } from '../config/db.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    // 1. Overall System Metrics from PostgreSQL
    const invRes = await query(`
      SELECT 
        COALESCE(SUM(quantity), 0) as total_quantity,
        COALESCE(SUM(reserved_quantity), 0) as total_reserved
      FROM inventory
    `);
    const totalInventory = parseInt(invRes.rows[0].total_quantity, 10);
    const totalReserved = parseInt(invRes.rows[0].total_reserved, 10);

    const countsRes = await query(`
      SELECT 
        (SELECT COUNT(*) FROM warehouses WHERE is_active = true) as total_warehouses,
        (SELECT COUNT(*) FROM stores WHERE is_active = true) as total_stores,
        (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
        (SELECT COUNT(*) FROM transfers WHERE status = 'PENDING') as pending_transfers,
        (SELECT COUNT(*) FROM ai_recommendations WHERE status = 'PENDING') as pending_recommendations,
        (SELECT COUNT(*) FROM data_imports) as total_imports
    `);
    const counts = countsRes.rows[0];

    // 2. Recent Transfers with relations
    const transfersRes = await query(`
      SELECT 
        t.id, t.transfer_number, t.quantity, t.status, t.created_at,
        p.id as product_id, p.name as product_name, p.sku,
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        s.id as store_id, s.name as store_name, s.code as store_code
      FROM transfers t
      JOIN products p ON t.product_id = p.id
      JOIN warehouses w ON t.source_warehouse_id = w.id
      JOIN stores s ON t.destination_id = s.id
      ORDER BY t.created_at DESC
      LIMIT 6
    `);

    const recentTransfers = transfersRes.rows.map(r => ({
      _id: r.id,
      id: r.id,
      transferNumber: r.transfer_number,
      quantity: r.quantity,
      status: r.status,
      createdAt: r.created_at,
      productId: { _id: r.product_id, id: r.product_id, name: r.product_name, sku: r.sku },
      sourceWarehouseId: { _id: r.warehouse_id, id: r.warehouse_id, name: r.warehouse_name, code: r.warehouse_code },
      destinationId: { _id: r.store_id, id: r.store_id, name: r.store_name, code: r.store_code },
    }));

    // 3. Category distribution
    const catRes = await query(`
      SELECT 
        p.category as _id,
        COALESCE(SUM(i.quantity), 0) as "totalQuantity",
        COALESCE(SUM(i.reserved_quantity), 0) as "totalReserved"
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      GROUP BY p.category
      ORDER BY "totalQuantity" DESC
    `);

    // 4. Critical Stockouts and Risk counts from PostgreSQL
    const riskRes = await query(`
      SELECT 
        COUNT(CASE WHEN i.quantity <= p.min_safety_stock THEN 1 END) as critical_stockouts,
        COUNT(CASE WHEN i.quantity > (p.reorder_point * 3) THEN 1 END) as excess_items
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.location_type = 'STORE'
    `);
    const criticalStockouts = parseInt(riskRes.rows[0].critical_stockouts || 0, 10);
    const excessItems = parseInt(riskRes.rows[0].excess_items || 0, 10);

    // 5. Expiry Risk Count (batches expiring within 30 days)
    const expRes = await query(`
      SELECT COUNT(*) as near_expiry_count 
      FROM batches 
      WHERE (expiry_date::date - CURRENT_DATE) <= 30 AND quantity > 0
    `);
    const nearExpiryBatches = parseInt(expRes.rows[0].near_expiry_count || 0, 10);

    return res.status(200).json({
      success: true,
      data: {
        totalInventory,
        totalReserved,
        availableInventory: Math.max(0, totalInventory - totalReserved),
        totalWarehouses: parseInt(counts.total_warehouses, 10),
        totalStores: parseInt(counts.total_stores, 10),
        totalProducts: parseInt(counts.total_products, 10),
        pendingTransfers: parseInt(counts.pending_transfers, 10),
        pendingRecommendations: parseInt(counts.pending_recommendations, 10),
        criticalStockouts,
        excessItems,
        nearExpiryBatches,
        recentTransfers,
        categoryStats: catRes.rows,
        totalImportsCount: parseInt(counts.total_imports, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDecisionHistory = async (req, res, next) => {
  try {
    const eventsRes = await query(`
      SELECT 
        ae.id,
        ae.transfer_id,
        ae.action,
        ae.previous_value,
        ae.new_value,
        ae.reason,
        ae.timestamp,
        u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role,
        t.transfer_number, t.quantity as transfer_quantity, t.status as transfer_status,
        p.id as product_id, p.name as product_name, p.sku as product_sku,
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        s.id as store_id, s.name as store_name, s.code as store_code
      FROM approval_events ae
      LEFT JOIN users u ON ae.user_id = u.id
      LEFT JOIN transfers t ON ae.transfer_id = t.id
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN warehouses w ON t.source_warehouse_id = w.id
      LEFT JOIN stores s ON t.destination_id = s.id
      ORDER BY ae.timestamp DESC
      LIMIT 50
    `);

    const formattedEvents = eventsRes.rows.map(r => ({
      _id: r.id,
      id: r.id,
      action: r.action,
      previousValue: r.previous_value,
      newValue: r.new_value,
      reason: r.reason,
      timestamp: r.timestamp,
      userId: {
        _id: r.user_id,
        id: r.user_id,
        name: r.user_name || 'System Admin',
        email: r.user_email || 'admin@stockwise.com',
        role: r.user_role || 'MANAGER',
      },
      transferId: r.transfer_id ? {
        _id: r.transfer_id,
        id: r.transfer_id,
        transferNumber: r.transfer_number,
        quantity: r.transfer_quantity,
        status: r.transfer_status,
        productId: { name: r.product_name, sku: r.product_sku },
        sourceWarehouseId: { name: r.warehouse_name, code: r.warehouse_code },
        destinationId: { name: r.store_name, code: r.store_code },
      } : null,
    }));

    return res.status(200).json({
      success: true,
      count: formattedEvents.length,
      data: formattedEvents,
    });
  } catch (error) {
    next(error);
  }
};

export const getRiskAlerts = async (req, res, next) => {
  const { getRiskAssessment } = await import('./aiController.js');
  return getRiskAssessment(req, res, next);
};

export const getDemandForecastOverview = async (req, res, next) => {
  const { getForecast } = await import('./aiController.js');
  return getForecast(req, res, next);
};

export const getBaselineComparisonOverview = async (req, res, next) => {
  const { getBaselineVsAiComparison } = await import('./aiController.js');
  return getBaselineVsAiComparison(req, res, next);
};
