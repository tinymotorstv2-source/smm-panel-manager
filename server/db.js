const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.serialize(() => {
            // Bot Config & Global Settings
            db.run(`CREATE TABLE IF NOT EXISTS bot_config (
                key TEXT PRIMARY KEY,
                value TEXT
            )`);

            // Users Table (Access Keys)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                accessKey TEXT UNIQUE NOT NULL,
                label TEXT,
                isActive INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Seed default master key if no users exist
            db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
                if (row && row.count === 0) {
                    const defaultKey = 'SMM-ADMIN-MASTER';
                    db.run(`INSERT INTO users (accessKey, label, isActive) VALUES (?, ?, 1)`, 
                        [defaultKey, 'Master Admin']);
                    console.log(`[DB] Created default master access key: ${defaultKey}`);
                }
            });

            // Per-User Settings
            db.run(`CREATE TABLE IF NOT EXISTS user_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER UNIQUE NOT NULL,
                apiUrl TEXT,
                apiKey TEXT,
                FOREIGN KEY(userId) REFERENCES users(id)
            )`);

            // Per-User Services
            db.run(`CREATE TABLE IF NOT EXISTS user_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                actionType TEXT NOT NULL,
                name TEXT NOT NULL,
                serviceId TEXT NOT NULL,
                rate REAL DEFAULT 0,
                FOREIGN KEY(userId) REFERENCES users(id)
            )`);

            // Migration: Check if rate column exists in user_services
            db.all(`PRAGMA table_info(user_services)`, [], (err, cols) => {
                if (!err && cols) {
                    const hasRate = cols.some(c => c.name === 'rate');
                    if (!hasRate) {
                        db.run(`ALTER TABLE user_services ADD COLUMN rate REAL DEFAULT 0`);
                    }
                }
            });

            // Jobs table
            db.run(`CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                actionType TEXT NOT NULL,
                targetLink TEXT NOT NULL,
                serviceId TEXT NOT NULL,
                totalQuantity INTEGER NOT NULL,
                targetRuns INTEGER, 
                status TEXT DEFAULT 'running',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                nextRunAt DATETIME,
                deadlineAt DATETIME NOT NULL
            )`);

            // Check if userId column exists in jobs (in case table was created before)
            db.all(`PRAGMA table_info(jobs)`, [], (err, cols) => {
                if (!err && cols) {
                    const hasUserId = cols.some(c => c.name === 'userId');
                    if (!hasUserId) {
                        db.run(`ALTER TABLE jobs ADD COLUMN userId INTEGER`, () => {
                            // Assign any legacy jobs to user 1
                            db.run(`UPDATE jobs SET userId = 1 WHERE userId IS NULL`);
                        });
                    }
                }
            });

            // Runs table
            db.run(`CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                jobId INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                response TEXT,
                status TEXT NOT NULL,
                runAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(jobId) REFERENCES jobs(id)
            )`);
        });
    }
});

module.exports = db;
