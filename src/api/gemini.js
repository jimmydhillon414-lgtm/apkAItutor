import { supabase } from './supabase';

export const getTutorResponse = async (userMessage, targetLanguage = 'English', level = 'Beginner') => {
  try {
    const messageText = typeof userMessage === 'string' 
      ? userMessage 
      : (userMessage?.content || JSON.stringify(userMessage));

    console.log("Invoking Supabase Edge Function (ai-proxy)...");

    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: { 
        prompt: messageText,
        targetLanguage: targetLanguage,
        level: level,
        mode: 'voice-tutor'
      }
    });

    if (error) {
      throw new Error(error.message || 'Edge function invocation failed');
    }

    if (!data || data.success === false) {
      throw new Error(data?.error || 'Unknown error from proxy');
    }

    return data.response || data?.choices?.[0]?.message?.content || JSON.stringify(data);

  } catch (error) {
    console.error('AI Proxy Error:', error);
    return JSON.stringify({
      hasCorrection: false,
      originalText: "",
      correctedText: "",
      explanation: "",
      pronunciationScore: 90,
      pronunciationTip: "Keep speaking clearly.",
      roleplayContext: "General Practice",
      scenarioObjective: "Speaking Practice",
      scenarioStage: "Active Practice",
      reply: "I am right here with you. What would you like to discuss next?"
    });
  }
};
