// seed.js — Seeds 5 default client details and their logs into the database
'use strict';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'krishna.db');
const db = new Database(DB_PATH);

console.log('🌱 Seeding database...');

// 5 default users
const defaultUsers = [
    {
        session_id: 'sess_default_101',
        name: 'Arjun Sharma',
        email: 'arjun.sharma@example.com',
        phone: '+919876543210',
        lang: 'en',
        depth: 'philosophical',
        subscription: 'unlimited',
        credits: 9999,
        streak_count: 5
    },
    {
        session_id: 'sess_default_102',
        name: 'Meera Patel',
        email: 'meera.patel@example.com',
        phone: '+919876543211',
        lang: 'gu',
        depth: 'practical',
        subscription: 'basic',
        credits: 45,
        streak_count: 2
    },
    {
        session_id: 'sess_default_103',
        name: 'Karan Singh',
        email: 'karan.singh@example.com',
        phone: '+919876543212',
        lang: 'hi',
        depth: 'deep',
        subscription: 'free',
        credits: 8,
        streak_count: 0
    },
    {
        session_id: 'sess_default_104',
        name: 'Priyanka Das',
        email: 'priyanka.das@example.com',
        phone: '+919876543213',
        lang: 'en',
        depth: 'practical',
        subscription: 'basic',
        credits: 50,
        streak_count: 12
    },
    {
        session_id: 'sess_default_105',
        name: 'Anand Verma',
        email: 'anand.verma@example.com',
        phone: '+919876543214',
        lang: 'hi',
        depth: 'philosophical',
        subscription: 'unlimited',
        credits: 9999,
        streak_count: 1
    }
];

const insertUser = db.prepare(`
    INSERT INTO users (session_id, name, email, phone, lang, depth, subscription, credits, streak_count, streak_date, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
    ON CONFLICT(session_id) DO NOTHING
`);

// Seed queries for the default users
const defaultQueries = [
    {
        session_id: 'sess_default_101',
        user_name: 'Arjun Sharma',
        question: 'What is the purpose of true devotion?',
        response: 'True devotion is surrendering the ego and aligning oneself with the divine will in every action.',
        depth: 'philosophical',
        mood: 'calm',
        lang: 'en'
    },
    {
        session_id: 'sess_default_102',
        user_name: 'Meera Patel',
        question: 'How do I reduce daily anxiety in my life?',
        response: 'Focus only on your current duty without worrying about future outcomes. Offer your daily work as a service.',
        depth: 'practical',
        mood: 'hopeful',
        lang: 'gu'
    }
];

const insertQuery = db.prepare(`
    INSERT INTO queries (session_id, user_name, question, response, depth, mood, lang)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Seed some initial transactions
const defaultTx = [
    {
        session_id: 'sess_default_101',
        user_name: 'Arjun Sharma',
        type: 'subscription',
        plan: 'Divine Unlimited',
        amount: 299,
        credits_delta: 9999,
        payment_id: 'pay_seed_101'
    },
    {
        session_id: 'sess_default_102',
        user_name: 'Meera Patel',
        type: 'subscription',
        plan: 'Basic Seeker',
        amount: 99,
        credits_delta: 50,
        payment_id: 'pay_seed_102'
    }
];

const insertTx = db.prepare(`
    INSERT INTO transactions (session_id, user_name, type, plan, amount, credits_delta, payment_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
`);

const runSeed = db.transaction(() => {
    for (const u of defaultUsers) {
        insertUser.run(u.session_id, u.name, u.email, u.phone, u.lang, u.depth, u.subscription, u.credits, u.streak_count);
    }
    for (const q of defaultQueries) {
        insertQuery.run(q.session_id, q.user_name, q.question, q.response, q.depth, q.mood, q.lang);
    }
    for (const t of defaultTx) {
        insertTx.run(t.session_id, t.user_name, t.type, t.plan, t.amount, t.credits_delta, t.payment_id);
    }
});

try {
    runSeed();
    console.log('✅ Seeding complete! 5 default client details inserted.');
} catch (e) {
    console.error('❌ Seeding failed:', e.message);
}
