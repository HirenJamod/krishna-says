import { userProfile, updateProfile, greetings } from './js/profileAgent.js';
import { generateWisdom } from './js/wisdomAgent.js';
import { elements, addMessage, speak, init3DEffect, renderVerses, addTransaction, renderHistory, renderFavorites, showToast, showTypingIndicator, hideTypingIndicator } from './js/uiAgent.js';
import { authAgent } from './js/authAgent.js';
import { masterAgent } from './js/masterAgent.js';
import { otpAgent } from './js/otpAgent.js';
import { razorpayAgent } from './js/razorpayAgent.js';

// ─── Admin Config ─────────────────────────────────────────────────────────────
let adminConfig = {};
async function loadAdminConfig() {
    try {
        const res = await fetch('/api/admin/config');
        adminConfig = await res.json();
        applyAdminConfig();
    } catch (e) {
        console.warn('[config] Could not load admin config, using defaults.');
    }
}

function applyAdminConfig() {
    const cfg = adminConfig;

    // Branding: browser tab title
    if (cfg.branding) {
        if (cfg.branding.appTagline) document.title = `${cfg.branding.appTitle || 'Krishna Says'} | ${cfg.branding.appTagline}`;
    }

    // Login screen text
    if (cfg.loginScreen) {
        const ls = cfg.loginScreen;
        const sanskritEl = document.querySelector('.login-sanskrit');
        const titleEl    = document.getElementById('loginThemeTitle');
        const subtitleEl = document.getElementById('loginThemeSubtitle');
        const btnEl      = document.getElementById('startJourneyBtn');
        const disclaimerEl = document.querySelector('.demo-mode-badge p');
        if (sanskritEl  && ls.sanskritText)   sanskritEl.textContent  = ls.sanskritText;
        if (titleEl     && ls.loginTitle)      titleEl.textContent     = ls.loginTitle;
        if (subtitleEl  && ls.loginSubtitle)   subtitleEl.textContent  = ls.loginSubtitle;
        if (btnEl       && ls.ascentBtnLabel)  btnEl.textContent       = ls.ascentBtnLabel;
        if (disclaimerEl && ls.disclaimer)     disclaimerEl.innerHTML  = `<strong style="color:#FF9933;">Demo Mode</strong> — ${ls.disclaimer}`;
    }

    // Subscription plan names, prices, features
    if (cfg.plans) {
        const b = cfg.plans.basic     || {};
        const u = cfg.plans.unlimited || {};
        // Plan modal cards — basic
        const basicNameEls  = document.querySelectorAll('[data-plan-name="basic"]');
        const basicPriceEls = document.querySelectorAll('[data-plan-price="basic"]');
        basicNameEls.forEach(el  => { if (b.name)  el.textContent = b.name; });
        basicPriceEls.forEach(el => { if (b.price) el.textContent = `₹${b.price}`; });
        // unlimited
        const uNameEls  = document.querySelectorAll('[data-plan-name="unlimited"]');
        const uPriceEls = document.querySelectorAll('[data-plan-price="unlimited"]');
        uNameEls.forEach(el  => { if (u.name)  el.textContent = u.name; });
        uPriceEls.forEach(el => { if (u.price) el.textContent = `₹${u.price}`; });
    }

    // Free tier
    if (cfg.freeTier) {
        authAgent.applyConfig(cfg.freeTier);
    }

    // Display defaults
    if (cfg.display) {
        const d = cfg.display;
        if (d.defaultDepth) {
            updateProfile({ depth: d.defaultDepth });
            document.querySelectorAll('.depth-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.depth === d.defaultDepth);
            });
        }
        // defaultSound stored for use in handleDisclaimer
        if (d.defaultSound) window._adminDefaultSound = d.defaultSound;
    }

    // Custom wisdom entries — inject into wisdomData
    if (Array.isArray(cfg.wisdom) && cfg.wisdom.length > 0) {
        cfg.wisdom.forEach(entry => {
            const pool = wisdomData[entry.depth];
            if (pool) {
                // Avoid duplicates on hot-reload
                const already = pool.some(e => JSON.stringify(e.keywords) === JSON.stringify(entry.keywords));
                if (!already) pool.unshift(entry);
            }
        });
    }

    // Announcement banner
    if (cfg.announcement && cfg.announcement.enabled && cfg.announcement.message) {
        showAnnouncementBanner(cfg.announcement);
    }
}

