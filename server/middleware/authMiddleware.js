import { verifyFirebaseToken } from '../config/firebaseAdmin.js';
import { query } from '../config/db.js';

/**
 * Authenticate incoming request via Firebase ID Token & PostgreSQL User Lookup
 */
export const authenticate = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No Bearer token provided in request headers',
    });
  }

  try {
    // 1. Verify token with Firebase Admin
    const decoded = await verifyFirebaseToken(token);
    const firebaseUid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();

    // 2. Look up authenticated user in PostgreSQL operational database
    const userRes = await query(
      `SELECT id, firebase_uid, name, email, role, warehouse_id, store_id, is_active 
       FROM users 
       WHERE firebase_uid = $1 OR LOWER(email) = $2
       LIMIT 1`,
      [firebaseUid, email]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User authentication verified in Firebase, but no active record found in PostgreSQL database.',
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your user account has been deactivated. Please contact your administrator.',
      });
    }

    // Attach verified user to request
    req.user = {
      _id: user.id, // For backward compatibility with controllers expecting req.user._id
      id: user.id,
      firebaseUid: user.firebase_uid,
      name: user.name,
      email: user.email,
      role: user.role,
      warehouseId: user.warehouse_id,
      storeId: user.store_id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: Invalid or expired Firebase ID token.',
      error: error.message,
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies authenticated user has one of the allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Role '${req.user?.role || 'NONE'}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

export default { authenticate, authorize };
