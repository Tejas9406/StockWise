import nodemailer from 'nodemailer';
import { query } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Configure Mail Transport (supports standard SMTP or simulated development mailer)
const createMailTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Fallback simulator transporter that generates previewable delivery records
  return null;
};

/**
 * Send an email notification for supply chain events
 */
export const sendEmailAlert = async ({ to, subject, htmlContent, metadata = {} }) => {
  const recipient = to || process.env.ALERT_EMAIL || 'manager@stockwise.ai';
  const transporter = createMailTransporter();

  try {
    let messageId = `sim_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    let deliveryStatus = 'SIMULATED';

    if (transporter) {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"StockWise AI Alerts" <alerts@stockwise.ai>',
        to: recipient,
        subject,
        html: htmlContent,
      });
      messageId = info.messageId;
      deliveryStatus = 'DELIVERED';
    }

    // Persist to notifications table with EMAIL channel
    await query(
      `INSERT INTO notifications (role, title, message, type, link, channel, recipient_contact, delivery_status, provider_response, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'MANAGER',
        subject,
        subject,
        'EXPIRY_ALERT',
        '/manager/alerts',
        'EMAIL',
        recipient,
        deliveryStatus,
        JSON.stringify({ messageId, sentAt: new Date().toISOString() }),
        JSON.stringify(metadata),
      ]
    );

    return { success: true, messageId, deliveryStatus, recipient };
  } catch (error) {
    console.error('[Automation Email Error]:', error.message);
    await query(
      `INSERT INTO notifications (role, title, message, type, link, channel, recipient_contact, delivery_status, provider_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      ['MANAGER', subject, error.message, 'ERROR', '/manager/alerts', 'EMAIL', recipient, 'FAILED', JSON.stringify({ error: error.message })]
    );
    return { success: false, error: error.message };
  }
};

/**
 * Send a WhatsApp notification for critical stock events
 */
export const sendWhatsAppAlert = async ({ phone, textMessage, metadata = {} }) => {
  const recipient = phone || process.env.ALERT_WHATSAPP || '+919876543210';
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  let deliveryStatus = 'SIMULATED';
  let providerResponse = { simulated: true, sentAt: new Date().toISOString() };

  try {
    if (sid && token) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', fromWhatsApp);
      params.append('To', recipient.startsWith('whatsapp:') ? recipient : `whatsapp:${recipient}`);
      params.append('Body', textMessage);

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      const data = await resp.json();
      if (resp.ok) {
        deliveryStatus = 'DELIVERED';
        providerResponse = data;
      } else {
        deliveryStatus = 'FAILED';
        providerResponse = data;
      }
    }

    // Persist to notifications table with WHATSAPP channel
    await query(
      `INSERT INTO notifications (role, title, message, type, link, channel, recipient_contact, delivery_status, provider_response, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'MANAGER',
        'WhatsApp Expiry Alert Dispatch',
        textMessage,
        'EXPIRY_ALERT',
        '/manager/alerts',
        'WHATSAPP',
        recipient,
        deliveryStatus,
        JSON.stringify(providerResponse),
        JSON.stringify(metadata),
      ]
    );

    return { success: deliveryStatus !== 'FAILED', deliveryStatus, recipient, providerResponse };
  } catch (error) {
    console.error('[Automation WhatsApp Error]:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Automated Expiry Scanner:
 * Checks for batches expiring within next 2 weeks (14 days) and next month (30 days)
 * Automatically fires multi-channel alerts (In-App, Email, and WhatsApp).
 */
export const runExpiryAutomationScan = async () => {
  const stats = {
    critical14DaysCount: 0,
    warning30DaysCount: 0,
    emailsDispatched: 0,
    whatsAppDispatched: 0,
    inAppCreated: 0,
    batchesScanned: 0,
  };

  try {
    // 1. Fetch batches expiring in next 30 days
    const batchesRes = await query(`
      SELECT 
        b.id,
        b.batch_number as "batchNumber",
        b.product_id as "productId",
        p.name as "productName",
        p.sku,
        p.category,
        b.warehouse_id as "warehouseId",
        COALESCE(w.name, s.name, 'Primary Facility') as "warehouseName",
        b.quantity as "availableQuantity",
        b.expiry_date as "expiryDate",
        ROUND(EXTRACT(EPOCH FROM (b.expiry_date - NOW())) / 86400) as "daysUntilExpiry"
      FROM batches b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN warehouses w ON b.warehouse_id = w.id
      LEFT JOIN stores s ON b.store_id = s.id
      WHERE b.quantity > 0
        AND b.expiry_date <= (NOW() + INTERVAL '30 days')
      ORDER BY b.expiry_date ASC
    `);

    stats.batchesScanned = batchesRes.rows.length;

    for (const batch of batchesRes.rows) {
      const days = parseInt(batch.daysUntilExpiry, 10);
      const isCritical = days <= 14;

      if (isCritical) {
        stats.critical14DaysCount += 1;
      } else {
        stats.warning30DaysCount += 1;
      }

      const urgencyTag = isCritical ? 'CRITICAL (Expires < 14 Days)' : 'WARNING (Expires < 30 Days)';
      const alertTitle = `[${urgencyTag}] Stock Expiring: ${batch.productName} (${batch.batchNumber})`;
      const alertMsg = `Batch ${batch.batchNumber} with ${batch.availableQuantity} units of ${batch.productName} (${batch.sku}) at ${batch.warehouseName} expires in ${days} days (${new Date(batch.expiryDate).toLocaleDateString()}). Prioritize FEFO transfer or markdown clearance.`;

      // 1. In-App Notification
      await query(
        `INSERT INTO notifications (role, warehouse_id, title, message, type, link, channel, delivery_status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'MANAGER',
          batch.warehouseId,
          alertTitle,
          alertMsg,
          isCritical ? 'CRITICAL_ALERT' : 'WARNING',
          '/manager/alerts',
          'IN_APP',
          'DELIVERED',
          JSON.stringify({ batchId: batch.id, sku: batch.sku, daysUntilExpiry: days }),
        ]
      );
      stats.inAppCreated += 1;

      // 2. Email Dispatch for Critical (14 days) and high volume 30-day batches
      if (isCritical || batch.availableQuantity > 100) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background-color: ${isCritical ? '#ef4444' : '#f59e0b'}; padding: 12px 20px; border-radius: 8px; color: #ffffff; font-weight: bold; font-size: 16px;">
              🚨 ${urgencyTag}
            </div>
            <h2 style="color: #0f172a; margin-top: 16px;">Stock Expiry Prevention Required</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">${alertMsg}</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Product:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${batch.productName} (${batch.sku})</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Batch Number:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${batch.batchNumber}</td></tr>
              <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Warehouse:</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${batch.warehouseName}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Available Quantity:</td><td style="padding: 8px; border: 1px solid #e2e8f0; color: #dc2626; font-weight: bold;">${batch.availableQuantity} units</td></tr>
              <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Expiry Horizon:</td><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>${days} Days Remaining</strong> (${new Date(batch.expiryDate).toLocaleDateString()})</td></tr>
            </table>
            <div style="margin-top: 24px; text-align: center;">
              <a href="http://localhost:5173/manager/recommendations" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Review FEFO Clearance Recommendations</a>
            </div>
            <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center;">StockWise AI Distribution Intelligence Automated Event Daemon</p>
          </div>
        `;
        await sendEmailAlert({
          subject: alertTitle,
          htmlContent: html,
          metadata: { batchId: batch.id, sku: batch.sku, daysUntilExpiry: days },
        });
        stats.emailsDispatched += 1;
      }

      // 3. WhatsApp Dispatch for Critical (14 days)
      if (isCritical) {
        const waText = `🚨 *StockWise FMCG Expiry Alert* (${days} Days Left!)\n` +
          `📦 *Product:* ${batch.productName} (${batch.sku})\n` +
          `🏷️ *Batch:* ${batch.batchNumber}\n` +
          `🏢 *Location:* ${batch.warehouseName}\n` +
          `⚠️ *Available:* ${batch.availableQuantity} units\n` +
          `📅 *Expiry Date:* ${new Date(batch.expiryDate).toLocaleDateString()}\n` +
          `💡 *Recommendation:* Immediate store dispatch via FEFO.\n` +
          `🔗 *Action:* http://localhost:5173/manager/recommendations`;

        await sendWhatsAppAlert({
          textMessage: waText,
          metadata: { batchId: batch.id, sku: batch.sku, daysUntilExpiry: days },
        });
        stats.whatsAppDispatched += 1;
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    };
  } catch (error) {
    console.error('[runExpiryAutomationScan Error]:', error.message);
    throw error;
  }
};

let daemonInterval = null;

/**
 * Start background daemon to check periodically (e.g. every 1 hour)
 */
export const startAutomationDaemon = (intervalMs = 3600000) => {
  if (daemonInterval) return;
  console.log('[Automation Daemon] Started StockWise continuous event listener');
  
  // Run once on launch
  runExpiryAutomationScan().catch(err => console.error('[Automation Initial Scan Error]:', err.message));

  daemonInterval = setInterval(() => {
    runExpiryAutomationScan().catch(err => console.error('[Automation Scheduled Scan Error]:', err.message));
  }, intervalMs);
};

export const stopAutomationDaemon = () => {
  if (daemonInterval) {
    clearInterval(daemonInterval);
    daemonInterval = null;
    console.log('[Automation Daemon] Stopped');
  }
};

export default {
  sendEmailAlert,
  sendWhatsAppAlert,
  runExpiryAutomationScan,
  startAutomationDaemon,
  stopAutomationDaemon,
};
