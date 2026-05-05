// admin.js — Krishna Says Admin Panel Logic (CommonJS back, ESM like endpoints)

let adminToken = sessionStorage.getItem('adminToken') || null;
let config = {};
let allUsers = [];
let allQueries = [];
let allTx = [];

// ──────────────────────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────────────────────
(async function boot() {
    if (adminToken) {
        const ok = await loadConfig();
        if (ok) {
            showApp();
        }
    }
})();

// ──────────────────────────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────────────────────────
document.getElementById('adminLoginBtn').addEventListener('click', doLogin);
document.getElementById('adminPasswordInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') doLogin();
});

async function doLogin() {
    const pw = document.getElementById('adminPasswordInput').value.trim();
    if (!pw) return;
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw })
        });
        const data = await res.json();
        if (data.success) {
            adminToken = data.token;
            sessionStorage.setItem('adminToken', adminToken);
            document.getElementById('loginError').style.display = 'none';
            await loadConfig();
            showApp();
        } else {
            showLoginError();
        }
    } catch {
        showLoginError();
    }
}

function showLoginError() {
    const el = document.getElementById('loginError');
    el.style.display = 'block';
    document.getElementById('adminPasswordInput').value = '';
}

// ──────────────────────────────────────────────────────────────
// LOGOUT
// ──────────────────────────────────────────────────────────────
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('adminToken');
    adminToken = null;
    document.getElementById('adminApp').style.display = 'none';
    document.getElementById('adminLogin').style.display = 'flex';
});

// ──────────────────────────────────────────────────────────────
// SHOW APP
// ──────────────────────────────────────────────────────────────
function showApp() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminApp').style.display = 'block';
    populateAll();
    loadStats();
    loadUsers();
    loadQueries();
    loadTransactions();
}

// ──────────────────────────────────────────────────────────────
// LOAD CONFIG FROM SERVER
// ──────────────────────────────────────────────────────────────
async function loadConfig() {
    try {
        const res = await fetch('/api/admin/config');
        config = await res.json();
        return true;
    } catch {
        return false;
    }
}

// ──────────────────────────────────────────────────────────────
// SAVE CONFIG TO SERVER
// ──────────────────────────────────────────────────────────────
async function saveConfig(patch) {
    try {
        const res = await fetch('/api/admin/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(patch)
        });
        const data = await res.json();
        if (data.success) {
            config = data.config;
            updateOverview();
            toast('✅ Saved successfully!', 'success');
        } else {
            toast('❌ Save failed', 'error');
        }
    } catch {
        toast('❌ Network error', 'error');
    }
}

// ──────────────────────────────────────────────────────────────
// POPULATE ALL FORMS
// ──────────────────────────────────────────────────────────────
function populateAll() {
    populateBranding();
    populateLogin();
    populatePlans();
    populateFreeTier();
    populateDisplay();
    populateAnnouncement();
    populateWisdom();
    updateOverview();
}

function val(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value !== undefined && value !== null ? value : '';
}

function populateBranding() {
    const b = config.branding || {};
    val('b_appTitle',       b.appTitle);
    val('b_appTagline',     b.appTagline);
    val('b_welcomeMessage', b.welcomeMessage);
}

function populateLogin() {
    const l = config.loginScreen || {};
    val('l_sanskritText',  l.sanskritText);
    val('l_loginTitle',    l.loginTitle);
    val('l_loginSubtitle', l.loginSubtitle);
    val('l_ascentBtnLabel',l.ascentBtnLabel);
    val('l_disclaimer',    l.disclaimer);
}

function populatePlans() {
    const p = config.plans || {};
    const b = p.basic || {};
    const u = p.unlimited || {};
    val('p_basicName',     b.name);
    val('p_basicPrice',    b.price);
    val('p_basicCredits',  b.credits);
    val('p_unlimitedName', u.name);
    val('p_unlimitedPrice',u.price);
    renderFeatures('basic',    b.features || []);
    renderFeatures('unlimited',u.features || []);
}

function populateFreeTier() {
    const f = config.freeTier || {};
    val('ft_dailyLimit',      f.dailyLimit);
    val('ft_startingCredits', f.startingCredits);
}

function populateDisplay() {
    const d = config.display || {};
    val('d_defaultSound',      d.defaultSound);
    val('d_defaultDepth',      d.defaultDepth);
    val('d_templeModeEnabled', d.templeModeEnabled);
}

function populateAnnouncement() {
    const a = config.announcement || {};
    val('a_enabled', a.enabled);
    val('a_message', a.message);
    val('a_type',    a.type);
}