function showAnnouncementBanner(announcement) {
    const existing = document.getElementById('announcementBanner');
    if (existing) existing.remove();
    const typeColors = {
        info:    'rgba(99,179,237,0.15)',
        warning: 'rgba(246,216,96,0.15)',
        danger:  'rgba(220,50,50,0.15)'
    };
    const typeBorders = {
        info:    'rgba(99,179,237,0.5)',
        warning: 'rgba(246,216,96,0.5)',
        danger:  'rgba(220,50,50,0.5)'
    };
    const icons = { info: 'ℹ️', warning: '⚠️', danger: '🚨' };
    const t = announcement.type || 'info';
    const banner = document.createElement('div');
    banner.id = 'announcementBanner';
    banner.style.cssText = `
        position:fixed;top:0;left:0;right:0;z-index:99998;
        background:${typeColors[t]};
        border-bottom:1px solid ${typeBorders[t]};
        backdrop-filter:blur(20px);
        padding:0.6rem 1.5rem;
        display:flex;align-items:center;justify-content:space-between;
        font-size:0.85rem;color:#f0f0f5;
    `;
    banner.innerHTML = `
        <span>${icons[t]} ${announcement.message}</span>
        <span style="cursor:pointer;opacity:0.6;font-size:1rem;" onclick="this.parentElement.remove()">✕</span>
    `;
    document.body.prepend(banner);
}

window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error:', msg, '| Line:', lineNo, error ? error.stack : '');
    return false;
};

// State
let isVoiceEnabled = false;
let hasAcknowledged = false;
let selectedMood = 'neutral';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let userStreak = JSON.parse(localStorage.getItem('userStreak') || '{"count": 0, "lastDate": null}');

// Session ID (persisted across page loads per user)
let sessionId = localStorage.getItem('krishna_session_id');
if (!sessionId) {
    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('krishna_session_id', sessionId);
}

// ─── DB API Helpers ────────────────────────────────────────────────────────────
async function dbUpsertUser(profile) {
    try {
        await fetch('/api/users/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, ...profile })
        });
    } catch (e) { console.warn('[db] upsertUser failed', e); }
}

async function dbLogQuery(question, response) {
    try {
        await fetch('/api/queries/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                user_name:  userProfile.name || 'Seeker',
                question,
                response:   typeof response === 'string' ? response.replace(/<[^>]*>/g,'').slice(0,500) : '',
                depth:      userProfile.depth || 'practical',
                mood:       selectedMood || 'neutral',
                lang:       userProfile.lang  || 'en'
            })
        });
    } catch (e) { console.warn('[db] logQuery failed', e); }
}

async function dbLogTransaction(type, plan = '', amount = 0, creditsDelta = 0, paymentId = '') {
    try {
        await fetch('/api/transactions/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id:    sessionId,
                user_name:     userProfile.name || 'Seeker',
                type, plan, amount,
                credits_delta: creditsDelta,
                payment_id:    paymentId,
                status:        'success'
            })
        });
    } catch (e) { console.warn('[db] logTransaction failed', e); }
}

const audioTracks = {
    flute: './assets/audio/flute.mp3',
    nature: './assets/audio/nature.mp3',
    chants: './assets/audio/chants.mp3'
};

// Initialize
init3DEffect();
loadAdminConfig();

// Initialize recaptcha when page loads
document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    otpAgent.initRecaptcha('recaptcha-container');

    // Restore Session on Boot
    const isLoggedIn = sessionStorage.getItem('krishna_logged_in') === 'true';
    if (isLoggedIn) {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.remove('active');
        // Prepopulate username from localStorage if available
        const savedProfile = JSON.parse(localStorage.getItem('krishna_auth_state') || '{}');
        if (savedProfile.name) userProfile.name = savedProfile.name;
        
        // Auto-start session for returning users
        setTimeout(() => {
            if (typeof window.handleDisclaimer === 'function') {
                window.handleDisclaimer();
            } else {
                document.body.classList.remove('login-pending');
            }
        }, 100);
    }
});

