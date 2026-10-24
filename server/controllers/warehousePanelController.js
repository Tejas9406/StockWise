import { query } from '../config/db.js';

const resolveWarehouseId = (req) => {
  if (req.user.role === 'WAREHOUSE') {
    return req.user.warehouseId?.id || req.user.warehouseId?._id || req.user.warehouseId;
  }
  return req.query.warehouseId ? parseInt(req.query.warehouseId, 10) : 1;
};

export const getWarehouseDashboard = async (req, res, next) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const whRes = await query('SELECT * FROM warehouses WHERE id = $1', [warehouseId]);
    const warehouse = whRes.rows[0];

    const invRes = await query(
      `SELECT 
        COALESCE(SUM(quantity), 0) as total_stock,
        COALESCE(SUM(reserved_quantity), 0) as reserved_stock
       FROM inventory
       WHERE warehouse_id = $1 AND location_type = 'WAREHOUSE'`,
      [warehouseId]
    );

    const totalStock = parseInt(invRes.rows[0].total_stock, 10);
    const reservedStock = parseInt(invRes.rows[0].reserved_stock, 10);
    const availableStock = Math.max(0, totalStock - reservedStock);

    const picksRes = await query(
      `SELECT COUNT(*) as count FROM transfers WHERE source_warehouse_id = $1 AND status = 'APPROVED'`,
      [warehouseId]
    );

    const dispatchQueueRes = await query(
      `SELECT COUNT(*) as count FROM transfers WHERE source_warehouse_id = $1 AND status IN ('PICKED', 'PACKED')`,
      [warehouseId]
    );

    const todayDispatchesRes = await query(
      `SELECT COUNT(*) as count FROM transfers 
       WHERE source_warehouse_id = $1 AND status IN ('DISPATCHED', 'RECEIVED') AND dispatched_at >= CURRENT_DATE`,
      [warehouseId]
    );

    return res.status(200).json({
      success: true,
      data: {
        warehouse,
        availableStock,
        reservedStock,
        totalStock,
        pendingPicksCount: parseInt(picksRes.rows[0].count, 10),
        readyToDispatchCount: parseInt(dispatchQueueRes.rows[0].count, 10),
        todayDispatchesCount: parseInt(todayDispatchesRes.rows[0].count, 10),
        lowStockItemsCount: 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPickList = async (req, res, next) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const result = await query(
      `SELECT 
        t.id, t.transfer_number as "transferNumber", t.quantity, t.status, t.created_at as "createdAt",
        p.id as product_id, p.name as product_name, p.sku,
        s.id as store_id, s.name as store_name, s.code as store_code,
        b.id as batch_id, b.batch_number as "batchNumber"
       FROM transfers t
       JOIN products p ON t.product_id = p.id
       JOIN stores s ON t.destination_id = s.id
       LEFT JOIN batches b ON t.batch_id = b.id
       WHERE t.source_warehouse_id = $1 AND t.status = 'APPROVED'
       ORDER BY t.created_at ASC`,
      [warehouseId]
    );

    const transfers = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      transferNumber: r.transferNumber,
      quantity: r.quantity,
      status: r.status,
      createdAt: r.createdAt,
      productId: { _id: r.product_id, id: r.product_id, name: r.product_name, sku: r.sku },
      destinationId: { _id: r.store_id, id: r.store_id, name: r.store_name, code: r.store_code },
      batchId: r.batch_id ? { _id: r.batch_id, id: r.batch_id, batchNumber: r.batchNumber } : null,
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

export const getDispatchQueue = async (req, res, next) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const result = await query(
      `SELECT 
        t.id, t.transfer_number as "transferNumber", t.quantity, t.status, t.updated_at as "updatedAt",
        p.id as product_id, p.name as product_name, p.sku,
        s.id as store_id, s.name as store_name, s.code as store_code,
        b.id as batch_id, b.batch_number as "batchNumber"
       FROM transfers t
       JOIN products p ON t.product_id = p.id
       JOIN stores s ON t.destination_id = s.id
       LEFT JOIN batches b ON t.batch_id = b.id
       WHERE t.source_warehouse_id = $1 AND t.status IN ('PICKED', 'PACKED')
       ORDER BY t.updated_at DESC`,
      [warehouseId]
    );

    const transfers = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      transferNumber: r.transferNumber,
      quantity: r.quantity,
      status: r.status,
      updatedAt: r.updatedAt,
      productId: { _id: r.product_id, id: r.product_id, name: r.product_name, sku: r.sku },
      destinationId: { _id: r.store_id, id: r.store_id, name: r.store_name, code: r.store_code },
      batchId: r.batch_id ? { _id: r.batch_id, id: r.batch_id, batchNumber: r.batchNumber } : null,
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

export const getWarehouseInventory = async (req, res, next) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const invRes = await query(
      `SELECT 
        i.id, i.quantity, i.reserved_quantity as "reservedQuantity",
        p.id as product_id, p.name as product_name, p.sku, p.category, p.unit
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.warehouse_id = $1 AND i.location_type = 'WAREHOUSE'`,
      [warehouseId]
    );

    const batchRes = await query(
      `SELECT b.id, b.batch_number as "batchNumber", b.quantity, b.expiry_date as "expiryDate",
              p.name as product_name
       FROM batches b
       JOIN products p ON b.product_id = p.id
       WHERE b.warehouse_id = $1
       ORDER BY b.expiry_date ASC`,
      [warehouseId]
    );

    return res.status(200).json({
      success: true,
      data: {
        inventories: invRes.rows.map(r => ({
          _id: r.id,
          quantity: r.quantity,
          reservedQuantity: r.reservedQuantity,
          availableQuantity: Math.max(0, r.quantity - r.reservedQuantity),
          productId: { _id: r.product_id, name: r.product_name, sku: r.sku, category: r.category, unit: r.unit },
        })),
        batches: batchRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDispatchHistory = async (req, res, next) => {
  try {
    const warehouseId = resolveWarehouseId(req);
    const result = await query(
      `SELECT 
        t.id, t.transfer_number as "transferNumber", t.quantity, t.status, t.dispatched_at as "dispatchedAt",
        t.carrier, t.vehicle_number as "vehicleNumber",
        p.id as product_id, p.name as product_name, p.sku,
        s.id as store_id, s.name as store_name
       FROM transfers t
       JOIN products p ON t.product_id = p.id
       JOIN stores s ON t.destination_id = s.id
       WHERE t.source_warehouse_id = $1 AND t.status IN ('DISPATCHED', 'RECEIVED')
       ORDER BY t.dispatched_at DESC LIMIT 50`,
      [warehouseId]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(r => ({
        _id: r.id,
        transferNumber: r.transferNumber,
        quantity: r.quantity,
        status: r.status,
        dispatchedAt: r.dispatchedAt,
        carrier: r.carrier,
        vehicleNumber: r.vehicleNumber,
        productId: { name: r.product_name, sku: r.sku },
        destinationId: { name: r.store_name },
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getApprovedTransfers = getPickList;
