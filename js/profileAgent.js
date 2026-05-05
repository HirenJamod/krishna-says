// Profile Agent: Handles User State and Onboarding
export let userProfile = {
    name: '',
    email: '',
    phone: '',
    lang: 'en',
    depth: 'practical'
};

export function updateProfile(data) {
    userProfile = { ...userProfile, ...data };
    return userProfile;
}

export const greetings = {
    en: (name, depth) => `Greetings, ${name}. I am here to offer guidance on your ${depth} path.`,
    hi: (name, depth) => `नमस्ते, ${name}। मैं आपके ${depth} पथ पर मार्गदर्शन के लिए यहाँ हूँ।`,
    gu: (name, depth) => `નમસ્તે, ${name}। હું તમારા ${depth} માર્ગ પર માર્ગદર્શન માટે અહીં છું।`
};
