/**
 * razorpayAgent — PRODUCTION MODE
 */

export const razorpayAgent = {
    openCheckout: async (plan, amount, onSuccess) => {
        try {
            // 1. Create Order on Server
            const response = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, amount })
            });

            const { order } = await response.json();
            if (!order) throw new Error('Could not create payment order.');

            // 2. Initialize Razorpay Modal
            const options = {
                key: window._RAZORPAY_KEY_ID || 'rzp_test_placeholder', // Should be passed or set in window
                amount: order.amount,
                currency: "INR",
                name: "Krishna Says",
                description: `Upgrade to ${plan.toUpperCase()} Plan`,
                image: "https://krishna-says.onrender.com/assets/logo.png",
                order_id: order.id,
                handler: async function (response) {
                    // 3. Verify Payment on Server
                    const verifyRes = await fetch('/api/payments/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...response,
                            session_id: localStorage.getItem('session_id'),
                            plan: plan,
                            credits_delta: plan === 'unlimited' ? 99999 : 500
                        })
                    });

                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        onSuccess(response);
                    } else {
                        alert('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: "Seeker",
                    email: "",
                    contact: ""
                },
                theme: {
                    color: "#A67C00"
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (e) {
            console.error('[razorpayAgent] Error:', e);
            alert('Failed to start checkout. Please ensure you are logged in.');
        }
    }
};
