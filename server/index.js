require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./db');
const { initTelegramBot, notifyNewCampaign } = require('./telegramBot');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Start Telegram Bot Service
initTelegramBot();

// Helper function to get random integer between min and max (inclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Background Worker Loop (Multi-User Aware)
setInterval(async () => {
    try {
        const now = new Date().toISOString();
        
        // Query running jobs along with their respective user's API settings
        const query = `
            SELECT j.*, us.apiUrl, us.apiKey, u.isActive as userActive, u.label as userLabel
            FROM jobs j
            JOIN users u ON j.userId = u.id
            LEFT JOIN user_settings us ON j.userId = us.userId
            WHERE j.status = 'running' 
              AND u.isActive = 1 
              AND (j.nextRunAt IS NULL OR j.nextRunAt <= ?)
        `;

        db.all(query, [now], async (err, jobs) => {
            if (err) {
                console.error('[Worker] DB Error:', err.message);
                return;
            }
            
            for (const job of jobs) {
                if (!job.apiUrl || !job.apiKey) {
                    // This user has not configured their own SMM provider credentials yet
                    console.log(`[Worker] Job ID: ${job.id} (${job.userLabel}) - Missing user's API URL or Key. Skipping.`);
                    continue;
                }

                if (!job.serviceId) {
                    console.error(`[Worker] Job ID: ${job.id} - No service ID assigned. Skipping.`);
                    continue;
                }

                console.log(`[Worker] Processing Job ID: ${job.id} (${job.actionType}) for User: ${job.userLabel}`);

                // Get total sent and number of runs
                db.get(`SELECT SUM(quantity) as totalSent, COUNT(*) as runCount FROM runs WHERE jobId = ? AND status = 'success'`, [job.id], async (err, row) => {
                    if (err) return;

                    let totalSent = (row && row.totalSent) || 0;
                    let runCount = (row && row.runCount) || 0;
                    let remainingQuantity = job.totalQuantity - totalSent;

                    if (remainingQuantity <= 0) {
                        db.run(`UPDATE jobs SET status = 'completed' WHERE id = ?`, [job.id]);
                        return;
                    }

                    // Calculate run quantity
                    let minChunk, maxChunk, avgChunk;
                    
                    if (job.targetRuns && job.targetRuns > 0) {
                        const remainingRuns = Math.max(1, job.targetRuns - runCount);
                        avgChunk = remainingQuantity / remainingRuns;
                        minChunk = Math.max(1, Math.floor(avgChunk * 0.8));
                        maxChunk = Math.ceil(avgChunk * 1.2);
                    } else {
                        minChunk = job.actionType === 'views' ? 100 : 10;
                        maxChunk = minChunk * 2; 
                        avgChunk = (minChunk + maxChunk) / 2;
                    }
                    
                    let runQuantity = getRandomInt(minChunk, maxChunk);
                    
                    if (runQuantity > remainingQuantity) {
                        runQuantity = remainingQuantity;
                    }
                    if (remainingQuantity < minChunk) {
                        runQuantity = remainingQuantity;
                    }

                    console.log(`[Worker] Job ID: ${job.id} | Sending ${runQuantity} ${job.actionType} via User's API...`);

                    let success = false;
                    try {
                        const apiUrl = new URL(job.apiUrl);
                        apiUrl.searchParams.append('key', job.apiKey);
                        apiUrl.searchParams.append('action', 'add');
                        apiUrl.searchParams.append('service', job.serviceId);
                        apiUrl.searchParams.append('link', job.targetLink);
                        apiUrl.searchParams.append('quantity', runQuantity);

                        const response = await axios.get(apiUrl.toString());
                        const responseData = response.data;

                        db.run(`INSERT INTO runs (jobId, quantity, response, status) VALUES (?, ?, ?, ?)`, 
                            [job.id, runQuantity, JSON.stringify(responseData), 'success']);
                        
                        success = true;
                        console.log(`[Worker] Job ID: ${job.id} | Success`);
                    } catch (apiErr) {
                        const errorMsg = apiErr.response ? JSON.stringify(apiErr.response.data) : apiErr.message;
                        db.run(`INSERT INTO runs (jobId, quantity, response, status) VALUES (?, ?, ?, ?)`, 
                            [job.id, runQuantity, errorMsg, 'error']);
                        console.error(`[Worker] Job ID: ${job.id} | API Error:`, errorMsg);
                    }

                    const remainingQuantityAfterThis = Math.max(0, remainingQuantity - runQuantity);
                    if (remainingQuantityAfterThis <= 0 && success) {
                        db.run(`UPDATE jobs SET status = 'completed' WHERE id = ?`, [job.id]);
                        return;
                    }

                    // Deadline-based interval calculation
                    const deadlineDate = new Date(job.deadlineAt);
                    const nowTime = new Date();
                    const msRemaining = deadlineDate.getTime() - nowTime.getTime();
                    const minutesRemaining = Math.max(1, msRemaining / 60000); 
                    
                    let estimatedRunsLeft;
                    if (job.targetRuns && job.targetRuns > 0) {
                        estimatedRunsLeft = Math.max(1, job.targetRuns - (runCount + 1));
                    } else {
                        estimatedRunsLeft = Math.ceil(remainingQuantityAfterThis / avgChunk);
                    }
                    
                    let nextIntervalMinutes = 1;
                    if (estimatedRunsLeft > 0) {
                        nextIntervalMinutes = minutesRemaining / estimatedRunsLeft;
                    }

                    const variance = nextIntervalMinutes * 0.2;
                    let randomInterval = nextIntervalMinutes + (Math.random() * variance * 2 - variance);
                    randomInterval = Math.max(1, randomInterval);

                    const nextRun = new Date();
                    nextRun.setMinutes(nextRun.getMinutes() + randomInterval);
                    
                    db.run(`UPDATE jobs SET nextRunAt = ? WHERE id = ?`, [nextRun.toISOString(), job.id]);
                });
            }
        });
    } catch (err) {
        console.error('[Worker] Fatal Error:', err);
    }
}, 60000); // Check every 60 seconds

