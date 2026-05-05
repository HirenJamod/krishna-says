/**
 * razorpayAgent — DEMO MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * Razorpay payments are currently paused.
 * This mock shows an in-app demo checkout UI and simulates a successful payment.
 *
 * TO RE-ENABLE: Replace this file with the real Razorpay implementation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function showDemoCheckout(plan, amount, onSuccess) {
    // Remove any existing demo modal
    document.getElementById('demoCheckoutModal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'demoCheckoutModal';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid rgba(255,153,51,0.35);
            border-radius: 24px;
            padding: 2.5rem;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 0 60px rgba(255,153,51,0.15);
            font-family: inherit;
            color: white;
            position: relative;
        ">
            <!-- Header -->
            <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
                <div style="width:44px; height:44px; background:linear-gradient(135deg,#FF9933,#FFD700); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">🕉️</div>
                <div>
                    <p style="font-size:0.7rem; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:2px; margin:0;">Demo Checkout</p>
                    <p style="font-size:1.1rem; font-weight:700; margin:0;">Krishna Says</p>
                </div>
                <div style="margin-left:auto; text-align:right;">
                    <p style="font-size:0.7rem; color:rgba(255,255,255,0.5); margin:0;">${plan.toUpperCase()} Plan</p>
                    <p style="font-size:1.4rem; font-weight:800; color:#FF9933; margin:0;">₹${amount}<span style="font-size:0.7rem; color:rgba(255,255,255,0.5)">/mo</span></p>
                </div>
            </div>

            <!-- Demo Notice -->
            <div style="background:rgba(255,153,51,0.08); border:1px solid rgba(255,153,51,0.25); border-radius:12px; padding:0.9rem 1rem; margin-bottom:1.5rem; display:flex; gap:0.75rem; align-items:flex-start;">
                <span style="font-size:1rem;">🧪</span>
                <p style="font-size:0.78rem; color:rgba(255,255,255,0.65); margin:0; line-height:1.5;">
                    <strong style="color:#FF9933;">Demo Mode</strong> — Razorpay is paused. Click <em>Confirm Payment</em> to simulate a successful transaction.
                </p>
            </div>

            <!-- Mock Card Fields -->
            <div style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem;">
                <input value="4111 1111 1111 1111" readonly style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.75rem 1rem; color:rgba(255,255,255,0.5); font-size:0.9rem; cursor:default; outline:none;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <input value="12/29" readonly style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.75rem 1rem; color:rgba(255,255,255,0.5); font-size:0.9rem; cursor:default; outline:none;">
                    <input value="•••" readonly style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0.75rem 1rem; color:rgba(255,255,255,0.5); font-size:0.9rem; cursor:default; outline:none;">
                </div>
            </div>

            <!-- Buttons -->
            <button id="demoPayConfirm" style="
                width:100%; padding:0.9rem; border:none; border-radius:14px; cursor:pointer;
                background:linear-gradient(135deg,#FF9933,#FFD700);
                color:#0f172a; font-weight:800; font-size:1rem; letter-spacing:0.5px;
                transition: opacity 0.2s; margin-bottom:0.75rem;
            ">✅ Confirm Payment (Demo)</button>

            <button id="demoPayCancel" style="
                width:100%; padding:0.75rem; border:1px solid rgba(255,255,255,0.12); border-radius:14px; cursor:pointer;
                background:transparent; color:rgba(255,255,255,0.45); font-size:0.85rem;
                transition: border-color 0.2s;
            ">Cancel</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Handlers
    document.getElementById('demoPayConfirm').addEventListener('click', () => {
        const btn = document.getElementById('demoPayConfirm');
        btn.textContent = 'Processing…';
        btn.disabled = true;

        // Simulate brief processing delay
        setTimeout(() => {
            overlay.remove();
            onSuccess({
                razorpay_payment_id: 'demo_pay_' + Date.now(),
                razorpay_order_id: 'demo_order_' + Date.now(),
                razorpay_signature: 'demo_signature'
            });
        }, 1200);
    });

    document.getElementById('demoPayCancel').addEventListener('click', () => overlay.remove());

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

export const razorpayAgent = {
    openCheckout: async (plan, amount, onSuccess) => {
        console.info('[razorpayAgent] Demo mode — showing mock checkout.');
        showDemoCheckout(plan, amount, onSuccess);
    }
};
