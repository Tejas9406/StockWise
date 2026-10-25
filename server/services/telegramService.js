import { query } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

let isPolling = false;
let pollingAbortController = null;
let lastUpdateId = 0;
let botInfo = null;

// Mask token for safe diagnostic logging
const getMaskedToken = (token) => {
  if (!token) return 'NONE';
  if (token.length < 10) return '***';
  return `${token.substring(0, 5)}...${token.substring(token.length - 4)}`;
};

/**
 * Initialize telegram_subscribers table in PostgreSQL
 */
export const initTelegramTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS telegram_subscribers (
        chat_id BIGINT PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'ALL',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // If TELEGRAM_CHAT_ID is defined in .env, seed it as a default subscriber
    if (process.env.TELEGRAM_CHAT_ID) {
      const defaultId = parseInt(process.env.TELEGRAM_CHAT_ID, 10);
      if (!isNaN(defaultId)) {
        await query(`
          INSERT INTO telegram_subscribers (chat_id, first_name, role)
          VALUES ($1, 'Primary Manager', 'DISTRIBUTION_MANAGER')
          ON CONFLICT (chat_id) DO NOTHING
        `, [defaultId]);
      }
    }
  } catch (err) {
    console.warn('[Telegram Service] Failed to initialize subscribers table:', err.message);
  }
};

/**
 * Send a message using Telegram Bot API
 */
export const sendTelegramMessage = async (chatId, text, options = {}) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || 'Markdown',
        disable_web_page_preview: options.disablePreview !== false,
      }),
    });

    const data = await res.json();
    if (data.ok && data.result) {
      return {
        success: true,
        messageId: data.result.message_id,
        chatId,
        date: data.result.date,
      };
    } else {
      return {
        success: false,
        error: data.description || 'Telegram API returned an error',
        errorCode: data.error_code,
      };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Broadcast an automated alert to all active Telegram subscribers
 */
export const broadcastTelegramAlert = async ({ title, message, severity = 'INFO', link = null }) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured', count: 0 };
  }

  try {
    // Fetch active subscribers
    const subRes = await query(`
      SELECT chat_id as "chatId", first_name as "firstName" 
      FROM telegram_subscribers 
      WHERE is_active = true
    `);

    const subscribers = subRes.rows;
    if (subscribers.length === 0 && process.env.TELEGRAM_CHAT_ID) {
      subscribers.push({ chatId: process.env.TELEGRAM_CHAT_ID });
    }

    if (subscribers.length === 0) {
      return { success: true, count: 0, message: 'No registered Telegram subscribers found' };
    }

    const emoji = severity === 'CRITICAL' ? '🚨' : severity === 'WARNING' ? '⚠️' : 'ℹ️';
    const formattedText = `${emoji} *StockWise Alert: ${title}*\n\n` +
      `${message}\n\n` +
      (link ? `🔗 *Action:* ${link}\n` : '') +
      `🕒 _${new Date().toLocaleString()}_`;

    let deliveredCount = 0;
    const results = [];

    for (const sub of subscribers) {
      const res = await sendTelegramMessage(sub.chatId, formattedText);
      results.push({ chatId: sub.chatId, ...res });
      if (res.success) deliveredCount++;
    }

    return {
      success: deliveredCount > 0,
      totalSubscribers: subscribers.length,
      deliveredCount,
      results,
    };
  } catch (err) {
    console.error('[Telegram Broadcast Error]:', err.message);
    return { success: false, error: err.message, count: 0 };
  }
};

/**
 * Command Handlers for Incoming Telegram Messages
 */