// ================= AUTH MIDDLEWARE =================

const requireAuth = (req, res, next) => {
    const key = req.headers['x-access-key'];
    if (!key) {
        return res.status(401).json({ error: 'Access Key required. Please authenticate.' });
    }

    db.get(`SELECT * FROM users WHERE accessKey = ?`, [key], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) {
            return res.status(401).json({ error: 'Invalid Access Key. Check with admin on Telegram.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ error: 'This Access Key has been revoked.' });
        }
        req.user = user;
        next();
    });
};

// ================= PUBLIC AUTH ROUTE =================

app.post('/api/auth/verify', (req, res) => {
    const { accessKey } = req.body;
    if (!accessKey) {
        return res.status(400).json({ error: 'Access key is required.' });
    }

    db.get(`SELECT id, accessKey, label, isActive FROM users WHERE accessKey = ?`, [accessKey.trim()], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) {
            return res.status(404).json({ error: 'Invalid Access Key. Please check the key provided by the Telegram Bot.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ error: 'This Access Key has been deactivated/revoked.' });
        }
        res.json({
            valid: true,
            user: {
                id: user.id,
                accessKey: user.accessKey,
                label: user.label
            }
        });
    });
});

// ================= PROTECTED API ROUTES =================

// Get Live Provider Balance for Current User
app.get('/api/user/balance', requireAuth, async (req, res) => {
    db.get(`SELECT apiUrl, apiKey FROM user_settings WHERE userId = ?`, [req.user.id], async (err, settings) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!settings || !settings.apiUrl || !settings.apiKey) {
            return res.json({ configured: false, message: 'API credentials not configured' });
        }

        try {
            let balanceData = null;

            // 1. Try GET request with query params
            try {
                const apiUrl = new URL(settings.apiUrl);
                apiUrl.searchParams.append('key', settings.apiKey);
                apiUrl.searchParams.append('action', 'balance');
                const getRes = await axios.get(apiUrl.toString(), { timeout: 8000 });
                if (getRes.data && (getRes.data.balance !== undefined && getRes.data.balance !== null)) {
                    balanceData = getRes.data;
                }
            } catch (e) {
                // Ignore GET error, fall through to POST
            }

            // 2. Try POST request with urlencoded form
            if (!balanceData || balanceData.balance === undefined) {
                const params = new URLSearchParams();
                params.append('key', settings.apiKey);
                params.append('action', 'balance');
                const postRes = await axios.post(settings.apiUrl, params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 8000
                });
                if (postRes.data && (postRes.data.balance !== undefined && postRes.data.balance !== null)) {
                    balanceData = postRes.data;
                } else if (postRes.data && postRes.data.error) {
                    return res.json({ configured: true, error: postRes.data.error });
                }
            }

            if (balanceData && balanceData.balance !== undefined) {
                return res.json({
                    configured: true,
                    balance: balanceData.balance,
                    currency: balanceData.currency || 'USD'
                });
            }

            res.json({ configured: true, error: 'Provider returned unexpected format' });
        } catch (apiErr) {
            const errorMsg = apiErr.response?.data?.error || apiErr.response?.data?.message || apiErr.message;
            res.json({ configured: true, error: errorMsg });
        }
    });
});

