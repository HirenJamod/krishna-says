// Master Agent: The central brain coordinating specialized agents
import { contextAgent } from './contextAgent.js';
import { generateWisdom } from './wisdomAgent.js';
import { systemGuard } from './safetyAgent.js';

export const masterAgent = {
    processQuery: async (query, profile, mood) => {
        // 1. Context Analysis
        const isFollowUp = contextAgent.isFollowUp(query);
        const context = contextAgent.getContext();
        
        let rawResponse;
        
        // 2. Fetch wisdom from Backend
        try {
            rawResponse = await generateWisdom(query, profile.lang, profile.depth, mood);
            
            if (isFollowUp && context.topicThread) {
                const ack = {
                    en: `Building on our reflection on ${context.topicThread}:\n\n`,
                    hi: `हमारे पिछले विषय ${context.topicThread} को आगे बढ़ाते हुए:\n\n`,
                    gu: `આપણા પાછલા વિષય ${context.topicThread} ને આગળ વધારતા:\n\n`
                };
                rawResponse = (ack[profile.lang] || ack.en) + rawResponse;
            }
        } catch (e) {
            rawResponse = "True wisdom lies in viewing all situations with a balanced mind.";
        }

        // 3. Safety Guard
        const guardedResult = systemGuard(rawResponse, query);

        // 4. Update Context
        contextAgent.update(query, guardedResult.content);

        return guardedResult;
    }
};
