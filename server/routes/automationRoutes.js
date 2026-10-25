import express from 'express';
import {
  runExpiryAutomationScan,
  sendEmailAlert,
  sendWhatsAppAlert,
} from '../services/automationService.js';
import { query } from '../config/db.js';

const router = express.Router();

/**
 * Trigger immediate automated expiry scan (checks <14 days and <30 days)
 */
router.post('/scan-expiry', async (req, res, next) => {
  try {
    const result = await runExpiryAutomationScan();
    return res.status(200).json({
      success: true,
      message: 'Automated expiry scan completed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get automation summary statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const notifsStats = await query(`
      SELECT 
        channel,
        delivery_status as "deliveryStatus",
        COUNT(*) as count
      FROM notifications
      WHERE channel IN ('EMAIL', 'WHATSAPP', 'IN_APP')
      GROUP BY channel, delivery_status
    `);

    const expiryCounts = await query(`
      SELECT 
        COUNT(CASE WHEN expiry_date <= NOW() + INTERVAL '14 days' THEN 1 END) as "critical14Days",
        COUNT(CASE WHEN expiry_date > NOW() + INTERVAL '14 days' AND expiry_date <= NOW() + INTERVAL '30 days' THEN 1 END) as "warning30Days",
        COUNT(CASE WHEN expiry_date > NOW() + INTERVAL '30 days' THEN 1 END) as "safeBatches",
        COALESCE(SUM(quantity), 0) as "totalAvailableUnits"
      FROM batches
      WHERE quantity > 0
    `);

    return res.status(200).json({
      success: true,
      data: {
        dispatchesByChannel: notifsStats.rows,
        batchExpiryDistribution: expiryCounts.rows[0],
        daemonActive: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get recent automated dispatch events
 */
router.get('/dispatches', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const result = await query(
      `SELECT id, role, title, message, type, channel, recipient_contact as "recipientContact",
              delivery_status as "deliveryStatus", provider_response as "providerResponse",
              metadata, created_at as "createdAt"
       FROM notifications
       WHERE channel IN ('EMAIL', 'WHATSAPP')
       ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Send test alert on demand (for testing email and WhatsApp pipeline)
 */
router.post('/send-test', async (req, res, next) => {
  try {
    const { channel, recipient, message } = req.body;

    if (channel === 'EMAIL') {
      const emailResult = await sendEmailAlert({
        to: recipient,
        subject: '[Test] StockWise AI Expiry Notification',
        htmlContent: `<p><strong>StockWise AI Test Dispatch</strong>: ${message || 'System connectivity verified.'}</p>`,
      });
      return res.status(200).json({ success: true, data: emailResult });
    }

    if (channel === 'WHATSAPP') {
      const waResult = await sendWhatsAppAlert({
        phone: recipient,
        textMessage: `🚨 *StockWise Test WhatsApp Alert*: ${message || 'System connectivity verified.'}`,
      });
      return res.status(200).json({ success: true, data: waResult });
    }

    return res.status(400).json({ success: false, message: 'Invalid channel specified. Use EMAIL or WHATSAPP.' });
  } catch (error) {
    next(error);
  }
});

export default router;