// Fetch services directly from SMM provider
app.get('/api/user/provider-services', requireAuth, async (req, res) => {
    db.get(`SELECT apiUrl, apiKey FROM user_settings WHERE userId = ?`, [req.user.id], async (err, settings) => {
        if (err || !settings || !settings.apiUrl || !settings.apiKey) {
            return res.status(400).json({ error: 'Configure API URL and Key first in Settings' });
        }
        try {
            const apiUrl = new URL(settings.apiUrl);
            apiUrl.searchParams.append('key', settings.apiKey);
            apiUrl.searchParams.append('action', 'services');
            const response = await axios.get(apiUrl.toString(), { timeout: 10000 });
            res.json(response.data);
        } catch (apiErr) {
            try {
                const params = new URLSearchParams();
                params.append('key', settings.apiKey);
                params.append('action', 'services');
                const postRes = await axios.post(settings.apiUrl, params, { timeout: 10000 });
                return res.json(postRes.data);
            } catch (err2) {
                res.status(500).json({ error: apiErr.message });
            }
        }
    });
});

// User Settings (isolated per user)
app.get('/api/settings', requireAuth, (req, res) => {
    db.get(`SELECT * FROM user_settings WHERE userId = ?`, [req.user.id], (err, settings) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all(`SELECT * FROM user_services WHERE userId = ?`, [req.user.id], (err, services) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ 
                settings: settings || { apiUrl: '', apiKey: '' }, 
                services: services || [],
                user: {
                    id: req.user.id,
                    accessKey: req.user.accessKey,
                    label: req.user.label
                }
            });
        });
    });
});

app.post('/api/settings', requireAuth, (req, res) => {
    const { apiUrl, apiKey, services } = req.body;
    const userId = req.user.id;

    // Upsert into user_settings
    db.run(
        `INSERT INTO user_settings (userId, apiUrl, apiKey) VALUES (?, ?, ?)
         ON CONFLICT(userId) DO UPDATE SET apiUrl = excluded.apiUrl, apiKey = excluded.apiKey`,
        [userId, apiUrl, apiKey],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Clear old services for THIS user and insert new
            db.run(`DELETE FROM user_services WHERE userId = ?`, [userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                if (services && services.length > 0) {
                    const stmt = db.prepare(`INSERT INTO user_services (userId, actionType, name, serviceId, rate) VALUES (?, ?, ?, ?, ?)`);
                    for (const s of services) {
                        stmt.run([userId, s.actionType, s.name, s.serviceId, parseFloat(s.rate) || 0]);
                    }
                    stmt.finalize();
                }

                res.json({ message: 'User settings updated successfully' });
            });
        }
    );
});