// Client Logout Listener
function handleLogout() {
    if (confirm('Are you sure you want to log out and end your cosmic session?')) {
        sessionStorage.removeItem('krishna_logged_in');
        localStorage.removeItem('krishna_auth_state');
        localStorage.removeItem('krishna_session_id');
        window.location.reload();
    }
}

const clientLogoutBtn = document.getElementById('clientLogoutBtn');
if (clientLogoutBtn) clientLogoutBtn.addEventListener('click', handleLogout);

const headerLogoutBtn = document.getElementById('headerLogoutBtn');
if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', handleLogout);

const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

// OTP Logic — PAUSED (Firebase Auth is disabled)
// Phone/OTP section is hidden in the UI.
// To re-enable: uncomment this block and restore the phone row in index.html.
/*
elements.sendOtpBtn.addEventListener('click', async () => { ... });
*/

// Depth Selection
elements.depthBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.depthBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const depth = btn.dataset.depth;
        updateProfile({ depth });

        // Visual Vibe: Shift background based on depth.
        // Use classList to avoid wiping other classes (e.g. login-pending, temple-mode)
        document.body.classList.remove('depth-practical', 'depth-philosophical', 'depth-deep');
        document.body.classList.add(`depth-${depth}`);
    });
});

// Start Journey — OTP AUTHENTICATION FLOW
let currentContact = '';
let otpSent = false;
let isNewUser = false;

async function clientSendOtp() {
    const contact = document.getElementById('authContact').value.trim();
    if (!contact) {
        showToast('Please enter your email or mobile number.', 'error');
        return;
    }
    console.log('[auth] Attempting to send OTP to:', contact);
    try {
        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact })
        });
        console.log('[auth] Server response status:', res.status);
        const data = await res.json();
        if (data.success) {
            currentContact = contact;
            otpSent = true;
            document.getElementById('otpWrapper').style.display = 'flex';
            document.getElementById('authOtpInput').value = data.otp; // Auto-fill in demo mode
            
            // IQ200 DYNAMIC FLOW
            if (data.exists) {
                isNewUser = false;
                document.getElementById('signupFields').style.display = 'none';
                document.getElementById('loginThemeSubtitle').innerText = 'Welcome back! Enter your cosmic code.';
                showToast('✨ Cosmic OTP sent! Code: ' + data.otp, 'success');
                if (data.user && data.user.name) {
                    document.getElementById('userName').value = data.user.name;
                }
            } else {
                isNewUser = true;
                document.getElementById('signupFields').style.display = 'flex';
                document.getElementById('loginThemeSubtitle').innerText = "Looks like you're new here. Let's set up your profile.";
                showToast('✨ Cosmic OTP sent! Please prepare your profile.', 'success');
            }
        } else {
            showToast(data.error || 'Failed to send OTP.', 'error');
        }
    } catch {
        showToast('Network error while sending OTP.', 'error');
    }
}
// Make globally accessible for direct onclick handlers if needed
window.clientSendOtp = clientSendOtp;

const sendOtpBtn = document.getElementById('clientSendOtpBtn');
if (sendOtpBtn) {
    console.log('[auth] Binding click event to clientSendOtpBtn');
    sendOtpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clientSendOtp();
    });
}

[document.getElementById('userName'), document.getElementById('authContact'), document.getElementById('authOtpInput')].forEach(input => {
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                elements.startJourneyBtn.click();
            }
        });
    }
});

