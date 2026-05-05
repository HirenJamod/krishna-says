// Wisdom Agent: The knowledge base and matching engine (Backend Connected)

export async function generateWisdom(query, lang, depth, mood = 'neutral') {
    try {
        const response = await fetch('/api/wisdom/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, lang, depth, mood })
        });
        
        const data = await response.json();
        if (data.success && data.response) {
            return data.response;
        } else {
            throw new Error(data.error || 'Unknown error from server');
        }
    } catch (e) {
        console.error('Error fetching wisdom:', e);
        // Fallback response if the server is unreachable
        const fallbacks = {
            en: "True wisdom lies in viewing all situations with a balanced mind. Remain centered in your principles.",
            hi: "सच्ची बुद्धिमत्ता सभी स्थितियों को संतुलित मन से देखने में है। अपने सिद्धांतों में केंद्रित रहें।",
            gu: "સાચી બુદ્ધિ બધી પરિસ્થિતિઓને સંતુલિત મનથી જોવામાં રહેલી છે. તમારા સિદ્ધાંતોમાં કેન્દ્રિત રહો."
        };
        return fallbacks[lang] || fallbacks.en;
    }
}