// Jobs creation (bound to current user)
app.post('/api/jobs/batch', requireAuth, (req, res) => {
    const { targetLink, actions, deadlineHours } = req.body;
    const userId = req.user.id;
    
    const stmt = db.prepare(
        `INSERT INTO jobs (userId, actionType, targetLink, serviceId, totalQuantity, targetRuns, deadlineAt, nextRunAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setMinutes(nextRun.getMinutes() + 1);
    const nextRunIso = nextRun.toISOString();

    const deadlineAt = new Date(now);
    deadlineAt.setTime(deadlineAt.getTime() + (deadlineHours * 60 * 60 * 1000));
    const deadlineIso = deadlineAt.toISOString();

    for (const action of actions) {
        if (action.quantity > 0) {
            stmt.run([
                userId,
                action.type, 
                targetLink, 
                action.serviceId,
                action.quantity,
                action.targetRuns || null,
                deadlineIso,
                nextRunIso
            ]);
        }
    }
    stmt.finalize();
    
    // Trigger real-time Telegram notification to Admin
    notifyNewCampaign({
        user: req.user,
        targetLink,
        actions,
        deadlineHours
    });
    
    res.json({ message: 'Campaign jobs created successfully' });
});

// Jobs list (isolated per user)
app.get('/api/jobs', requireAuth, (req, res) => {
    db.all(`SELECT * FROM jobs WHERE userId = ? ORDER BY createdAt DESC`, [req.user.id], (err, jobs) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all(
            `SELECT r.jobId, SUM(r.quantity) as totalSent, COUNT(*) as runCount 
             FROM runs r 
             JOIN jobs j ON r.jobId = j.id
             WHERE j.userId = ? AND r.status = 'success' 
             GROUP BY r.jobId`, 
            [req.user.id], 
            (err, progresses) => {
                if (err) return res.status(500).json({ error: err.message });
                
                const progressMap = {};
                const runCountMap = {};
                progresses.forEach(p => {
                    progressMap[p.jobId] = p.totalSent;
                    runCountMap[p.jobId] = p.runCount;
                });

                const jobsWithProgress = jobs.map(job => ({
                    ...job,
                    totalSent: progressMap[job.id] || 0,
                    runCount: runCountMap[job.id] || 0
                }));

                res.json(jobsWithProgress);
            }
        );
    });
});

// Run history for a job (isolated per user)
app.get('/api/jobs/:id/runs', requireAuth, (req, res) => {
    db.get(`SELECT id FROM jobs WHERE id = ? AND userId = ?`, [req.params.id, req.user.id], (err, job) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!job) return res.status(404).json({ error: 'Job not found or access denied.' });

        db.all(`SELECT * FROM runs WHERE jobId = ? ORDER BY runAt DESC`, [req.params.id], (err, runs) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(runs);
        });
    });
});

// Toggle pause/resume (isolated per user)
app.post('/api/jobs/:id/toggle', requireAuth, (req, res) => {
    db.get(`SELECT status FROM jobs WHERE id = ? AND userId = ?`, [req.params.id, req.user.id], (err, job) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!job) return res.status(404).json({ error: 'Job not found or access denied.' });
        
        const newStatus = job.status === 'running' ? 'paused' : 'running';
        
        let updateQuery = `UPDATE jobs SET status = ? WHERE id = ?`;
        let params = [newStatus, req.params.id];
        
        if (newStatus === 'running') {
            updateQuery = `UPDATE jobs SET status = ?, nextRunAt = ? WHERE id = ?`;
            params = [newStatus, new Date().toISOString(), req.params.id];
        }

        db.run(updateQuery, params, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `Job ${newStatus}` });
        });
    });
});

// Update next run time (isolated per user)
app.post('/api/jobs/:id/time', requireAuth, (req, res) => {
    const { nextRunAt } = req.body;
    db.run(`UPDATE jobs SET nextRunAt = ? WHERE id = ? AND userId = ?`, [nextRunAt, req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Job not found or unauthorized' });
        res.json({ message: 'Time updated' });
    });
});

// Healthcheck for free cloud monitoring (e.g. UptimeRobot)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

// Serve Frontend Static Build in Production
const path = require('path');
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Catch-all route to serve React index.html for SPA routing (Express 5 compatible)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