elements.startJourneyBtn.addEventListener('click', async () => {
    const name = document.getElementById('userName').value.trim();
    const contact = document.getElementById('authContact').value.trim();
    const otp = document.getElementById('authOtpInput').value.trim();

    if (!contact) {
        showToast('Please enter your email or mobile.', 'error');
        return;
    }

    // 1. If OTP has not been sent yet, automatically send it first for better UX
    if (!otpSent) {
        await clientSendOtp();
        return;
    }

    if (isNewUser && !name) {
        showToast('Please enter your name to begin.', 'error');
        return;
    }

    if (otpSent && !otp) {
        showToast('Please enter the OTP.', 'error');
        return;
    }

    // 2. Verify OTP with Server/Database
    try {
        const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contact, 
                otp, 
                name, 
                lang: elements.langPref.value, 
                depth: userProfile.depth 
            })
        });
        const d = await res.json();
        if (d.success) {
            const profileData = {
                name: d.user.name,
                email: contact.includes('@') ? contact : d.user.email,
                phone: !contact.includes('@') ? contact : d.user.phone,
                lang: elements.langPref.value,
                depth: d.user.depth || 'practical'
            };

            sessionId = d.user.session_id;
            localStorage.setItem('krishna_session_id', sessionId);
            updateProfile(profileData);

            sessionStorage.setItem('krishna_logged_in', 'true');

            // Smooth Transition: Exit Animation
            elements.loginModal.classList.add('exit');

            setTimeout(() => {
                elements.loginModal.classList.remove('active');
                elements.loginModal.classList.remove('exit');

                // Step 2: Show Pre-Chat Disclaimer
                setTimeout(() => {
                    elements.preChatDisclaimer.classList.add('active');
                }, 100);
            }, 800);
        } else {
            showToast(d.error || 'Invalid OTP. Please try again.', 'error');
        }
    } catch (e) {
        showToast('Network error while verifying OTP.', 'error');
    }
});

// ─── Audio Helper ─────────────────────────────────────────────────────────────
// Central function to play/stop background audio.
// Must be called from within a user gesture callback (browser autoplay policy).
function playBgAudio(trackKey) {
    if (!elements.bgAudio) return;
    if (trackKey === 'none') {
        elements.bgAudio.pause();
        elements.bgAudio.src = '';
        localStorage.setItem('bgSound', 'none');
        return;
    }
    const src = audioTracks[trackKey];
    if (!src) return;

    // Only reload src if it's a different track (avoids restart on same track)
    const currentSrc = elements.bgAudio.src || '';
    if (!currentSrc.includes(trackKey)) {
        elements.bgAudio.src = src;
    }
    elements.bgAudio.loop   = true;
    elements.bgAudio.volume = 0.45;
    elements.bgAudio.play().catch(() => {
        console.info('[audio] Autoplay blocked — will play on next user interaction.');
    });
    localStorage.setItem('bgSound', trackKey);

    // Sync the dropdown UI to reflect the current track
    if (elements.soundSelector && elements.soundSelector.value !== trackKey) {
        elements.soundSelector.value = trackKey;
    }
}

// Step 3: Accept Disclaimer & Start
window.handleDisclaimer = () => {
    const disclaimer = document.getElementById('preChatDisclaimer');
    if (disclaimer) disclaimer.classList.remove('active');
    document.body.classList.remove('login-pending');
    hasAcknowledged = true;

    const lang  = userProfile.lang  || 'en';
    const name  = userProfile.name  || 'Seeker';
    const depth = userProfile.depth || 'practical';

    const greetingFn = greetings[lang] || greetings.en;
    const initialMsg = greetingFn(name, depth);

    setTimeout(() => {
        if (elements.chatHistory) elements.chatHistory.innerHTML = '';
        addMessage(initialMsg, false);
        if (isVoiceEnabled) speak(initialMsg, lang, isVoiceEnabled);

        // Auto-start music — use admin default or saved pref
        const savedSound = localStorage.getItem('bgSound') || window._adminDefaultSound || 'flute';
        playBgAudio(savedSound);
        showToast('🎵 Background music started. Use the top bar to change tracks.', 'info');

        showDailyVerse();
        updateStreak();
    }, 500);
};

