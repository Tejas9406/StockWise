import { query } from '../config/db.js';

export const getAllBatches = async (req, res, next) => {
  try {
    const { productId, warehouseId, storeId, expiringWithinDays } = req.query;
    let sql = `
      SELECT 
        b.id,
        b.batch_number as "batchNumber",
        b.quantity,
        b.manufacturing_date as "manufacturingDate",
        b.expiry_date as "expiryDate",
        (b.expiry_date::date - CURRENT_DATE) as "daysUntilExpiry",
        p.id as product_id, p.name as product_name, p.sku,
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        s.id as store_id, s.name as store_name, s.code as store_code
      FROM batches b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN warehouses w ON b.warehouse_id = w.id
      LEFT JOIN stores s ON b.store_id = s.id
    `;

    const where = [];
    const params = [];

    if (productId) {
      params.push(parseInt(productId, 10));
      where.push(`b.product_id = $${params.length}`);
    }
    if (warehouseId) {
      params.push(parseInt(warehouseId, 10));
      where.push(`b.warehouse_id = $${params.length}`);
    }
    if (storeId) {
      params.push(parseInt(storeId, 10));
      where.push(`b.store_id = $${params.length}`);
    }
    if (expiringWithinDays) {
      params.push(parseInt(expiringWithinDays, 10));
      where.push(`(b.expiry_date::date - CURRENT_DATE) <= $${params.length}`);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY b.expiry_date ASC';

    const result = await query(sql, params);
    const batches = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      batchNumber: r.batchNumber,
      quantity: r.quantity,
      manufacturingDate: r.manufacturingDate,
      expiryDate: r.expiryDate,
      daysUntilExpiry: r.daysUntilExpiry,
      productId: { _id: r.product_id, id: r.product_id, name: r.product_name, sku: r.sku },
      warehouseId: r.warehouse_id ? { _id: r.warehouse_id, id: r.warehouse_id, name: r.warehouse_name, code: r.warehouse_code } : null,
      storeId: r.store_id ? { _id: r.store_id, id: r.store_id, name: r.store_name, code: r.store_code } : null,
    }));

    return res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

export const createBatch = async (req, res, next) => {
  try {
    const { productId, warehouseId, storeId, batchNumber, quantity, manufacturingDate, expiryDate } = req.body;
    const result = await query(
      `INSERT INTO batches (product_id, warehouse_id, store_id, batch_number, quantity, manufacturing_date, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [productId, warehouseId || null, storeId || null, batchNumber, quantity, manufacturingDate || new Date(), expiryDate]
    );
    return res.status(201).json({ success: true, message: 'Batch created', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateBatch = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { quantity, expiryDate } = req.body;
    const result = await query(
      `UPDATE batches 
       SET quantity = COALESCE($1, quantity), expiry_date = COALESCE($2, expiry_date), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [quantity, expiryDate, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Batch not found' });
    return res.status(200).json({ success: true, message: 'Batch updated', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
