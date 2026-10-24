import { query, runTransaction } from '../config/db.js';

export const getAllSales = async (req, res, next) => {
  try {
    const { storeId, productId, startDate, endDate } = req.query;
    let sql = `
      SELECT 
        s.id,
        s.date,
        s.quantity,
        s.revenue,
        p.id as product_id, p.name as product_name, p.sku, p.category, p.selling_price as "sellingPrice",
        st.id as store_id, st.name as store_name, st.code as store_code
      FROM sales_records s
      JOIN products p ON s.product_id = p.id
      JOIN stores st ON s.store_id = st.id
    `;

    const where = [];
    const params = [];

    if (storeId) {
      params.push(parseInt(storeId, 10));
      where.push(`s.store_id = $${params.length}`);
    }
    if (productId) {
      params.push(parseInt(productId, 10));
      where.push(`s.product_id = $${params.length}`);
    }
    if (startDate) {
      params.push(startDate);
      where.push(`s.date >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      where.push(`s.date <= $${params.length}`);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY s.date DESC LIMIT 100';

    const result = await query(sql, params);
    const sales = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      date: r.date,
      quantity: r.quantity,
      revenue: r.revenue,
      productId: { _id: r.product_id, name: r.product_name, sku: r.sku, category: r.category, sellingPrice: r.sellingPrice },
      storeId: { _id: r.store_id, name: r.store_name, code: r.store_code },
    }));

    return res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    next(error);
  }
};

export const recordSale = async (req, res, next) => {
  try {
    const { storeId, productId, quantity, date = new Date() } = req.body;
    const targetStoreId = storeId || req.user?.storeId?.id || req.user?.storeId?._id || req.user?.storeId || req.user?.store_id || 1;

    if (!targetStoreId || !productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid storeId, productId, and positive quantity required.' });
    }

    const sale = await runTransaction(async (client) => {
      // 1. Get product price
      const pRes = await client.query('SELECT selling_price FROM products WHERE id = $1', [productId]);
      const price = parseFloat(pRes.rows[0]?.selling_price || 0);
      const revenue = price * Number(quantity);

      // 2. Insert sales record
      const sRes = await client.query(
        `INSERT INTO sales_records (product_id, store_id, date, quantity, revenue)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [productId, targetStoreId, date, quantity, revenue]
      );

      // 3. Deduct from store inventory
      await client.query(
        `UPDATE inventory 
         SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
         WHERE product_id = $2 AND store_id = $3 AND location_type = 'STORE'`,
        [quantity, productId, targetStoreId]
      );

      return sRes.rows[0];
    });

    return res.status(201).json({
      success: true,
      message: `Sale of ${quantity} units recorded and inventory deducted in PostgreSQL.`,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesTrends = async (req, res, next) => {
  try {
    const { storeId, productId } = req.query;
    let sql = `
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as _id,
        SUM(quantity) as "totalQuantity",
        SUM(revenue) as "totalRevenue",
        COUNT(*) as count
      FROM sales_records
    `;
    const where = [];
    const params = [];

    if (storeId) {
      params.push(parseInt(storeId, 10));
      where.push(`store_id = $${params.length}`);
    }
    if (productId) {
      params.push(parseInt(productId, 10));
      where.push(`product_id = $${params.length}`);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ` GROUP BY TO_CHAR(date, 'YYYY-MM-DD') ORDER BY _id ASC`;

    const result = await query(sql, params);
    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};