// Also keep the event listener for redundancy
if (elements.acceptDisclaimerBtn) {
    elements.acceptDisclaimerBtn.addEventListener('click', window.handleDisclaimer);
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastDate = userStreak.lastDate;

    if (lastDate !== today) {
        if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
            userStreak.count++;
        } else {
            userStreak.count = 1;
        }
        userStreak.lastDate = today;
        localStorage.setItem('userStreak', JSON.stringify(userStreak));
    }
    
    if (elements.streakCount) {
        elements.streakCount.textContent = userStreak.count;
    }
}

function showDailyVerse() {
    if (!elements.dailyVerse) return;
    const all = [...wisdomData.practical, ...wisdomData.philosophical, ...wisdomData.deep];
    // Date-seed: same verse for all users on the same day
    const seed = new Date().toDateString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const picked = all[seed % all.length];

    elements.dailyVerseTitle.textContent = picked.keywords[0];
    elements.dailyVerseText.textContent = picked.responses[userProfile.lang] || picked.responses.en;
    elements.dailyVerse.style.display = 'block';
}

// Audio Toggle
elements.voiceToggle.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    elements.voiceToggle.classList.toggle('active');
    elements.voiceIcon.textContent = isVoiceEnabled ? '🔊' : '🔇';
    if (!isVoiceEnabled) window.speechSynthesis.cancel();
});

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.onstart = () => elements.micBtn.classList.add('recording');
    recognition.onresult = (e) => {
        elements.userInput.value = e.results[0][0].transcript;
        handleSend();
    };
    recognition.onend = () => elements.micBtn.classList.remove('recording');
    elements.micBtn.addEventListener('click', () => recognition.start());
} else {
    elements.micBtn.style.display = 'none';
}

// Chat Logic
async function handleSend() {
    const text = elements.userInput.value.trim();
    if (!text) return;

    // Check Access via Auth Agent
    if (!authAgent.hasAccess()) {
        showToast('You have run out of credits. Please recharge in the Wallet.', 'error');
        elements.modalOverlay.classList.add('active');
        return;
    }

    addMessage(text, true);
    elements.userInput.value = '';

    // Consume via Auth Agent (Tracks history and limits)
    const authResult = authAgent.consume(text);
    if (elements.creditBalance) {
        elements.creditBalance.textContent = authResult.subscription === 'unlimited' ? '∞' : authResult.credits;
    }
    
    // Log Transaction & History
    addTransaction('Wisdom Query', authResult.subscription === 'unlimited' ? 0 : -1, authResult.credits);
    renderHistory(authResult.history);

    // Step 1 & 2: Detect & Respond (Safety + Wisdom)
    // SPEED: Unlimited users get 300ms, others get tiered speed
    const processTime = authAgent.getProcessTime();
    
    showTypingIndicator();
    setTimeout(async () => {
        hideTypingIndicator();
        const guardedResult = await masterAgent.processQuery(text, userProfile, selectedMood);

        addMessage(guardedResult.content, false, true);

        // Log query to database
        dbLogQuery(text, guardedResult.content);

        if (guardedResult.isEscalationNeeded) {
            elements.escalationOverlay.classList.add('active');
        }

        if (isVoiceEnabled) {
            const plainText = guardedResult.content.replace(/<[^>]*>/g, '');
            speak(plainText, userProfile.lang, isVoiceEnabled);
        }
    }, processTime);
}

elements.sendBtn.addEventListener('click', handleSend);
elements.userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// Sidebar & Modals
elements.goProBtn.addEventListener('click', () => elements.modalOverlay.classList.add('active'));
elements.closeModal.addEventListener('click', () => elements.modalOverlay.classList.remove('active'));
elements.closeEscalation.addEventListener('click', () => elements.escalationOverlay.classList.remove('active'));

// View Navigation
elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetView = item.dataset.view;
        if (!targetView) return;

        // Update Nav UI
        elements.navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update View Sections
        elements.viewSections.forEach(section => {
            section.classList.toggle('active', section.id === `${targetView}View`);
        });

        // If Verses view, initial render
        if (targetView === 'verses') {
            const allVerses = adminConfig.wisdom || [];
            renderVerses(allVerses, userProfile.lang);
        }
        
        // If Favorites view, render favorites
        if (targetView === 'favorites') {
            renderFavorites(favorites);
        }
    });
});

