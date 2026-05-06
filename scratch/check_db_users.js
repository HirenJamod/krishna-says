const db = require('../db.js');

async function checkUsers() {
    try {
        const stats = await db.getStats();
        console.log('--- Database Stats ---');
        console.log('Total Users:', stats.totalUsers);
        console.log('Total Queries:', stats.totalQueries);
        console.log('Total Transactions:', stats.totalTransactions);
        console.log('Total Wisdom Entries:', stats.totalWisdom);
        console.log('Premium Users:', stats.premiumUsers);
        
        const users = await db.getAllUsers();
        console.log('\n--- User List (Latest 5) ---');
        users.slice(0, 5).forEach(u => {
            console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Phone: ${u.phone}, Last Seen: ${u.last_seen}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error checking users:', err);
        process.exit(1);
    }
}

checkUsers();
