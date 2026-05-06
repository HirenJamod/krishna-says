const db = require('../db');

async function updatePlans() {
    console.log('[setup] Updating subscription plans to Strategic Projection...');
    
    const newPlans = {
        basic: {
            name: "Arjuna's Path",
            price: 199,
            credits: 500, // Effectively unlimited for monthly
            features: ["Unlimited Wisdom", "Voice Recognition", "Global Languages"]
        },
        unlimited: {
            name: "Vedic Master",
            price: 2999,
            credits: 99999, // Lifetime
            features: ["Lifetime Access", "Priority Insights", "Sacred Journal"]
        }
    };

    try {
        await db.setConfig('plans', newPlans);
        console.log('[setup] SUCCESS: Plans updated to Arjuna\'s Path (₹199) and Vedic Master (₹2,999)');
        process.exit(0);
    } catch (e) {
        console.error('[setup] FAILED to update plans:', e);
        process.exit(1);
    }
}

updatePlans();
