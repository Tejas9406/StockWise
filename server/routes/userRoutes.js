import express from 'express';
import { query } from '../config/db.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('DISTRIBUTION_MANAGER'), async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, u.firebase_uid, u.name, u.email, u.role, u.is_active,
             w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
             s.id as store_id, s.name as store_name, s.code as store_code
      FROM users u
      LEFT JOIN warehouses w ON u.warehouse_id = w.id
      LEFT JOIN stores s ON u.store_id = s.id
      ORDER BY u.created_at DESC
    `);

    const users = result.rows.map(r => ({
      _id: r.id,
      id: r.id,
      firebaseUid: r.firebase_uid,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: r.is_active,
      warehouseId: r.warehouse_id ? { _id: r.warehouse_id, id: r.warehouse_id, name: r.warehouse_name, code: r.warehouse_code } : null,
      storeId: r.store_id ? { _id: r.store_id, id: r.store_id, name: r.store_name, code: r.store_code } : null,
    }));

    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
});

export default router;