function populateWisdom() {
    const list = config.wisdom || [];
    const container = document.getElementById('wisdomList');
    if (!list.length) {
        container.innerHTML = '<p style="color:var(--admin-dim);font-size:0.85rem;">No custom entries yet. Click below to add one.</p>';
        return;
    }
    container.innerHTML = list.map((entry, i) => `
        <div class="wisdom-item">
            <div class="wisdom-item-meta">
                <strong>${entry.keywords.join(', ')}</strong>
                <span>Depth: ${entry.depth} · ${entry.responses.en.slice(0, 80)}...</span>
            </div>
            <div class="wisdom-actions">
                <button class="icon-btn edit" title="Edit" onclick="editWisdom(${i})">✏️</button>
                <button class="icon-btn" title="Delete" onclick="deleteWisdom(${i})">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ──────────────────────────────────────────────────────────────
// OVERVIEW STATS
// ──────────────────────────────────────────────────────────────
function updateOverview() {
    const summary = {
        appTitle:     (config.branding  || {}).appTitle,
        loginTitle:   (config.loginScreen || {}).loginTitle,
        basicPrice:   '₹' + ((config.plans || {}).basic     || {}).price + '/mo',
        unlimitedPrice:'₹' + ((config.plans || {}).unlimited || {}).price + '/mo',
        freeDailyLimit: (config.freeTier || {}).dailyLimit + ' questions/day',
        defaultSound: (config.display   || {}).defaultSound,
        announcementEnabled: (config.announcement || {}).enabled,
        customWisdomEntries: (config.wisdom || []).length
    };
    const el = document.getElementById('configSummary');
    if (el) el.textContent = JSON.stringify(summary, null, 2);
}

async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const s = await res.json();
        document.getElementById('statTotalUsers').textContent        = s.totalUsers || 0;
        document.getElementById('statTotalQueries').textContent      = s.totalQueries || 0;
        document.getElementById('statTotalTransactions').textContent = s.totalTransactions || 0;
        document.getElementById('statWisdomCount').textContent       = s.totalWisdom || 0;
        document.getElementById('statPremiumUsers').textContent      = s.premiumUsers || 0;
    } catch (e) { console.warn('[stats] error fetching stats', e); }
}

// ──────────────────────────────────────────────────────────────
// SAVE FUNCTIONS
// ──────────────────────────────────────────────────────────────
function g(id) { return document.getElementById(id); }

function saveBranding() {
    saveConfig({
        branding: {
            appTitle:       g('b_appTitle').value,
            appTagline:     g('b_appTagline').value,
            welcomeMessage: g('b_welcomeMessage').value
        }
    });
}

function saveLogin() {
    saveConfig({
        loginScreen: {
            sanskritText:  g('l_sanskritText').value,
            loginTitle:    g('l_loginTitle').value,
            loginSubtitle: g('l_loginSubtitle').value,
            ascentBtnLabel:g('l_ascentBtnLabel').value,
            disclaimer:    g('l_disclaimer').value
        }
    });
}

function savePlans() {
    saveConfig({
        plans: {
            basic: {
                name:    g('p_basicName').value,
                price:   Number(g('p_basicPrice').value),
                credits: Number(g('p_basicCredits').value),
                features: collectFeatures('basic')
            },
            unlimited: {
                name:    g('p_unlimitedName').value,
                price:   Number(g('p_unlimitedPrice').value),
                features: collectFeatures('unlimited')
            }
        }
    });
}

function saveFreeTier() {
    saveConfig({
        freeTier: {
            dailyLimit:      Number(g('ft_dailyLimit').value),
            startingCredits: Number(g('ft_startingCredits').value)
        }
    });
}

function saveDisplay() {
    saveConfig({
        display: {
            defaultSound:       g('d_defaultSound').value,
            defaultDepth:       g('d_defaultDepth').value,
            templeModeEnabled:  g('d_templeModeEnabled').checked
        }
    });
}

function saveAnnouncement() {
    saveConfig({
        announcement: {
            enabled: g('a_enabled').checked,
            message: g('a_message').value,
            type:    g('a_type').value
        }
    });
}

// ──────────────────────────────────────────────────────────────
// FEATURE LIST EDITOR
// ──────────────────────────────────────────────────────────────
function renderFeatures(plan, features) {
    const listId = plan === 'basic' ? 'basicFeatureList' : 'unlimitedFeatureList';
    const container = document.getElementById(listId);
    container.innerHTML = features.map((f, i) => `
        <div class="feature-item">
            <input type="text" class="admin-input" value="${f}" data-plan="${plan}" data-index="${i}">
            <button class="icon-btn" onclick="removeFeature('${plan}', ${i})">✕</button>
        </div>
    `).join('');
}

function collectFeatures(plan) {
    const listId = plan === 'basic' ? 'basicFeatureList' : 'unlimitedFeatureList';
    return [...document.querySelectorAll(`#${listId} input`)].map(i => i.value.trim()).filter(Boolean);
}

function addFeature(plan) {
    const features = collectFeatures(plan);
    features.push('');
    renderFeatures(plan, features);
    const listId = plan === 'basic' ? 'basicFeatureList' : 'unlimitedFeatureList';
    const inputs = document.querySelectorAll(`#${listId} input`);
    if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeFeature(plan, index) {
    const features = collectFeatures(plan);
    features.splice(index, 1);
    renderFeatures(plan, features);
}

// ──────────────────────────────────────────────────────────────
// WISDOM CRUD
// ──────────────────────────────────────────────────────────────
function openWisdomModal(editIndex = -1) {
    g('wm_editIndex').value = editIndex;
    if (editIndex >= 0) {
        const entry = config.wisdom[editIndex];
        g('wisdomModalTitle').textContent = '✏️ Edit Wisdom Entry';
        val('wm_depth',    entry.depth);
        val('wm_keywords', entry.keywords.join(', '));
        val('wm_en',       (entry.responses || {}).en);
        val('wm_hi',       (entry.responses || {}).hi);
        val('wm_gu',       (entry.responses || {}).gu);
    } else {
        g('wisdomModalTitle').textContent = '➕ Add Wisdom Entry';
        ['wm_depth','wm_keywords','wm_en','wm_hi','wm_gu'].forEach(id => {
            const el = g(id);
            if (el.type !== 'select-one') el.value = '';
        });
        val('wm_depth', 'practical');
    }
    g('wisdomModal').classList.add('active');
}

function closeWisdomModal() {
    g('wisdomModal').classList.remove('active');
}

function editWisdom(index) {
    openWisdomModal(index);
}

async function saveWisdomEntry() {
    const keywords = g('wm_keywords').value.split(',').map(k => k.trim()).filter(Boolean);
    if (!keywords.length) { toast('⚠️ Please enter at least one keyword', 'error'); return; }
    if (!g('wm_en').value.trim()) { toast('⚠️ English response is required', 'error'); return; }

    const entry = {
        depth: g('wm_depth').value,
        keywords,
        response_en: g('wm_en').value.trim(),
        response_hi: g('wm_hi').value.trim(),
        response_gu: g('wm_gu').value.trim()
    };

    const editIndex = parseInt(g('wm_editIndex').value);
    const method = editIndex >= 0 ? 'PUT' : 'POST';
    const endpoint = editIndex >= 0 ? `/api/admin/wisdom/${config.wisdom[editIndex].id}` : '/api/admin/wisdom';

    try {
        const res = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify(entry)
        });
        if (res.ok) {
            closeWisdomModal();
            toast('✅ Wisdom saved!', 'success');
            await loadConfig();
            populateWisdom();
            loadStats();
        } else {
            toast('❌ Failed to save wisdom', 'error');
        }
    } catch { toast('❌ Network error', 'error'); }
}

