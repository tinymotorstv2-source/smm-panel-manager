const axios = require('axios');
const crypto = require('crypto');
const db = require('./db');

const token = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = token ? `https://api.telegram.org/bot${token}` : null;

async function sendMessage(chatId, text, options = {}) {
    if (!API_BASE) return;
    try {
        await axios.post(`${API_BASE}/sendMessage`, {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
            ...options
        });
    } catch (err) {
        console.error('[TelegramBot] Send error:', err.response?.data?.description || err.message);
    }
}

function getAdminId() {
    return new Promise((resolve) => {
        if (process.env.ADMIN_TELEGRAM_ID && process.env.ADMIN_TELEGRAM_ID.trim()) {
            return resolve(String(process.env.ADMIN_TELEGRAM_ID).trim());
        }
        db.get(`SELECT value FROM bot_config WHERE key = 'admin_telegram_id'`, [], (err, row) => {
            if (!err && row && row.value) {
                return resolve(String(row.value).trim());
            }
            resolve(null);
        });
    });
}

function setAdminId(chatId) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO bot_config (key, value) VALUES ('admin_telegram_id', ?) 
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            [String(chatId)],
            (err) => err ? reject(err) : resolve()
        );
    });
}

function generateAccessKey() {
    const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `SMM-${p1}-${p2}`;
}

// Function to notify admin whenever any order/campaign is launched
async function notifyNewCampaign({ user, targetLink, actions, deadlineHours }) {
    try {
        const adminId = await getAdminId();
        if (!adminId) {
            console.log('[TelegramBot] No admin configured yet to receive order alert.');
            return;
        }

        let actionsText = '';
        if (Array.isArray(actions)) {
            actions.forEach(a => {
                if (a.quantity > 0) {
                    const runsText = a.targetRuns ? ` | Auto Runs: ${a.targetRuns}` : '';
                    actionsText += `• *${a.type.toUpperCase()}:* ${Number(a.quantity).toLocaleString()} (Service: \`${a.serviceId}\`${runsText})\n`;
                }
            });
        }

        const alertMessage = 
            `🔔 *NEW CAMPAIGN ORDER ALERT!* 🔔\n\n` +
            `👤 *Client / Label:* \`${user.label || 'Client'}\`\n` +
            `🔑 *Access Key:* \`${user.accessKey}\`\n` +
            `🔗 *Target Link:*\n${targetLink}\n\n` +
            `⏱️ *Completion Deadline:* ${deadlineHours} Hour(s)\n` +
            `📅 *Order Time:* ${new Date().toLocaleString()}\n\n` +
            `📊 *Requested Engagements:*\n${actionsText || 'None'}\n` +
            `🛡️ _Executed using client's own SMM panel credentials._`;

        await sendMessage(adminId, alertMessage);
        console.log(`[TelegramBot] Sent new order alert to admin (${adminId})`);
    } catch (err) {
        console.error('[TelegramBot] Failed to send order notification:', err.message);
    }
}