// Favorites Logic
window.saveFavorite = (text) => {
    const plainText = text.replace(/<[^>]*>/g, '');
    const isDuplicate = favorites.some(f => f.text === plainText);
    if (!isDuplicate) {
        favorites.push({ text: plainText, note: '' });
        localStorage.setItem('favorites', JSON.stringify(favorites));
        showToast('Insight saved to your favorites! ⭐', 'success');
    } else {
        showToast('Already in your favorites.', 'info');
    }
};

window.saveNote = (index, note) => {
    favorites[index].note = note;
    localStorage.setItem('favorites', JSON.stringify(favorites));
};

window.removeFavorite = (index) => {
    favorites.splice(index, 1);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites(favorites);
};

// Audio Management — uses playBgAudio() helper defined above
elements.soundSelector.addEventListener('change', (e) => {
    playBgAudio(e.target.value);
    if (e.target.value === 'none') {
        showToast('🔇 Background music off', 'info');
    } else {
        const labels = { flute: '🪈 Flute', nature: '🍃 Nature', chants: '🕉️ Chants' };
        showToast(`${labels[e.target.value]} playing`, 'success');
    }
});

// Mood Selection
elements.moodChips.forEach(chip => {
    chip.addEventListener('click', () => {
        elements.moodChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedMood = chip.dataset.mood;
    });
});

// Temple Mode Toggle
elements.templeToggle.addEventListener('click', () => {
    const isOn = document.body.classList.toggle('temple-mode');
    elements.templeToggle.classList.toggle('active', isOn);

    if (isOn) {
        showToast('🪔 Temple Mode ON — Sacred atmosphere activated', 'success');
        // Auto-switch to chants when entering temple mode
        playBgAudio('chants');
    } else {
        showToast('✨ Temple Mode OFF', 'info');
        // Restore previous sound or flute
        const savedSound = localStorage.getItem('bgSound') || 'flute';
        playBgAudio(savedSound === 'chants' ? 'flute' : savedSound);
    }
});

// Subscription Upgrades — use admin-configured prices
elements.subscribeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const plan = btn.dataset.plan;
        // Use admin config prices if available, else fallback
        const plans   = (adminConfig.plans || {});
        const credits = (plans.basic || {}).credits || 50;
        const amount  = plan === 'unlimited'
            ? ((plans.unlimited || {}).price || 299)
            : ((plans.basic    || {}).price  || 99);

        showToast(`Opening payment gateway...`, 'info');

        razorpayAgent.openCheckout(plan, amount, (response) => {
            const newState = authAgent.upgrade(plan, credits);
            showToast(`🎉 You are now on the ${plan.toUpperCase()} tier!`, 'success');
            elements.modalOverlay.classList.remove('active');
            if (elements.creditBalance) {
                elements.creditBalance.textContent = newState.subscription === 'unlimited' ? '∞' : newState.credits;
            }
            // Log payment transaction to database
            dbLogTransaction('subscription', plan, amount, credits, (response || {}).razorpay_payment_id || '');
        });
    });
});

// Wallet: Recharge Credits button
const rechargeBtn = document.querySelector('#walletView .subscribe-btn');
if (rechargeBtn) {
    rechargeBtn.addEventListener('click', () => {
        // Open the subscription/upgrade modal so the user can choose a plan
        if (elements.modalOverlay) elements.modalOverlay.classList.add('active');
    });
}

// Mobile Bottom Nav Handler
document.querySelectorAll('.mobile-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
        const targetView = item.dataset.view;
        document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        elements.navItems.forEach(nav => nav.classList.toggle('active', nav.dataset.view === targetView));
        elements.viewSections.forEach(section => {
            section.classList.toggle('active', section.id === `${targetView}View`);
        });
        if (targetView === 'verses') renderVerses(adminConfig.wisdom || [], userProfile.lang);
        if (targetView === 'favorites') renderFavorites(favorites);
    });
});

