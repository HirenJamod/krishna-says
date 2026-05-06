// UI Agent: Handles DOM, Animations, and Audio
const elementCache = {};
const elementSelectors = {
    chatHistory: 'chatHistory',
    userInput: 'userInput',
    sendBtn: 'sendBtn',
    appShell: 'appShell',
    goProBtn: 'goProBtn',
    modalOverlay: 'modalOverlay',
    closeModal: 'closeModal',
    loginModal: 'loginModal',
    sendOtpBtn: 'clientSendOtpBtn',
    otpInput: 'authOtpInput',
    startJourneyBtn: 'startJourneyBtn',
    langPref: 'langPref',
    micBtn: 'micBtn',
    voiceToggle: 'voiceToggle',
    voiceIcon: 'voiceIcon',
    escalationOverlay: 'escalationOverlay',
    closeEscalation: 'closeEscalation',
    versesList: 'versesList',
    verseSearch: 'verseSearch',
    creditBalance: 'creditBalance',
    activityLog: 'activityLog',
    questionHistory: 'questionHistory',
    preChatDisclaimer: 'preChatDisclaimer',
    acceptDisclaimerBtn: 'acceptDisclaimerBtn',
    templeToggle: 'templeToggle',
    wisdomCardOverlay: 'wisdomCardOverlay',
    wisdomCardContent: 'wisdomCardContent',
    closeCard: 'closeCard',
    favoritesList: 'favoritesList',
    dailyVerse: 'dailyVerse',
    dailyVerseTitle: 'dailyVerseTitle',
    dailyVerseText: 'dailyVerseText',
    soundSelector: 'soundSelector',
    bgAudio: 'bgAudio',
    streakCount: 'streakCount'
};

const multiSelectors = {
    depthBtns: '.depth-btn',
    navItems: '.nav-item',
    viewSections: '.view-section',
    subscribeBtns: '.subscribe-btn[data-plan]',
    moodChips: '.mood-chip'
};

export const elements = new Proxy({}, {
    get(target, prop) {
        if (elementCache[prop]) return elementCache[prop];
        
        if (elementSelectors[prop]) {
            const el = document.getElementById(elementSelectors[prop]);
            if (el) elementCache[prop] = el;
            return el;
        }
        
        if (multiSelectors[prop]) {
            const els = document.querySelectorAll(multiSelectors[prop]);
            if (els.length > 0) elementCache[prop] = els;
            return els;
        }

        return undefined;
    }
});

export function renderFavorites(favorites) {
    if (!elements.favoritesList) return;
    elements.favoritesList.innerHTML = '';
    if (favorites.length === 0) {
        elements.favoritesList.innerHTML = '<p style="color: var(--text-dim); text-align: center; grid-column: 1/-1; padding: 3rem;">No favorites saved yet.</p>';
        return;
    }
    favorites.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'verse-card';
        card.innerHTML = `
            <h3>Insight #${index + 1}</h3>
            <p style="margin-bottom: 1rem;">${item.text}</p>
            <textarea 
                placeholder="Write your reflection here..." 
                style="width: 100%; background: rgba(255,255,255,0.6); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main); padding: 0.75rem; font-size: 0.8rem; height: 80px; resize: none; margin-bottom: 1rem;"
                onchange="window.saveNote(${index}, this.value)"
            >${item.note || ''}</textarea>
            <div class="message-actions" style="opacity: 1;">
                <span class="action-icon" onclick="window.removeFavorite(${index})">🗑️ Remove</span>
            </div>
        `;
        elements.favoritesList.appendChild(card);
    });
}

export function showWisdomCard(text) {
    if (!elements.wisdomCardContent) return;
    const plainText = text.replace(/<[^>]*>/g, '');
    elements.wisdomCardContent.innerHTML = `
        <div class="wisdom-card-text">"${plainText}"</div>
        <div class="wisdom-card-footer">— Krishna says</div>
        <div style="margin-top: 2rem; display: flex; gap: 1rem; position: relative; z-index: 1;">
            <button class="subscribe-btn" id="copyCardBtn" style="padding: 0.5rem 1.5rem; font-size: 0.9rem;">📋 Copy Wisdom</button>
        </div>
        <button class="close-modal" id="closeCard" style="top: 2rem; right: 2rem;">✕</button>
    `;
    elements.wisdomCardOverlay.classList.add('active');
    
    document.getElementById('copyCardBtn').onclick = () => {
        navigator.clipboard.writeText(plainText);
        alert('Wisdom copied to clipboard! Ready to share.');
    };
    
    // Re-bind close event
    document.getElementById('closeCard').onclick = () => {
        elements.wisdomCardOverlay.classList.remove('active');
    };
}

