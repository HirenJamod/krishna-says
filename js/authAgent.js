// Auth Agent: Manages User Credits, Subscriptions, and History
// Supports dynamic config from admin panel (dailyLimit, startingCredits)
const STORAGE_KEY = 'krishna_auth_state';

let dynamicDailyLimit    = 5;
let dynamicStartCredits  = 10;

const defaultState = () => ({
    credits: dynamicStartCredits,
    subscription: 'free',
    dailyLimit: dynamicDailyLimit,
    questionsToday: 0,
    history: [],
    lastResetDate: new Date().toDateString()
});

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) return defaultState();
        if (saved.lastResetDate !== new Date().toDateString()) {
            saved.questionsToday = 0;
            saved.lastResetDate = new Date().toDateString();
        }
        return saved;
    } catch (e) {
        return defaultState();
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

export const authAgent = {
    getState: () => state,

    // Called after admin config is fetched — updates live limits
    applyConfig: (freeTier = {}) => {
        if (freeTier.dailyLimit)     dynamicDailyLimit   = freeTier.dailyLimit;
        if (freeTier.startingCredits !== undefined) dynamicStartCredits = freeTier.startingCredits;
        // Update current session state if still on free tier
        if (state.subscription === 'free') {
            state.dailyLimit = dynamicDailyLimit;
        }
    },

    hasAccess: () => {
        if (state.subscription === 'unlimited') return true;
        if (state.subscription === 'basic') return state.credits > 0;
        return state.questionsToday < state.dailyLimit;
    },

    consume: (question) => {
        state.questionsToday++;
        state.history.push({ question, date: new Date().toISOString() });

        if (state.subscription === 'unlimited') {
            saveState();
            return { success: true, ...state };
        }

        if (state.subscription === 'basic' || state.subscription === 'free') {
            if (state.credits > 0) state.credits--;
            saveState();
            return { success: true, ...state };
        }

        saveState();
        return { success: false, ...state };
    },

    upgrade: (plan, credits) => {
        state.subscription = plan;
        if (plan === 'basic') {
            state.credits += (credits || 50);
            state.dailyLimit = 50;
        } else if (plan === 'unlimited') {
            state.dailyLimit = Infinity;
        }
        saveState();
        return state;
    },

    getProcessTime: () => {
        if (state.subscription === 'unlimited') return 300;
        if (state.subscription === 'basic') return 600;
        return 1200;
    }
};
