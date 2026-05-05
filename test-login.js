const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf-8');
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("jsdomError", (error) => { console.error("JSDOM Error:", error.stack, error.detail); });
virtualConsole.sendTo(console);
const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole, url: "http://localhost:3000/" });

dom.window.fetch = async (url, options) => {
    console.log('[fetch]', url);
    return {
        json: async () => {
            if (url.includes('send-otp')) return { success: true, otp: '108108', exists: false };
            if (url.includes('verify-otp')) return { success: true, user: { session_id: 's1', name: 'Test', depth: 'practical' } };
            if (url.includes('admin/config')) return {};
            return {};
        }
    };
};

setTimeout(() => {
    console.log("DOM loaded. Simulating login...");
    const doc = dom.window.document;
    doc.getElementById('userName').value = 'Test User';
    doc.getElementById('authContact').value = 'test@example.com';
    
    // Attempt Ascend
    doc.getElementById('startJourneyBtn').click();
    
    setTimeout(() => {
        console.log("OTP Sent flag:", dom.window.otpSent || "Check manually");
        
        // Let's type OTP
        doc.getElementById('authOtpInput').value = '108108';
        doc.getElementById('startJourneyBtn').click();
        
        setTimeout(() => {
            console.log('Login modal classes:', doc.getElementById('loginModal').className);
        }, 1000);
    }, 1000);
}, 1000);
