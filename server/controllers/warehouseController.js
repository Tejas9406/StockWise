import { query } from '../config/db.js';

export const getAllWarehouses = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM warehouses WHERE is_active = true ORDER BY name ASC');
    const warehouses = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      name: r.name,
      code: r.code,
      location: r.location,
      capacity: r.capacity,
      contactPerson: r.contact_person,
      isActive: r.is_active,
    }));
    return res.status(200).json({
      success: true,
      count: warehouses.length,
      data: warehouses,
    });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM warehouses WHERE id = $1', [parseInt(req.params.id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
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
        capacity: r.capacity,
        contactPerson: r.contact_person,
        isActive: r.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createWarehouse = async (req, res, next) => {
  try {
    const { name, code, location, capacity, contactPerson } = req.body;
    const result = await query(
      `INSERT INTO warehouses (name, code, location, capacity, contact_person)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, code, location, capacity || 10000, contactPerson || '']
    );
    return res.status(201).json({ success: true, message: 'Warehouse created', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, code, location, capacity, contactPerson, isActive } = req.body;
    const result = await query(
      `UPDATE warehouses 
       SET name = COALESCE($1, name), code = COALESCE($2, code), location = COALESCE($3, location),
           capacity = COALESCE($4, capacity), contact_person = COALESCE($5, contact_person),
           is_active = COALESCE($6, is_active), updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, code, location, capacity, contactPerson, isActive, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    return res.status(200).json({ success: true, message: 'Warehouse updated', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
