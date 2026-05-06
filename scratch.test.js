/**
 * @vitest-environment jsdom
 *
 * Krishna Says — UI Integration Tests
 * Run with: npm test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ESM-compatible __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const html = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf8');

describe('Krishna Says — App UI Tests', () => {
    beforeEach(async () => {
        // Reset DOM with full HTML
        document.documentElement.innerHTML = html;

        // Mock browser APIs unavailable in jsdom
        window.alert = vi.fn();
        window.scrollTo = vi.fn();
        window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };

        // Mock HTMLMediaElement (audio)
        if (!window.HTMLMediaElement) {
            window.HTMLMediaElement = class {};
        }
        window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
        window.HTMLMediaElement.prototype.pause = vi.fn();

        // Mock localStorage (jsdom sometimes does not have a fully functional one)
        const store = {};
        const localStorageMock = {
            getItem: vi.fn((key) => store[key] ?? null),
            setItem: vi.fn((key, value) => { store[key] = String(value); }),
            removeItem: vi.fn((key) => { delete store[key]; }),
            clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
            configurable: true
        });

        // Mock Firebase and Razorpay globals so main.js doesn't crash in test env
        window.firebase = {
            initializeApp: vi.fn(),
            auth: vi.fn(() => ({
                signInWithPhoneNumber: vi.fn()
            }))
        };
        window.firebase.auth.RecaptchaVerifier = vi.fn();
        window.Razorpay = vi.fn().mockImplementation(() => ({
            open: vi.fn(),
            on: vi.fn()
        }));

        // Reset modules so main.js re-evaluates cleanly
        vi.resetModules();

        // Dynamically import main.js to attach event listeners
        await import('./main.js');

        // Fire DOMContentLoaded to trigger init scripts (starfield, recaptcha)
        document.dispatchEvent(new Event('DOMContentLoaded'));

        // Allow async initializations to settle
        await new Promise(r => setTimeout(r, 150));
    });

    // ── Login Modal ───────────────────────────────────────────────────────────

    it('should initialize with the login modal active', () => {
        const loginModal = document.getElementById('loginModal');
        expect(loginModal).not.toBeNull();
        expect(loginModal.classList.contains('active')).toBe(true);
        expect(document.body.classList.contains('login-pending')).toBe(true);
    });

    // ── Phone/OTP Fields ──────────────────────────────────────────────────────
    // Phone auth is paused — fields are hidden. Verify they exist in DOM but are hidden.

    it('should have OTP fields hidden in the DOM initially', () => {
        const otpWrapper = document.getElementById('otpWrapper');
        expect(otpWrapper).not.toBeNull();
        expect(otpWrapper.style.display).toBe('none');
    });

    // ── Name-only Login (Demo Mode) ───────────────────────────────────────────

    it('should reject login when name is empty', () => {
        const startBtn = document.getElementById('startJourneyBtn');
        const userName = document.getElementById('userName');

        userName.value = '';
        startBtn.click();

        // Modal should remain active — login was blocked
        const loginModal = document.getElementById('loginModal');
        expect(loginModal.classList.contains('active')).toBe(true);
    });

    // ── Depth Selector ────────────────────────────────────────────────────────

    it('should update depth class on body without wiping other classes', () => {
        // Simulate login-pending state
        document.body.classList.add('login-pending');

        const deepBtn = document.querySelector('[data-depth="deep"]');
        deepBtn.click();

        expect(deepBtn.classList.contains('active')).toBe(true);
        expect(document.body.classList.contains('depth-deep')).toBe(true);
        // Crucially, login-pending must NOT have been removed
        expect(document.body.classList.contains('login-pending')).toBe(true);
    });

    it('should switch depth class correctly between options', () => {
        const philosophicalBtn = document.querySelector('[data-depth="philosophical"]');
        const practicalBtn = document.querySelector('[data-depth="practical"]');

        philosophicalBtn.click();
        expect(document.body.classList.contains('depth-philosophical')).toBe(true);
        expect(document.body.classList.contains('depth-practical')).toBe(false);

        practicalBtn.click();
        expect(document.body.classList.contains('depth-practical')).toBe(true);
        expect(document.body.classList.contains('depth-philosophical')).toBe(false);
    });

    // ── View Navigation ───────────────────────────────────────────────────────

    it('should activate the correct view section when a nav item is clicked', () => {
        const versesNavItem = document.querySelector('[data-view="verses"]');
        versesNavItem.click();

        const versesView = document.getElementById('versesView');
        const chatView = document.getElementById('chatView');

        expect(versesView.classList.contains('active')).toBe(true);
        expect(chatView.classList.contains('active')).toBe(false);
    });

    // ── Starfield ─────────────────────────────────────────────────────────────

    it('should generate exactly 150 stars in the starfield (no duplicates)', () => {
        const starfield = document.getElementById('starfield');
        expect(starfield).not.toBeNull();
        // Clear any stars already added during beforeEach, then re-run a clean init
        starfield.innerHTML = '';
        window.initStarfield();
        const stars = starfield.querySelectorAll('.matrix-char');
        expect(stars.length).toBe(150);
    });

    // ── Mood Selector ─────────────────────────────────────────────────────────

    it('should mark only the clicked mood chip as active', () => {
        const anxiousChip = document.querySelector('[data-mood="anxious"]');
        anxiousChip.click();

        const activeChips = document.querySelectorAll('.mood-chip.active');
        expect(activeChips.length).toBe(1);
        expect(activeChips[0].dataset.mood).toBe('anxious');
    });
});
