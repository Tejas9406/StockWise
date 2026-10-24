import { query } from '../config/db.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, role, warehouseId, storeId } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, and role are required' });
    }
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    const result = await query(
      `INSERT INTO users (firebase_uid, name, email, role, warehouse_id, store_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [`fb-${Date.now()}`, name, email.toLowerCase(), role, warehouseId || null, storeId || null]
    );
    return res.status(201).json({ success: true, message: 'Registered successfully', data: { user: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

/**
 * Login / Session verification
 */
export const login = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const userRes = await query(
      `SELECT u.id, u.firebase_uid, u.name, u.email, u.role, u.warehouse_id, u.store_id, u.is_active,
              w.name as warehouse_name, w.code as warehouse_code,
              s.name as store_name, s.code as store_code
       FROM users u
       LEFT JOIN warehouses w ON u.warehouse_id = w.id
       LEFT JOIN stores s ON u.store_id = s.id
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No registered user found for this email address.',
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.',
      });
    }

    // Format user object matching frontend expectations
    const formattedUser = {
      _id: user.id,
      id: user.id,
      firebaseUid: user.firebase_uid,
      name: user.name,
      email: user.email,
      role: user.role,
      warehouseId: user.warehouse_id ? { _id: user.warehouse_id, id: user.warehouse_id, name: user.warehouse_name, code: user.warehouse_code } : null,
      storeId: user.store_id ? { _id: user.store_id, id: user.store_id, name: user.store_name, code: user.store_code } : null,
    };

    // Return session token (in demo mode, use demo token; in production, use client Firebase token)
    const token = `demo-token-${user.role.toLowerCase()}-${user.id}`;

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: formattedUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details from PostgreSQL
 */
export const getMe = async (req, res, next) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.firebase_uid, u.name, u.email, u.role, u.warehouse_id, u.store_id, u.is_active,
              w.name as warehouse_name, w.code as warehouse_code,
              s.name as store_name, s.code as store_code
       FROM users u
       LEFT JOIN warehouses w ON u.warehouse_id = w.id
       LEFT JOIN stores s ON u.store_id = s.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRes.rows[0];
    const formattedUser = {
      _id: user.id,
      id: user.id,
      firebaseUid: user.firebase_uid,
      name: user.name,
      email: user.email,
      role: user.role,
      warehouseId: user.warehouse_id ? { _id: user.warehouse_id, id: user.warehouse_id, name: user.warehouse_name, code: user.warehouse_code } : null,
      storeId: user.store_id ? { _id: user.store_id, id: user.store_id, name: user.store_name, code: user.store_code } : null,
    };

    return res.status(200).json({
      success: true,
      data: {
        user: formattedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
