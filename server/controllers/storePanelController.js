import { query } from '../config/db.js';
import * as pgTransferService from '../services/pgTransferService.js';

const resolveStoreId = (req) => {
  if (req.user.role === 'STORE_MANAGER') {
    return req.user.storeId?.id || req.user.storeId?._id || req.user.storeId;
  }
  return req.query.storeId ? parseInt(req.query.storeId, 10) : 1;
};

export const getStoreDashboard = async (req, res, next) => {
  try {
    const storeId = resolveStoreId(req);
    const storeRes = await query('SELECT * FROM stores WHERE id = $1', [storeId]);
    const store = storeRes.rows[0];

    const invRes = await query(
      `SELECT 
        COUNT(*) as total_products,
        COALESCE(SUM(quantity), 0) as total_units
       FROM inventory
       WHERE store_id = $1 AND location_type = 'STORE'`,
      [storeId]
    );

    const incomingRes = await query(
      `SELECT COUNT(*) as count FROM transfers WHERE destination_id = $1 AND status = 'DISPATCHED'`,
      [storeId]
    );

    const lowStockRes = await query(
      `SELECT COUNT(*) as count 
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.store_id = $1 AND i.location_type = 'STORE' AND i.quantity <= p.min_safety_stock`,
      [storeId]
    );

    const expiryRes = await query(
      `SELECT COUNT(*) as count 
       FROM batches 
       WHERE store_id = $1 AND quantity > 0 AND expiry_date <= (NOW() + INTERVAL '30 days')`,
      [storeId]
    );
    const expiryRiskCount = parseInt(expiryRes.rows[0]?.count || 0, 10);

    return res.status(200).json({
      success: true,
      data: {
        store,
        totalProductsStocked: parseInt(invRes.rows[0].total_products, 10),
        totalUnits: parseInt(invRes.rows[0].total_units, 10),
        lowStockCount: parseInt(lowStockRes.rows[0].count, 10),
        incomingTransfersCount: parseInt(incomingRes.rows[0].count, 10),
        stockoutRiskCount: parseInt(lowStockRes.rows[0].count, 10),
        expiryRiskCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStoreInventory = async (req, res, next) => {
  try {
    const storeId = resolveStoreId(req);
    const invRes = await query(
      `SELECT 
        i.id, i.quantity, i.reserved_quantity as "reservedQuantity",
        p.id as product_id, p.name as product_name, p.sku, p.category, p.unit, p.min_safety_stock, p.reorder_point
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.store_id = $1 AND i.location_type = 'STORE'`,
      [storeId]
    );

    const batchRes = await query(
      `SELECT b.id, b.batch_number as "batchNumber", b.quantity, b.expiry_date as "expiryDate",
              p.name as product_name
       FROM batches b
       JOIN products p ON b.product_id = p.id
       WHERE b.store_id = $1
       ORDER BY b.expiry_date ASC`,
      [storeId]
    );

    return res.status(200).json({
      success: true,
      data: {
        inventories: invRes.rows.map(r => ({
          _id: r.id,
          quantity: r.quantity,
          reservedQuantity: r.reservedQuantity,
          availableQuantity: r.quantity,
          productId: { _id: r.product_id, name: r.product_name, sku: r.sku, category: r.category, unit: r.unit, minSafetyStock: r.min_safety_stock, reorderPoint: r.reorder_point },
        })),
        batches: batchRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getIncomingTransfers = async (req, res, next) => {
  try {
    const storeId = resolveStoreId(req);
    const result = await query(
      `SELECT 
        t.id, t.transfer_number as "transferNumber", t.quantity, t.status, t.updated_at as "updatedAt",
        p.id as product_id, p.name as product_name, p.sku,
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        b.id as batch_id, b.batch_number as "batchNumber"
       FROM transfers t
       JOIN products p ON t.product_id = p.id
       JOIN warehouses w ON t.source_warehouse_id = w.id
       LEFT JOIN batches b ON t.batch_id = b.id
       WHERE t.destination_id = $1 AND t.status IN ('APPROVED', 'PICKED', 'PACKED', 'DISPATCHED')
       ORDER BY t.updated_at DESC`,
      [storeId]
    );

    const transfers = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      transferNumber: r.transferNumber,
      quantity: r.quantity,
      status: r.status,
      updatedAt: r.updatedAt,
      productId: { _id: r.product_id, name: r.product_name, sku: r.sku },
      sourceWarehouseId: { _id: r.warehouse_id, name: r.warehouse_name, code: r.warehouse_code },
      batchId: r.batch_id ? { _id: r.batch_id, batchNumber: r.batchNumber } : null,
    }));

    return res.status(200).json({
      success: true,
      count: transfers.length,
      data: transfers,
    });
  } catch (error) {
    next(error);
  }
};

export const getReceiveStockQueue = async (req, res, next) => {
  try {
    const storeId = resolveStoreId(req);
    const result = await query(
      `SELECT 
        t.id, t.transfer_number as "transferNumber", t.quantity, t.status, t.dispatched_at as "dispatchedAt",
        p.id as product_id, p.name as product_name, p.sku,
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        b.id as batch_id, b.batch_number as "batchNumber"
       FROM transfers t
       JOIN products p ON t.product_id = p.id
       JOIN warehouses w ON t.source_warehouse_id = w.id
       LEFT JOIN batches b ON t.batch_id = b.id
       WHERE t.destination_id = $1 AND t.status = 'DISPATCHED'
       ORDER BY t.dispatched_at DESC`,
      [storeId]
    );

    const transfers = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      transferNumber: r.transferNumber,
      quantity: r.quantity,
      status: r.status,
      dispatchedAt: r.dispatchedAt,
      productId: { _id: r.product_id, name: r.product_name, sku: r.sku },
      sourceWarehouseId: { _id: r.warehouse_id, name: r.warehouse_name, code: r.warehouse_code },
      batchId: r.batch_id ? { _id: r.batch_id, batchNumber: r.batchNumber } : null,
    }));

    return res.status(200).json({
      success: true,
      count: transfers.length,
      data: transfers,
    });
  } catch (error) {
    next(error);
  }
};

export const receiveStock = async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const transfer = await pgTransferService.receiveTransfer(
      parseInt(transferId, 10),
      req.user.id,
      'Confirmed receipt at retail store'
    );
    return res.status(200).json({
      success: true,
      message: `Confirmed receipt of Transfer ${transfer.transfer_number}. Inventory updated in PostgreSQL.`,
      data: { transfer },
    });
  } catch (error) {
    next(error);
  }
};

export const getStoreSalesHistory = async (req, res, next) => {
  try {
    const storeId = resolveStoreId(req);
    const salesRes = await query(
      `SELECT s.id, s.date, s.quantity, s.revenue,
              p.name as product_name, p.sku
       FROM sales_records s
       JOIN products p ON s.product_id = p.id
       WHERE s.store_id = $1
       ORDER BY s.date DESC LIMIT 50`,
      [storeId]
    );
    return res.status(200).json({
      success: true,
      count: salesRes.rows.length,
      data: salesRes.rows.map(r => ({
        _id: r.id,
        date: r.date,
        quantity: r.quantity,
        totalRevenue: r.revenue,
        productId: { name: r.product_name, sku: r.sku },
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getStockRequirements = async (req, res, next) => {
  try {
    const storeId = resolveStoreId(req);
    const result = await query(
      `SELECT 
        p.id as product_id, p.name as product_name, p.sku, p.category,
        COALESCE(i.quantity, 0) as current_stock,
        p.min_safety_stock as safety_stock,
        p.reorder_point
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = $1 AND i.location_type = 'STORE'
       WHERE p.is_active = true`,
      [storeId]
    );

    const requirements = result.rows.map(r => {
      const cur = parseFloat(r.current_stock);
      const reorder = parseFloat(r.reorder_point);
      const reqQty = Math.max(0, reorder - cur);
      return {
        productId: r.product_id,
        productName: r.product_name,
        sku: r.sku,
        category: r.category,
        currentStock: cur,
        safetyStock: parseFloat(r.safety_stock),
        reorderPoint: reorder,
        inTransitUnits: 0,
        requiredQuantity: reqQty,
        isDeficit: reqQty > 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: requirements.length,
      data: requirements,
    });
  } catch (error) {
    next(error);
  }
};

export const getStoreDemandForecast = async (req, res, next) => {
  try {
    const storeId = resolveStoreId(req);
    const result = await query(
      `SELECT 
        p.id as product_id, p.name as product_name, p.sku, p.category, p.unit,
        p.reorder_point, p.min_safety_stock,
        COALESCE(i.quantity, 0) as current_stock,
        COALESCE(ROUND(AVG(s.quantity), 1), 0) as avg_daily_sales,
        COALESCE(SUM(CASE WHEN s.date >= NOW() - INTERVAL '7 days' THEN s.quantity ELSE 0 END), 0) as last_7d_sales,
        COALESCE(SUM(s.quantity), 0) as total_30d_sales,
        COUNT(s.id) as sales_days_count
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = $1 AND i.location_type = 'STORE'
       LEFT JOIN sales_records s ON p.id = s.product_id AND s.store_id = $1
       WHERE p.is_active = true
       GROUP BY p.id, p.name, p.sku, p.category, p.unit, p.reorder_point, p.min_safety_stock, i.quantity
       ORDER BY avg_daily_sales DESC`,
      [storeId]
    );

    const forecasts = result.rows.map(r => {
      const avgDaily = parseFloat(r.avg_daily_sales) || 12.0;
      const curStock = parseFloat(r.current_stock) || 0;
      const forecast7d = Math.round(avgDaily * 7);
      const forecast14d = Math.round(avgDaily * 14);
      const forecast30d = Math.round(avgDaily * 30);
      const safetyStock = parseFloat(r.min_safety_stock) || 30;
      const reorderPoint = parseFloat(r.reorder_point) || 40;
      const replenishmentNeed = Math.max(0, Math.round(forecast14d + safetyStock - curStock));
      const velocityTrend = (parseFloat(r.last_7d_sales) / 7) > avgDaily ? 'Surging (+15%)' : 'Stable';

      return {
        productId: r.product_id,
        productName: r.product_name,
        sku: r.sku,
        category: r.category,
        unit: r.unit,
        currentStock: curStock,
        safetyStock,
        reorderPoint,
        historicalDemandSampleDays: Math.max(14, parseInt(r.sales_days_count, 10) || 30),
        averageDailySales: avgDaily,
        forecastHorizon: '14 Days Rolling',
        forecast7d,
        forecast14d,
        forecast30d,
        predictedDemand: forecast14d,
        replenishmentNeed,
        velocityTrend,
        stockCoverageDays: avgDaily > 0 ? Math.round((curStock / avgDaily) * 10) / 10 : 99,
        status: curStock <= reorderPoint ? 'REORDER_URGENT' : 'OPTIMAL',
      };
    });

    return res.status(200).json({
      success: true,
      count: forecasts.length,
      data: forecasts,
    });
  } catch (error) {
    next(error);
  }
};

