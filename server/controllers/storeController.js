import { query } from '../config/db.js';

export const getAllStores = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM stores WHERE is_active = true ORDER BY name ASC');
    const stores = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      name: r.name,
      code: r.code,
      location: r.location,
      targetInventoryLevel: r.target_inventory_level,
      reorderPoint: r.reorder_point,
      contactPerson: r.contact_person,
      isActive: r.is_active,
    }));
    return res.status(200).json({
      success: true,
      count: stores.length,
      data: stores,
    });
  } catch (error) {
    next(error);
  }
};

export const getStoreById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM stores WHERE id = $1', [parseInt(req.params.id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    const r = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        _id: r.id,
        id: r.id,
        name: r.name,
        code: r.code,
        location: r.location,
        targetInventoryLevel: r.target_inventory_level,
        reorderPoint: r.reorder_point,
        contactPerson: r.contact_person,
        isActive: r.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createStore = async (req, res, next) => {
  try {
    const { name, code, location, targetInventoryLevel, reorderPoint, contactPerson } = req.body;
    const result = await query(
      `INSERT INTO stores (name, code, location, target_inventory_level, reorder_point, contact_person)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, code, location, targetInventoryLevel || 200, reorderPoint || 50, contactPerson || '']
    );
    return res.status(201).json({ success: true, message: 'Store created', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateStore = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, code, location, targetInventoryLevel, reorderPoint, contactPerson, isActive } = req.body;
    const result = await query(
      `UPDATE stores 
       SET name = COALESCE($1, name), code = COALESCE($2, code), location = COALESCE($3, location),
           target_inventory_level = COALESCE($4, target_inventory_level), reorder_point = COALESCE($5, reorder_point),
           contact_person = COALESCE($6, contact_person), is_active = COALESCE($7, is_active), updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name, code, location, targetInventoryLevel, reorderPoint, contactPerson, isActive, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Store not found' });
    return res.status(200).json({ success: true, message: 'Store updated', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