function initTelegramBot() {
    if (!token) {
        console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not provided in .env');
        return;
    }

    async function handleMessage(msg) {
        if (!msg || !msg.text) return;
        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const senderName = msg.from?.first_name || 'User';

        console.log(`[TelegramBot] Message from ${senderName} (${chatId}): ${text}`);

        // Command: /myid
        if (text.startsWith('/myid')) {
            return sendMessage(chatId, `🆔 Your Telegram Chat ID is: \`${chatId}\``);
        }

        // Command: /claimadmin
        if (text.startsWith('/claimadmin')) {
            const currentAdmin = await getAdminId();
            if (currentAdmin && currentAdmin !== String(chatId)) {
                return sendMessage(chatId, `❌ Admin already configured by another user.`);
            }
            await setAdminId(chatId);
            return sendMessage(
                chatId,
                `👑 *Congratulations!* You are now saved as the Primary Admin (ID: \`${chatId}\`).\n\nUse \`/help\` to view your commands.`
            );
        }

        const adminId = await getAdminId();

        // If no admin is configured yet, auto-assign first user who messages
        if (!adminId) {
            await setAdminId(chatId);
            return sendMessage(
                chatId,
                `👑 *Welcome ${senderName}! You are now registered as the Admin!* (Chat ID: \`${chatId}\`)\n\n` +
                `Available Commands:\n` +
                `🔑 \`/genkey <name>\` - Generate new access key for a client\n` +
                `📋 \`/keys\` - View all active and revoked keys\n` +
                `🚫 \`/revoke <KEY>\` - Revoke/block a client key\n` +
                `✅ \`/activate <KEY>\` - Re-activate a key\n` +
                `🆔 \`/myid\` - View your chat ID`
            );
        }

        // If sender is NOT admin, block them
        if (String(chatId) !== String(adminId)) {
            return sendMessage(
                chatId,
                `🔒 *Access Denied*\n\nThis bot is private and managed by the administrator. Contact the admin to request your SMM Access Key.`
            );
        }

        // ADMIN COMMANDS:

        // 1. /start or /help
        if (text === '/start' || text === '/help') {
            return sendMessage(
                chatId,
                `👑 *SMM Admin Dashboard Bot*\n\n` +
                `Available Commands:\n` +
                `🔑 \`/genkey <client_name>\` - Generate new access key for client\n` +
                `📋 \`/keys\` - View all active and revoked keys\n` +
                `🚫 \`/revoke <KEY>\` - Instantly revoke a client's access\n` +
                `✅ \`/activate <KEY>\` - Re-activate a revoked key\n` +
                `🆔 \`/myid\` - Show your Chat ID\n\n` +
                `🔔 _You will also receive instant Telegram alerts whenever any user places an order!_`
            );
        }

        // 2. /genkey <name>
        if (text.startsWith('/genkey')) {
            const parts = text.split(' ');
            const label = parts.slice(1).join(' ').trim() || 'Client';
            const key = generateAccessKey();

            db.run(`INSERT INTO users (accessKey, label, isActive) VALUES (?, ?, 1)`, [key, label], (err) => {
                if (err) {
                    return sendMessage(chatId, `❌ Failed to create key: ${err.message}`);
                }

                const responseText = 
                    `✨ *New Access Key Generated!* ✨\n\n` +
                    `👤 *Client / Label:* \`${label}\`\n` +
                    `🔑 *Access Key:* \`${key}\`\n` +
                    `📅 *Created:* ${new Date().toLocaleString()}\n` +
                    `🛡️ *Data Isolation:* 100% Private (Own APIs & Own Orders)\n\n` +
                    `_Forward this message or key to your client. They can paste it on the website to access their isolated dashboard._`;

                sendMessage(chatId, responseText);
            });
            return;
        }

        // 3. /keys or /listkeys
        if (text === '/keys' || text === '/listkeys') {
            db.all(`SELECT * FROM users ORDER BY createdAt DESC LIMIT 30`, [], (err, rows) => {
                if (err) return sendMessage(chatId, `❌ Error: ${err.message}`);
                if (!rows || rows.length === 0) {
                    return sendMessage(chatId, `ℹ️ No access keys found. Use \`/genkey <name>\` to create one.`);
                }

                let msgText = `📋 *Access Keys List (${rows.length}):*\n\n`;
                rows.forEach((u, i) => {
                    const icon = u.isActive ? '🟢' : '🔴';
                    const status = u.isActive ? 'Active' : 'REVOKED';
                    msgText += `${i + 1}. ${icon} \`${u.accessKey}\`\n   👤 *${u.label || 'Unnamed'}* | [${status}]\n`;
                });

                msgText += `\n_To revoke: \`/revoke <KEY>\`\nTo re-activate: \`/activate <KEY>\`_`;
                sendMessage(chatId, msgText);
            });
            return;
        }

        // 4. /revoke <KEY>
        if (text.startsWith('/revoke')) {
            const parts = text.split(' ');
            const keyToRevoke = (parts[1] || '').trim();
            if (!keyToRevoke) {
                return sendMessage(chatId, `⚠️ Usage: \`/revoke <KEY>\``);
            }

            db.run(`UPDATE users SET isActive = 0 WHERE accessKey = ?`, [keyToRevoke], function (err) {
                if (err) return sendMessage(chatId, `❌ Error: ${err.message}`);
                if (this.changes === 0) {
                    return sendMessage(chatId, `⚠️ Key \`${keyToRevoke}\` not found.`);
                }
                sendMessage(chatId, `🚫 *Key Revoked!*\n\`${keyToRevoke}\` has been deactivated. The user can no longer place orders or access dashboard.`);
            });
            return;
        }

        // 5. /activate <KEY>
        if (text.startsWith('/activate')) {
            const parts = text.split(' ');
            const keyToActivate = (parts[1] || '').trim();
            if (!keyToActivate) {
                return sendMessage(chatId, `⚠️ Usage: \`/activate <KEY>\``);
            }

            db.run(`UPDATE users SET isActive = 1 WHERE accessKey = ?`, [keyToActivate], function (err) {
                if (err) return sendMessage(chatId, `❌ Error: ${err.message}`);
                if (this.changes === 0) {
                    return sendMessage(chatId, `⚠️ Key \`${keyToActivate}\` not found.`);
                }
                sendMessage(chatId, `✅ *Key Activated!*\n\`${keyToActivate}\` is now active again.`);
            });
            return;
        }
    }

    // Long polling loop
    let offset = 0;
    let isPolling = true;

    async function poll() {
        while (isPolling) {
            try {
                const res = await axios.get(`${API_BASE}/getUpdates`, {
                    params: {
                        offset,
                        timeout: 20
                    },
                    timeout: 30000
                });

                if (res.data && res.data.ok && Array.isArray(res.data.result)) {
                    for (const update of res.data.result) {
                        offset = update.update_id + 1;
                        if (update.message) {
                            handleMessage(update.message);
                        }
                    }
                }
            } catch (err) {
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }

    poll();
    console.log('[TelegramBot] Long-polling loop active.');
}

module.exports = { initTelegramBot, notifyNewCampaign };
