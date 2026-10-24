import { query } from '../config/db.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = user?.id || null;
    const userRole = user?.role || null;
    const whId = user?.warehouseId ? (user.warehouseId.id || user.warehouseId._id || user.warehouseId) : null;
    const stId = user?.storeId ? (user.storeId.id || user.storeId._id || user.storeId) : null;

    const notifsRes = await query(
      `SELECT id, role, user_id as "recipientUserId", warehouse_id as "warehouseId", store_id as "storeId",
              title, message, type, link, is_read as "isRead", created_at as "createdAt"
       FROM notifications
       WHERE (user_id IS NOT NULL AND user_id = $1)
          OR (role IS NOT NULL AND role = $2)
          OR role = 'ALL'
          OR (warehouse_id IS NOT NULL AND warehouse_id = $3)
          OR (store_id IS NOT NULL AND store_id = $4)
       ORDER BY created_at DESC LIMIT 30`,
      [userId, userRole, whId, stId]
    );

    const notifications = notifsRes.rows.map(r => ({
      _id: r.id,
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      link: r.link,
      isRead: r.isRead,
      createdAt: r.createdAt,
    }));

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return res.status(200).json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const result = await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [notifId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const user = req.user;
    await query(
      'UPDATE notifications SET is_read = true WHERE role = $1 OR user_id = $2',
      [user.role, user.id]
    );
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};
