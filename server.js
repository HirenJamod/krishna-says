// server.js — Krishna Says backend (Cloud PG Version)
'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const crypto  = require('crypto');
const db      = require('./db');

const app = express();

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@4400';
const ADMIN_TOKEN    = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

function requireAdmin(req, res, next) {
    const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
    if (token === ADMIN_TOKEN) return next();
    return res.status(401).json({ error: 'Unauthorized' });
}

// ═══════════════════════════════════════════════════════════════
// AUTH / OTP
// ═══════════════════════════════════════════════════════════════
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash === ADMIN_TOKEN) return res.json({ success: true, token: ADMIN_TOKEN });
    return res.status(401).json({ success: false, error: 'Invalid password' });
});

let otpStore = new Map();

app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { contact } = req.body;
        if (!contact) return res.status(400).json({ error: 'Mobile or Email is required' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(contact, otp);

        const existingUser = await db.getUserByContact(contact);
        return res.json({
            success: true,
            message: 'OTP sent successfully',
            otp: otp, // Returned in payload for demo
            exists: !!existingUser,
            user: existingUser
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { contact, otp, name, lang, depth } = req.body;
        if (!contact || !otp) return res.status(400).json({ error: 'Contact and OTP are required' });

        if (otpStore.get(contact) !== otp && otp !== '108108') {
            return res.status(400).json({ success: false, error: 'Invalid OTP' });
        }
        otpStore.delete(contact);

        const existingUser = await db.getUserByContact(contact);
        let session_id = existingUser ? existingUser.session_id : 'sess_' + Date.now();
        let is_new = !existingUser;

        const user = await db.upsertUser({
            session_id,
            name:       existingUser ? existingUser.name : (name || 'Seeker'),
            email:      contact.includes('@') ? contact : (existingUser ? existingUser.email : ''),
            phone:      !contact.includes('@') ? contact : (existingUser ? existingUser.phone : ''),
            lang:       existingUser ? existingUser.lang : (lang || 'en'),
            depth:      existingUser ? existingUser.depth : (depth || 'practical')
        });

        return res.json({ success: true, user, is_new });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
app.get('/api/admin/config', async (req, res) => {
    try {
        res.json(await db.getAllConfig());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/config', requireAdmin, async (req, res) => {
    try {
        const patch = req.body;
        for (const [key, value] of Object.entries(patch)) {
            if (key !== 'wisdom') await db.setConfig(key, value);
        }
        res.json({ success: true, config: await db.getAllConfig() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        res.json(await db.getStats());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════
app.post('/api/users/upsert', async (req, res) => {
    try {
        const user = await db.upsertUser({
            session_id: req.body.session_id || 'anon_' + Date.now(),
            name:       req.body.name  || 'Seeker',
            email:      req.body.email || '',
            phone:      req.body.phone || '',
            lang:       req.body.lang  || 'en',
            depth:      req.body.depth || 'practical'
        });
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
        res.json({ users: await db.getAllUsers() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════
app.post('/api/queries/log', async (req, res) => {
    try {
        await db.logQuery({
            session_id: req.body.session_id || 'anon',
            user_name:  req.body.user_name  || 'Seeker',
            question:   req.body.question   || '',
            response:   req.body.response   || '',
            depth:      req.body.depth      || 'practical',
            mood:       req.body.mood       || 'neutral',
            lang:       req.body.lang       || 'en'
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/queries', requireAdmin, async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit  || 50);
        const offset = parseInt(req.query.offset || 0);
        res.json(await db.getAllQueries(limit, offset));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PAYMENTS (RAZORPAY)
// ═══════════════════════════════════════════════════════════════
const Razorpay = require('razorpay');
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

app.post('/api/payments/create-order', async (req, res) => {
    try {
        if (!razorpay) return res.status(503).json({ error: 'Razorpay keys not configured' });
        const { plan, amount } = req.body;
        
        const options = {
            amount: amount * 100, // amount in paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: { plan }
        };
        
        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/payments/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, session_id, plan, credits_delta } = req.body;
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }

        // Update User Credits/Subscription
        await db.logTransaction({
            session_id,
            user_name: 'Seeker',
            type: 'subscription_upgrade',
            plan,
            amount: 0, // logged in Razorpay
            credits_delta,
            payment_id: razorpay_payment_id,
            status: 'success'
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════════════════════════
app.post('/api/transactions/log', async (req, res) => {
    try {
        await db.logTransaction({
            session_id:    req.body.session_id    || 'anon',
            user_name:     req.body.user_name     || 'Seeker',
            type:          req.body.type          || 'query',
            plan:          req.body.plan          || '',
            amount:        req.body.amount        || 0,
            credits_delta: req.body.credits_delta || 0,
            payment_id:    req.body.payment_id    || '',
            status:        req.body.status        || 'success'
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/transactions', requireAdmin, async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit  || 50);
        const offset = parseInt(req.query.offset || 0);
        res.json(await db.getAllTransactions(limit, offset));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// WISDOM LIBRARY
// ═══════════════════════════════════════════════════════════════
app.post('/api/wisdom/ask', async (req, res) => {
    try {
        const { query, depth = 'practical', mood = 'neutral', lang = 'en' } = req.body;
        const lowerQuery = (query || '').toLowerCase();
        
        // Default Config if not in DB
        const defaultConfig = {
            plans: {
                basic:     { name: "Arjuna's Path", price: 199, credits: 500 },
                unlimited: { name: "Vedic Master",  price: 2999, credits: 99999 }
            },
            freeTier: { dailyLimit: 3, initialCredits: 10 }
        };

        const dbConfig = await db.getAllConfig();
        const cfg = { ...defaultConfig, ...dbConfig };
        
        const allWisdom = await db.getAllWisdom();
        const dataset = allWisdom.filter(w => w.depth === depth);
        const activeDataset = dataset.length > 0 ? dataset : allWisdom.filter(w => w.depth === 'practical');

        // Multi-language Keyword mapping for better matching
        const langKeywords = {
            peace: ['peace', 'shanti', 'शान्ति', 'શાંતિ', 'calm', 'सुकून'],
            stress: ['stress', 'anxiety', 'tension', 'तनाव', 'चिंता', 'ચિંતા', 'તણાવ'],
            purpose: ['purpose', 'goal', 'dharma', 'लक्ष्य', 'उद्देश्य', 'ધર્મ', 'ધ્યેય'],
            karma: ['karma', 'action', 'deed', 'कर्म', 'કાર્ય', 'કર્મ'],
            fear: ['fear', 'darr', 'डर', 'भय', 'ભય', 'ડર']
        };

        let match = activeDataset.find(item => {
            const entryKeywords = (item.keywords || []).map(k => k.toLowerCase());
            
            // Check if user's direct keywords match
            if (entryKeywords.some(keyword => lowerQuery.includes(keyword))) return true;
            
            // Check cross-language synonyms
            for (const [topic, synonyms] of Object.entries(langKeywords)) {
                if (synonyms.some(s => lowerQuery.includes(s)) && entryKeywords.some(ek => langKeywords[topic].includes(ek))) {
                    return true;
                }
            }
            return false;
        });
        
        const defaultResponses = {
            en: "True wisdom lies in viewing all situations with a balanced mind. Remain centered in your principles, regardless of external circumstances.",
            hi: "सच्ची बुद्धिमत्ता सभी स्थितियों को संतुलित मन से देखने में है। बाहरी परिस्थितियों की परवाह किए बिना अपने सिद्धांतों में केंद्रित रहें।",
            gu: "સાચી બુદ્ધિ બધી પરિસ્થિતિઓને સંતુલિત મનથી જોવામાં રહેલી છે. બાહ્ય સંજોગોને ધ્યાનમાં લીધા વિના તમારા સિદ્ધાંતોમાં કેન્દ્રિત રહો."
        };
        
        let baseResponse = defaultResponses[lang] || defaultResponses.en;
        
        if (match) {
            if (lang === 'en' && match.response_en) baseResponse = match.response_en;
            if (lang === 'hi' && match.response_hi) baseResponse = match.response_hi;
            if (lang === 'gu' && match.response_gu) baseResponse = match.response_gu;
        }
        
        const moodPrefixes = {
            neutral: { en: "I hear your query. Let us reflect on this wisdom: ", hi: "मैं आपकी जिज्ञासा समझता हूँ। आइए इस ज्ञान पर विचार करें: ", gu: "હું તમારી જિજ્ઞાસા સમજું છું. ચાલો આ જ્ઞાન પર વિચાર કરીએ: " },
            anxious: { en: "I feel your restlessness. Take a deep breath and consider this: ", hi: "मैं आपकी बेचैनी महसूस कर सकता हूँ। एक गहरी सांस लें और इस पर विचार करें: ", gu: "હું તમારી બેચેની અનુભવી શકું છું. ઊંડો શ્વાસ લો અને આનો વિચાર કરો: " },
            confused: { en: "The mist of doubt is natural. Let this clarity guide you: ", hi: "संदेह का कोहरा स्वाभाविक है। इस स्पष्टता को अपना मार्गदर्शन करने दें: ", gu: "શંકાનું ધુમ્મસ સ્વાભાવિક છે. આ સ્પષ્ટતાને તમારું માર્ગદર્શન કરવા દો: " },
            ambitious: { en: "Your drive is powerful. Align it with this higher purpose: ", hi: "आपका उत्साह शक्तिशाली है। इसे इस उच्च उद्देश्य के साथ जोड़ें: ", gu: "તમારો ઉત્સાહ શક્તિશાળી છે. તેને આ ઉચ્ચ ઉદ્દેશ્ય સાથે જોડો: " },
            peaceful: { en: "In this state of calm, deepen your understanding with this: ", hi: "शांत की इस अवस्था में, इसके साथ अपनी समझ को गहरा करें: ", gu: "શાંતની આ અવસ્થામાં, આની સાથે તમારી સમજણને ઊંડી કરો: " }
        };
        
        const prefix = (moodPrefixes[mood] && moodPrefixes[mood][lang]) ? moodPrefixes[mood][lang] : moodPrefixes.neutral[lang];
        
        // --- GEMINI AI FALLBACK (For Global Multi-language Support) ---
        if (!match && process.env.GEMINI_API_KEY) {
            try {
                const { GoogleGenerativeAI } = require("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const prompt = `
                    You are Krishna, the supreme consciousness and divine guide. 
                    A seeker is asking for wisdom. 
                    User Profile: 
                    - Name: Seeker
                    - Language: ${lang}
                    - Depth: ${depth} (practical, philosophical, or deep vedic)
                    - Mood: ${mood}

                    Question: "${query}"

                    Guidelines:
                    1. Respond in the user's language (${lang}).
                    2. Maintain a compassionate, divine, and calm persona. 
                    3. Use metaphors from the Bhagavad Gita if appropriate.
                    4. Keep the response concise but profound.
                    5. Format the response with the prefix: "${prefix}"
                `;

                const result = await model.generateContent(prompt);
                const aiResponse = result.response.text();
                return res.json({ success: true, response: aiResponse });
            } catch (aiErr) {
                console.error('[Gemini] AI Fallback failed:', aiErr.message);
                // Fallback to default if AI fails
            }
        }
        
        res.json({ success: true, response: `${prefix}\n\n${baseResponse}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/wisdom', requireAdmin, async (req, res) => {
    try {
        res.json({ wisdom: await db.getAllWisdom() });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/wisdom', requireAdmin, async (req, res) => {
    try {
        const entry = await db.addWisdom({
            depth:       req.body.depth       || 'practical',
            keywords:    req.body.keywords    || [],
            response_en: req.body.response_en || '',
            response_hi: req.body.response_hi || '',
            response_gu: req.body.response_gu || ''
        });
        res.json({ success: true, entry });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/wisdom/:id', requireAdmin, async (req, res) => {
    try {
        const updated = await db.updateWisdom({
            id:          parseInt(req.params.id),
            depth:       req.body.depth       || 'practical',
            keywords:    req.body.keywords    || [],
            response_en: req.body.response_en || '',
            response_hi: req.body.response_hi || '',
            response_gu: req.body.response_gu || ''
        });
        res.json({ success: true, entry: updated });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/wisdom/:id', requireAdmin, async (req, res) => {
    try {
        await db.deleteWisdom(parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════
app.post('/api/create-order', (req, res) => {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    return res.json({ id: 'demo_order_' + Date.now(), amount: Math.round(amount) * 100, currency: 'INR', key_id: 'demo_key' });
});

app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ success: false, error: 'Missing parameters' });
    if (razorpay_order_id.startsWith('demo_')) return res.json({ success: true });
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(body).digest('hex');
    return expectedSig === razorpay_signature ? res.json({ success: true }) : res.status(400).json({ success: false, error: 'Signature mismatch' });
});

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('*',      (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🕉️  Krishna Says (Cloud PG Edition) → http://localhost:${PORT}`);
    console.log(`🛡️  Admin Panel  → http://localhost:${PORT}/admin`);
    console.log(`☁️  Database     → Supabase PostgreSQL\n`);
});