export function renderHistory(history) {
    if (!elements.questionHistory) return;
    elements.questionHistory.innerHTML = '';
    history.slice().reverse().forEach(item => {
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div style="flex: 1;">
                <p style="font-weight: 600;">${item.question}</p>
                <p style="font-size: 0.75rem; color: var(--text-dim);">${new Date(item.date).toLocaleString()}</p>
            </div>
        `;
        elements.questionHistory.appendChild(div);
    });
}

export function renderVerses(data, lang) {
    if (!elements.versesList) return;
    elements.versesList.innerHTML = '';
    
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'verse-card';
        card.innerHTML = `
            <h3>${item.keywords[0]}</h3>
            <p>${item.responses[lang] || item.responses.en}</p>
        `;
        elements.versesList.appendChild(card);
    });
}

export function showEscalationPopup() {
    if (elements.escalationOverlay) {
        elements.escalationOverlay.classList.add('active');
    }
}

export function addTransaction(type, amount, balance) {
    if (!elements.transactionList) return;
    const item = document.createElement('div');
    item.className = 'transaction-item';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
        <div style="flex: 1;">
            <p style="font-weight: 600;">${type}</p>
            <p style="font-size: 0.75rem; color: var(--text-dim);">Today, ${time}</p>
        </div>
        <p style="color: ${amount < 0 ? '#ff4d4d' : '#4ade80'};">${amount < 0 ? '' : '+'}${amount} Credit</p>
    `;
    elements.activityLog.prepend(item);
}

export function addMessage(text, isUser = false, isHtml = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const textContainer = document.createElement('div');
    msgDiv.appendChild(textContainer);

    if (isUser) {
        if (isHtml) textContainer.innerHTML = text;
        else textContainer.textContent = text;
    } else {
        // Decrypting Wisdom Animation (Cyber-Vedic effect)
        const finalHtml = isHtml ? text : text.replace(/\n/g, '<br>');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = finalHtml;
        const finalString = tempDiv.textContent || tempDiv.innerText || "";
        
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*ॐकृशनधर्म';
        let iterations = 0;
        const maxIterations = 20;
        
        const scrambleInterval = setInterval(() => {
            textContainer.innerText = finalString.split('').map((char, index) => {
                if (char.trim() === '') return char;
                if (index < (iterations / maxIterations) * finalString.length) {
                    return finalString[index];
                }
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');
            
            iterations++;
            if (iterations > maxIterations) {
                clearInterval(scrambleInterval);
                textContainer.innerHTML = finalHtml;
                elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
            }
        }, 40);
    }

    if (!isUser) {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        const cardBtn = document.createElement('span');
        cardBtn.className = 'action-icon';
        cardBtn.innerHTML = '🎴 View Card';
        cardBtn.onclick = () => showWisdomCard(text);
        
        const saveBtn = document.createElement('span');
        saveBtn.className = 'action-icon';
        saveBtn.innerHTML = '⭐ Save';
        saveBtn.onclick = () => window.saveFavorite(text);
        
        actions.appendChild(cardBtn);
        actions.appendChild(saveBtn);
        msgDiv.appendChild(actions);
    }

    elements.chatHistory.appendChild(msgDiv);
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

export function speak(text, lang, isEnabled) {
    if (!isEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const bgAudio = document.getElementById('bgAudio');
    if (bgAudio) bgAudio.pause();

    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { hi: 'hi-IN', en: 'en-US', gu: 'gu-IN' };
    utterance.lang = langMap[lang] || 'en-US';
    
    utterance.onend = () => {
        // Resume background music if it was playing previously
        const savedSound = localStorage.getItem('bgSound') || 'flute';
        if (bgAudio && savedSound !== 'none') {
            bgAudio.play().catch(e => console.info('[audio] Resume blocked by browser.'));
        }
    };

    window.speechSynthesis.speak(utterance);
}

export function init3DEffect() {
    document.addEventListener('mousemove', (e) => {
        if (!elements.appShell) return;
        
        const xAxis = (window.innerWidth / 2 - e.pageX) / 40;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 40;
        
        // Only apply 3D tilt to the main dashboard, NOT the login form
        // to prevent input hit-testing bugs.
        elements.appShell.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    });
}

// --- Toast Notifications ---
export function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3200);
}

// --- Typing Indicator ---
export function showTypingIndicator() {
    const chatHistory = document.getElementById('chatHistory');
    if (!chatHistory || document.getElementById('typingIndicator')) return;
    const indicator = document.createElement('div');
    indicator.className = 'message ai-message typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    chatHistory.appendChild(indicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

export function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}