const handleTelegramCommand = async (chatId, user, commandText) => {
  const text = (commandText || '').trim();
  const lowerText = text.toLowerCase();
  const firstName = user?.first_name || 'StockWise Operator';
  const username = user?.username || null;

  // Always update subscriber interaction
  try {
    await query(`
      INSERT INTO telegram_subscribers (chat_id, username, first_name, last_interaction, is_active)
      VALUES ($1, $2, $3, NOW(), true)
      ON CONFLICT (chat_id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_interaction = NOW(),
        is_active = true
    `, [chatId, username, firstName]);
  } catch (dbErr) {
    console.warn('[Telegram Subscriber Upsert Warn]:', dbErr.message);
  }

  // 1. /start
  if (lowerText.startsWith('/start')) {
    const welcomeMsg = `👋 *Welcome to StockWise AI, ${firstName}!*

I am your official FMCG Distribution Intelligence Bot connected live to your operations backend.

🔔 *What I deliver automatically:*
• Real-time stockout & low safety stock alerts
• FEFO batch expiry warnings (14-day & 30-day thresholds)
• Cross-facility replenishment recommendation notices
• Dispatch, transit & delivery milestone confirmations

⚡ *Quick Commands:*
/status — Check live PostgreSQL backend & facility metrics
/alerts — View latest active inventory & expiry alerts
/test — Send an instant verification test alert
/help — View full command documentation

_Your chat ID has been linked to the StockWise notification stream._`;

    await sendTelegramMessage(chatId, welcomeMsg);
    return;
  }

  // 2. /help
  if (lowerText.startsWith('/help')) {
    const helpMsg = `🤖 *StockWise AI Bot Manual*

Available commands:
• */start* — Initialize connection and register for real-time inventory alerts
• */alerts* — Fetch latest 5 active inventory and expiry risk alerts from the database
• */status* — Check live PostgreSQL backend, facilities, and system metrics
• */test* — Send an immediate notification delivery test to this chat
• */help* — Show this command reference

💡 *Note:* Alerts are also automatically pushed to this chat whenever critical inventory events or batch expiry horizons occur in the warehouse or store network.`;

    await sendTelegramMessage(chatId, helpMsg);
    return;
  }

  // 3. /status
  if (lowerText.startsWith('/status')) {
    try {
      // Gather live statistics from PostgreSQL
      const [whRes, storeRes, prodRes, notifRes, expRes] = await Promise.all([
        query('SELECT COUNT(*) as count FROM warehouses'),
        query('SELECT COUNT(*) as count FROM stores'),
        query('SELECT COUNT(*) as count FROM products'),
        query('SELECT COUNT(*) as count FROM notifications WHERE is_read = false'),
        query(`
          SELECT COUNT(*) as count 
          FROM batches 
          WHERE expiry_date <= (NOW() + INTERVAL '30 days') AND quantity > 0
        `),
      ]);

      const whCount = whRes.rows[0]?.count || 0;
      const storeCount = storeRes.rows[0]?.count || 0;
      const prodCount = prodRes.rows[0]?.count || 0;
      const unreadAlerts = notifRes.rows[0]?.count || 0;
      const expiringBatches = expRes.rows[0]?.count || 0;

      const statusMsg = `🟢 *StockWise AI Backend Status*

• *API Gateway:* Online (Port 5000)
• *Database:* PostgreSQL (Neon Cloud Operational DB)
• *Distribution Centers:* ${whCount} Facilities
• *Retail Stores:* ${storeCount} Outlets
• *Tracked FMCG SKUs:* ${prodCount} Products
• *Unresolved Alerts:* ${unreadAlerts} Pending
• *Near-Expiry Batches (<30d):* ${expiringBatches} Batches
• *Telegram Integration:* Free Official Bot API (Long Polling Active)
• *Server Time:* ${new Date().toUTCString()}

✅ _All operational pipelines and automated event daemons are running normally._`;

      await sendTelegramMessage(chatId, statusMsg);
    } catch (err) {
      await sendTelegramMessage(chatId, `⚠️ *Status Check Error*: Could not retrieve metrics (${err.message})`);
    }
    return;
  }

  // 4. /alerts
  if (lowerText.startsWith('/alerts')) {
    try {
      const alertsRes = await query(`
        SELECT id, title, message, type, channel, created_at as "createdAt"
        FROM notifications
        ORDER BY created_at DESC
        LIMIT 5
      `);

      if (alertsRes.rows.length === 0) {
        await sendTelegramMessage(chatId, `✅ *No Active Alerts*\n\nAll facility inventory balances are optimal. No stockouts or critical expiry risks detected.`);
        return;
      }

      let alertsMsg = `📋 *Recent StockWise AI Alerts (Latest 5)*\n\n`;
      alertsRes.rows.forEach((r, idx) => {
        const icon = (r.type || '').includes('CRITICAL') ? '🚨' : (r.type || '').includes('WARNING') ? '⚠️' : 'ℹ️';
        const dateStr = new Date(r.createdAt).toLocaleDateString();
        alertsMsg += `${icon} *${idx + 1}. ${r.title}*\n${r.message}\n_Channel: ${r.channel || 'IN_APP'} | ${dateStr}_\n\n`;
      });

      alertsMsg += `🔗 _View complete command center at http://localhost:5173/manager/alerts_`;
      await sendTelegramMessage(chatId, alertsMsg);
    } catch (err) {
      await sendTelegramMessage(chatId, `⚠️ *Alerts Error*: Could not query database alerts (${err.message})`);
    }
    return;
  }

  // 5. /test
  if (lowerText.startsWith('/test')) {
    const testMsg = `🧪 *StockWise AI Notification Test*

✅ *Success!* Your Telegram client is actively receiving real-time alerts.

• *Recipient:* ${firstName} (@${username || 'N/A'})
• *Chat ID:* \`${chatId}\`
• *Delivery Channel:* Telegram Bot API
• *Confirmed At:* ${new Date().toLocaleString()}

You will receive critical stockout notifications, transfer approvals, and batch expiry alerts here automatically.`;

    await sendTelegramMessage(chatId, testMsg);
    return;
  }

  // Fallback for unrecognized messages
  const fallbackMsg = `🤖 I received your message: "${text}"

Use the following commands to interact with StockWise AI:
/start — Register for automated alerts
/alerts — View latest inventory alerts
/status — Check system & database health
/test — Run notification delivery test
/help — View command reference`;

  await sendTelegramMessage(chatId, fallbackMsg);
};