const mobileGoProBtn = document.getElementById('mobileGoProBtn');
if (mobileGoProBtn) mobileGoProBtn.addEventListener('click', () => elements.modalOverlay.classList.add('active'));

// Verse Search
elements.verseSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const allVerses = adminConfig.wisdom || [];
    const filtered = allVerses.filter(item => 
        (item.keywords || []).some(k => k.toLowerCase().includes(term)) ||
        ((item.responses && item.responses.en) || "").toLowerCase().includes(term)
    );
    renderVerses(filtered, userProfile.lang);
});

// Digital Sanskrit Matrix (Cyber-Vedic Starfield)
function initStarfield() {
    const starfield = document.getElementById('starfield');
    if (!starfield) return;
    
    const count = 60;
    const chars = ['ॐ', 'क्रि', 'श', 'न', 'ध', 'र्म', 'स', 'त्य', 'अ', 'आ', 'इ', 'ई'];
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'matrix-char';
        star.innerText = chars[Math.floor(Math.random() * chars.length)];
        const size = (Math.random() * 1.5 + 0.8) + 'rem';
        star.style.fontSize = size;
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.setProperty('--duration', (Math.random() * 15 + 10) + 's');
        star.style.animationDelay = (Math.random() * -15) + 's'; // Negative delay so they are visible immediately
        starfield.appendChild(star);
    }
}

// NOTE: initStarfield is already registered inside the DOMContentLoaded listener
// at the top of this file (line 32). Duplicate removed to avoid double star creation.
// Re-init if dynamically cleared
window.initStarfield = initStarfield;

// Holographic Card Physics (Event Delegation)
document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.verse-card');
    if (!card) return;
    
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Move the glare
    card.style.setProperty('--x', `${(x / rect.width) * 100 - 50}%`);
    card.style.setProperty('--y', `${(y / rect.height) * 100 - 50}%`);
    
    // Slight 3D tilt on hover
    const xAxis = (rect.width / 2 - x) / 10;
    const yAxis = (rect.height / 2 - y) / 10;
    card.style.transform = `perspective(1000px) rotateY(${-xAxis}deg) rotateX(${yAxis}deg) scale(1.05)`;
});

document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.verse-card');
    if (!card) return;
    
    card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
    card.style.setProperty('--x', '-100%');
    card.style.setProperty('--y', '-100%');
});


// ─── PWA File Handling ────────────────────────────────────────────────────────
if (typeof launchQueue !== 'undefined') {
    launchQueue.setConsumer((launchParams) => {
        if (launchParams.files && launchParams.files.length) {
            console.log('[PWA] Launched with file:', launchParams.files[0].name);
            if (typeof showToast === 'function') showToast('Opening file: ' + launchParams.files[0].name, 'info');
        }
    });
}

// ─── PWA Share Target Handling ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const parsedUrl = new URL(window.location);
    const sharedText = parsedUrl.searchParams.get('text') || parsedUrl.searchParams.get('title') || parsedUrl.searchParams.get('url');
    if (sharedText && elements.chatInput) {
        console.log('[PWA] Received shared content:', sharedText);
        elements.chatInput.value = sharedText;
        showToast('Shared content received', 'info');
        // Optionally trigger the masterAgent.handleUserQuery() here
    }
});

// ─── PWA Sync & Notifications ────────────────────────────────────────────────
async function registerSyncs() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // 1. Background Sync
        if ('sync' in registration) {
            try { await registration.sync.register('sync-queries'); } catch (e) { console.log('Background Sync failed'); }
        }

        // 2. Periodic Sync (requires app installation)
        if ('periodicSync' in registration) {
            try {
                const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                if (status.state === 'granted') {
                    await registration.periodicSync.register('daily-wisdom', { minInterval: 24 * 60 * 60 * 1000 });
                }
            } catch (e) { console.log('Periodic Sync failed'); }
        }

        // 3. Push Notifications
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') console.log('Notification permission granted');
        }
    }
}
registerSyncs();
