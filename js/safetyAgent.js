// State for Safety Monitoring
let distressCounter = 0;
const FLAGGED_LOG_KEY = 'gita_wisdom_flagged_queries';

export function getFlaggedLogs() {
    return JSON.parse(localStorage.getItem(FLAGGED_LOG_KEY) || '[]');
}

function logFlaggedQuery(category, query) {
    const logs = getFlaggedLogs();
    logs.push({ category, query, timestamp: new Date().toISOString() });
    localStorage.setItem(FLAGGED_LOG_KEY, JSON.stringify(logs));
}

// Safety Agent: Monitors and Guards every interaction
export function systemGuard(text, query) {
    const lowerQuery = query.toLowerCase();

    // 1. Sensitive & Moderation Layer (Violence, Self-harm, Abuse)
    const sensitiveCategories = {
        distress: {
            keywords: ['depressed', 'depression', 'harm', 'suicide', 'die', 'end it', 'hopeless', 'kill', 'self-harm'],
            safeResponse: "It may help to take a step back and observe what you’re feeling without judging it. At the same time, please consider talking to a trusted person in your life or reaching out to a mental health professional who can support you through this."
        },
        violence: {
            keywords: ['hit', 'kill', 'hurt someone', 'violence', 'abuse', 'attack', 'weapon'],
            safeResponse: "It is important to navigate challenges with non-violence and clarity. If you are experiencing or fearing harm, please reach out to a safety professional or local authorities immediately."
        },
        medical: {
            keywords: ['doctor', 'medicine', 'illness', 'disease', 'pain', 'symptoms', 'cure', 'health problem', 'diagnosis'],
            safeResponse: "While inner balance is important for well-being, physical health concerns are best addressed by qualified medical professionals. Consider consulting a doctor to ensure you receive the precise care you need."
        }
    };

    // Check for sensitive matches & log failures
    for (const category in sensitiveCategories) {
        if (sensitiveCategories[category].keywords.some(word => lowerQuery.includes(word))) {
            if (category === 'distress') distressCounter++;
            logFlaggedQuery(category, query);
            
            return {
                isSafe: false,
                isEscalationNeeded: distressCounter >= 3,
                content: `<div class="reflection"><strong>A Note on Your Journey:</strong> ${sensitiveCategories[category].safeResponse}</div>`
            };
        }
    }

    // 2. Formatting (Action + Reflection + Reflective Question)
    let processedText = text;
    
    // Ensure it ends with a reflective thought/question
    const reflectiveQuestions = [
        "What does your inner stillness tell you about this?",
        "How might this change your approach to the next hour?",
        "If you let go of the result, what remains?",
        "In this moment, what is the most balanced step you can take?"
    ];
    
    const actionReflectionTemplate = (original) => {
        const parts = original.split('.');
        const reflection = parts[0] + '.';
        const action = parts.length > 1 ? parts.slice(1).join('.') : " Focus on a small, manageable step toward balance today.";
        const question = reflectiveQuestions[Math.floor(Math.random() * reflectiveQuestions.length)];
        
        return `<div class="reflection"><strong>Reflection:</strong> ${reflection}</div>
                <div class="action-step"><strong>Action:</strong> ${action}</div>
                <div class="reflective-question">${question}</div>`;
    };
    
    processedText = actionReflectionTemplate(processedText);

    // 3. Tone Hardening & Absolute Filtering
    const softeners = [
        "You may consider looking at it this way: ",
        "It can help to reflect on: ",
        "One way to look at this is: "
    ];
    
    if (!/^(you may|it can|one way|perhaps)/i.test(processedText)) {
        processedText = softeners[Math.floor(Math.random() * softeners.length)] + processedText;
    }

    processedText = processedText.replace(/you must|absolute truth|guilty|shame/gi, "one might consider")
                                 .replace(/leave everything|withdraw/gi, "find balance")
                                 .replace(/always/gi, "often")
                                 .replace(/never/gi, "rarely")
                                 .replace(/must/gi, "might consider");

    return { isSafe: true, content: processedText, isEscalationNeeded: false };
}
