// db.js — Krishna Says Cloud PostgreSQL Layer
'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false 
    }
});

// Initialize Database Tables
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                session_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL DEFAULT 'Seeker',
                email TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                lang TEXT DEFAULT 'en',
                depth TEXT DEFAULT 'practical',
                subscription TEXT DEFAULT 'free',
                credits INTEGER DEFAULT 10,
                streak_count INTEGER DEFAULT 0,
                streak_date TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS queries (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                user_name TEXT DEFAULT 'Seeker',
                question TEXT NOT NULL,
                response TEXT DEFAULT '',
                depth TEXT DEFAULT 'practical',
                mood TEXT DEFAULT 'neutral',
                lang TEXT DEFAULT 'en',
                asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                user_name TEXT DEFAULT 'Seeker',
                type TEXT NOT NULL,
                plan TEXT DEFAULT '',
                amount REAL DEFAULT 0,
                credits_delta INTEGER DEFAULT 0,
                payment_id TEXT DEFAULT '',
                status TEXT DEFAULT 'success',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS wisdom_entries (
                id SERIAL PRIMARY KEY,
                depth TEXT NOT NULL DEFAULT 'practical',
                keywords TEXT NOT NULL,
                response_en TEXT NOT NULL,
                response_hi TEXT DEFAULT '',
                response_gu TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS admin_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[db] Cloud database tables verified.');
    } catch (err) {
        console.error('[db] Initialization error:', err);
    }
};

initDb();

module.exports = {
    // Users
    async upsertUser(data) {
        const query = `
            INSERT INTO users (session_id, name, email, phone, lang, depth, last_seen)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (session_id) DO UPDATE SET
                name=EXCLUDED.name, email=EXCLUDED.email, lang=EXCLUDED.lang, depth=EXCLUDED.depth, last_seen=CURRENT_TIMESTAMP
            RETURNING *
        `;
        const values = [data.session_id, data.name, data.email, data.phone, data.lang, data.depth];
        const res = await pool.query(query, values);
        return res.rows[0];
    },
    async getUser(sessionId) {
        const res = await pool.query('SELECT * FROM users WHERE session_id = $1', [sessionId]);
        return res.rows[0];
    },
    async getUserByContact(contact) {
        const res = await pool.query('SELECT * FROM users WHERE email = $1 OR phone = $1', [contact]);
        return res.rows[0];
    },
    async getAllUsers() {
        const res = await pool.query('SELECT * FROM users ORDER BY last_seen DESC');
        return res.rows;
    },
    async updateUserCredits(sessionId, credits, subscription) {
        await pool.query('UPDATE users SET credits=$1, subscription=$2 WHERE session_id=$3', [credits, subscription, sessionId]);
    },
    async updateUserStreak(sessionId, count, date) {
        await pool.query('UPDATE users SET streak_count=$1, streak_date=$2 WHERE session_id=$3', [count, date, sessionId]);
    },

    // Queries
    async logQuery(data) {
        await pool.query(`
            INSERT INTO queries (session_id, user_name, question, response, depth, mood, lang)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [data.session_id, data.user_name, data.question, data.response, data.depth, data.mood, data.lang]);
    },
    async getAllQueries(limit = 50, offset = 0) {
        const res = await pool.query('SELECT * FROM queries ORDER BY asked_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        const countRes = await pool.query('SELECT COUNT(*) as total FROM queries');
        return { rows: res.rows, total: parseInt(countRes.rows[0].total) };
    },
    async getUserQueries(sessionId) {
        const res = await pool.query('SELECT * FROM queries WHERE session_id=$1 ORDER BY asked_at DESC LIMIT 20', [sessionId]);
        return res.rows;
    },

    // Transactions
    async logTransaction(data) {
        await pool.query(`
            INSERT INTO transactions (session_id, user_name, type, plan, amount, credits_delta, payment_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [data.session_id, data.user_name, data.type, data.plan, data.amount, data.credits_delta, data.payment_id, data.status]);
    },
    async getAllTransactions(limit = 50, offset = 0) {
        const res = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        const countRes = await pool.query('SELECT COUNT(*) as total FROM transactions');
        return { rows: res.rows, total: parseInt(countRes.rows[0].total) };
    },

    // Wisdom
    async getAllWisdom() {
        const res = await pool.query('SELECT * FROM wisdom_entries ORDER BY created_at DESC');
        return res.rows.map(row => ({
            ...row,
            keywords: JSON.parse(row.keywords || '[]')
        }));
    },
    async addWisdom(data) {
        const res = await pool.query(`
            INSERT INTO wisdom_entries (depth, keywords, response_en, response_hi, response_gu)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [data.depth, JSON.stringify(data.keywords), data.response_en, data.response_hi, data.response_gu]);
        return res.rows[0];
    },
    async updateWisdom(data) {
        const res = await pool.query(`
            UPDATE wisdom_entries SET depth=$1, keywords=$2, response_en=$3, response_hi=$4, response_gu=$5
            WHERE id=$6 RETURNING *
        `, [data.depth, JSON.stringify(data.keywords), data.response_en, data.response_hi, data.response_gu, data.id]);
        return res.rows[0];
    },
    async deleteWisdom(id) {
        await pool.query('DELETE FROM wisdom_entries WHERE id=$1', [id]);
    },

    // Config
    async getConfig(key) {
        const res = await pool.query('SELECT value FROM admin_config WHERE key=$1', [key]);
        return res.rows[0] ? JSON.parse(res.rows[0].value) : null;
    },
    async setConfig(key, value) {
        await pool.query(`
            INSERT INTO admin_config (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP
        `, [key, JSON.stringify(value)]);
    },
    async getAllConfig() {
        const configRes = await pool.query('SELECT key, value FROM admin_config');
        const out = {};
        configRes.rows.forEach(r => { out[r.key] = JSON.parse(r.value); });
        
        const wisdomRes = await pool.query('SELECT * FROM wisdom_entries');
        out.wisdom = wisdomRes.rows.map(row => ({
            id: row.id,
            depth: row.depth,
            keywords: JSON.parse(row.keywords || '[]'),
            responses: { en: row.response_en, hi: row.response_hi, gu: row.response_gu }
        }));
        return out;
    },

    // Stats
    async getStats() {
        const queries = [
            pool.query('SELECT COUNT(*) as c FROM users'),
            pool.query('SELECT COUNT(*) as c FROM queries'),
            pool.query('SELECT COUNT(*) as c FROM transactions'),
            pool.query('SELECT COUNT(*) as c FROM wisdom_entries'),
            pool.query("SELECT COUNT(*) as c FROM users WHERE subscription != 'free'")
        ];
        const results = await Promise.all(queries);
        return {
            totalUsers: parseInt(results[0].rows[0].c),
            totalQueries: parseInt(results[1].rows[0].c),
            totalTransactions: parseInt(results[2].rows[0].c),
            totalWisdom: parseInt(results[3].rows[0].c),
            premiumUsers: parseInt(results[4].rows[0].c)
        };
    }
};
