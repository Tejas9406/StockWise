import nodemailer from 'nodemailer';
import { query } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Default multi-stakeholder distribution lists
export const DEFAULT_EMAIL_RECIPIENTS = [
  'tejaskarpe06@gmail.com',
  'purvamarve0508@gmail.com',
  'shreerajgudade798@gmail.com',
  'anuradhakadam371@gmail.com',
];

export const DEFAULT_WHATSAPP_PHONE = '+917558417704';

// Configure Mail Transport (supports Gmail service or standard SMTP or simulation)
const createMailTransporter = () => {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (user && pass) {
    // If Gmail account, use nodemailer built-in service
    if (user.includes('@gmail.com') || process.env.GMAIL_USER) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }
  return null;
};

/**
 * Generate a WhatsApp Web 1-Click Click-to-Chat Deep Link
 */
export const getWhatsAppDeepLink = (phone = DEFAULT_WHATSAPP_PHONE, text = '') => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

/**
 * Send an email notification for supply chain events
 */
export const sendEmailAlert = async ({ to, subject, htmlContent, metadata = {} }) => {
  const recipients = to || process.env.ALERT_EMAIL || DEFAULT_EMAIL_RECIPIENTS.join(', ');
  const transporter = createMailTransporter();

  try {
    let messageId = `sim_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    let deliveryStatus = 'SIMULATED';
    let providerDetails = { simulated: true, sentAt: new Date().toISOString() };

    if (transporter) {
      const info = await transporter.sendMail({
        from: process.env.GMAIL_USER || process.env.SMTP_FROM || '"StockWise AI FMCG Alerts" <alerts@stockwise.ai>',
        to: recipients,
        subject,
        html: htmlContent,
      });
      messageId = info.messageId;
      deliveryStatus = 'DELIVERED';
      providerDetails = { messageId: info.messageId, response: info.response, sentAt: new Date().toISOString() };
      console.log(`[Automation Email Delivered] Sent live to: ${recipients}`);
    } else {
      console.log(`[Automation Email Simulated] Configured recipients: ${recipients} (Add GMAIL_APP_PASSWORD in server/.env for live dispatch)`);
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
        recipients,
        deliveryStatus,
        JSON.stringify(providerDetails),
        JSON.stringify(metadata),
      ]
    );

    return { success: true, messageId, deliveryStatus, recipient: recipients, isLive: Boolean(transporter) };
  } catch (error) {
    console.error('[Automation Email Error]:', error.message);
    await query(
      `INSERT INTO notifications (role, title, message, type, link, channel, recipient_contact, delivery_status, provider_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      ['MANAGER', subject, error.message, 'ERROR', '/manager/alerts', 'EMAIL', recipients, 'FAILED', JSON.stringify({ error: error.message })]
    );
    return { success: false, error: error.message };
  }
};

/**
 * Send a WhatsApp / Telegram notification for critical stock events
 */
export const sendWhatsAppAlert = async ({ phone, textMessage, metadata = {} }) => {
  const recipient = phone || process.env.ALERT_WHATSAPP || DEFAULT_WHATSAPP_PHONE;
  const cleanPhone = recipient.replace(/[^0-9]/g, '');
  const deepLink = getWhatsAppDeepLink(recipient, textMessage);

  let deliveryStatus = 'SIMULATED';
  let providerResponse = { simulated: true, sentAt: new Date().toISOString(), deepLink };

  try {
    // 1. Try CallMeBot Free WhatsApp API (no paid accounts required)
    if (process.env.CALLMEBOT_API_KEY) {
      const botUrl = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(textMessage)}&apikey=${process.env.CALLMEBOT_API_KEY}`;
      const res = await fetch(botUrl);
      if (res.ok) {
        deliveryStatus = 'DELIVERED';
        providerResponse = { provider: 'CallMeBot', status: 'Delivered to WhatsApp', sentAt: new Date().toISOString(), deepLink };
      }
    }

    // 2. Try Telegram Bot API if configured (Free direct instant phone messaging)
    if (deliveryStatus !== 'DELIVERED' && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const tgUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const res = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `🚨 *StockWise FMCG Notification*\n\n${textMessage}\n\nTarget Phone: ${recipient}`,
          parse_mode: 'Markdown',
        }),
      });
      if (res.ok) {
        deliveryStatus = 'DELIVERED';
        providerResponse = { provider: 'Telegram', status: 'Delivered', sentAt: new Date().toISOString(), deepLink };
      }
    }

    // 3. Try Twilio WhatsApp if credentials exist
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    if (deliveryStatus !== 'DELIVERED' && sid && token) {
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
        providerResponse = { provider: 'Twilio', data, deepLink };
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
        JSON.stringify({ ...metadata, deepLink }),
      ]
    );

    return {
      success: true,
      deliveryStatus,
      recipient,
      deepLink,
      providerResponse,
      isLive: deliveryStatus === 'DELIVERED',
    };
  } catch (error) {
    console.error('[Automation WhatsApp Error]:', error.message);
    return { success: false, error: error.message, deepLink };
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
