import { query } from '../config/db.js';

export const getAllProducts = async (req, res, next) => {
  try {
    const { search, category, isActive } = req.query;
    let sql = 'SELECT * FROM products';
    const where = [];
    const params = [];

    if (isActive !== undefined) {
      params.push(isActive === 'true');
      where.push(`is_active = $${params.length}`);
    }
    if (category) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);
    const products = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      name: r.name,
      sku: r.sku,
      category: r.category,
      unit: r.unit,
      minSafetyStock: r.min_safety_stock,
      reorderPoint: r.reorder_point,
      shelfLifeDays: r.shelf_life_days,
      leadTimeDays: r.lead_time_days,
      costPrice: r.cost_price,
      sellingPrice: r.selling_price,
      isActive: r.is_active,
    }));

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM products WHERE id = $1', [parseInt(req.params.id, 10)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const r = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        _id: r.id,
        id: r.id,
        name: r.name,
        sku: r.sku,
        category: r.category,
        unit: r.unit,
        minSafetyStock: r.min_safety_stock,
        reorderPoint: r.reorder_point,
        shelfLifeDays: r.shelf_life_days,
        leadTimeDays: r.lead_time_days,
        costPrice: r.cost_price,
        sellingPrice: r.selling_price,
        isActive: r.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { name, sku, category, unit, minSafetyStock, reorderPoint, shelfLifeDays, leadTimeDays, costPrice, sellingPrice } = req.body;
    const result = await query(
      `INSERT INTO products 
        (name, sku, category, unit, min_safety_stock, reorder_point, shelf_life_days, lead_time_days, cost_price, selling_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, sku, category, unit || 'units', minSafetyStock || 20, reorderPoint || 50, shelfLifeDays || 90, leadTimeDays || 2, costPrice || 0, sellingPrice || 0]
    );
    return res.status(201).json({ success: true, message: 'Product created', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, sku, category, unit, minSafetyStock, reorderPoint, shelfLifeDays, leadTimeDays, costPrice, sellingPrice, isActive } = req.body;
    const result = await query(
      `UPDATE products 
       SET name = COALESCE($1, name), sku = COALESCE($2, sku), category = COALESCE($3, category),
           unit = COALESCE($4, unit), min_safety_stock = COALESCE($5, min_safety_stock),
           reorder_point = COALESCE($6, reorder_point), shelf_life_days = COALESCE($7, shelf_life_days),
           lead_time_days = COALESCE($8, lead_time_days), cost_price = COALESCE($9, cost_price),
           selling_price = COALESCE($10, selling_price), is_active = COALESCE($11, is_active), updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [name, sku, category, unit, minSafetyStock, reorderPoint, shelfLifeDays, leadTimeDays, costPrice, sellingPrice, isActive, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.status(200).json({ success: true, message: 'Product updated', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
