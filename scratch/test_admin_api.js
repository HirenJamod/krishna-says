const crypto = require('crypto');

const ADMIN_PASSWORD = 'Admin@4400';
const ADMIN_TOKEN = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');
const BASE_URL = 'https://krishna-says.onrender.com';

async function testAdminAPI() {
    try {
        console.log('--- Testing Admin API ---');
        
        // 1. Login
        const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: ADMIN_PASSWORD })
        });
        const loginData = await loginRes.json();
        console.log('Login Success:', loginData.success);
        const token = loginData.token;

        // 2. Stats
        const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        console.log('Stats:', statsData);

        // 3. Users
        const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        console.log('Users Count:', usersData.users ? usersData.users.length : 'N/A');
        if (usersData.users && usersData.users.length > 0) {
            console.log('First User:', usersData.users[0].name);
        }

    } catch (err) {
        console.error('API Test Error:', err.message);
    }
}

testAdminAPI();
