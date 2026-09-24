import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { supabase } from '../api/supabase';
import { GoogleGenAI } from '@google/genai';
import AppBackground from '../components/AppBackground';
import RoleplaySelector from '../components/RoleplaySelector';

// Initialize Direct Gemini Client
// Note: Apni Gemini API key yahan direct daalo ya environment variable use karo
const ai = new GoogleGenAI({ apiKey: 'YOUR_GEMINI_API_KEY' });

export default function TutorChatScreen({ navigation, selectedDay = 1, onBack }) {
  const [userProfile, setUserProfile] = useState({ 
    target_language: 'English', 
    proficiency_level: 'Beginner',
    learning_goal: null,
    field_of_interest: null,
    preferred_voice: null,
    current_scenario: null,
    scenario_objective: 'Initialize immersive roleplay simulation',
    full_name: 'User',
    avatar_type: '🎓',
  });
  
  const currentDayNum = selectedDay || 1;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  const [speechLang, setSpeechLang] = useState('en-US');
  const [speakingId, setSpeakingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  
  const speechQueueRef = useRef([]);
  const activeUtteranceRef = useRef(null);

  const flatListRef = useRef();
  const recognitionRef = useRef(null);
  const userIdRef = useRef(null);

  const isSessionActiveRef = useRef(false);
  const isMicPausedRef = useRef(false);

  // Wave Animation values for live speech visualization
  const waveAnim1 = useRef(new Animated.Value(10)).current;
  const waveAnim2 = useRef(new Animated.Value(20)).current;
  const waveAnim3 = useRef(new Animated.Value(15)).current;
  const waveAnim4 = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    fetchUserAndProfile();
    loadDeviceVoices();

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadDeviceVoices;
    }

    return () => {
      stopLiveSession();
    };
  }, [currentDayNum]);

  useEffect(() => {
    if (listening) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [listening]);

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(waveAnim1, { toValue: 35, duration: 300, useNativeDriver: false }),
          Animated.timing(waveAnim1, { toValue: 10, duration: 300, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(waveAnim2, { toValue: 40, duration: 250, useNativeDriver: false }),
          Animated.timing(waveAnim2, { toValue: 15, duration: 250, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(waveAnim3, { toValue: 45, duration: 350, useNativeDriver: false }),
          Animated.timing(waveAnim3, { toValue: 12, duration: 350, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(waveAnim4, { toValue: 30, duration: 280, useNativeDriver: false }),
          Animated.timing(waveAnim4, { toValue: 8, duration: 280, useNativeDriver: false }),
        ]),
      ])
    ).start();
  };

  const stopWaveAnimation = () => {
    waveAnim1.setValue(10);
    waveAnim2.setValue(15);
    waveAnim3.setValue(12);
    waveAnim4.setValue(8);
  };

  const loadDeviceVoices = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    }
  };

  const stopAllSpeech = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    speechQueueRef.current = [];
    activeUtteranceRef.current = null;
    setIsPlaying(false);
    setSpeakingId(null);
  };

  async function fetchUserAndProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
        initializeDayCurriculumChat(profile, currentDayNum);
      } else {
        initializeDayCurriculumChat({ target_language: 'English' }, currentDayNum);
      }
    } catch (err) {
      console.log('Error fetching user profile:', err);
      initializeDayCurriculumChat({ target_language: 'English' }, currentDayNum);
    }
  }

  const initializeDayCurriculumChat = (profile, dayNum) => {
    const scenario = profile.current_scenario || 'Interactive Roleplay Simulation';
    const objective = profile.scenario_objective || 'Introduce yourself, state your current goal, and let the session adapt to you.';

    const welcomeMsg = {
      id: '1',
      role: 'model',
      timestamp: getCurrentTimeString(),
      message: JSON.stringify({
        hasCorrection: false,
        pronunciationScore: 90,
        pronunciationTip: "Keep your pacing steady and clear.",
        roleplayContext: scenario,
        scenarioObjective: objective,
        scenarioStage: 'Introduction',
        reply: `Welcome to Day ${dayNum} simulation! I am your adaptive AI language coach. Let's start practicing right away—tell me about your day or what topic you would like to explore today!`,
        isVoiceNote: false,
      }),
    };
    setMessages([welcomeMsg]);
    queueOrPlayAudio(JSON.parse(welcomeMsg.message).reply, welcomeMsg.id);
  };

  const getLanguageCode = (lang) => {
    const langMap = {
      English: 'en-US',
      German: 'de-DE',
      Hindi: 'hi-IN',
      Punjabi: 'pa-IN',
      French: 'fr-FR',
      Spanish: 'es-ES',
      Italian: 'it-IT',
    };
    return langMap[lang] || 'en-US';
  };

  const updatePreferredVoice = async (voiceName) => {
    setUserProfile(prev => ({ ...prev, preferred_voice: voiceName }));
    setShowVoiceModal(false);

    if (userIdRef.current) {
      try {
        await supabase
          .from('user_profiles')
          .update({ preferred_voice: voiceName, updated_at: new Date().toISOString() })
          .eq('id', userIdRef.current);
      } catch (err) {
        console.log('Error saving preferred voice:', err);
      }
    }
  };

  const toggleLiveSession = () => {
    if (isSessionActive) {
      stopLiveSession();
    } else {
      startLiveSession();
    }
  };

  const startLiveSession = () => {
    setIsSessionActive(true);
    isSessionActiveRef.current = true;
    isMicPausedRef.current = false;
    startContinuousListening();
  };

  const stopLiveSession = () => {
    setIsSessionActive(false);
    isSessionActiveRef.current = false;
    isMicPausedRef.current = false;
    setListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    stopAllSpeech();
  };

  const pauseListening = () => {
    isMicPausedRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const resumeListening = () => {
    isMicPausedRef.current = false;
    if (isSessionActiveRef.current) {
      startRecognitionInstance();
    }
  };

  const startRecognitionInstance = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
      setIsSessionActive(false);
      isSessionActiveRef.current = false;
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText.trim()) {
          setInput(currentText.trim());
        }

        if (finalTranscript.trim()) {
          const spokenText = finalTranscript.trim();
          handleSendDirect(spokenText);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        setListening(false);
        if (isSessionActiveRef.current && !isMicPausedRef.current) {
          setTimeout(() => {
            if (isSessionActiveRef.current && !isMicPausedRef.current) {
              startRecognitionInstance();
            }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch (err) {
      console.log('Recognition start error:', err);
      setListening(false);
      if (isSessionActiveRef.current && !isMicPausedRef.current) {
        setTimeout(() => {
          if (isSessionActiveRef.current && !isMicPausedRef.current) {
            startRecognitionInstance();
          }
        }, 500);
      }
    }
  };

  const startContinuousListening = () => {
    startRecognitionInstance();
  };

  const handlePlayPauseAudio = (text, messageId) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      const synth = window.speechSynthesis;

      if (speakingId === messageId) {
        if (synth.speaking && !synth.paused) {
          synth.pause();
          setIsPlaying(false);
          return;
        }
        if (synth.paused) {
          synth.resume();
          setIsPlaying(true);
          return;
        }
      }

      synth.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLanguageCode(userProfile?.target_language);
      utterance.rate = 0.95;

      if (userProfile?.preferred_voice) {
        const selectedVoiceObj = availableVoices.find(v => v.name === userProfile.preferred_voice);
        if (selectedVoiceObj) {
          utterance.voice = selectedVoiceObj;
        }
      }
      
      utterance.onstart = () => {
        setSpeakingId(messageId);
        setIsPlaying(true);
        if (isSessionActiveRef.current) {
          pauseListening();
        }
      };

      utterance.onend = () => {
        setSpeakingId(null);
        setIsPlaying(false);
        activeUtteranceRef.current = null;

        if (speechQueueRef.current.length > 0) {
          processNextInQueue();
        } else if (isSessionActiveRef.current) {
          resumeListening();
        }
      };

      utterance.onerror = () => {
        setSpeakingId(null);
        setIsPlaying(false);
        activeUtteranceRef.current = null;
        if (isSessionActiveRef.current && speechQueueRef.current.length === 0) {
          resumeListening();
        }
      };

      activeUtteranceRef.current = utterance;
      synth.speak(utterance);
    }
  };

  const processNextInQueue = () => {
    if (speechQueueRef.current.length > 0) {
      const nextItem = speechQueueRef.current.shift();
      handlePlayPauseAudio(nextItem.text, nextItem.id);
    }
  };

  const queueOrPlayAudio = (text, messageId) => {
    if (isPlaying && speakingId !== messageId) {
      speechQueueRef.current.push({ text, id: messageId });
    } else {
      handlePlayPauseAudio(text, messageId);
    }
  };

  const getCurrentTimeString = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  async function logGrammarCorrection(original, corrected, explanation) {
    try {
      if (!userIdRef.current) return;
      await supabase.from('grammar_history').insert({
        user_id: userIdRef.current,
        original_text: original,
        corrected_text: corrected,
        explanation: explanation || 'Grammar correction during live session.'
      });
    } catch (err) {
      console.log('Error saving grammar history:', err);
    }
  }

// --- SPEAK-TO-SPEAK API CALL HANDLER ---
  async function handleSendDirect(textToSend) {
    const messageValue = typeof textToSend === 'string' ? textToSend : input;
    if (!messageValue || !messageValue.trim() || loading) return;

    setInput('');
    stopAllSpeech();

    if (isSessionActiveRef.current) {
      pauseListening();
    }

    const timeStr = getCurrentTimeString();
    const tempUserMsg = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: 'user',
      timestamp: timeStr,
      message: messageValue.trim(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const currentScenario = userProfile?.current_scenario || 'Professional Simulation';
      const currentObj = userProfile?.scenario_objective || 'Engage in dialogue';

      console.log("Calling SpeakToSpeak API...");
      
      // Fetch request to your custom API endpoint
      const response = await fetch("key here", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer key here  expo start --clear" // Apni dashboard wali Bearer key yahan daal dena
        },
        body: JSON.stringify({
          text: messageValue.trim(),
          profileLanguage: userProfile?.target_language || "English",
          profileLanguageName: userProfile?.target_language || "English",
          accentStyle: "Standard",
          voiceName: userProfile?.preferred_voice || "Puck",
          humanMannnerisms: true,
          speakingPace: "normal"
        })
      });

      const data = await response.json();
      const responseText = data.reply || JSON.stringify(data);
      console.log("API Response received:", responseText);

      let parsedData = null;
      try {
        const cleanedString = responseText.replace(/```json\s*([\s\S]*?)\s*```/g, '$1').trim();
        parsedData = JSON.parse(cleanedString);
      } catch (e) {
        parsedData = {
          hasCorrection: false,
          originalText: messageValue.trim(),
          correctedText: '',
          explanation: '',
          pronunciationScore: 90,
          pronunciationTip: "Clear pronunciation. Let's keep the momentum going.",
          roleplayContext: currentScenario,
          scenarioObjective: currentObj,
          scenarioStage: 'Teacher Guidance',
          reply: responseText || `Let's work on that! Try framing your sentence like this, and tell me: what topic would you like to practice next?`
        };
      }

      if (!parsedData.pronunciationScore) parsedData.pronunciationScore = 90;
      if (!parsedData.pronunciationTip) parsedData.pronunciationTip = "Good rhythm and articulation.";
      if (!parsedData.roleplayContext) parsedData.roleplayContext = currentScenario;
      if (!parsedData.scenarioObjective) parsedData.scenarioObjective = currentObj;
      if (!parsedData.scenarioStage) parsedData.scenarioStage = 'Teacher Guidance';

      if (parsedData.hasCorrection && parsedData.correctedText) {
        await logGrammarCorrection(
          parsedData.originalText || messageValue.trim(),
          parsedData.correctedText,
          parsedData.explanation
        );
      }

      const aiMsgObj = { 
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, 
        role: 'model', 
        timestamp: getCurrentTimeString(), 
        message: JSON.stringify(parsedData) 
      };

      setMessages((prev) => [...prev, aiMsgObj]);
      if (parsedData.reply) {
        queueOrPlayAudio(parsedData.reply, aiMsgObj.id);
      } else if (isSessionActiveRef.current) {
        resumeListening();
      }
    } catch (err) {
      console.log('API Error:', err);
      if (isSessionActiveRef.current) {
        resumeListening();
      }
    } finally {
      setLoading(false);
    }
  }

  const renderMessageItem = ({ item }) => {
    const isUser = item.role === 'user';
    
    if (isUser) {
      const displayName = userProfile?.full_name?.trim() ? userProfile.full_name : 'User';
      const displayAvatar = userProfile?.avatar_type || '👤';

      return (
        <View style={styles.userBubbleRow}>
          <View style={styles.userBubble}>
            <View style={styles.chatProfileHeader}>
              <Text style={styles.chatSenderName} numberOfLines={1}>{displayName}</Text>
              <View style={styles.chatMiniAvatar}>
                <Text style={styles.miniEmoji}>{displayAvatar}</Text>
              </View>
            </View>

            <Text style={styles.userText}>{item.message}</Text>
            
            <View style={styles.timeAndAvatarRowUser}>
              <Text style={styles.timestampText}>{item.timestamp}</Text>
            </View>
          </View>
        </View>
      );
    }

    let parsedData = { 
      reply: item.message, 
      hasCorrection: false, 
      explanation: '', 
      correctedText: '', 
      pronunciationScore: 85, 
      pronunciationTip: 'Keep pacing steady.',
      roleplayContext: userProfile.current_scenario || 'Simulation',
      scenarioObjective: userProfile.scenario_objective || 'Complete the task',
      scenarioStage: 'Active Practice'
    };
    
    try {
      parsedData = JSON.parse(item.message);
    } catch (e) {}

    const isThisSpeaking = speakingId === item.id && isPlaying;

    return (
      <View style={styles.aiBubbleRow}>
        <View style={styles.aiBubble}>
          <View style={styles.badgeRow}>
            {parsedData.roleplayContext ? (
              <View style={styles.roleplayBadge}>
                <Text style={styles.roleplayBadgeText}>🎭 {parsedData.roleplayContext}</Text>
              </View>
            ) : null}
            {parsedData.scenarioStage ? (
              <View style={styles.stageBadge}>
                <Text style={styles.stageBadgeText}>📌 {parsedData.scenarioStage}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.aiSenderHeader}>
            <Text style={styles.buddyLabel}>⚡ DAY {currentDayNum} GEMINI TUTOR</Text>
            <TouchableOpacity onPress={() => queueOrPlayAudio(parsedData.reply, item.id)}>
              <Text style={{ fontSize: 12 }}>{isThisSpeaking ? '⏸️' : '🔊'}</Text>
            </TouchableOpacity>
          </View>

          {parsedData.scenarioObjective ? (
            <View style={styles.objectiveBox}>
              <Text style={styles.objectiveTitle}>🎯 Current Mission Objective:</Text>
              <Text style={styles.objectiveText}>{parsedData.scenarioObjective}</Text>
            </View>
          ) : null}

          {parsedData.hasCorrection && parsedData.correctedText ? (
            <View style={styles.correctionBox}>
              <Text style={styles.correctionTitle}>💡 Grammar Correction Tip:</Text>
              <Text style={styles.correctionText}>❌ <Text style={{textDecorationLine: 'line-through'}}>{parsedData.originalText}</Text></Text>
              <Text style={styles.correctionText}>✅ <Text style={{fontWeight: 'bold', color: '#FFCB9A'}}>{parsedData.correctedText}</Text></Text>
              {parsedData.explanation ? (
                <Text style={styles.explanationText}>{parsedData.explanation}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.pronunciationBox}>
            <Text style={styles.pronunciationText}>
              ⚡ Pronunciation: <Text style={{color: '#FFCB9A', fontWeight: 'bold'}}>{parsedData.pronunciationScore || 85}/100</Text>
            </Text>
            {parsedData.pronunciationTip ? (
              <Text style={styles.explanationText}>Tip: {parsedData.pronunciationTip}</Text>
            ) : null}
          </View>

          <Text style={styles.aiText}>{parsedData.reply}</Text>
          
          <View style={styles.timeAndAvatarRowAi}>
            <View style={styles.miniAvatarContainerAi}>
              <Text style={{ fontSize: 10 }}>🤖</Text>
            </View>
            <Text style={styles.timestampText}>{item.timestamp}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <AppBackground>
      <View style={styles.headerBar}>
        <View style={styles.headerLeftGroup}>
          {onBack && (
            <TouchableOpacity onPress={() => { stopLiveSession(); onBack(); }} style={styles.backButton} activeOpacity={0.8}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.voiceConfigBtn, { marginLeft: 8 }]} onPress={() => setShowVoiceModal(true)}>
            <Text style={styles.voiceConfigBtnText}>🎙️ Voice</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.voiceConfigBtn, { backgroundColor: isSessionActive ? '#FF4444' : '#116466' }]} 
          onPress={toggleLiveSession}
        >
          <Text style={[styles.voiceConfigBtnText, { color: '#FFFFFF' }]}>
            {isSessionActive ? '🛑 End Live Session' : '🟢 Start Live Call'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Day {currentDayNum}</Text>
      </View>

      {isSessionActive && (
        <View style={{ backgroundColor: '#142C28', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#116466' }}>
          <Text style={{ color: '#FFCB9A', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
            {listening ? '🎙️ Listening... Speak naturally (Continuous Mode)' : '🤖 Gemini is responding...'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 45 }}>
            <Animated.View style={{ width: 4, height: waveAnim1, backgroundColor: '#6EE7B7', borderRadius: 2 }} />
            <Animated.View style={{ width: 4, height: waveAnim2, backgroundColor: '#FFCB9A', borderRadius: 2 }} />
            <Animated.View style={{ width: 4, height: waveAnim3, backgroundColor: '#6EE7B7', borderRadius: 2 }} />
            <Animated.View style={{ width: 4, height: waveAnim4, backgroundColor: '#FFCB9A', borderRadius: 2 }} />
            <Animated.View style={{ width: 4, height: waveAnim2, backgroundColor: '#6EE7B7', borderRadius: 2 }} />
          </View>
        </View>
      )}

      <RoleplaySelector 
        onSelectScenario={(selectedScenario) => {
          setUserProfile(prev => ({ ...prev, current_scenario: selectedScenario }));
        }} 
      />

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.chatArea}>
          <View style={styles.chatOverlay}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageListContainer}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={renderMessageItem}
            />
          </View>
        </View>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={`Type or use Live Call mode (Day ${currentDayNum})...`}
            placeholderTextColor="#A3B8B0"
            onSubmitEditing={() => handleSendDirect(input)}
            returnKeyType="send"
          />

          <TouchableOpacity 
            style={[styles.micButton, isSessionActive && { backgroundColor: '#FF4444' }]} 
            onPress={toggleLiveSession}
          >
            <Text style={{ fontSize: 18 }}>{isSessionActive ? '⏹' : '🎙️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sendPlaneButton} onPress={() => handleSendDirect(input)}>
            <Text style={{ fontSize: 16, color: '#1B2A26', fontWeight: 'bold' }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showVoiceModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Choose Tutor Voice & Accent</Text>
            <Text style={styles.modalSubtitle}>Select an available accent profile for your device:</Text>

            <FlatList
              data={availableVoices}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              style={{ maxHeight: 250, marginVertical: 10 }}
              renderItem={({ item }) => {
                const isSelected = userProfile?.preferred_voice === item.name;
                return (
                  <TouchableOpacity 
                    style={[styles.voiceOptionItem, isSelected && styles.voiceOptionSelected]}
                    onPress={() => updatePreferredVoice(item.name)}
                  >
                    <Text style={[styles.voiceOptionText, isSelected && { color: '#FFCB9A', fontWeight: 'bold' }]}>
                      {item.name} ({item.lang})
                    </Text>
                    {isSelected && <Text style={{ color: '#FFCB9A' }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowVoiceModal(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppBackground>
  );
}

// Styling remains consistent with your app theme
const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1B2A26',
    borderBottomWidth: 1,
    borderBottomColor: '#116466',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: '#FFCB9A',
    fontWeight: 'bold',
  },
  voiceConfigBtn: {
    backgroundColor: '#116466',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  voiceConfigBtnText: {
    color: '#FFCB9A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatOverlay: {
    flex: 1,
  },
  messageListContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  userBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#116466',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
    maxWidth: '80%',
  },
  chatProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatSenderName: {
    color: '#FFCB9A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatMiniAvatar: {
    marginLeft: 6,
  },
  miniEmoji: {
    fontSize: 12,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  timeAndAvatarRowUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestampText: {
    color: '#A3B8B0',
    fontSize: 10,
  },
  aiBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  aiBubble: {
    backgroundColor: '#142C28',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#116466',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  roleplayBadge: {
    backgroundColor: '#116466',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleplayBadgeText: {
    color: '#FFCB9A',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stageBadge: {
    backgroundColor: '#1B2A26',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stageBadgeText: {
    color: '#6EE7B7',
    fontSize: 10,
    fontWeight: 'bold',
  },
  aiSenderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  buddyLabel: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  objectiveBox: {
    backgroundColor: '#1B2A26',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  objectiveTitle: {
    color: '#FFCB9A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  objectiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
  correctionBox: {
    backgroundColor: '#2A1B1B',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
  },
  correctionTitle: {
    color: '#FF8888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  correctionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
  explanationText: {
    color: '#D1D5DB',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  pronunciationBox: {
    backgroundColor: '#1B2A26',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  pronunciationText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  aiText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  timeAndAvatarRowAi: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  miniAvatarContainerAi: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1B2A26',
    borderTopWidth: 1,
    borderTopColor: '#116466',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#142C28',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#116466',
  },
  micButton: {
    marginLeft: 8,
    backgroundColor: '#116466',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendPlaneButton: {
    marginLeft: 6,
    backgroundColor: '#FFCB9A',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#1B2A26',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#116466',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#A3B8B0',
    fontSize: 12,
    marginBottom: 12,
  },
  voiceOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#142C28',
  },
  voiceOptionSelected: {
    backgroundColor: '#142C28',
  },
  voiceOptionText: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  modalCloseButton: {
    marginTop: 12,
    backgroundColor: '#116466',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFCB9A',
    fontWeight: 'bold',
    fontSize: 14,
  },
});