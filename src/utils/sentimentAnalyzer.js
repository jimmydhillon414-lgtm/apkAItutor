// utils/sentimentAnalyzer.js
export function detectUserMood(text = '') {
  const lower = text.toLowerCase();
  const frustratedWords = ['hard', 'difficult', 'confused', 'dont understand', 'stuck', 'error'];
  const excitedWords = ['great', 'easy', 'awesome', 'fun', 'got it'];

  if (frustratedWords.some(word => lower.includes(word))) {
    return 'ENCOURAGING'; // Shift AI tone to be extra supportive and simple
  }
  if (excitedWords.some(word => lower.includes(word))) {
    return 'CHALLENGING'; // Shift AI tone to introduce harder vocabulary
  }
  return 'STANDARD';
}

export function getAdjustedSystemPrompt(basePrompt, mood) {
  if (mood === 'ENCOURAGING') {
    return `${basePrompt} The user seems frustrated or stuck. Keep explanations extra simple, patient, and motivating.`;
  }
  if (mood === 'CHALLENGING') {
    return `${basePrompt} The user is doing well. Introduce advanced phrasing or idioms to stretch their skills.`;
  }
  return basePrompt;
}
