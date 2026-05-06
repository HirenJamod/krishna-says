const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Time from DB:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
        if (err.stack) console.error(err.stack);
    }
}

testConnection();
