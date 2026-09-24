// utils/speechService.js
import * as Speech from 'expo-speech';

export const speakText = (text, language = 'en-US') => {
  Speech.stop(); // Stop any ongoing speech
  Speech.speak(text, {
    language: language,
    pitch: 1.0,
    rate: 0.95, // Slightly slower for language learners
    onError: (err) => console.error('TTS Error:', err),
  });
};