async function deleteWisdom(index) {
    if (!confirm('Delete this wisdom entry?')) return;
    try {
        const entry = config.wisdom[index];
        const res = await fetch(`/api/admin/wisdom/${entry.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (res.ok) {
            toast('✅ Wisdom entry deleted', 'success');
            await loadConfig();
            populateWisdom();
            loadStats();
        } else {
            toast('❌ Delete failed', 'error');
        }
    } catch { toast('❌ Network error', 'error'); }
}

// ──────────────────────────────────────────────────────────────
// USERS SECTION
// ──────────────────────────────────────────────────────────────
async function loadUsers() {
    try {
        const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const d = await res.json();
        allUsers = d.users || [];
        renderUsersTable(allUsers);
    } catch (e) { console.warn('[users] load failed', e); }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    document.getElementById('usersCount').textContent = `${users.length} Users`;
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-icon">👥</div>No users registered yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr>
            <td class="mono truncate" title="${u.session_id}">${u.session_id}</td>
            <td>
                <strong>${u.name || 'Seeker'}</strong><br>
                <span style="font-size:0.75rem;color:var(--admin-dim);">${u.email || ''} ${u.phone || ''}</span>
            </td>
            <td>
                <span class="plan-badge plan-${u.subscription || 'free'}">${u.subscription || 'free'}</span>
            </td>
            <td>${u.credits !== null && u.credits !== undefined ? (u.credits === Infinity ? '∞' : u.credits) : 10}</td>
            <td>${u.streak_count || 0} 🔥</td>
            <td style="font-size:0.78rem;color:var(--admin-dim);">${u.last_seen || ''}</td>
        </tr>
    `).join('');
}

function filterUsersTable() {
    const query = document.getElementById('usersSearch').value.toLowerCase().trim();
    if (!query) return renderUsersTable(allUsers);
    const filtered = allUsers.filter(u =>
        (u.name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.session_id || '').toLowerCase().includes(query)
    );
    renderUsersTable(filtered);
}

// ──────────────────────────────────────────────────────────────
// QUERIES SECTION
// ──────────────────────────────────────────────────────────────
async function loadQueries() {
    try {
        const res = await fetch('/api/admin/queries?limit=100', { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const d = await res.json();
        allQueries = d.rows || [];
        renderQueriesTable(allQueries);
    } catch (e) { console.warn('[queries] load failed', e); }
}

function renderQueriesTable(queries) {
    const tbody = document.getElementById('queriesTableBody');
    document.getElementById('queriesCount').textContent = `${queries.length} Queries`;
    if (!queries.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><div class="empty-icon">💬</div>No queries logged yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = queries.map(q => `
        <tr>
            <td style="font-size:0.75rem;color:var(--admin-dim);white-space:nowrap;">${q.asked_at || ''}</td>
            <td><strong>${q.user_name || 'Seeker'}</strong><br><span class="mono" style="font-size:0.7rem;">${q.session_id}</span></td>
            <td>
                <div style="margin-bottom:0.35rem;font-weight:600;color:var(--admin-text);">${q.question || ''}</div>
                <div style="font-size:0.78rem;color:var(--admin-dim);background:rgba(255,255,255,0.02);padding:0.5rem;border-radius:6px;border:1px solid rgba(255,255,255,0.03);">${q.response || ''}</div>
            </td>
            <td>
                <span class="plan-badge plan-basic" style="margin-bottom:0.25rem;">${q.depth || 'practical'}</span><br>
                <span class="plan-badge plan-free">${q.lang || 'en'}</span>
            </td>
        </tr>
    `).join('');
}

function filterQueriesTable() {
    const query = document.getElementById('queriesSearch').value.toLowerCase().trim();
    if (!query) return renderQueriesTable(allQueries);
    const filtered = allQueries.filter(q =>
        (q.question || '').toLowerCase().includes(query) ||
        (q.user_name || '').toLowerCase().includes(query) ||
        (q.session_id || '').toLowerCase().includes(query)
    );
    renderQueriesTable(filtered);
}

// ──────────────────────────────────────────────────────────────
// TRANSACTIONS SECTION
// ──────────────────────────────────────────────────────────────
async function loadTransactions() {
    try {
        const res = await fetch('/api/admin/transactions?limit=100', { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const d = await res.json();
        allTx = d.rows || [];
        renderTxTable(allTx);
    } catch (e) { console.warn('[tx] load failed', e); }
}

function renderTxTable(txs) {
    const tbody = document.getElementById('txTableBody');
    document.getElementById('txCount').textContent = `${txs.length} Transactions`;
    if (!txs.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-icon">💳</div>No transactions logged yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = txs.map(t => `
        <tr>
            <td style="font-size:0.75rem;color:var(--admin-dim);">${t.created_at || ''}</td>
            <td><strong>${t.user_name || 'Seeker'}</strong><br><span class="mono" style="font-size:0.7rem;">${t.session_id}</span></td>
            <td>
                <span class="plan-badge plan-unlimited">${t.type || 'subscription'}</span><br>
                <span style="font-size:0.75rem;color:var(--admin-dim);">${t.plan || ''}</span>
            </td>
            <td><strong>₹${t.amount || 0}</strong></td>
            <td>${t.credits_delta > 0 ? '+' : ''}${t.credits_delta || 0} credits</td>
            <td class="mono truncate" title="${t.payment_id || ''}">${t.payment_id || 'demo_payment'}</td>
        </tr>
    `).join('');
}

function filterTxTable() {
    const query = document.getElementById('txSearch').value.toLowerCase().trim();
    if (!query) return renderTxTable(allTx);
    const filtered = allTx.filter(t =>
        (t.user_name || '').toLowerCase().includes(query) ||
        (t.plan || '').toLowerCase().includes(query) ||
        (t.payment_id || '').toLowerCase().includes(query) ||
        (t.session_id || '').toLowerCase().includes(query)
    );
    renderTxTable(filtered);
}

// ──────────────────────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────────────────────
document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        navTo(panel);
    });
});

function navTo(panel) {
    document.querySelectorAll('.admin-nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.panel === panel);
    });
    document.querySelectorAll('.admin-panel').forEach(p => {
        p.classList.toggle('active', p.id === `panel-${panel}`);
    });
    // Dynamically load fresh DB records when changing tabs
    if (panel === 'users') loadUsers();
    if (panel === 'queries') loadQueries();
    if (panel === 'transactions') loadTransactions();
    if (panel === 'overview') loadStats();
}

// ──────────────────────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
    const el = document.getElementById('adminToast');
    el.textContent = msg;
    el.className = `show ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = ''; }, 3000);
}