/**
 * Process updates array returned by Telegram API (or incoming webhook)
 */
export const processTelegramUpdates = async (updates = []) => {
  for (const update of updates) {
    if (update.update_id >= lastUpdateId) {
      lastUpdateId = update.update_id + 1;
    }

    const message = update.message || update.edited_message;
    if (!message || !message.text) continue;

    const chatId = message.chat.id;
    const user = message.from;
    const text = message.text;

    try {
      await handleTelegramCommand(chatId, user, text);
    } catch (err) {
      console.error(`[Telegram Handler Error for chat ${chatId}]:`, err.message);
    }
  }
};

/**
 * Long Polling Worker
 */
const pollTelegramLoop = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  while (isPolling) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId}&timeout=20`;
      const res = await fetch(url, {
        signal: pollingAbortController?.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // If conflict (another poller running), back off
        if (res.status === 409) {
          console.warn('[Telegram Polling] 409 Conflict: Another instance is polling. Waiting 10s...');
          await new Promise((r) => setTimeout(r, 10000));
        } else {
          console.warn(`[Telegram Polling Error ${res.status}]:`, errorData.description || res.statusText);
          await new Promise((r) => setTimeout(r, 5000));
        }
        continue;
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        await processTelegramUpdates(data.result);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        break; // Clean shutdown
      }
      // Network hiccup - sleep 3s and retry
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};

/**
 * Start Telegram Polling Singleton
 */
export const startTelegramPolling = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.info('[Telegram Service] TELEGRAM_BOT_TOKEN not configured. Telegram bot disabled.');
    return;
  }

  if (isPolling) {
    console.info('[Telegram Service] Poller is already active.');
    return;
  }

  try {
    // 1. Verify Bot Token and fetch info
    const checkRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const checkData = await checkRes.json();
    if (!checkData.ok) {
      console.warn('[Telegram Service] Invalid bot token or Telegram unreachable:', checkData.description);
      return;
    }

    botInfo = checkData.result;
    console.log(`[Telegram Service] Connected as @${botInfo.username} (${botInfo.first_name})`);

    // 2. Ensure no webhook is active so getUpdates works
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`).catch(() => {});

    // 3. Initialize DB table
    await initTelegramTable();

    // 4. Start polling loop
    isPolling = true;
    pollingAbortController = new AbortController();
    pollTelegramLoop();
    console.log(`[Telegram Service] Long polling started for @${botInfo.username}`);
  } catch (err) {
    console.warn('[Telegram Service Initialization Warn]:', err.message);
  }
};

/**
 * Stop Telegram Polling
 */
export const stopTelegramPolling = () => {
  if (!isPolling) return;
  isPolling = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  console.log('[Telegram Service] Polling stopped');
};

/**
 * Get service diagnostic status
 */
export const getTelegramStatus = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let subscriberCount = 0;

  try {
    const res = await query('SELECT COUNT(*) as count FROM telegram_subscribers WHERE is_active = true');
    subscriberCount = parseInt(res.rows[0]?.count || 0, 10);
  } catch (e) {}

  return {
    isConfigured: Boolean(token),
    maskedToken: getMaskedToken(token),
    isPolling,
    botUsername: botInfo?.username || 'StockWise_Alertss_bot',
    botName: botInfo?.first_name || 'StockWise Alerts',
    activeSubscribers: subscriberCount,
  };
};

export default {
  startTelegramPolling,
  stopTelegramPolling,
  sendTelegramMessage,
  broadcastTelegramAlert,
  processTelegramUpdates,
  getTelegramStatus,
};
