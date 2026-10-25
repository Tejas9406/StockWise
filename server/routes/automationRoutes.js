import express from 'express';
import {
  runExpiryAutomationScan,
  sendEmailAlert,
  sendWhatsAppAlert,
} from '../services/automationService.js';
import {
  getTelegramStatus,
  sendTelegramMessage,
  broadcastTelegramAlert,
  processTelegramUpdates,
} from '../services/telegramService.js';
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

    if (channel === 'TELEGRAM') {
      const text = `🧪 *StockWise AI Test Dispatch*\n\n${message || 'Real-time alert delivery verified via Telegram Bot API.'}\n\n🕒 _${new Date().toLocaleString()}_`;
      if (recipient) {
        const tgRes = await sendTelegramMessage(recipient, text);
        return res.status(200).json({ success: tgRes.success, data: tgRes });
      } else {
        const broadcastRes = await broadcastTelegramAlert({
          title: 'System Test Alert',
          message: message || 'System connectivity verified.',
          severity: 'INFO',
        });
        return res.status(200).json({ success: broadcastRes.success, data: broadcastRes });
      }
    }

    return res.status(400).json({ success: false, message: 'Invalid channel specified. Use EMAIL, WHATSAPP, or TELEGRAM.' });
  } catch (error) {
    next(error);
  }
});

/**
 * Get Telegram bot integration status
 */
router.get('/telegram/status', async (req, res, next) => {
  try {
    const status = await getTelegramStatus();
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Send a dedicated test message via Telegram
 */
router.post('/telegram/test', async (req, res, next) => {
  try {
    const { chatId, message } = req.body;
    const testText = `🧪 *StockWise AI On-Demand Test*\n\n${message || 'Operational notification verified from StockWise dashboard.'}\n\n📡 Free Telegram Bot API\n🕒 ${new Date().toLocaleString()}`;

    if (chatId) {
      const tgRes = await sendTelegramMessage(chatId, testText);
      if (!tgRes.success) {
        return res.status(400).json({
          success: false,
          error: tgRes.error,
          message: 'Failed to deliver message via Telegram',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Telegram test message confirmed delivered',
        data: tgRes,
      });
    }

    const broadcastRes = await broadcastTelegramAlert({
      title: 'Dashboard Test Alert',
      message: message || 'Manual test triggered from dashboard.',
      severity: 'INFO',
    });

    return res.status(200).json({
      success: broadcastRes.success,
      message: broadcastRes.deliveredCount > 0 ? `Delivered to ${broadcastRes.deliveredCount} subscriber(s)` : 'No active subscribers found',
      data: broadcastRes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Webhook endpoint for production deployment
 */
router.post('/telegram/webhook', async (req, res, next) => {
  try {
    if (req.body && req.body.update_id) {
      await processTelegramUpdates([req.body]);
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook Error]:', error.message);
    return res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
});

export default router;
