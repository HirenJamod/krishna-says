/**
 * otpAgent — DEMO MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Phone Auth is currently paused.
 * This mock always returns success so the app runs without Firebase credentials.
 *
 * TO RE-ENABLE: Replace this file with the real Firebase implementation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const otpAgent = {
    initRecaptcha: (_containerId) => {
        // No-op in demo mode
        console.info('[otpAgent] Demo mode — reCAPTCHA skipped.');
    },

    sendOtp: async (_phoneNumber) => {
        console.info('[otpAgent] Demo mode — OTP send simulated.');
        return { success: true };
    },

    verifyOtp: async (_code) => {
        console.info('[otpAgent] Demo mode — OTP verify simulated.');
        return { success: true, user: { uid: 'demo-user', phoneNumber: 'demo' } };
    }
};
