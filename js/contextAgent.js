// Context Agent: Manages conversation flow and short-term memory
let conversationContext = {
    previousQuestions: [],
    lastAnswer: null,
    topicThread: null
};

export const contextAgent = {
    update: (question, answer) => {
        conversationContext.previousQuestions.push(question);
        conversationContext.lastAnswer = answer;
        
        // Basic topic detection
        if (question.includes('stress') || question.includes('anxiety')) {
            conversationContext.topicThread = 'peace';
        } else if (question.includes('purpose') || question.includes('goal')) {
            conversationContext.topicThread = 'dharma';
        }
        
        // Keep only last 5 questions
        if (conversationContext.previousQuestions.length > 5) {
            conversationContext.previousQuestions.shift();
        }
    },
    
    getContext: () => conversationContext,
    
    isFollowUp: (query) => {
        const followUpKeywords = ['it', 'that', 'this', 'why', 'how', 'more', 'explain'];
        return followUpKeywords.some(k => query.toLowerCase().includes(k)) && conversationContext.lastAnswer !== null;
    }
};
