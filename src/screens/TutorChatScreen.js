import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

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
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import * as Speech from 'expo-speech';

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { supabase } from '../api/supabase';


// ============================================================
// LANGUAGE CONFIGURATION
// ============================================================

const LANGUAGE_CODES = {
  English: 'en-IN',
  German: 'de-DE',
  Hindi: 'hi-IN',
  Punjabi: 'pa-IN',
  French: 'fr-FR',
  Spanish: 'es-ES',
  Italian: 'it-IT',
  Japanese: 'ja-JP',
  Mandarin: 'zh-CN',
  Chinese: 'zh-CN',
  Portuguese: 'pt-PT',
  Russian: 'ru-RU',
  Korean: 'ko-KR',
  Arabic: 'ar-SA',
};

const getLanguageCode = (language) => {
  if (!language) return 'en-IN';

  return LANGUAGE_CODES[language] || 'en-IN';
};


// ============================================================
// ROLEPLAY SCENARIOS
// ============================================================

const ROLEPLAY_SCENARIOS = {
  introduction: {
    title: 'Introduction',
    icon: '👋',
    objective: 'Introduce yourself and have a basic conversation.',
  },

  travel: {
    title: 'Travel',
    icon: '✈️',
    objective: 'Practice useful conversations while travelling.',
  },

  restaurant: {
    title: 'Restaurant',
    icon: '🍽️',
    objective: 'Practice ordering food and speaking with restaurant staff.',
  },

  job: {
    title: 'Job Interview',
    icon: '💼',
    objective: 'Practice answering common job interview questions.',
  },

  shopping: {
    title: 'Shopping',
    icon: '🛍️',
    objective: 'Practice conversations while shopping.',
  },
};


// ============================================================
// COMPONENT
// ============================================================

