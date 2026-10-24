import { query } from '../config/db.js';

export const getAllInventory = async (req, res, next) => {
  try {
    const { locationType, warehouseId, storeId, productId, search } = req.query;
    let sql = `
      SELECT 
        i.id,
        i.location_type as "locationType",
        i.quantity,
        i.reserved_quantity as "reservedQuantity",
        (i.quantity - i.reserved_quantity) as "availableQuantity",
        i.updated_at as "updatedAt",
        p.id as product_id, p.name as product_name, p.sku, p.category, p.unit, p.min_safety_stock, p.reorder_point,
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        s.id as store_id, s.name as store_name, s.code as store_code
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN stores s ON i.store_id = s.id
    `;

    const where = [];
    const params = [];

    if (locationType) {
      params.push(locationType);
      where.push(`i.location_type = $${params.length}`);
    }
    if (warehouseId) {
      params.push(parseInt(warehouseId, 10));
      where.push(`i.warehouse_id = $${params.length}`);
    }
    if (storeId) {
      params.push(parseInt(storeId, 10));
      where.push(`i.store_id = $${params.length}`);
    }
    if (productId) {
      params.push(parseInt(productId, 10));
      where.push(`i.product_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY i.updated_at DESC';

    const result = await query(sql, params);

    const inventories = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      locationType: r.locationType,
      quantity: r.quantity,
      reservedQuantity: r.reservedQuantity,
      availableQuantity: Math.max(0, r.availableQuantity),
      updatedAt: r.updatedAt,
      productId: {
        _id: r.product_id,
        id: r.product_id,
        name: r.product_name,
        sku: r.sku,
        category: r.category,
        unit: r.unit,
        minSafetyStock: r.min_safety_stock,
        reorderPoint: r.reorder_point,
      },
      warehouseId: r.warehouse_id ? { _id: r.warehouse_id, id: r.warehouse_id, name: r.warehouse_name, code: r.warehouse_code } : null,
      storeId: r.store_id ? { _id: r.store_id, id: r.store_id, name: r.store_name, code: r.store_code } : null,
    }));

    return res.status(200).json({
      success: true,
      count: inventories.length,
      data: inventories,
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await query(
      `SELECT 
        i.id, i.location_type as "locationType", i.quantity, i.reserved_quantity as "reservedQuantity",
        p.id as product_id, p.name as product_name, p.sku,
        w.id as warehouse_id, w.name as warehouse_name,
        s.id as store_id, s.name as store_name
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       LEFT JOIN warehouses w ON i.warehouse_id = w.id
       LEFT JOIN stores s ON i.store_id = s.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inventory record not found' });
    }

    const r = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        _id: r.id,
        id: r.id,
        locationType: r.locationType,
        quantity: r.quantity,
        reservedQuantity: r.reservedQuantity,
        productId: { _id: r.product_id, id: r.product_id, name: r.product_name, sku: r.sku },
        warehouseId: r.warehouse_id ? { _id: r.warehouse_id, id: r.warehouse_id, name: r.warehouse_name } : null,
        storeId: r.store_id ? { _id: r.store_id, id: r.store_id, name: r.store_name } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const upsertInventory = async (req, res, next) => {
  try {
    const { productId, locationType, warehouseId, storeId, quantity, reservedQuantity = 0 } = req.body;
    const existing = await query(
      `SELECT id FROM inventory 
       WHERE product_id = $1 AND location_type = $2 
         AND (warehouse_id = $3 OR store_id = $4)`,
      [productId, locationType, warehouseId || null, storeId || null]
    );

    let row;
    if (existing.rows.length > 0) {
      const uRes = await query(
        `UPDATE inventory 
         SET quantity = $1, reserved_quantity = $2, updated_at = NOW() 
         WHERE id = $3 RETURNING *`,
        [quantity, reservedQuantity, existing.rows[0].id]
      );
      row = uRes.rows[0];
    } else {
      const iRes = await query(
        `INSERT INTO inventory (product_id, location_type, warehouse_id, store_id, quantity, reserved_quantity)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [productId, locationType, warehouseId || null, storeId || null, quantity, reservedQuantity]
      );
      row = iRes.rows[0];
    }
    return res.status(200).json({ success: true, message: 'Inventory upserted', data: row });
  } catch (error) {
    next(error);
  }
};
