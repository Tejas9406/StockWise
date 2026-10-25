import { query } from '../config/db.js';
import * as pgTransferService from '../services/pgTransferService.js';

export const getAllTransfers = async (req, res, next) => {
  try {
    const { status, sourceWarehouseId, destinationId } = req.query;
    let queryStr = `
      SELECT 
        t.id,
        t.transfer_number as "transferNumber",
        t.quantity,
        t.status,
        t.notes,
        t.carrier,
        t.vehicle_number as "vehicleNumber",
        t.dispatched_at as "dispatchedAt",
        t.received_at as "receivedAt",
        t.created_at as "createdAt",
        p.id as product_id, p.name as product_name, p.sku,
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        s.id as store_id, s.name as store_name, s.code as store_code,
        b.id as batch_id, b.batch_number as "batchNumber",
        u.id as user_id, u.name as user_name
      FROM transfers t
      JOIN products p ON t.product_id = p.id
      JOIN warehouses w ON t.source_warehouse_id = w.id
      JOIN stores s ON t.destination_id = s.id
      LEFT JOIN batches b ON t.batch_id = b.id
      LEFT JOIN users u ON t.created_by = u.id
    `;

    const whereClauses = [];
    const params = [];

    if (status) {
      params.push(status);
      whereClauses.push(`t.status = $${params.length}`);
    }
    if (sourceWarehouseId) {
      params.push(parseInt(sourceWarehouseId, 10));
      whereClauses.push(`t.source_warehouse_id = $${params.length}`);
    }
    if (destinationId) {
      params.push(parseInt(destinationId, 10));
      whereClauses.push(`t.destination_id = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      queryStr += ` WHERE ` + whereClauses.join(' AND ');
    }
    queryStr += ` ORDER BY t.created_at DESC`;

    const result = await query(queryStr, params);

    const transfers = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      transferNumber: r.transferNumber,
      quantity: r.quantity,
      status: r.status,
      notes: r.notes,
      carrier: r.carrier,
      vehicleNumber: r.vehicleNumber,
      dispatchedAt: r.dispatchedAt,
      receivedAt: r.receivedAt,
      createdAt: r.createdAt,
      productId: { _id: r.product_id, id: r.product_id, name: r.product_name, sku: r.sku },
      sourceWarehouseId: { _id: r.warehouse_id, id: r.warehouse_id, name: r.warehouse_name, code: r.warehouse_code },
      destinationId: { _id: r.store_id, id: r.store_id, name: r.store_name, code: r.store_code },
      batchId: r.batch_id ? { _id: r.batch_id, id: r.batch_id, batchNumber: r.batchNumber } : null,
      createdBy: r.user_id ? { _id: r.user_id, id: r.user_id, name: r.user_name } : null,
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

export const getTransferById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await query(
      `SELECT 
        t.id, t.transfer_number as "transferNumber", t.quantity, t.status, t.notes, t.carrier, t.vehicle_number as "vehicleNumber",
        t.dispatched_at as "dispatchedAt", t.received_at as "receivedAt", t.created_at as "createdAt",
        p.id as product_id, p.name as product_name, p.sku,
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        s.id as store_id, s.name as store_name, s.code as store_code,
        b.id as batch_id, b.batch_number as "batchNumber"
       FROM transfers t
       JOIN products p ON t.product_id = p.id
       JOIN warehouses w ON t.source_warehouse_id = w.id
       JOIN stores s ON t.destination_id = s.id
       LEFT JOIN batches b ON t.batch_id = b.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    const r = result.rows[0];
    const transfer = {
      _id: r.id,
      id: r.id,
      transferNumber: r.transferNumber,
      quantity: r.quantity,
      status: r.status,
      notes: r.notes,
      carrier: r.carrier,
      vehicleNumber: r.vehicleNumber,
      dispatchedAt: r.dispatchedAt,
      receivedAt: r.receivedAt,
      createdAt: r.createdAt,
      productId: { _id: r.product_id, id: r.product_id, name: r.product_name, sku: r.sku },
      sourceWarehouseId: { _id: r.warehouse_id, id: r.warehouse_id, name: r.warehouse_name, code: r.warehouse_code },
      destinationId: { _id: r.store_id, id: r.store_id, name: r.store_name, code: r.store_code },
      batchId: r.batch_id ? { _id: r.batch_id, id: r.batch_id, batchNumber: r.batchNumber } : null,
    };

    // Timeline events
    const timelineRes = await query(
      `SELECT ae.id, ae.action, ae.previous_value, ae.new_value, ae.reason, ae.timestamp,
              u.name as user_name, u.role as user_role
       FROM approval_events ae
       LEFT JOIN users u ON ae.user_id = u.id
       WHERE ae.transfer_id = $1
       ORDER BY ae.timestamp ASC`,
      [id]
    );

    const timeline = timelineRes.rows.map(ev => ({
      _id: ev.id,
      id: ev.id,
      action: ev.action,
      previousValue: ev.previous_value,
      newValue: ev.new_value,
      reason: ev.reason,
      timestamp: ev.timestamp,
      userId: { name: ev.user_name || 'System', role: ev.user_role || 'STAFF' },
    }));

    return res.status(200).json({
      success: true,
      data: {
        transfer,
        timeline,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createTransfer = async (req, res, next) => {
  try {
    const destinationId = req.body.destinationId || req.user?.storeId || 1;
    const transfer = await pgTransferService.createTransfer({
      ...req.body,
      destinationId: parseInt(destinationId, 10),
      createdBy: req.user.id,
    });
    return res.status(201).json({
      success: true,
      message: 'Transfer created successfully in PostgreSQL',
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

export const approveTransfer = async (req, res, next) => {
  try {
    const { reason, modifiedQuantity } = req.body;
    const transfer = await pgTransferService.approveTransfer(
      parseInt(req.params.id, 10),
      req.user.id,
      reason,
      modifiedQuantity
    );
    return res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transfer_number} approved and stock reserved.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectTransfer = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const transfer = await pgTransferService.rejectTransfer(
      parseInt(req.params.id, 10),
      req.user.id,
      reason
    );
    return res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transfer_number} cancelled.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

export const markPicked = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const transfer = await pgTransferService.markTransferPicked(
      parseInt(req.params.id, 10),
      req.user.id,
      notes
    );
    return res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transfer_number} marked as PICKED.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

export const markPacked = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const transfer = await pgTransferService.markTransferPacked(
      parseInt(req.params.id, 10),
      req.user.id,
      notes
    );
    return res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transfer_number} marked as PACKED.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

export const markDispatched = async (req, res, next) => {
  try {
    const { carrier, vehicleNumber, notes } = req.body;
    const transfer = await pgTransferService.markTransferDispatched(
      parseInt(req.params.id, 10),
      req.user.id,
      { carrier, vehicleNumber, notes }
    );
    return res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transfer_number} DISPATCHED from warehouse.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};

export const receiveTransfer = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const transfer = await pgTransferService.receiveTransfer(
      parseInt(req.params.id, 10),
      req.user.id,
      notes
    );
    return res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transfer_number} confirmed as RECEIVED. Store inventory updated.`,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};