export default function TutorChatScreen({
  selectedDay,
  onBack,
}) {
  // ----------------------------------------------------------
  // DAY
  // ----------------------------------------------------------

  const currentDayNum = Number(selectedDay) || 1;


  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState('');

  const [loading, setLoading] = useState(false);

  const [listening, setListening] = useState(false);

  const [isSessionActive, setIsSessionActive] = useState(false);

  const [speechLang, setSpeechLang] = useState('en-IN');

  const [speakingId, setSpeakingId] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const [availableVoices, setAvailableVoices] = useState([]);

  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const [voiceError, setVoiceError] = useState('');

  const [interimTranscript, setInterimTranscript] = useState('');

  const [selectedScenario, setSelectedScenario] =
    useState('introduction');


  // ----------------------------------------------------------
  // REFS
  // ----------------------------------------------------------

  const flatListRef = useRef(null);

  const userIdRef = useRef(null);

  const mountedRef = useRef(true);

  const speechTimeoutRef = useRef(null);

  const turnEndTimeoutRef = useRef(null);

  const finalTranscriptRef = useRef('');

  const speechSegmentBufferRef = useRef('');

  const speechQueueRef = useRef([]);

  const isSpeakingRef = useRef(false);

  const currentSpeakingIdRef = useRef(null);

  const sendingRef = useRef(false);

  const recognitionRetryTimeoutRef = useRef(null);

  const conversationHistoryRef = useRef([]);

  const sessionActiveRef = useRef(false);

  // ----------------------------------------------------------
  // IMPORTANT SPEECH RECOGNITION REFS
  // ----------------------------------------------------------

  // True only while the native recognition engine is actually
  // running.
  const recognitionRunningRef = useRef(false);

  // True when WE intentionally stopped/aborted recognition.
  // This prevents the "aborted -> end -> restart -> abort" loop.
  const intentionalRecognitionStopRef = useRef(false);

  // Prevent multiple start() calls at the same time.
  const recognitionStartingRef = useRef(false);

  // Current target language / level.
  const targetLanguageRef = useRef('English');

  const levelRef = useRef('Beginner');

  // Preferred voice selected by the user.
  const preferredVoiceRef = useRef(null);


  // ============================================================
  // INITIALIZATION
  // ============================================================

  useEffect(() => {
    mountedRef.current = true;

    fetchUserAndProfile();
    loadDeviceVoices();

    return () => {
      mountedRef.current = false;

      sessionActiveRef.current = false;

      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }

      if (turnEndTimeoutRef.current) {
        clearTimeout(turnEndTimeoutRef.current);
        turnEndTimeoutRef.current = null;
      }

      if (recognitionRetryTimeoutRef.current) {
        clearTimeout(recognitionRetryTimeoutRef.current);
        recognitionRetryTimeoutRef.current = null;
      }

      stopRecognition(true);
      stopAllSpeech();
    };
  }, []);


  // Keep ref synchronized with state.
  useEffect(() => {
    sessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);


  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    }
  }, [messages]);


  // ============================================================
  // USER PROFILE
  // ============================================================

  const fetchUserAndProfile = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.log(
          'No active Supabase auth session. Using local tutor profile.'
        );

        const localProfile = {
          target_language: 'English',
          proficiency_level: 'Beginner',
          learning_goal: null,
          field_of_interest: null,
          preferred_voice: null,
          current_scenario: 'introduction',
          scenario_objective:
            'Introduce yourself and have a basic conversation.',
          full_name: 'User',
          avatar_type: '🎓',
        };

        const language =
          localProfile.target_language || 'English';

        const level =
          localProfile.proficiency_level || 'Beginner';

        targetLanguageRef.current = language;
        levelRef.current = level;

        preferredVoiceRef.current =
          localProfile.preferred_voice || null;

        setSpeechLang(getLanguageCode(language));

        setSelectedScenario(
          localProfile.current_scenario || 'introduction'
        );

        initializeDayCurriculumChat(
          currentDayNum,
          language
        );

        return;
      }

      userIdRef.current = user.id;

      let profile = null;

      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        profile = data;
      } catch (profileError) {
        console.log(
          'Profile fetch error:',
          profileError?.message || profileError
        );
      }

      const mergedProfile = {
        target_language:
          profile?.target_language || 'English',

        proficiency_level:
          profile?.proficiency_level || 'Beginner',

        learning_goal:
          profile?.learning_goal || null,

        field_of_interest:
          profile?.field_of_interest || null,

        preferred_voice:
          profile?.preferred_voice || null,

        current_scenario:
          profile?.current_scenario || 'introduction',

        scenario_objective:
          profile?.scenario_objective ||
          'Introduce yourself and have a basic conversation.',

        full_name:
          profile?.full_name || 'User',

        avatar_type:
          profile?.avatar_type || '🎓',
      };

      targetLanguageRef.current =
        mergedProfile.target_language;

      levelRef.current =
        mergedProfile.proficiency_level;

      preferredVoiceRef.current =
        mergedProfile.preferred_voice || null;

      setSpeechLang(
        getLanguageCode(
          mergedProfile.target_language
        )
      );

      setSelectedScenario(
        mergedProfile.current_scenario || 'introduction'
      );

      initializeDayCurriculumChat(
        currentDayNum,
        mergedProfile.target_language
      );

    } catch (error) {
      console.log(
        'fetchUserAndProfile error:',
        error?.message || error
      );

      targetLanguageRef.current = 'English';
      levelRef.current = 'Beginner';

      setSpeechLang('en-IN');

      initializeDayCurriculumChat(
        currentDayNum,
        'English'
      );
    }
  };


  // ============================================================
  // INITIAL DAY MESSAGE
  // ============================================================

  const initializeDayCurriculumChat = (
    dayNumber,
    language
  ) => {
    conversationHistoryRef.current = [];

    const welcomeText =
      `Welcome to Day ${dayNumber}! Today we will practice ` +
      `${language} together. Please introduce yourself in ${language}.`;

    const welcomeMessage = {
      id: `welcome-${dayNumber}-${Date.now()}`,

      role: 'assistant',

      type: 'tutor',

      text:
        `Welcome to Day ${dayNumber}! 🎓\n\n` +
        `Today we will practice ${language} together.\n\n` +
        `I will help you with grammar, vocabulary, pronunciation, ` +
        `and natural conversation.\n\n` +
        `Let's begin! Please introduce yourself in ${language}.`,

      data: {
        reply: welcomeText,
      },
    };

    setMessages([welcomeMessage]);

    conversationHistoryRef.current = [
      {
        role: 'assistant',
        content: welcomeText,
      },
    ];

    scheduleSpeech(welcomeMessage, 700);
  };


  // ============================================================
  // DEVICE VOICES
  // ============================================================

  const loadDeviceVoices = async () => {
    try {
      const voices =
        await Speech.getAvailableVoicesAsync();

      if (mountedRef.current) {
        setAvailableVoices(
          Array.isArray(voices)
            ? voices
            : []
        );
      }

      console.log(
        'Available device voices:',
        Array.isArray(voices)
          ? voices.length
          : 0
      );
    } catch (error) {
      console.log(
        'Unable to load voices:',
        error?.message || error
      );
    }
  };


  // ============================================================
  // SAVE PREFERRED VOICE
  // ============================================================

  const updatePreferredVoice = async (voice) => {
    if (!voice) return;

    preferredVoiceRef.current =
      voice.identifier ||
      voice.name ||
      null;

    try {
      if (userIdRef.current) {
        await supabase
          .from('user_profiles')
          .update({
            preferred_voice:
              voice.identifier ||
              voice.name,
          })
          .eq(
            'id',
            userIdRef.current
          );
      }
    } catch (error) {
      console.log(
        'Unable to save preferred voice:',
        error?.message || error
      );
    }
  };


  // ============================================================
  // STOP SPEECH
  // ============================================================

  const stopAllSpeech = async () => {
    try {
      if (speechTimeoutRef.current) {
        clearTimeout(
          speechTimeoutRef.current
        );

        speechTimeoutRef.current = null;
      }

      speechQueueRef.current = [];

      await Speech.stop();

    } catch (error) {
      console.log(
        'Speech stop error:',
        error?.message || error
      );
    }

    isSpeakingRef.current = false;
    currentSpeakingIdRef.current = null;

    if (mountedRef.current) {
      setSpeakingId(null);
      setIsPlaying(false);
    }
  };


  // ============================================================
  // START CONTINUOUS LISTENING
  // ============================================================

  const startContinuousListening =
    useCallback(async () => {
      if (!mountedRef.current) {
        return;
      }

      if (!sessionActiveRef.current) {
        return;
      }

      if (sendingRef.current) {
        return;
      }

      if (isSpeakingRef.current) {
        return;
      }

      // Already running.
      // IMPORTANT: Do not abort it and start another one.
      if (recognitionRunningRef.current) {
        console.log(
          '🎙️ Recognition already running.'
        );

        return;
      }

      // Another start operation is already in progress.
      if (recognitionStartingRef.current) {
        return;
      }

      recognitionStartingRef.current = true;

      try {
        setVoiceError('');

        const permission =
          await ExpoSpeechRecognitionModule
            .requestPermissionsAsync();

        console.log(
          'Speech permission:',
          permission
        );

        if (!permission?.granted) {
          recognitionStartingRef.current = false;

          if (mountedRef.current) {
            setVoiceError(
              'Microphone permission is required.'
            );
          }

          return;
        }

        if (
          !mountedRef.current ||
          !sessionActiveRef.current ||
          sendingRef.current ||
          isSpeakingRef.current
        ) {
          recognitionStartingRef.current = false;
          return;
        }

        // ------------------------------------------------------
        // IMPORTANT
        // ------------------------------------------------------
        // We DO NOT call abort() here.
        //
        // The previous code called abort() every time before
        // start(), which produced:
        //
        // aborted -> end -> restart -> abort -> end...
        //
        // That was the main bug.
        // ------------------------------------------------------

        intentionalRecognitionStopRef.current = false;

        console.log(
          '🎙️ Starting speech recognition with:',
          speechLang
        );

        await ExpoSpeechRecognitionModule.start({
          lang: speechLang,

          interimResults: true,

          continuous: true,

          maxAlternatives: 1,

          requiresOnDeviceRecognition: false,

          addsPunctuation: true,
        });

        recognitionRunningRef.current = true;

      } catch (error) {
        console.log(
          '🎙️ Speech start error:',
          error?.message || error
        );

        recognitionRunningRef.current = false;

        if (mountedRef.current) {
          setListening(false);

          setVoiceError(
            error?.message ||
            'Unable to start speech recognition.'
          );
        }

        // Retry only when appropriate.
        if (
          mountedRef.current &&
          sessionActiveRef.current &&
          !sendingRef.current &&
          !isSpeakingRef.current &&
          !intentionalRecognitionStopRef.current
        ) {
          if (
            recognitionRetryTimeoutRef.current
          ) {
            clearTimeout(
              recognitionRetryTimeoutRef.current
            );
          }

          recognitionRetryTimeoutRef.current =
            setTimeout(() => {
              recognitionRetryTimeoutRef.current = null;

              if (
                mountedRef.current &&
                sessionActiveRef.current &&
                !sendingRef.current &&
                !isSpeakingRef.current &&
                !recognitionRunningRef.current
              ) {
                startContinuousListening();
              }
            }, 1500);
        }

      } finally {
        recognitionStartingRef.current = false;
      }

    }, [speechLang]);


  // ============================================================
  // STOP RECOGNITION
  // ============================================================

  const stopRecognition = async (
    immediate = true
  ) => {
    // Mark this stop as intentional BEFORE calling native
    // abort/stop. The native module can emit "aborted" and
    // "end" immediately afterwards.
    intentionalRecognitionStopRef.current = true;

    if (
      recognitionRetryTimeoutRef.current
    ) {
      clearTimeout(
        recognitionRetryTimeoutRef.current
      );

      recognitionRetryTimeoutRef.current = null;
    }

    if (
      turnEndTimeoutRef.current
    ) {
      clearTimeout(
        turnEndTimeoutRef.current
      );

      turnEndTimeoutRef.current = null;
    }

    // If recognition is not actually running, there is
    // nothing to abort.
    if (!recognitionRunningRef.current) {
      if (mountedRef.current) {
        setListening(false);
      }

      return;
    }

    try {
      recognitionRunningRef.current = false;

      if (
        ExpoSpeechRecognitionModule
      ) {
        if (immediate) {
          await ExpoSpeechRecognitionModule.abort();
        } else {
          await ExpoSpeechRecognitionModule.stop();
        }
      }

    } catch (error) {
      console.log(
        'Stop recognition error:',
        error?.message || error
      );
    }

    if (mountedRef.current) {
      setListening(false);
    }
  };


  // ============================================================
  // SPEECH RECOGNITION START EVENT
  // ============================================================

  useSpeechRecognitionEvent(
    'start',
    () => {
      console.log(
        '🎙️ Speech recognition started'
      );

      recognitionRunningRef.current = true;

      intentionalRecognitionStopRef.current = false;

      if (mountedRef.current) {
        setListening(true);
        setVoiceError('');
      }
    }
  );


  // ============================================================
  // SPEECH RECOGNITION END EVENT
  // ============================================================

  useSpeechRecognitionEvent(
    'end',
    () => {
      console.log(
        '🎙️ Speech recognition ended'
      );

      recognitionRunningRef.current = false;

      if (mountedRef.current) {
        setListening(false);
      }

      // --------------------------------------------------------
      // INTENTIONAL STOP
      // --------------------------------------------------------

      if (
        intentionalRecognitionStopRef.current
      ) {
        console.log(
          '🎙️ Recognition ended intentionally. No restart.'
        );

        return;
      }

      // --------------------------------------------------------
      // DO NOT RESTART WHILE AI IS PROCESSING/SPEAKING
      // --------------------------------------------------------

      if (
        !mountedRef.current ||
        !sessionActiveRef.current ||
        sendingRef.current ||
        isSpeakingRef.current
      ) {
        return;
      }

      // --------------------------------------------------------
      // UNEXPECTED END
      // --------------------------------------------------------

      if (
        recognitionRetryTimeoutRef.current
      ) {
        clearTimeout(
          recognitionRetryTimeoutRef.current
        );
      }

      recognitionRetryTimeoutRef.current =
        setTimeout(() => {
          recognitionRetryTimeoutRef.current = null;

          if (
            mountedRef.current &&
            sessionActiveRef.current &&
            !sendingRef.current &&
            !isSpeakingRef.current &&
            !recognitionRunningRef.current
          ) {
            console.log(
              '🎙️ Recognition ended unexpectedly. Restarting...'
            );

            startContinuousListening();
          }
        }, 500);
    }
  );


  // ============================================================
  // SPEECH RESULT
  // ============================================================

  useSpeechRecognitionEvent(
    'result',
    (event) => {
      try {
        if (!event?.results) {
          return;
        }

        const results = event.results;

        const latestResult =
          results[results.length - 1];

        const transcript =
          latestResult?.transcript ||
          '';

        if (!transcript.trim()) {
          return;
        }

        console.log(
          '🎙️ Speech result:',
          transcript,
          'final:',
          event.isFinal
        );

        if (mountedRef.current) {
          setInterimTranscript(
            transcript
          );

          setInput(transcript);
        }

        if (event.isFinal) {
          speechSegmentBufferRef.current =
            `${speechSegmentBufferRef.current} ${transcript}`
              .trim();

          finalTranscriptRef.current =
            speechSegmentBufferRef.current;

          setInterimTranscript('');

          scheduleVoiceTurn();
        }

      } catch (error) {
        console.log(
          'Speech result processing error:',
          error?.message || error
        );
      }
    }
  );


  // ============================================================
  // SPEECH ERROR
  // ============================================================

  useSpeechRecognitionEvent(
    'error',
    (event) => {
      const errorCode =
        event?.error || '';

      const errorMessage =
        event?.message || '';

      console.log(
        '🎙️ Speech recognition error:',
        errorCode,
        errorMessage
      );

      recognitionRunningRef.current = false;

      if (mountedRef.current) {
        setListening(false);
      }

      // --------------------------------------------------------
      // INTENTIONAL ABORT
      // --------------------------------------------------------

      if (
        errorCode === 'aborted' &&
        intentionalRecognitionStopRef.current
      ) {
        console.log(
          '🎙️ Ignoring intentional recognition abort.'
        );

        return;
      }

      // --------------------------------------------------------
      // NETWORK ERROR
      // --------------------------------------------------------

      if (
        errorCode === 'network'
      ) {
        if (mountedRef.current) {
          setVoiceError(
            'Speech service network error. Retrying...'
          );
        }

        if (
          mountedRef.current &&
          sessionActiveRef.current &&
          !sendingRef.current &&
          !isSpeakingRef.current
        ) {
          if (
            recognitionRetryTimeoutRef.current
          ) {
            clearTimeout(
              recognitionRetryTimeoutRef.current
            );
          }

          recognitionRetryTimeoutRef.current =
            setTimeout(() => {
              recognitionRetryTimeoutRef.current =
                null;

              if (
                mountedRef.current &&
                sessionActiveRef.current &&
                !sendingRef.current &&
                !isSpeakingRef.current &&
                !recognitionRunningRef.current
              ) {
                console.log(
                  '🎙️ Retrying speech recognition...'
                );

                setVoiceError('');

                intentionalRecognitionStopRef.current =
                  false;

                startContinuousListening();
              }
            }, 1500);
        }

        return;
      }

      // --------------------------------------------------------
      // PERMISSION ERROR
      // --------------------------------------------------------

      if (
        errorCode === 'not-allowed'
      ) {
        if (mountedRef.current) {
          setVoiceError(
            'Microphone permission was denied.'
          );
        }

        return;
      }

      // --------------------------------------------------------
      // NO SPEECH
      // --------------------------------------------------------

      if (
        errorCode === 'no-speech'
      ) {
        if (mountedRef.current) {
          setVoiceError('');
        }

        return;
      }

      // --------------------------------------------------------
      // OTHER ABORTED EVENTS
      // --------------------------------------------------------

      if (
        errorCode === 'aborted'
      ) {
        // Do not create another abort loop.
        if (mountedRef.current) {
          setVoiceError('');
        }

        return;
      }

      // --------------------------------------------------------
      // OTHER ERRORS
      // --------------------------------------------------------

      if (mountedRef.current) {
        setVoiceError(
          errorMessage ||
          'Speech recognition error.'
        );
      }
    }
  );


  // ============================================================
  // SCHEDULE VOICE TURN
  // ============================================================

  const scheduleVoiceTurn = () => {
    if (turnEndTimeoutRef.current) {
      clearTimeout(
        turnEndTimeoutRef.current
      );
    }

    turnEndTimeoutRef.current =
      setTimeout(() => {
        turnEndTimeoutRef.current = null;

        flushVoiceTurn();
      }, 700);
  };


  // ============================================================
  // FLUSH VOICE TURN
  // ============================================================

  const flushVoiceTurn = () => {
    const finalText =
      speechSegmentBufferRef.current
        .trim();

    if (!finalText) {
      return;
    }

    speechSegmentBufferRef.current = '';
    finalTranscriptRef.current = '';

    setInput('');
    setInterimTranscript('');

    console.log(
      '🎙️ FINAL USER SPEECH:',
      finalText
    );

    handleSendDirect(finalText);
  };


  // ============================================================
  // SPEAK MESSAGE
  // ============================================================

  const speakMessage = async (
    message
  ) => {
    if (
      !message ||
      !mountedRef.current
    ) {
      return;
    }

    const text =
      message?.data?.reply ||
      message?.reply ||
      message?.text ||
      '';

    if (
      !text ||
      !text.trim()
    ) {
      return;
    }

    try {
      // --------------------------------------------------------
      // Stop recognition BEFORE AI speaks.
      // --------------------------------------------------------

      if (
        recognitionRunningRef.current
      ) {
        await stopRecognition(true);
      }

      await Speech.stop();

      const messageId =
        message.id;

      currentSpeakingIdRef.current =
        messageId;

      isSpeakingRef.current = true;

      setSpeakingId(messageId);
      setIsPlaying(true);

      let selectedVoice = null;

      const preferredVoice =
        message.preferredVoice ||
        preferredVoiceRef.current;

      if (preferredVoice) {
        selectedVoice =
          availableVoices.find(
            (voice) =>
              voice.identifier ===
                preferredVoice ||
              voice.name ===
                preferredVoice
          );
      }

      const languageVoices =
        availableVoices.filter(
          (voice) => {
            if (!voice?.language) {
              return false;
            }

            return (
              voice.language.toLowerCase() ===
              speechLang.toLowerCase()
            );
          }
        );

      if (
        !selectedVoice &&
        languageVoices.length > 0
      ) {
        selectedVoice =
          languageVoices[0];
      }

      const speechOptions = {
        language:
          selectedVoice?.language ||
          speechLang,

        voice:
          selectedVoice?.identifier ||
          undefined,

        rate: 0.95,

        pitch: 1.0,

        onStart: () => {
          isSpeakingRef.current = true;

          if (mountedRef.current) {
            setIsPlaying(true);
            setSpeakingId(messageId);
          }
        },

        onDone: () => {
          isSpeakingRef.current = false;

          currentSpeakingIdRef.current =
            null;

          if (mountedRef.current) {
            setIsPlaying(false);
            setSpeakingId(null);
          }

          // ----------------------------------------------------
          // AI finished speaking.
          // Start microphone again.
          // ----------------------------------------------------

          if (
            mountedRef.current &&
            sessionActiveRef.current
          ) {
            setTimeout(() => {
              if (
                mountedRef.current &&
                sessionActiveRef.current &&
                !sendingRef.current &&
                !isSpeakingRef.current &&
                !recognitionRunningRef.current
              ) {
                console.log(
                  '🎙️ AI finished speaking. Starting microphone...'
                );

                intentionalRecognitionStopRef.current =
                  false;

                startContinuousListening();
              }
            }, 400);
          }
        },

        onStopped: () => {
          isSpeakingRef.current = false;

          currentSpeakingIdRef.current =
            null;

          if (mountedRef.current) {
            setIsPlaying(false);
            setSpeakingId(null);
          }

          // Only restart if the live tutor session
          // is genuinely active.
          if (
            mountedRef.current &&
            sessionActiveRef.current &&
            !sendingRef.current
          ) {
            setTimeout(() => {
              if (
                mountedRef.current &&
                sessionActiveRef.current &&
                !sendingRef.current &&
                !isSpeakingRef.current &&
                !recognitionRunningRef.current
              ) {
                startContinuousListening();
              }
            }, 400);
          }
        },

        onError: (error) => {
          console.log(
            '🔊 Speech synthesis error:',
            error
          );

          isSpeakingRef.current = false;

          currentSpeakingIdRef.current =
            null;

          if (mountedRef.current) {
            setIsPlaying(false);
            setSpeakingId(null);
          }

          if (
            mountedRef.current &&
            sessionActiveRef.current &&
            !sendingRef.current
          ) {
            setTimeout(() => {
              if (
                mountedRef.current &&
                sessionActiveRef.current &&
                !sendingRef.current &&
                !isSpeakingRef.current &&
                !recognitionRunningRef.current
              ) {
                startContinuousListening();
              }
            }, 700);
          }
        },
      };

      console.log(
        '🔊 Speaking tutor response:',
        text
      );

      Speech.speak(
        text.trim(),
        speechOptions
      );

    } catch (error) {
      console.log(
        'speakMessage error:',
        error?.message || error
      );

      isSpeakingRef.current = false;

      currentSpeakingIdRef.current =
        null;

      if (mountedRef.current) {
        setIsPlaying(false);
        setSpeakingId(null);
      }
    }
  };


  // ============================================================
  // SCHEDULE SPEECH
  // ============================================================

  const scheduleSpeech = (
    message,
    delay = 300
  ) => {
    if (speechTimeoutRef.current) {
      clearTimeout(
        speechTimeoutRef.current
      );
    }

    speechTimeoutRef.current =
      setTimeout(() => {
        speechTimeoutRef.current =
          null;

        if (
          mountedRef.current &&
          message
        ) {
          speakMessage(message);
        }
      }, delay);
  };


  // ============================================================
  // PLAY / PAUSE AUDIO
  // ============================================================

  const handlePlayPauseAudio = async (
    message
  ) => {
    try {
      if (
        isSpeakingRef.current &&
        currentSpeakingIdRef.current ===
          message.id
      ) {
        // This is a manual speaker-button stop.
        // Do not restart recognition because this
        // isn't necessarily an active live turn.
        await Speech.stop();

        isSpeakingRef.current = false;

        currentSpeakingIdRef.current =
          null;

        setIsPlaying(false);
        setSpeakingId(null);

        return;
      }

      await speakMessage(message);

    } catch (error) {
      console.log(
        'Audio toggle error:',
        error?.message || error
      );
    }
  };


  // ============================================================
  // START LIVE SESSION
  // ============================================================

  const startLiveSession = async () => {
    try {
      console.log(
        '🎙️ Starting live tutor session'
      );

      sessionActiveRef.current = true;

      intentionalRecognitionStopRef.current =
        false;

      setIsSessionActive(true);
      setVoiceError('');

      speechSegmentBufferRef.current = '';
      finalTranscriptRef.current = '';

      if (
        recognitionRetryTimeoutRef.current
      ) {
        clearTimeout(
          recognitionRetryTimeoutRef.current
        );

        recognitionRetryTimeoutRef.current =
          null;
      }

      await stopAllSpeech();

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 300)
      );

      await startContinuousListening();

    } catch (error) {
      console.log(
        'startLiveSession error:',
        error?.message || error
      );
    }
  };


  // ============================================================
  // STOP LIVE SESSION
  // ============================================================

  const stopLiveSession = async () => {
    console.log(
      '🎙️ Stopping live tutor session'
    );

    sessionActiveRef.current = false;

    setIsSessionActive(false);

    intentionalRecognitionStopRef.current =
      true;

    await stopRecognition(true);

    await stopAllSpeech();

    speechSegmentBufferRef.current = '';
    finalTranscriptRef.current = '';

    setInterimTranscript('');
    setInput('');
    setVoiceError('');
  };


  // ============================================================
  // SCENARIO SELECT
  // ============================================================

  const handleScenarioSelect = async (
    scenarioKey
  ) => {
    const scenario =
      ROLEPLAY_SCENARIOS[
        scenarioKey
      ];

    if (!scenario) return;

    setSelectedScenario(
      scenarioKey
    );

    try {
      if (userIdRef.current) {
        await supabase
          .from('user_profiles')
          .update({
            current_scenario:
              scenarioKey,

            scenario_objective:
              scenario.objective,
          })
          .eq(
            'id',
            userIdRef.current
          );
      }
    } catch (error) {
      console.log(
        'Scenario save error:',
        error?.message || error
      );
    }
  };


  // ============================================================
  // EXTRACT AI RESPONSE
  // ============================================================

  const extractResponsePayload = (
    data
  ) => {
    let raw = null;

    if (
      typeof data === 'string'
    ) {
      raw = data;

    } else if (
      data?.response !== undefined
    ) {
      raw = data.response;

    } else if (
      data?.reply !== undefined
    ) {
      raw = data.reply;

    } else if (
      data?.message !== undefined
    ) {
      raw = data.message;

    } else if (
      data?.choices?.[0]?.message?.content
    ) {
      raw =
        data.choices[0]
          .message
          .content;

    } else {
      raw = data;
    }

    if (
      typeof raw === 'string'
    ) {
      const cleaned =
        raw
          .replace(
            /^```json\s*/i,
            ''
          )
          .replace(
            /^```\s*/i,
            ''
          )
          .replace(
            /\s*```$/i,
            ''
          )
          .trim();

      try {
        return JSON.parse(
          cleaned
        );
      } catch (_) {
        return {
          reply: raw,
        };
      }
    }

    return raw || {};
  };


  // ============================================================
  // HANDLE SEND
  // ============================================================

  const handleSend = () => {
    const cleanMessage =
      input.trim();

    if (!cleanMessage) {
      return;
    }

    handleSendDirect(
      cleanMessage
    );
  };


  // ============================================================
  // HANDLE SEND DIRECT
  // ============================================================

  const handleSendDirect = async (
    cleanMessage
  ) => {
    const messageText =
      String(
        cleanMessage || ''
      ).trim();

    if (!messageText) {
      return;
    }

    if (sendingRef.current) {
      console.log(
        'Ignoring duplicate AI request.'
      );

      return;
    }

    sendingRef.current = true;

    try {
      // --------------------------------------------------------
      // STOP MICROPHONE WHILE AI PROCESSES
      // --------------------------------------------------------

      await stopRecognition(true);

      setInput('');
      setInterimTranscript('');
      setLoading(true);

      // --------------------------------------------------------
      // USER MESSAGE
      // --------------------------------------------------------

      const userMessage = {
        id:
          `user-${Date.now()}-${Math.random()}`,

        role: 'user',

        type: 'user',

        text: messageText,
      };

      setMessages(
        (previous) => [
          ...previous,
          userMessage,
        ]
      );

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,

        {
          role: 'user',
          content: messageText,
        },
      ];

      const scenario =
        ROLEPLAY_SCENARIOS[
          selectedScenario
        ] ||
        ROLEPLAY_SCENARIOS.introduction;

      // --------------------------------------------------------
      // CONVERSATION HISTORY
      // --------------------------------------------------------

      const conversationHistory =
        conversationHistoryRef.current
          .slice(-20)
          .map(
            (item) => ({
              role:
                item.role,
              content:
                item.content,
            })
          );

      console.log(
        '🤖 Sending conversation to AI:',
        conversationHistory.length,
        'messages'
      );

      console.log(
        '🤖 Target language:',
        targetLanguageRef.current
      );

      console.log(
        '🤖 Level:',
        levelRef.current
      );

      // --------------------------------------------------------
      // SUPABASE EDGE FUNCTION
      // --------------------------------------------------------

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          'ai-proxy',
          {
            body: {
              prompt:
                messageText,

              message:
                messageText,

              targetLanguage:
                targetLanguageRef.current ||
                'English',

              level:
                levelRef.current ||
                'Beginner',

              mode:
                'voice-tutor',

              day:
                currentDayNum,

              currentScenario:
                selectedScenario,

              scenarioObjective:
                scenario.objective,

              conversationHistory,

              messages:
                conversationHistory,
            },
          }
        );

      if (error) {
  console.log('========================================');
  console.log('❌ SUPABASE EDGE FUNCTION ERROR');
  console.log('Error name:', error?.name);
  console.log('Error message:', error?.message);
  console.log('Error status:', error?.status);
  console.log('Error context:', error?.context);
  console.log('Error details:', error?.details);

  try {
    if (error?.context) {
      const responseText = await error.context.text();

      console.log(
        'Edge Function HTTP response:',
        responseText
      );
    }
  } catch (readError) {
    console.log(
      'Could not read Edge Function error response:',
      readError?.message || readError
    );
  }

  console.log('========================================');

  throw error;
}

      if (
        !data ||
        data.success === false
      ) {
        throw new Error(
          data?.error ||
          data?.message ||
          'AI tutor returned an invalid response.'
        );
      }

      console.log(
        '🤖 AI response received'
      );

      // --------------------------------------------------------
      // PARSE RESPONSE
      // --------------------------------------------------------

      const parsed =
        extractResponsePayload(
          data
        );

      let reply =
        parsed?.reply ||
        parsed?.response ||
        parsed?.message ||
        '';

      if (
        typeof reply !== 'string'
      ) {
        reply =
          String(
            reply || ''
          );
      }

      reply =
        reply.trim();

      if (!reply) {
        throw new Error(
          'AI tutor returned an empty response.'
        );
      }

      // --------------------------------------------------------
      // TUTOR MESSAGE
      // --------------------------------------------------------

      const tutorMessage = {
        id:
          `tutor-${Date.now()}-${Math.random()}`,

        role: 'assistant',

        type: 'tutor',

        text: reply,

        preferredVoice:
          preferredVoiceRef.current,

        data: {
          ...parsed,

          reply,

          hasCorrection:
            Boolean(
              parsed?.hasCorrection
            ),

          originalText:
            parsed?.originalText ||
            '',

          correctedText:
            parsed?.correctedText ||
            '',

          explanation:
            parsed?.explanation ||
            '',

          pronunciationScore:
            parsed?.pronunciationScore ??
            null,

          tip:
            parsed?.tip ||
            '',

          roleplayContext:
            parsed?.roleplayContext ||
            selectedScenario,

          objective:
            parsed?.objective ||
            scenario.objective,

          stage:
            parsed?.stage ||
            '',
        },
      };

      // --------------------------------------------------------
      // SAVE AI RESPONSE TO HISTORY
      // --------------------------------------------------------

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,

        {
          role:
            'assistant',

          content:
            reply,
        },
      ];

      // --------------------------------------------------------
      // DISPLAY AI MESSAGE
      // --------------------------------------------------------

      setMessages(
        (previous) => [
          ...previous,
          tutorMessage,
        ]
      );

      // --------------------------------------------------------
      // SAVE GRAMMAR CORRECTION
      // --------------------------------------------------------

      if (
        parsed?.hasCorrection &&
        parsed?.correctedText
      ) {
        await logGrammarCorrection({
          originalText:
            parsed.originalText ||
            messageText,

          correctedText:
            parsed.correctedText,

          explanation:
            parsed.explanation ||
            '',

          pronunciationScore:
            parsed.pronunciationScore ??
            null,
        });
      }

      // --------------------------------------------------------
      // SPEAK AI RESPONSE
      // --------------------------------------------------------

      scheduleSpeech(
        tutorMessage,
        300
      );

    } catch (error) {
      console.log(
        '❌ Tutor request error:',
        error?.message || error
      );

      // Remove failed user message from history.
      if (
        conversationHistoryRef.current
          .length > 0
      ) {
        const last =
          conversationHistoryRef.current[
            conversationHistoryRef.current.length - 1
          ];

        if (
          last?.role === 'user' &&
          last?.content ===
            messageText
        ) {
          conversationHistoryRef.current.pop();
        }
      }

      const errorMessage = {
        id:
          `error-${Date.now()}`,

        role: 'assistant',

        type: 'tutor',

        text:
          'I could not connect to the AI tutor right now. Please try again.',

        data: {
          reply:
            'I could not connect to the AI tutor right now. Please try again.',
        },

        isError: true,
      };

      setMessages(
        (previous) => [
          ...previous,
          errorMessage,
        ]
      );

    } finally {
      sendingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };


  // ============================================================
  // GRAMMAR HISTORY
  // ============================================================

  const logGrammarCorrection = async ({
    originalText,
    correctedText,
    explanation,
    pronunciationScore,
  }) => {
    if (!userIdRef.current) {
      return;
    }

    try {
      await supabase
        .from('grammar_history')
        .insert({
          user_id:
            userIdRef.current,

          original_text:
            originalText,

          corrected_text:
            correctedText,

          explanation:
            explanation,

          pronunciation_score:
            pronunciationScore,
        });
    } catch (error) {
      console.log(
        'Grammar history error:',
        error?.message || error
      );
    }
  };


  // ============================================================
  // RENDER CHAT MESSAGE
  // ============================================================

  const renderMessage = ({
    item,
  }) => {
    const isUser =
      item.role === 'user';

    const isTutor =
      item.role === 'assistant';

    return (
      <View
        style={[
          styles.messageRow,

          isUser
            ? styles.userRow
            : styles.tutorRow,
        ]}
      >
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              🤖
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,

            isUser
              ? styles.userBubble
              : styles.tutorBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,

              isUser
                ? styles.userMessageText
                : styles.tutorMessageText,
            ]}
          >
            {item.text}
          </Text>

          {isTutor &&
            !item.isError && (
              <View
                style={
                  styles.messageActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.audioButton
                  }
                  onPress={() =>
                    handlePlayPauseAudio(
                      item
                    )
                  }
                >
                  <Text
                    style={
                      styles.audioButtonText
                    }
                  >
                    {speakingId ===
                      item.id &&
                    isPlaying
                      ? '⏸️'
                      : '🔊'}
                  </Text>
                </TouchableOpacity>

                {item.data
                  ?.hasCorrection &&
                  item.data
                    ?.correctedText && (
                    <View
                      style={
                        styles.correctionBox
                      }
                    >
                      <Text
                        style={
                          styles.correctionTitle
                        }
                      >
                        ✏️ Correction
                      </Text>

                      <Text
                        style={
                          styles.originalText
                        }
                      >
                        You said:{' '}
                        {
                          item.data
                            .originalText
                        }
                      </Text>

                      <Text
                        style={
                          styles.correctedText
                        }
                      >
                        Better:{' '}
                        {
                          item.data
                            .correctedText
                        }
                      </Text>

                      {item.data
                        .explanation ? (
                        <Text
                          style={
                            styles.explanationText
                          }
                        >
                          {
                            item.data
                              .explanation
                          }
                        </Text>
                      ) : null}
                    </View>
                  )}

                {item.data
                  ?.pronunciationScore !==
                  null &&
                  item.data
                    ?.pronunciationScore !==
                    undefined && (
                    <Text
                      style={
                        styles.scoreText
                      }
                    >
                      🎯 Pronunciation:{' '}
                      {
                        item.data
                          .pronunciationScore
                      }
                      %
                    </Text>
                  )}

                {item.data?.tip ? (
                  <Text
                    style={
                      styles.tipText
                    }
                  >
                    💡 {item.data.tip}
                  </Text>
                ) : null}
              </View>
            )}
        </View>
      </View>
    );
  };


  // ============================================================
  // VOICE MODAL
  // ============================================================

  const renderVoiceModal = () => {
    return (
      <Modal
        visible={
          showVoiceModal
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowVoiceModal(false)
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.voiceModal
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                Select Tutor Voice
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setShowVoiceModal(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.closeButton
                  }
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={
                styles.voiceList
              }
            >
              {availableVoices.length ===
              0 ? (
                <View
                  style={
                    styles.emptyVoiceBox
                  }
                >
                  <Text
                    style={
                      styles.emptyVoiceText
                    }
                  >
                    No device voices found.
                  </Text>
                </View>
              ) : (
                availableVoices.map(
                  (
                    voice,
                    index
                  ) => (
                    <TouchableOpacity
                      key={
                        voice.identifier ||
                        `${voice.name}-${index}`
                      }
                      style={
                        styles.voiceItem
                      }
                      onPress={() => {
                        updatePreferredVoice(
                          voice
                        );

                        setShowVoiceModal(
                          false
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.voiceName
                        }
                      >
                        {voice.name ||
                          'Voice'}
                      </Text>

                      <Text
                        style={
                          styles.voiceLanguage
                        }
                      >
                        {voice.language ||
                          'Unknown language'}
                      </Text>
                    </TouchableOpacity>
                  )
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };


  // ============================================================
  // CURRENT SCENARIO
  // ============================================================

  const currentScenario =
    ROLEPLAY_SCENARIOS[
      selectedScenario
    ] ||
    ROLEPLAY_SCENARIOS.introduction;


  // ============================================================
  // UI
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            stopLiveSession();
            onBack?.();
          }}
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.headerCenter
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            AI Tutor
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Day {currentDayNum} •
            Interactive Practice
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.voiceSettingsButton
          }
          onPress={() =>
            setShowVoiceModal(true)
          }
        >
          <Text
            style={
              styles.voiceSettingsText
            }
          >
            🔊
          </Text>
        </TouchableOpacity>
      </View>


      {/* ================================================== */}
      {/* DAY BANNER */}
      {/* ================================================== */}

      <View
        style={
          styles.dayBanner
        }
      >
        <View>
          <Text
            style={
              styles.dayBannerTitle
            }
          >
            Day {currentDayNum}
          </Text>

          <Text
            style={
              styles.dayBannerSubtitle
            }
          >
            {
              currentScenario.objective
            }
          </Text>
        </View>

        <Text
          style={
            styles.dayEmoji
          }
        >
          🎓
        </Text>
      </View>


      {/* ================================================== */}
      {/* VOICE STATUS */}
      {/* ================================================== */}

      <View
        style={
          styles.voiceStatusContainer
        }
      >
        <View
          style={[
            styles.statusDot,

            listening &&
              styles.statusDotActive,

            isPlaying &&
              styles.statusDotSpeaking,
          ]}
        />

        <Text
          style={
            styles.voiceStatusText
          }
        >
          {isPlaying
            ? 'Tutor is speaking...'
            : listening
              ? 'Listening...'
              : isSessionActive
                ? 'Preparing microphone...'
                : 'Tap microphone to start'}
        </Text>

        {voiceError ? (
          <Text
            style={
              styles.voiceErrorText
            }
          >
            {voiceError}
          </Text>
        ) : null}
      </View>


      {/* ================================================== */}
      {/* LIVE WAVE */}
      {/* ================================================== */}

      {isSessionActive &&
        listening && (
          <View
            style={
              styles.waveContainer
            }
          >
            <View
              style={
                styles.waveBar
              }
            />

            <View
              style={[
                styles.waveBar,
                styles.waveBarTall,
              ]}
            />

            <View
              style={
                styles.waveBar
              }
            />

            <View
              style={[
                styles.waveBar,
                styles.waveBarTall2,
              ]}
            />

            <View
              style={
                styles.waveBar
              }
            />
          </View>
        )}


      {/* ================================================== */}
      {/* SCENARIOS */}
      {/* ================================================== */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        style={
          styles.scenarioScroll
        }
        contentContainerStyle={
          styles.scenarioContent
        }
      >
        {Object.entries(
          ROLEPLAY_SCENARIOS
        ).map(
          ([
            key,
            scenario,
          ]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.scenarioCard,

                selectedScenario ===
                  key &&
                  styles.scenarioCardActive,
              ]}
              onPress={() =>
                handleScenarioSelect(
                  key
                )
              }
            >
              <Text
                style={
                  styles.scenarioIcon
                }
              >
                {scenario.icon}
              </Text>

              <Text
                style={[
                  styles.scenarioTitle,

                  selectedScenario ===
                    key &&
                    styles.scenarioTitleActive,
                ]}
              >
                {scenario.title}
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>


      {/* ================================================== */}
      {/* CHAT */}
      {/* ================================================== */}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) =>
          String(item.id)
        }
        style={
          styles.chatList
        }
        contentContainerStyle={
          styles.chatContent
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          loading ? (
            <View
              style={
                styles.typingContainer
              }
            >
              <View
                style={
                  styles.typingAvatar
                }
              >
                <Text>
                  🤖
                </Text>
              </View>

              <View
                style={
                  styles.typingBubble
                }
              >
                <ActivityIndicator
                  size="small"
                />

                <Text
                  style={
                    styles.typingText
                  }
                >
                  Tutor is thinking...
                </Text>
              </View>
            </View>
          ) : null
        }
      />


      {/* ================================================== */}
      {/* INTERIM SPEECH */}
      {/* ================================================== */}

      {interimTranscript ? (
        <View
          style={
            styles.interimContainer
          }
        >
          <Text
            style={
              styles.interimLabel
            }
          >
            Listening:
          </Text>

          <Text
            style={
              styles.interimText
            }
          >
            {interimTranscript}
          </Text>
        </View>
      ) : null}


      {/* ================================================== */}
      {/* INPUT AREA */}
      {/* ================================================== */}

      <View
        style={
          styles.inputContainer
        }
      >
        <TouchableOpacity
          style={[
            styles.micButton,

            isSessionActive &&
              styles.micButtonActive,
          ]}
          onPress={() => {
            if (isSessionActive) {
              stopLiveSession();
            } else {
              startLiveSession();
            }
          }}
        >
          <Text
            style={
              styles.micIcon
            }
          >
            {isSessionActive
              ? '⏹'
              : '🎙️'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={
            styles.textInput
          }
          value={input}
          onChangeText={
            setInput
          }
          placeholder={
            listening
              ? 'Speak now...'
              : 'Type your message...'
          }
          placeholderTextColor="#7d8494"
          multiline
          editable={!loading}
          onSubmitEditing={() => {
            if (!loading) {
              handleSend();
            }
          }}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,

            (!input.trim() ||
              loading) &&
              styles.sendButtonDisabled,
          ]}
          disabled={
            !input.trim() ||
            loading
          }
          onPress={
            handleSend
          }
        >
          <Text
            style={
              styles.sendButtonText
            }
          >
            ➤
          </Text>
        </TouchableOpacity>
      </View>


      {/* ================================================== */}
      {/* VOICE MODAL */}
      {/* ================================================== */}

      {renderVoiceModal()}
    </KeyboardAvoidingView>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1020',
  },

  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#20283a',
    backgroundColor: '#10172a',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2235',
  },

  backButtonText: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 36,
    marginTop: -4,
  },

  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: '#8e98ac',
    fontSize: 12,
    marginTop: 2,
  },

  voiceSettingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2235',
  },

  voiceSettingsText: {
    fontSize: 20,
  },


  // ----------------------------------------------------------
  // DAY BANNER
  // ----------------------------------------------------------

  dayBanner: {
    marginHorizontal: 14,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#151d31',
    borderWidth: 1,
    borderColor: '#27314a',
    flexDirection: 'row',
    alignItems: 'center',
  },

  dayBannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },

  dayBannerSubtitle: {
    color: '#98a3b8',
    fontSize: 12,
    marginTop: 5,
    maxWidth: 290,
    lineHeight: 17,
  },

  dayEmoji: {
    marginLeft: 'auto',
    fontSize: 30,
  },


  // ----------------------------------------------------------
  // VOICE STATUS
  // ----------------------------------------------------------

  voiceStatusContainer: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#596273',
    marginBottom: 3,
  },

  statusDotActive: {
    backgroundColor: '#35d07f',
  },

  statusDotSpeaking: {
    backgroundColor: '#8b7cff',
  },

  voiceStatusText: {
    color: '#a9b2c3',
    fontSize: 12,
  },

  voiceErrorText: {
    color: '#ff8c8c',
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },


  // ----------------------------------------------------------
  // WAVE
  // ----------------------------------------------------------

  waveContainer: {
    height: 35,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },

  waveBar: {
    width: 5,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#5d75ff',
  },

  waveBarTall: {
    height: 24,
  },

  waveBarTall2: {
    height: 18,
  },


  // ----------------------------------------------------------
  // SCENARIOS
  // ----------------------------------------------------------

  scenarioScroll: {
    maxHeight: 78,
    flexGrow: 0,
  },

  scenarioContent: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
  },

  scenarioCard: {
    minWidth: 88,
    height: 62,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#151d31',
    borderWidth: 1,
    borderColor: '#242e44',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scenarioCardActive: {
    borderColor: '#6578ff',
    backgroundColor: '#1b2443',
  },

  scenarioIcon: {
    fontSize: 20,
  },

  scenarioTitle: {
    color: '#8f9aae',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },

  scenarioTitleActive: {
    color: '#ffffff',
  },


  // ----------------------------------------------------------
  // CHAT
  // ----------------------------------------------------------

  chatList: {
    flex: 1,
  },

  chatContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },

  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },

  userRow: {
    justifyContent: 'flex-end',
  },

  tutorRow: {
    justifyContent: 'flex-start',
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#202b46',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  avatarText: {
    fontSize: 18,
  },

  messageBubble: {
    maxWidth: '82%',
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  userBubble: {
    backgroundColor: '#5368ed',
    borderBottomRightRadius: 4,
  },

  tutorBubble: {
    backgroundColor: '#171f32',
    borderWidth: 1,
    borderColor: '#28334b',
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },

  userMessageText: {
    color: '#ffffff',
  },

  tutorMessageText: {
    color: '#e6eaf2',
  },

  messageActions: {
    marginTop: 8,
  },

  audioButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#232d46',
    alignItems: 'center',
    justifyContent: 'center',
  },

  audioButtonText: {
    fontSize: 15,
  },


  // ----------------------------------------------------------
  // CORRECTION
  // ----------------------------------------------------------

  correctionBox: {
    marginTop: 9,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#101729',
    borderLeftWidth: 3,
    borderLeftColor: '#6678ff',
  },

  correctionTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },

  originalText: {
    color: '#ff9b9b',
    fontSize: 12,
    lineHeight: 17,
  },

  correctedText: {
    color: '#6fe3a2',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  explanationText: {
    color: '#9ba6b9',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  scoreText: {
    color: '#f4c96b',
    fontSize: 11,
    marginTop: 7,
  },

  tipText: {
    color: '#91b6ff',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },


  // ----------------------------------------------------------
  // TYPING
  // ----------------------------------------------------------

  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  typingAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#202b46',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  typingBubble: {
    backgroundColor: '#171f32',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  typingText: {
    color: '#8f9aae',
    fontSize: 11,
    marginLeft: 8,
  },


  // ----------------------------------------------------------
  // INTERIM SPEECH
  // ----------------------------------------------------------

  interimContainer: {
    marginHorizontal: 14,
    marginBottom: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#121a2d',
    borderWidth: 1,
    borderColor: '#27324a',
  },

  interimLabel: {
    color: '#69778f',
    fontSize: 10,
    marginBottom: 2,
  },

  interimText: {
    color: '#d8deea',
    fontSize: 13,
  },


  // ----------------------------------------------------------
  // INPUT
  // ----------------------------------------------------------

  inputContainer: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#10172a',
    borderTopWidth: 1,
    borderTopColor: '#20283a',
    gap: 8,
  },

  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#202b46',
    justifyContent: 'center',
    alignItems: 'center',
  },

  micButtonActive: {
    backgroundColor: '#c54858',
  },

  micIcon: {
    fontSize: 21,
  },

  textInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 23,
    backgroundColor: '#171f32',
    borderWidth: 1,
    borderColor: '#29344c',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    fontSize: 14,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#586cf0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sendButtonDisabled: {
    opacity: 0.35,
  },

  sendButtonText: {
    color: '#ffffff',
    fontSize: 22,
    marginLeft: 2,
  },


  // ----------------------------------------------------------
  // MODAL
  // ----------------------------------------------------------

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },

  voiceModal: {
    backgroundColor: '#11182a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 25,
  },

  modalHeader: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#263149',
  },

  modalTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },

  closeButton: {
    color: '#ffffff',
    fontSize: 22,
  },

  voiceList: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },

  voiceItem: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#182137',
    borderWidth: 1,
    borderColor: '#27334c',
    marginBottom: 8,
  },

  voiceName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  voiceLanguage: {
    color: '#8995aa',
    fontSize: 11,
    marginTop: 3,
  },

  emptyVoiceBox: {
    padding: 30,
    alignItems: 'center',
  },

  emptyVoiceText: {
    color: '#8c97aa',
    fontSize: 13,
  },
});