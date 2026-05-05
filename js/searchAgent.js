// Search Agent: Advanced keyword matching with weighted scoring
import { wisdomData } from './wisdomAgent.js';

export const searchAgent = {
    findBestMatch: (query, depth) => {
        const lowerQuery = query.toLowerCase();
        const dataset = wisdomData[depth] || wisdomData.practical;
        
        let bestMatch = null;
        let highestScore = 0;

        dataset.forEach(item => {
            let score = 0;
            item.keywords.forEach(keyword => {
                if (lowerQuery.includes(keyword.toLowerCase())) {
                    // Match score based on keyword length (longer words usually more specific)
                    score += keyword.length;
                    
                    // Exact match bonus
                    if (lowerQuery === keyword.toLowerCase()) {
                        score += 50;
                    }
                }
            });

            if (score > highestScore) {
                highestScore = score;
                bestMatch = item;
            }
        });

        return { match: bestMatch, score: highestScore };
    }
};
