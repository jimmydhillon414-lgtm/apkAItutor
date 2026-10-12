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

import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';

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
  if (!language) {
    return 'en-IN';
  }

  return LANGUAGE_CODES[language] || 'en-IN';
};


// ============================================================
// ROLEPLAY SCENARIOS
// ============================================================

const ROLEPLAY_SCENARIOS = {
  introduction: {
    title: 'Introduction',
    icon: '👋',
    objective:
      'Introduce yourself and have a basic conversation.',
  },

  travel: {
    title: 'Travel',
    icon: '✈️',
    objective:
      'Practice useful conversations while travelling.',
  },

  restaurant: {
    title: 'Restaurant',
    icon: '🍽️',
    objective:
      'Practice ordering food and speaking with restaurant staff.',
  },

  job: {
    title: 'Job Interview',
    icon: '💼',
    objective:
      'Practice answering common job interview questions.',
  },

  shopping: {
    title: 'Shopping',
    icon: '🛍️',
    objective:
      'Practice conversations while shopping.',
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

  const currentDayNum =
    Number(selectedDay) || 1;


  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [listening, setListening] =
    useState(false);

  const [isSessionActive, setIsSessionActive] =
    useState(false);

  const [speechLang, setSpeechLang] =
    useState('en-IN');

  const [speakingId, setSpeakingId] =
    useState(null);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [availableVoices, setAvailableVoices] =
    useState([]);

  const [showVoiceModal, setShowVoiceModal] =
    useState(false);

  const [voiceError, setVoiceError] =
    useState('');

  const [interimTranscript, setInterimTranscript] =
    useState('');

  const [selectedScenario, setSelectedScenario] =
    useState('introduction');

  // Raw microphone diagnostic state.
  const [micDiagnosticRunning, setMicDiagnosticRunning] =
    useState(false);

  const [micDiagnosticStatus, setMicDiagnosticStatus] =
    useState('');

  const [micInputName, setMicInputName] =
    useState('');

  const [micMetering, setMicMetering] =
    useState(null);


  // ----------------------------------------------------------
  // REFS
  // ----------------------------------------------------------

  const flatListRef =
    useRef(null);

  const userIdRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const speechTimeoutRef =
    useRef(null);

  const turnEndTimeoutRef =
    useRef(null);

  const finalTranscriptRef =
    useRef('');

  const speechSegmentBufferRef =
    useRef('');

  const speechQueueRef =
    useRef([]);

  const isSpeakingRef =
    useRef(false);

  const currentSpeakingIdRef =
    useRef(null);

  const sendingRef =
    useRef(false);

  const recognitionRetryTimeoutRef =
    useRef(null);

  const conversationHistoryRef =
    useRef([]);

  const sessionActiveRef =
    useRef(false);


  // ----------------------------------------------------------
  // SPEECH RECOGNITION REFS
  // ----------------------------------------------------------

  const recognitionRunningRef =
    useRef(false);

  const intentionalRecognitionStopRef =
    useRef(false);

  const recognitionStartingRef =
    useRef(false);

  const finalResultHandledRef =
    useRef(false);

  const targetLanguageRef =
    useRef('English');

  const levelRef =
    useRef('Beginner');

  const preferredVoiceRef =
    useRef(null);

  // Keep the same selected device voice for each language during this session.
  const voiceByLanguageRef =
    useRef({});


  // ----------------------------------------------------------
  // RAW MICROPHONE DIAGNOSTIC REFS
  // ----------------------------------------------------------

  const micDiagnosticRunningRef =
    useRef(false);

  const micLastMeteringLogRef =
    useRef(0);

  const micDetectedSpeechRef =
    useRef(false);

  const micInputRef =
    useRef(null);


  // ============================================================
  // EXPO AUDIO RECORDER
  //
  // IMPORTANT:
  // This recorder is ONLY used for the diagnostic.
  //
  // It must NOT run at the same time as
  // ExpoSpeechRecognitionModule.
  // ============================================================

  const audioRecorder =
    useAudioRecorder(
      {
        ...RecordingPresets.HIGH_QUALITY,

        // Ask Android for a microphone source optimized
        // for voice recognition.
        android: {
          ...RecordingPresets.HIGH_QUALITY.android,
          audioSource: 'voice_recognition',
        },

        // Enable metering so we can see whether actual
        // microphone level is changing while the user speaks.
        isMeteringEnabled: true,
      },
      (status) => {
        if (
          !micDiagnosticRunningRef.current
        ) {
          return;
        }

        const now =
          Date.now();

        // Avoid flooding Metro with hundreds of logs.
        if (
          now -
            micLastMeteringLogRef.current <
          250
        ) {
          return;
        }

        micLastMeteringLogRef.current =
          now;

        const meter =
          status?.metering;

        if (
          typeof meter === 'number'
        ) {
          if (
            mountedRef.current
          ) {
            setMicMetering(
              meter
            );
          }

          console.log(
            '🎤 RAW MIC METERING:',
            meter
          );

          /*
           * Android/Expo metering is generally expressed
           * as an audio level value.
           *
           * We don't assume one exact threshold here.
           * We simply detect whether the value changes
           * while the user is speaking.
           */
          if (
            Math.abs(meter) >
            0.1
          ) {
            micDetectedSpeechRef.current =
              true;
          }
        } else {
          console.log(
            '🎤 RAW MIC STATUS:',
            status
          );
        }
      }
    );


  // ============================================================
  // INITIALIZATION
  // ============================================================

  useEffect(() => {
    mountedRef.current =
      true;

    fetchUserAndProfile();
    loadDeviceVoices();

    return () => {
      mountedRef.current =
        false;

      sessionActiveRef.current =
        false;

      micDiagnosticRunningRef.current =
        false;

      if (
        speechTimeoutRef.current
      ) {
        clearTimeout(
          speechTimeoutRef.current
        );

        speechTimeoutRef.current =
          null;
      }

      if (
        turnEndTimeoutRef.current
      ) {
        clearTimeout(
          turnEndTimeoutRef.current
        );

        turnEndTimeoutRef.current =
          null;
      }

      if (
        recognitionRetryTimeoutRef.current
      ) {
        clearTimeout(
          recognitionRetryTimeoutRef.current
        );

        recognitionRetryTimeoutRef.current =
          null;
      }

      stopRecognition(true);
      stopAllSpeech();

      try {
        if (
          audioRecorder?.isRecording
        ) {
          audioRecorder.stop();
        }
      } catch (_) {}
    };
  }, []);


  // Keep session ref synchronized.
  useEffect(() => {
    sessionActiveRef.current =
      isSessionActive;
  }, [
    isSessionActive,
  ]);


  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    if (
      messages.length > 0
    ) {
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

  const fetchUserAndProfile =
    async () => {
      try {
        const {
          data: {
            user,
          },
          error,
        } =
          await supabase.auth.getUser();

        if (
          error ||
          !user
        ) {
          console.log(
            'No active Supabase auth session. Using local tutor profile.'
          );

          const localProfile = {
            target_language:
              'English',

            proficiency_level:
              'Beginner',

            learning_goal:
              null,

            field_of_interest:
              null,

            preferred_voice:
              null,

            current_scenario:
              'introduction',

            scenario_objective:
              'Introduce yourself and have a basic conversation.',

            full_name:
              'User',

            avatar_type:
              '🎓',
          };

          const language =
            localProfile.target_language ||
            'English';

          const level =
            localProfile.proficiency_level ||
            'Beginner';

          targetLanguageRef.current =
            language;

          levelRef.current =
            level;

          preferredVoiceRef.current =
            localProfile.preferred_voice ||
            null;

          setSpeechLang(
            getLanguageCode(
              language
            )
          );

          setSelectedScenario(
            localProfile.current_scenario ||
              'introduction'
          );

          initializeDayCurriculumChat(
            currentDayNum,
            language
          );

          return;
        }

        userIdRef.current =
          user.id;

        let profile =
          null;

        try {
          const {
            data,
          } =
            await supabase
              .from(
                'user_profiles'
              )
              .select('*')
              .eq(
                'id',
                user.id
              )
              .maybeSingle();

          profile =
            data;

        } catch (
          profileError
        ) {
          console.log(
            'Profile fetch error:',
            profileError?.message ||
              profileError
          );
        }

        const mergedProfile = {
          target_language:
            profile?.target_language ||
            'English',

          proficiency_level:
            profile?.proficiency_level ||
            'Beginner',

          learning_goal:
            profile?.learning_goal ||
            null,

          field_of_interest:
            profile?.field_of_interest ||
            null,

          preferred_voice:
            profile?.preferred_voice ||
            null,

          current_scenario:
            profile?.current_scenario ||
            'introduction',

          scenario_objective:
            profile?.scenario_objective ||
            'Introduce yourself and have a basic conversation.',

          full_name:
            profile?.full_name ||
            'User',

          avatar_type:
            profile?.avatar_type ||
            '🎓',
        };

        targetLanguageRef.current =
          mergedProfile.target_language;

        levelRef.current =
          mergedProfile.proficiency_level;

        preferredVoiceRef.current =
          mergedProfile.preferred_voice ||
          null;

        setSpeechLang(
          getLanguageCode(
            mergedProfile.target_language
          )
        );

        setSelectedScenario(
          mergedProfile.current_scenario ||
            'introduction'
        );

        initializeDayCurriculumChat(
          currentDayNum,
          mergedProfile.target_language
        );

      } catch (
        error
      ) {
        console.log(
          'fetchUserAndProfile error:',
          error?.message ||
            error
        );

        targetLanguageRef.current =
          'English';

        levelRef.current =
          'Beginner';

        setSpeechLang(
          'en-IN'
        );

        initializeDayCurriculumChat(
          currentDayNum,
          'English'
        );
      }
    };


  // ============================================================
  // INITIAL DAY MESSAGE
  // ============================================================

  const initializeDayCurriculumChat =
    (
      dayNumber,
      language
    ) => {
      conversationHistoryRef.current =
        [];

      const welcomeText =
        `Welcome to Day ${dayNumber}! Today we will practice ${language} together. Please introduce yourself in ${language}.`;

      const welcomeMessage = {
        id:
          `welcome-${dayNumber}-${Date.now()}`,

        role:
          'assistant',

        type:
          'tutor',

        text:
          `Welcome to Day ${dayNumber}! 🎓\n\n` +
          `Today we will practice ${language} together.\n\n` +
          `I will help you with grammar, vocabulary, pronunciation, and natural conversation.\n\n` +
          `Let's begin! Please introduce yourself in ${language}.`,

        data: {
          reply:
            welcomeText,
        },
      };

      setMessages([
        welcomeMessage,
      ]);

      conversationHistoryRef.current =
        [
          {
            role:
              'assistant',

            content:
              welcomeText,
          },
        ];

      scheduleSpeech(
        welcomeMessage,
        700
      );
    };


  // ============================================================
  // DEVICE VOICES
  // ============================================================

  const loadDeviceVoices =
    async () => {
      try {
        const voices =
          await Speech.getAvailableVoicesAsync();

        if (
          mountedRef.current
        ) {
          setAvailableVoices(
            Array.isArray(
              voices
            )
              ? voices
              : []
          );
        }

        console.log(
          'Available device voices:',
          Array.isArray(
            voices
          )
            ? voices.length
            : 0
        );

      } catch (
        error
      ) {
        console.log(
          'Unable to load voices:',
          error?.message ||
            error
        );
      }
    };


  // ============================================================
  // SAVE PREFERRED VOICE
  // ============================================================

  const updatePreferredVoice =
    async (
      voice
    ) => {
      if (!voice) {
        return;
      }

      preferredVoiceRef.current =
        voice.identifier ||
        voice.name ||
        null;

      try {
        if (
          userIdRef.current
        ) {
          await supabase
            .from(
              'user_profiles'
            )
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

      } catch (
        error
      ) {
        console.log(
          'Unable to save preferred voice:',
          error?.message ||
            error
        );
      }
    };


  // ============================================================
  // STOP SPEECH
  // ============================================================

  const stopAllSpeech =
    async () => {
      try {
        if (
          speechTimeoutRef.current
        ) {
          clearTimeout(
            speechTimeoutRef.current
          );

          speechTimeoutRef.current =
            null;
        }

        speechQueueRef.current =
          [];

        await Speech.stop();

      } catch (
        error
      ) {
        console.log(
          'Speech stop error:',
          error?.message ||
            error
        );
      }

      isSpeakingRef.current =
        false;

      currentSpeakingIdRef.current =
        null;

      if (
        mountedRef.current
      ) {
        setSpeakingId(
          null
        );

        setIsPlaying(
          false
        );
      }
    };


  // ============================================================
  // RAW MICROPHONE DIAGNOSTIC
  //
  // THIS IS THE IMPORTANT NEW TEST.
  //
  // Do NOT run speech recognition while this test is running.
  // ============================================================

  const runMicrophoneDiagnostic =
    async () => {
      if (
        !mountedRef.current
      ) {
        return;
      }

      if (
        micDiagnosticRunningRef.current
      ) {
        console.log(
          '🎤 Microphone diagnostic already running.'
        );

        return;
      }

      if (
        loading ||
        sendingRef.current
      ) {
        setMicDiagnosticStatus(
          'AI request is currently processing.'
        );

        return;
      }

      console.log(
        '========================================'
      );

      console.log(
        '🎤 RAW MICROPHONE DIAGNOSTIC START'
      );

      console.log(
        '========================================'
      );

      micDiagnosticRunningRef.current =
        true;

      micDetectedSpeechRef.current =
        false;

      micLastMeteringLogRef.current =
        0;

      if (
        mountedRef.current
      ) {
        setMicDiagnosticRunning(
          true
        );

        setMicDiagnosticStatus(
          'Preparing microphone...'
        );

        setMicInputName(
          ''
        );

        setMicMetering(
          null
        );
      }

      try {
        // ------------------------------------------------------
        // Stop speech recognition first.
        // ------------------------------------------------------

        if (
          recognitionRunningRef.current ||
          recognitionStartingRef.current
        ) {
          await stopRecognition(
            true
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                300
              )
          );
        }

        // ------------------------------------------------------
        // Stop TTS.
        // ------------------------------------------------------

        await stopAllSpeech();

        // ------------------------------------------------------
        // Microphone permission.
        // ------------------------------------------------------

        const permission =
          await AudioModule.requestRecordingPermissionsAsync();

        console.log(
          '🎤 RAW MIC PERMISSION:',
          permission
        );

        if (
          !permission?.granted
        ) {
          throw new Error(
            'Microphone permission was not granted.'
          );
        }

        // ------------------------------------------------------
        // Configure audio for recording.
        // ------------------------------------------------------

        await setAudioModeAsync({
          playsInSilentMode:
            true,

          allowsRecording:
            true,
        });

        console.log(
          '🎤 Audio mode configured.'
        );

        // ------------------------------------------------------
        // Prepare recorder.
        // ------------------------------------------------------

        await audioRecorder.prepareToRecordAsync({
          ...RecordingPresets.HIGH_QUALITY,

          android: {
            ...RecordingPresets.HIGH_QUALITY.android,

            audioSource:
              'voice_recognition',
          },

          isMeteringEnabled:
            true,
        });

        console.log(
          '🎤 Recorder prepared.'
        );

        // ------------------------------------------------------
        // Inspect available inputs.
        // ------------------------------------------------------

        try {
          const inputs =
            await audioRecorder.getAvailableInputs();

          console.log(
            '🎤 AVAILABLE RECORDING INPUTS:',
            inputs
          );

          if (
            Array.isArray(
              inputs
            ) &&
            inputs.length > 0
          ) {
            inputs.forEach(
              (
                item,
                index
              ) => {
                console.log(
                  `🎤 INPUT ${index}:`,
                  {
                    name:
                      item?.name,
                    type:
                      item?.type,
                    uid:
                      item?.uid,
                  }
                );
              }
            );
          }

        } catch (
          inputError
        ) {
          console.log(
            '🎤 Could not read available recording inputs:',
            inputError?.message ||
              inputError
          );
        }

        // ------------------------------------------------------
        // Inspect current input.
        // ------------------------------------------------------

        try {
          const currentInput =
            await audioRecorder.getCurrentInput();

          console.log(
            '🎤 CURRENT RECORDING INPUT:',
            currentInput
          );

          micInputRef.current =
            currentInput;

          const readableInput =
            currentInput?.name ||
            currentInput?.type ||
            currentInput?.uid ||
            'Unknown microphone';

          if (
            mountedRef.current
          ) {
            setMicInputName(
              readableInput
            );
          }

        } catch (
          currentInputError
        ) {
          console.log(
            '🎤 Could not read current recording input:',
            currentInputError?.message ||
              currentInputError
          );
        }

        if (
          mountedRef.current
        ) {
          setMicDiagnosticStatus(
            'Recording for 5 seconds — SPEAK NOW.'
          );
        }

        console.log(
          '🎤 ========================================'
        );

        console.log(
          '🎤 RECORDING STARTED'
        );

        console.log(
          '🎤 SPEAK NOW FOR 5 SECONDS'
        );

        console.log(
          '🎤 ========================================'
        );

        // ------------------------------------------------------
        // Start a controlled 5-second recording.
        // ------------------------------------------------------

        audioRecorder.record({
          forDuration:
            5,
        });

        // Give Android time to capture the full recording.
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              5600
            )
        );

        // ------------------------------------------------------
        // Explicitly stop if still recording.
        // ------------------------------------------------------

        try {
          if (
            audioRecorder.isRecording
          ) {
            await audioRecorder.stop();
          }
        } catch (
          stopError
        ) {
          console.log(
            '🎤 Recorder stop warning:',
            stopError?.message ||
              stopError
          );
        }

        // ------------------------------------------------------
        // Get final status.
        // ------------------------------------------------------

        let finalStatus =
          null;

        try {
          finalStatus =
            audioRecorder.getStatus();

          console.log(
            '🎤 FINAL RAW MIC STATUS:',
            finalStatus
          );
        } catch (
          statusError
        ) {
          console.log(
            '🎤 Could not get final recorder status:',
            statusError?.message ||
              statusError
          );
        }

        const recordingUri =
          audioRecorder.uri ||
          finalStatus?.url ||
          null;

        console.log(
          '🎤 FINAL RECORDING URI:',
          recordingUri
        );

        console.log(
          '🎤 AUDIO ACTIVITY DETECTED:',
          micDetectedSpeechRef.current
        );

        // ------------------------------------------------------
        // Diagnostic conclusion.
        // ------------------------------------------------------

        if (
          micDetectedSpeechRef.current
        ) {
          console.log(
            '🎤 RESULT: MICROPHONE AUDIO ACTIVITY DETECTED.'
          );

          if (
            mountedRef.current
          ) {
            setMicDiagnosticStatus(
              '✅ Microphone audio detected. Check SpeechRecognizer/Android speech service next.'
            );
          }

        } else if (
          recordingUri
        ) {
          console.log(
            '🎤 RESULT: RECORDING FILE CREATED, BUT NO CLEAR METERING ACTIVITY WAS DETECTED.'
          );

          if (
            mountedRef.current
          ) {
            setMicDiagnosticStatus(
              '⚠️ Recording created, but no clear microphone activity was detected.'
            );
          }

        } else {
          console.log(
            '🎤 RESULT: NO RECORDING URI / NO MICROPHONE DATA.'
          );

          if (
            mountedRef.current
          ) {
            setMicDiagnosticStatus(
              '❌ No microphone recording data was produced.'
            );
          }
        }

        console.log(
          '🎤 ========================================'
        );

        console.log(
          '🎤 RAW MICROPHONE DIAGNOSTIC COMPLETE'
        );

        console.log(
          '🎤 ========================================'
        );

      } catch (
        error
      ) {
        console.log(
          '🎤 RAW MICROPHONE DIAGNOSTIC ERROR:',
          error?.message ||
            error
        );

        console.log(
          '🎤 RAW MICROPHONE DIAGNOSTIC ERROR OBJECT:',
          error
        );

        if (
          mountedRef.current
        ) {
          setMicDiagnosticStatus(
            `❌ Microphone diagnostic failed: ${
              error?.message ||
              'Unknown error'
            }`
          );
        }

      } finally {
        micDiagnosticRunningRef.current =
          false;

        if (
          mountedRef.current
        ) {
          setMicDiagnosticRunning(
            false
          );
        }
      }
    };


  // ============================================================
  // START SPEECH RECOGNITION
  // ============================================================

  const startContinuousListening =
    useCallback(
      async () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        if (
          !sessionActiveRef.current
        ) {
          return;
        }

        if (
          sendingRef.current
        ) {
          return;
        }

        if (
          isSpeakingRef.current
        ) {
          return;
        }

        if (
          micDiagnosticRunningRef.current
        ) {
          console.log(
            '🎙️ Microphone diagnostic is running. Speech recognition will not start.'
          );

          return;
        }

        if (
          recognitionRunningRef.current
        ) {
          console.log(
            '🎙️ Recognition already running.'
          );

          return;
        }

        if (
          recognitionStartingRef.current
        ) {
          return;
        }

        recognitionStartingRef.current =
          true;

        try {
          setVoiceError(
            ''
          );

          finalResultHandledRef.current =
            false;

          speechSegmentBufferRef.current =
            '';

          finalTranscriptRef.current =
            '';

          const permission =
            await ExpoSpeechRecognitionModule.requestPermissionsAsync();

          console.log(
            'Speech permission:',
            permission
          );

          if (
            !permission?.granted
          ) {
            recognitionStartingRef.current =
              false;

            if (
              mountedRef.current
            ) {
              setListening(
                false
              );

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
            isSpeakingRef.current ||
            micDiagnosticRunningRef.current
          ) {
            recognitionStartingRef.current =
              false;

            return;
          }

          intentionalRecognitionStopRef.current =
            false;

          console.log(
            '🎙️ Starting speech recognition with:',
            speechLang
          );

          await ExpoSpeechRecognitionModule.start({
            lang:
              speechLang,

            interimResults:
              true,

            continuous:
              false,

            maxAlternatives:
              1,

            requiresOnDeviceRecognition:
              false,
          });

          recognitionRunningRef.current =
            true;

          console.log(
            '🎙️ Speech recognition start() completed'
          );

        } catch (
          error
        ) {
          console.log(
            '🎙️ Speech start error:',
            error?.message ||
              error
          );

          recognitionRunningRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setListening(
              false
            );

            setVoiceError(
              error?.message ||
                'Unable to start speech recognition.'
            );
          }

        } finally {
          recognitionStartingRef.current =
            false;
        }
      },
      [
        speechLang,
      ]
    );


  // ============================================================
  // STOP RECOGNITION
  // ============================================================

  const stopRecognition =
    async (
      immediate = true
    ) => {
      intentionalRecognitionStopRef.current =
        true;

      if (
        recognitionRetryTimeoutRef.current
      ) {
        clearTimeout(
          recognitionRetryTimeoutRef.current
        );

        recognitionRetryTimeoutRef.current =
          null;
      }

      if (
        turnEndTimeoutRef.current
      ) {
        clearTimeout(
          turnEndTimeoutRef.current
        );

        turnEndTimeoutRef.current =
          null;
      }

      if (
        !recognitionRunningRef.current
      ) {
        if (
          mountedRef.current
        ) {
          setListening(
            false
          );
        }

        return;
      }

      try {
        recognitionRunningRef.current =
          false;

        if (
          ExpoSpeechRecognitionModule
        ) {
          if (
            immediate
          ) {
            console.log(
              '🎙️ Aborting speech recognition intentionally'
            );

            await ExpoSpeechRecognitionModule.abort();

          } else {
            console.log(
              '🎙️ Stopping speech recognition intentionally'
            );

            await ExpoSpeechRecognitionModule.stop();
          }
        }

      } catch (
        error
      ) {
        console.log(
          'Stop recognition error:',
          error?.message ||
            error
        );
      }

      if (
        mountedRef.current
      ) {
        setListening(
          false
        );
      }
    };


  // ============================================================
  // SPEECH START EVENT
  // ============================================================

  useSpeechRecognitionEvent(
    'start',
    () => {
      console.log(
        '🎙️ Speech recognition started'
      );

      recognitionRunningRef.current =
        true;

      if (
        mountedRef.current
      ) {
        setListening(
          true
        );

        setVoiceError(
          ''
        );
      }
    }
  );


  // ============================================================
  // AUDIO START
  // ============================================================

  useSpeechRecognitionEvent(
    'audiostart',
    (event) => {
      console.log(
        '🎙️ AUDIO START:',
        event || ''
      );
    }
  );


  // ============================================================
  // SPEECH START
  // ============================================================

  useSpeechRecognitionEvent(
    'speechstart',
    (event) => {
      console.log(
        '🎙️ SPEECH START — Android detected speech:',
        event || ''
      );
    }
  );


  // ============================================================
  // SPEECH END
  // ============================================================

  useSpeechRecognitionEvent(
    'speechend',
    (event) => {
      console.log(
        '🎙️ SPEECH END — Android stopped detecting speech:',
        event || ''
      );
    }
  );


  // ============================================================
  // AUDIO END
  // ============================================================

  useSpeechRecognitionEvent(
    'audioend',
    (event) => {
      console.log(
        '🎙️ AUDIO END:',
        event || ''
      );
    }
  );


  // ============================================================
  // SPEECH RECOGNITION END
  // ============================================================

  useSpeechRecognitionEvent(
    'end',
    () => {
      console.log(
        '🎙️ Speech recognition ended'
      );

      recognitionRunningRef.current =
        false;

      if (
        mountedRef.current
      ) {
        setListening(
          false
        );
      }

      if (
        intentionalRecognitionStopRef.current
      ) {
        console.log(
          '🎙️ Recognition ended intentionally. No restart.'
        );

        return;
      }

      if (
        !mountedRef.current ||
        !sessionActiveRef.current
      ) {
        console.log(
          '🎙️ Recognition ended because tutor session is inactive.'
        );

        return;
      }

      if (
        sendingRef.current
      ) {
        console.log(
          '🎙️ Recognition ended while AI request is processing.'
        );

        return;
      }

      if (
        isSpeakingRef.current
      ) {
        console.log(
          '🎙️ Recognition ended while tutor is speaking.'
        );

        return;
      }

      console.log(
        '🎙️ Recognition ended unexpectedly. Scheduling safe microphone restart.'
      );

      // Android speech recognition commonly ends after one utterance or a
      // no-speech timeout. In a live tutor session, recover automatically.
      if (
        recognitionRetryTimeoutRef.current
      ) {
        clearTimeout(
          recognitionRetryTimeoutRef.current
        );
      }

      recognitionRetryTimeoutRef.current =
        setTimeout(
          () => {
            recognitionRetryTimeoutRef.current = null;

            if (
              !mountedRef.current ||
              !sessionActiveRef.current ||
              sendingRef.current ||
              isSpeakingRef.current ||
              micDiagnosticRunningRef.current ||
              recognitionRunningRef.current ||
              recognitionStartingRef.current
            ) {
              console.log(
                '🎙️ Microphone restart skipped because the tutor is busy or the session is inactive.'
              );
              return;
            }

            intentionalRecognitionStopRef.current = false;
            console.log(
              '🎙️ Recovering live session: restarting speech recognition.'
            );
            startContinuousListening();
          },
          900
        );
    }
  );


  // ============================================================
  // SPEECH RESULT
  // ============================================================

  useSpeechRecognitionEvent(
    'result',
    async (
      event
    ) => {
      try {
        if (
          !event?.results
        ) {
          return;
        }

        const results =
          event.results;

        const latestResult =
          results[
            results.length - 1
          ];

        const transcript =
          latestResult?.transcript ||
          '';

        if (
          !transcript.trim()
        ) {
          return;
        }

        console.log(
          '🎙️ Speech result:',
          transcript,
          'final:',
          event.isFinal
        );

        if (
          mountedRef.current
        ) {
          setInterimTranscript(
            transcript
          );

          setInput(
            transcript
          );
        }

        if (
          !event.isFinal
        ) {
          return;
        }

        if (
          finalResultHandledRef.current
        ) {
          console.log(
            '🎙️ Duplicate final result ignored.'
          );

          return;
        }

        finalResultHandledRef.current =
          true;

        const finalText =
          transcript.trim();

        if (
          !finalText
        ) {
          finalResultHandledRef.current =
            false;

          return;
        }

        speechSegmentBufferRef.current =
          finalText;

        finalTranscriptRef.current =
          finalText;

        if (
          mountedRef.current
        ) {
          setInterimTranscript(
            ''
          );
        }

        console.log(
          '🎙️ FINAL USER SPEECH:',
          finalText
        );

        await stopRecognition(
          true
        );

        speechSegmentBufferRef.current =
          '';

        finalTranscriptRef.current =
          '';

        if (
          mountedRef.current
        ) {
          setInput(
            ''
          );

          setInterimTranscript(
            ''
          );
        }

        handleSendDirect(
          finalText
        );

      } catch (
        error
      ) {
        console.log(
          'Speech result processing error:',
          error?.message ||
            error
        );

        finalResultHandledRef.current =
          false;
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
        event?.error ||
        '';

      const errorMessage =
        event?.message ||
        '';

      console.log(
        '🎙️ Speech recognition error:',
        errorCode,
        errorMessage
      );

      recognitionRunningRef.current =
        false;

      if (
        mountedRef.current
      ) {
        setListening(
          false
        );
      }

      if (
        errorCode === 'aborted' &&
        intentionalRecognitionStopRef.current
      ) {
        console.log(
          '🎙️ Ignoring intentional recognition abort.'
        );

        return;
      }

      if (
        errorCode ===
        'no-speech'
      ) {
        console.log(
          '🎙️ Android reported no-speech.'
        );

        if (
          mountedRef.current
        ) {
          setVoiceError(
            'No speech detected. Tap the microphone and speak clearly.'
          );
        }

        return;
      }

      if (
        errorCode ===
        'network'
      ) {
        if (
          mountedRef.current
        ) {
          setVoiceError(
            'Speech service network error. Tap the microphone to try again.'
          );
        }

        return;
      }

      if (
        errorCode ===
        'not-allowed'
      ) {
        if (
          mountedRef.current
        ) {
          setVoiceError(
            'Microphone permission was denied.'
          );
        }

        return;
      }

      if (
        errorCode ===
        'aborted'
      ) {
        console.log(
          '🎙️ Recognition aborted.'
        );

        if (
          mountedRef.current
        ) {
          setVoiceError(
            ''
          );
        }

        return;
      }

      if (
        mountedRef.current
      ) {
        setVoiceError(
          errorMessage ||
            'Speech recognition error.'
        );
      }
    }
  );


  // ============================================================
  // LEGACY VOICE TURN FUNCTIONS
  // ============================================================

  const scheduleVoiceTurn =
    () => {
      if (
        turnEndTimeoutRef.current
      ) {
        clearTimeout(
          turnEndTimeoutRef.current
        );
      }

      turnEndTimeoutRef.current =
        setTimeout(
          () => {
            turnEndTimeoutRef.current =
              null;

            flushVoiceTurn();
          },
          700
        );
    };


  const flushVoiceTurn =
    () => {
      const finalText =
        speechSegmentBufferRef.current.trim();

      if (
        !finalText
      ) {
        return;
      }

      speechSegmentBufferRef.current =
        '';

      finalTranscriptRef.current =
        '';

      setInput(
        ''
      );

      setInterimTranscript(
        ''
      );

      console.log(
        '🎙️ FINAL USER SPEECH:',
        finalText
      );

      handleSendDirect(
        finalText
      );
    };


  // ============================================================
  // SPEAK MESSAGE
  // ============================================================

  const speakMessage =
    async (
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
        if (
          recognitionRunningRef.current
        ) {
          await stopRecognition(
            true
          );
        }

        await Speech.stop();

        const messageId =
          message.id;

        currentSpeakingIdRef.current =
          messageId;

        isSpeakingRef.current =
          true;

        setSpeakingId(
          messageId
        );

        setIsPlaying(
          true
        );

        let selectedVoice =
          null;

        const requestedLanguage =
          String(speechLang || 'en-IN').toLowerCase();

        const requestedBaseLanguage =
          requestedLanguage.split('-')[0];

        const preferredVoice =
          message.preferredVoice ||
          preferredVoiceRef.current;

        // A saved voice is usable only when it matches the active language.
        // Otherwise Android can speak one language with another language's
        // voice, which sounds inconsistent or triggers system fallback.
        if (preferredVoice) {
          selectedVoice =
            availableVoices.find(
              (voice) =>
                (voice.identifier === preferredVoice ||
                  voice.name === preferredVoice) &&
                String(voice.language || '').toLowerCase() ===
                  requestedLanguage
            ) || null;
        }

        const languageVoices =
          availableVoices.filter(
            (voice) =>
              String(voice?.language || '').toLowerCase() ===
              requestedLanguage
          );

        const baseLanguageVoices =
          availableVoices.filter(
            (voice) =>
              String(voice?.language || '').toLowerCase().split('-')[0] ===
              requestedBaseLanguage
          );

        // Reuse the voice previously selected for this language.
        if (!selectedVoice) {
          const cachedVoiceId =
            voiceByLanguageRef.current[requestedLanguage];

          if (cachedVoiceId) {
            selectedVoice =
              availableVoices.find(
                (voice) =>
                  voice.identifier === cachedVoiceId ||
                  voice.name === cachedVoiceId
              ) || null;
          }
        }

        // Prefer an exact locale, then the same base language. Use a
        // deterministic quality/name ordering instead of voices[0], whose
        // order can vary between Android voice-engine refreshes.
        const rankedVoices = (
          languageVoices.length > 0
            ? languageVoices
            : baseLanguageVoices
        ).slice().sort((left, right) => {
          const score = (voice) => {
            const description =
              `${voice?.name || ''} ${voice?.quality || ''}`.toLowerCase();

            let value = 0;
            if (description.includes('enhanced')) value += 30;
            if (description.includes('premium')) value += 25;
            if (description.includes('natural')) value += 20;
            if (description.includes('neural')) value += 20;
            if (description.includes('default')) value += 5;
            return value;
          };

          const scoreDifference = score(right) - score(left);
          if (scoreDifference !== 0) return scoreDifference;

          return String(left?.identifier || left?.name || '').localeCompare(
            String(right?.identifier || right?.name || '')
          );
        });

        if (!selectedVoice && rankedVoices.length > 0) {
          selectedVoice = rankedVoices[0];
        }

        if (selectedVoice) {
          voiceByLanguageRef.current[requestedLanguage] =
            selectedVoice.identifier || selectedVoice.name;
        }

        const speechOptions = {
          language:
            selectedVoice?.language ||
            speechLang,

          voice:
            selectedVoice?.identifier ||
            undefined,

          rate:
            0.95,

          pitch:
            1.0,

          onStart:
            () => {
              isSpeakingRef.current =
                true;

              if (
                mountedRef.current
              ) {
                setIsPlaying(
                  true
                );

                setSpeakingId(
                  messageId
                );
              }
            },

          onDone:
            () => {
              isSpeakingRef.current =
                false;

              currentSpeakingIdRef.current =
                null;

              if (
                mountedRef.current
              ) {
                setIsPlaying(
                  false
                );

                setSpeakingId(
                  null
                );
              }

              if (
                mountedRef.current &&
                sessionActiveRef.current
              ) {
                setTimeout(
                  () => {
                    if (
                      mountedRef.current &&
                      sessionActiveRef.current &&
                      !sendingRef.current &&
                      !isSpeakingRef.current &&
                      !recognitionRunningRef.current &&
                      !micDiagnosticRunningRef.current
                    ) {
                      console.log(
                        '🎙️ AI finished speaking. Starting microphone...'
                      );

                      intentionalRecognitionStopRef.current =
                        false;

                      startContinuousListening();
                    }
                  },
                  500
                );
              }
            },

          onStopped:
            () => {
              isSpeakingRef.current =
                false;

              currentSpeakingIdRef.current =
                null;

              if (
                mountedRef.current
              ) {
                setIsPlaying(
                  false
                );

                setSpeakingId(
                  null
                );
              }

              if (
                mountedRef.current &&
                sessionActiveRef.current &&
                !sendingRef.current &&
                !micDiagnosticRunningRef.current
              ) {
                setTimeout(
                  () => {
                    if (
                      mountedRef.current &&
                      sessionActiveRef.current &&
                      !sendingRef.current &&
                      !isSpeakingRef.current &&
                      !recognitionRunningRef.current &&
                      !micDiagnosticRunningRef.current
                    ) {
                      console.log(
                        '🎙️ TTS stopped. Starting microphone...'
                      );

                      intentionalRecognitionStopRef.current =
                        false;

                      startContinuousListening();
                    }
                  },
                  500
                );
              }
            },

          onError:
            (
              error
            ) => {
              console.log(
                '🔊 Speech synthesis error:',
                error
              );

              isSpeakingRef.current =
                false;

              currentSpeakingIdRef.current =
                null;

              if (
                mountedRef.current
              ) {
                setIsPlaying(
                  false
                );

                setSpeakingId(
                  null
                );
              }

              if (
                mountedRef.current &&
                sessionActiveRef.current &&
                !sendingRef.current &&
                !micDiagnosticRunningRef.current
              ) {
                setTimeout(
                  () => {
                    if (
                      mountedRef.current &&
                      sessionActiveRef.current &&
                      !sendingRef.current &&
                      !isSpeakingRef.current &&
                      !recognitionRunningRef.current &&
                      !micDiagnosticRunningRef.current
                    ) {
                      console.log(
                        '🎙️ TTS error. Starting microphone...'
                      );

                      intentionalRecognitionStopRef.current =
                        false;

                      startContinuousListening();
                    }
                  },
                  700
                );
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

      } catch (
        error
      ) {
        console.log(
          'speakMessage error:',
          error?.message ||
            error
        );

        isSpeakingRef.current =
          false;

        currentSpeakingIdRef.current =
          null;

        if (
          mountedRef.current
        ) {
          setIsPlaying(
            false
          );

          setSpeakingId(
            null
          );
        }

        if (
          mountedRef.current &&
          sessionActiveRef.current &&
          !sendingRef.current &&
          !micDiagnosticRunningRef.current
        ) {
          setTimeout(
            () => {
              if (
                mountedRef.current &&
                sessionActiveRef.current &&
                !sendingRef.current &&
                !isSpeakingRef.current &&
                !recognitionRunningRef.current &&
                !micDiagnosticRunningRef.current
              ) {
                intentionalRecognitionStopRef.current =
                  false;

                startContinuousListening();
              }
            },
            700
          );
        }
      }
    };


  // ============================================================
  // SCHEDULE SPEECH
  // ============================================================

  const scheduleSpeech =
    (
      message,
      delay = 300
    ) => {
      if (
        speechTimeoutRef.current
      ) {
        clearTimeout(
          speechTimeoutRef.current
        );
      }

      speechTimeoutRef.current =
        setTimeout(
          () => {
            speechTimeoutRef.current =
              null;

            if (
              mountedRef.current &&
              message
            ) {
              speakMessage(
                message
              );
            }
          },
          delay
        );
    };


  // ============================================================
  // PLAY / PAUSE AUDIO
  // ============================================================

  const handlePlayPauseAudio =
    async (
      message
    ) => {
      try {
        if (
          isSpeakingRef.current &&
          currentSpeakingIdRef.current ===
            message.id
        ) {
          await Speech.stop();

          isSpeakingRef.current =
            false;

          currentSpeakingIdRef.current =
            null;

          setIsPlaying(
            false
          );

          setSpeakingId(
            null
          );

          return;
        }

        await speakMessage(
          message
        );

      } catch (
        error
      ) {
        console.log(
          'Audio toggle error:',
          error?.message ||
            error
        );
      }
    };


  // ============================================================
  // START LIVE SESSION
  // ============================================================

  const startLiveSession =
    async () => {
      try {
        console.log(
          '🎙️ Starting live tutor session'
        );

        sessionActiveRef.current =
          true;

        intentionalRecognitionStopRef.current =
          false;

        finalResultHandledRef.current =
          false;

        setIsSessionActive(
          true
        );

        setVoiceError(
          ''
        );

        speechSegmentBufferRef.current =
          '';

        finalTranscriptRef.current =
          '';

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
          (
            resolve
          ) =>
            setTimeout(
              resolve,
              300
            )
        );

        await startContinuousListening();

      } catch (
        error
      ) {
        console.log(
          'startLiveSession error:',
          error?.message ||
            error
        );
      }
    };


  // ============================================================
  // STOP LIVE SESSION
  // ============================================================

  const stopLiveSession =
    async () => {
      console.log(
        '🎙️ Stopping live tutor session'
      );

      sessionActiveRef.current =
        false;

      setIsSessionActive(
        false
      );

      intentionalRecognitionStopRef.current =
        true;

      await stopRecognition(
        true
      );

      await stopAllSpeech();

      speechSegmentBufferRef.current =
        '';

      finalTranscriptRef.current =
        '';

      finalResultHandledRef.current =
        false;

      setInterimTranscript(
        ''
      );

      setInput(
        ''
      );

      setVoiceError(
        ''
      );
    };


  // ============================================================
  // RETRY CURRENT LISTENING TURN
  // ============================================================

  const retryListening =
    async () => {
      if (
        !mountedRef.current ||
        !sessionActiveRef.current
      ) {
        return;
      }

      if (
        sendingRef.current ||
        isSpeakingRef.current ||
        recognitionRunningRef.current ||
        recognitionStartingRef.current ||
        micDiagnosticRunningRef.current
      ) {
        return;
      }

      console.log(
        '🎙️ User requested another microphone turn'
      );

      setVoiceError(
        ''
      );

      finalResultHandledRef.current =
        false;

      speechSegmentBufferRef.current =
        '';

      finalTranscriptRef.current =
        '';

      intentionalRecognitionStopRef.current =
        false;

      await startContinuousListening();
    };


  // ============================================================
  // SCENARIO SELECT
  // ============================================================

  const handleScenarioSelect =
    async (
      scenarioKey
    ) => {
      const scenario =
        ROLEPLAY_SCENARIOS[
          scenarioKey
        ];

      if (
        !scenario
      ) {
        return;
      }

      setSelectedScenario(
        scenarioKey
      );

      try {
        if (
          userIdRef.current
        ) {
          await supabase
            .from(
              'user_profiles'
            )
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

      } catch (
        error
      ) {
        console.log(
          'Scenario save error:',
          error?.message ||
            error
        );
      }
    };


  // ============================================================
  // EXTRACT AI RESPONSE
  // ============================================================

  const extractResponsePayload =
    (
      data
    ) => {
      let raw =
        null;

      if (
        typeof data ===
        'string'
      ) {
        raw =
          data;

      } else if (
        data?.response !==
        undefined
      ) {
        raw =
          data.response;

      } else if (
        data?.reply !==
        undefined
      ) {
        raw =
          data.reply;

      } else if (
        data?.message !==
        undefined
      ) {
        raw =
          data.message;

      } else if (
        data?.choices?.[0]?.message?.content
      ) {
        raw =
          data.choices[0]
            .message
            .content;

      } else {
        raw =
          data;
      }

      if (
        typeof raw ===
        'string'
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

        } catch (
          _
        ) {
          return {
            reply:
              raw,
          };
        }
      }

      return (
        raw || {}
      );
    };


  // ============================================================
  // HANDLE SEND
  // ============================================================

  const handleSend =
    () => {
      const cleanMessage =
        input.trim();

      if (
        !cleanMessage
      ) {
        return;
      }

      handleSendDirect(
        cleanMessage
      );
    };


  // ============================================================
  // HANDLE SEND DIRECT
  // ============================================================

  const handleSendDirect =
    async (
      cleanMessage
    ) => {
      const messageText =
        String(
          cleanMessage ||
            ''
        ).trim();

      if (
        !messageText
      ) {
        return;
      }

      if (
        sendingRef.current
      ) {
        console.log(
          'Ignoring duplicate AI request.'
        );

        return;
      }

      sendingRef.current =
        true;

      try {
        await stopRecognition(
          true
        );

        setInput(
          ''
        );

        setInterimTranscript(
          ''
        );

        setLoading(
          true
        );

        const userMessage = {
          id:
            `user-${Date.now()}-${Math.random()}`,

          role:
            'user',

          type:
            'user',

          text:
            messageText,
        };

        setMessages(
          (
            previous
          ) => [
            ...previous,
            userMessage,
          ]
        );

        conversationHistoryRef.current =
          [
            ...conversationHistoryRef.current,

            {
              role:
                'user',

              content:
                messageText,
            },
          ];

        const scenario =
          ROLEPLAY_SCENARIOS[
            selectedScenario
          ] ||
          ROLEPLAY_SCENARIOS
            .introduction;

        const conversationHistory =
          conversationHistoryRef.current
            .slice(-20)
            .map(
              (
                item
              ) => ({
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

        if (
          error
        ) {
          console.log(
            '========================================'
          );

          console.log(
            '❌ SUPABASE EDGE FUNCTION ERROR'
          );

          console.log(
            'Error name:',
            error?.name
          );

          console.log(
            'Error message:',
            error?.message
          );

          console.log(
            'Error status:',
            error?.status
          );

          console.log(
            'Error context:',
            error?.context
          );

          console.log(
            'Error details:',
            error?.details
          );

          try {
            if (
              error?.context
            ) {
              const responseText =
                await error.context.text();

              console.log(
                'Edge Function HTTP response:',
                responseText
              );
            }
          } catch (
            readError
          ) {
            console.log(
              'Could not read Edge Function error response:',
              readError?.message ||
                readError
            );
          }

          console.log(
            '========================================'
          );

          throw error;
        }

        if (
          !data ||
          data.success ===
            false
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
          typeof reply !==
          'string'
        ) {
          reply =
            String(
              reply ||
                ''
            );
        }

        reply =
          reply.trim();

        if (
          !reply
        ) {
          throw new Error(
            'AI tutor returned an empty response.'
          );
        }

        const tutorMessage = {
          id:
            `tutor-${Date.now()}-${Math.random()}`,

          role:
            'assistant',

          type:
            'tutor',

          text:
            reply,

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

        conversationHistoryRef.current =
          [
            ...conversationHistoryRef.current,

            {
              role:
                'assistant',

              content:
                reply,
            },
          ];

        setMessages(
          (
            previous
          ) => [
            ...previous,
            tutorMessage,
          ]
        );

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
              parsed?.pronunciationScore ??
              null,
          });
        }

        scheduleSpeech(
          tutorMessage,
          300
        );

      } catch (
        error
      ) {
        console.log(
          '❌ Tutor request error:',
          error?.message ||
            error
        );

        if (
          conversationHistoryRef.current
            .length > 0
        ) {
          const last =
            conversationHistoryRef.current[
              conversationHistoryRef.current.length -
                1
            ];

          if (
            last?.role ===
              'user' &&
            last?.content ===
              messageText
          ) {
            conversationHistoryRef.current.pop();
          }
        }

        const errorMessage = {
          id:
            `error-${Date.now()}`,

          role:
            'assistant',

          type:
            'tutor',

          text:
            'I could not connect to the AI tutor right now. Please try again.',

          data: {
            reply:
              'I could not connect to the AI tutor right now. Please try again.',
          },

          isError:
            true,
        };

        setMessages(
          (
            previous
          ) => [
            ...previous,
            errorMessage,
          ]
        );

      } finally {
        sendingRef.current =
          false;

        if (
          mountedRef.current
        ) {
          setLoading(
            false
          );
        }
      }
    };


  // ============================================================
  // GRAMMAR HISTORY
  // ============================================================

  const logGrammarCorrection =
    async ({
      originalText,
      correctedText,
      explanation,
      pronunciationScore,
    }) => {
      if (
        !userIdRef.current
      ) {
        return;
      }

      try {
        await supabase
          .from(
            'grammar_history'
          )
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

      } catch (
        error
      ) {
        console.log(
          'Grammar history error:',
          error?.message ||
            error
        );
      }
    };


  // ============================================================
  // RENDER CHAT MESSAGE
  // ============================================================

  const renderMessage =
    ({
      item,
    }) => {
      const isUser =
        item.role ===
        'user';

      const isTutor =
        item.role ===
        'assistant';

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
            <View
              style={
                styles.avatar
              }
            >
              <Text
                style={
                  styles.avatarText
                }
              >
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

  const renderVoiceModal =
    () => {
      return (
        <Modal
          visible={
            showVoiceModal
          }
          transparent
          animationType="slide"
          onRequestClose={() =>
            setShowVoiceModal(
              false
            )
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
    ROLEPLAY_SCENARIOS
      .introduction;


  // ============================================================
  // UI
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={
        styles.container
      }
      behavior={
        Platform.OS ===
        'ios'
          ? 'padding'
          : undefined
      }
    >
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <View
        style={
          styles.header
        }
      >
        <TouchableOpacity
          style={
            styles.backButton
          }
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
            setShowVoiceModal(
              true
            )
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
                ? 'Tap microphone to listen'
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
      {/* RAW MICROPHONE DIAGNOSTIC */}
      {/* ================================================== */}



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
              key={
                key
              }
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
                {
                  scenario.icon
                }
              </Text>

              <Text
                style={[
                  styles.scenarioTitle,

                  selectedScenario ===
                    key &&
                    styles.scenarioTitleActive,
                ]}
              >
                {
                  scenario.title
                }
              </Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>


      {/* ================================================== */}
      {/* CHAT */}
      {/* ================================================== */}

      <FlatList
        ref={
          flatListRef
        }
        data={
          messages
        }
        renderItem={
          renderMessage
        }
        keyExtractor={(
          item
        ) =>
          String(
            item.id
          )
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
            {
              interimTranscript
            }
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
              listening &&
              styles.micButtonActive,
          ]}
          onPress={() => {
            if (
              micDiagnosticRunning
            ) {
              return;
            }

            if (
              !isSessionActive
            ) {
              startLiveSession();
              return;
            }

            if (
              listening
            ) {
              stopLiveSession();
              return;
            }

            retryListening();
          }}
        >
          <Text
            style={
              styles.micIcon
            }
          >
            {!isSessionActive
              ? '🎙️'
              : listening
                ? '⏹'
                : '🎙️'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={
            styles.textInput
          }
          value={
            input
          }
          onChangeText={
            setInput
          }
          placeholder={
            listening
              ? 'Speak now...'
              : 'Type your message...'
          }
          placeholderTextColor="#94A3B8"
          multiline
          editable={
            !loading
          }
          onSubmitEditing={() => {
            if (
              !loading
            ) {
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

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#0F1715',
    },

    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    header: {
      height: 70,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        16,
      borderBottomWidth:
        1.5,
      borderBottomColor:
        '#116466',
      backgroundColor:
        '#111E1A',
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent:
        'center',
      alignItems:
        'center',
      backgroundColor:
        '#116466',
    },

    backButtonText: {
      color:
        '#ffffff',
      fontSize: 34,
      lineHeight: 36,
      marginTop: -4,
    },

    headerCenter: {
      flex: 1,
      paddingHorizontal:
        12,
    },

    headerTitle: {
      color:
        '#ffffff',
      fontSize: 19,
      fontWeight:
        '700',
    },

    headerSubtitle: {
      color:
        '#94A3B8',
      fontSize: 12,
      marginTop: 2,
    },

    voiceSettingsButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent:
        'center',
      alignItems:
        'center',
      backgroundColor:
        '#116466',
    },

    voiceSettingsText: {
      fontSize: 20,
    },

    // --------------------------------------------------------
    // DAY BANNER
    // --------------------------------------------------------

    dayBanner: {
      marginHorizontal:
        14,
      marginTop: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor:
        '#182C25',
      borderWidth: 1,
      borderColor:
        '#116466',
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    dayBannerTitle: {
      color:
        '#ffffff',
      fontSize: 18,
      fontWeight:
        '800',
    },

    dayBannerSubtitle: {
      color:
        '#94A3B8',
      fontSize: 12,
      marginTop: 5,
      maxWidth: 290,
      lineHeight: 17,
    },

    dayEmoji: {
      marginLeft:
        'auto',
      fontSize: 30,
    },

    // --------------------------------------------------------
    // VOICE STATUS
    // --------------------------------------------------------

    voiceStatusContainer: {
      minHeight: 32,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        12,
    },

    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        '#64748B',
      marginBottom: 3,
    },

    statusDotActive: {
      backgroundColor:
        '#4ADE80',
    },

    statusDotSpeaking: {
      backgroundColor:
        '#FFCB9A',
    },

    voiceStatusText: {
      color:
        '#D1E8E2',
      fontSize: 12,
    },

    voiceErrorText: {
      color:
        '#ff8c8c',
      fontSize: 11,
      marginTop: 3,
      textAlign:
        'center',
    },

    // --------------------------------------------------------
    // RAW MICROPHONE DIAGNOSTIC
    // --------------------------------------------------------

    diagnosticContainer: {
      marginHorizontal:
        14,
      marginBottom: 4,
      paddingHorizontal:
        10,
      paddingVertical:
        7,
      borderRadius: 12,
      backgroundColor:
        '#111E1A',
      borderWidth: 1,
      borderColor:
        '#116466',
    },

    diagnosticButton: {
      minHeight: 36,
      borderRadius: 18,
      backgroundColor:
        '#116466',
      justifyContent:
        'center',
      alignItems:
        'center',
      paddingHorizontal:
        16,
    },

    diagnosticButtonActive: {
      backgroundColor:
        '#0E7778',
    },

    diagnosticButtonText: {
      color:
        '#ffffff',
      fontSize: 12,
      fontWeight:
        '700',
    },

    diagnosticStatus: {
      color:
        '#D1E8E2',
      fontSize: 11,
      lineHeight: 16,
      textAlign:
        'center',
      marginTop: 5,
    },

    diagnosticDetail: {
      color:
        '#94A3B8',
      fontSize: 10,
      textAlign:
        'center',
      marginTop: 2,
    },

    // --------------------------------------------------------
    // WAVE
    // --------------------------------------------------------

    waveContainer: {
      height: 35,
      flexDirection:
        'row',
      justifyContent:
        'center',
      alignItems:
        'center',
      gap: 5,
    },

    waveBar: {
      width: 5,
      height: 10,
      borderRadius: 3,
      backgroundColor:
        '#FFCB9A',
    },

    waveBarTall: {
      height: 24,
    },

    waveBarTall2: {
      height: 18,
    },

    // --------------------------------------------------------
    // SCENARIOS
    // --------------------------------------------------------

    scenarioScroll: {
      maxHeight: 78,
      flexGrow: 0,
    },

    scenarioContent: {
      paddingHorizontal:
        14,
      paddingVertical:
        7,
      gap: 8,
    },

    scenarioCard: {
      minWidth: 88,
      height: 62,
      paddingHorizontal:
        10,
      borderRadius: 12,
      backgroundColor:
        '#182C25',
      borderWidth: 1,
      borderColor:
        '#116466',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    scenarioCardActive: {
      borderColor:
        '#FFCB9A',
      backgroundColor:
        '#203D33',
    },

    scenarioIcon: {
      fontSize: 20,
    },

    scenarioTitle: {
      color:
        '#94A3B8',
      fontSize: 10,
      fontWeight:
        '600',
      marginTop: 3,
    },

    scenarioTitleActive: {
      color:
        '#ffffff',
    },

    // --------------------------------------------------------
    // CHAT
    // --------------------------------------------------------

    chatList: {
      flex: 1,
    },

    chatContent: {
      paddingHorizontal:
        14,
      paddingTop: 10,
      paddingBottom: 12,
    },

    messageRow: {
      flexDirection:
        'row',
      marginBottom: 14,
      alignItems:
        'flex-end',
    },

    userRow: {
      justifyContent:
        'flex-end',
    },

    tutorRow: {
      justifyContent:
        'flex-start',
    },

    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        '#116466',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 8,
    },

    avatarText: {
      fontSize: 18,
    },

    messageBubble: {
      maxWidth:
        '82%',
      borderRadius:
        17,
      paddingHorizontal:
        14,
      paddingVertical:
        11,
    },

    userBubble: {
      backgroundColor:
        '#FFCB9A',
      borderWidth: 1,
      borderColor: '#FFCB9A',
      borderBottomRightRadius:
        4,
    },

    tutorBubble: {
      backgroundColor:
        '#182C25',
      borderWidth: 1.5,
      borderColor:
        '#116466',
      borderBottomLeftRadius:
        4,
    },

    messageText: {
      fontSize: 15,
      lineHeight: 22,
    },

    userMessageText: {
      color:
        '#0F1715',
    },

    tutorMessageText: {
      color:
        '#E2E8F0',
    },

    messageActions: {
      marginTop: 8,
    },

    audioButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        '#116466',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    audioButtonText: {
      fontSize: 15,
    },

    // --------------------------------------------------------
    // CORRECTION
    // --------------------------------------------------------

    correctionBox: {
      marginTop: 9,
      padding: 10,
      borderRadius: 10,
      backgroundColor:
        '#111E1A',
      borderLeftWidth:
        3,
      borderLeftColor:
        '#FFCB9A',
    },

    correctionTitle: {
      color:
        '#ffffff',
      fontSize: 12,
      fontWeight:
        '700',
      marginBottom: 5,
    },

    originalText: {
      color:
        '#ff9b9b',
      fontSize: 12,
      lineHeight: 17,
    },

    correctedText: {
      color:
        '#4ADE80',
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },

    explanationText: {
      color:
        '#CBD5E1',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 5,
    },

    scoreText: {
      color:
        '#FFCB9A',
      fontSize: 11,
      marginTop: 7,
    },

    tipText: {
      color:
        '#FFCB9A',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 5,
    },

    // --------------------------------------------------------
    // TYPING
    // --------------------------------------------------------

    typingContainer: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 10,
    },

    typingAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        '#116466',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 8,
    },

    typingBubble: {
      backgroundColor:
        '#182C25',
      borderRadius: 16,
      paddingHorizontal:
        13,
      paddingVertical:
        9,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    typingText: {
      color:
        '#94A3B8',
      fontSize: 11,
      marginLeft: 8,
    },

    // --------------------------------------------------------
    // INTERIM SPEECH
    // --------------------------------------------------------

    interimContainer: {
      marginHorizontal:
        14,
      marginBottom: 5,
      paddingHorizontal:
        12,
      paddingVertical:
        7,
      borderRadius: 10,
      backgroundColor:
        '#111E1A',
      borderWidth: 1,
      borderColor:
        '#116466',
    },

    interimLabel: {
      color:
        '#94A3B8',
      fontSize: 10,
      marginBottom: 2,
    },

    interimText: {
      color:
        '#E2E8F0',
      fontSize: 13,
    },

    // --------------------------------------------------------
    // INPUT
    // --------------------------------------------------------

    inputContainer: {
      minHeight: 68,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        10,
      paddingVertical:
        9,
      backgroundColor:
        '#111E1A',
      borderTopWidth:
        1.5,
      borderTopColor:
        '#116466',
      gap: 8,
    },

    micButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        '#116466',
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    micButtonActive: {
      backgroundColor:
        '#B94A48',
    },

    micIcon: {
      fontSize: 21,
    },

    textInput: {
      flex: 1,
      minHeight: 46,
      maxHeight: 110,
      borderRadius: 23,
      backgroundColor:
        '#182C25',
      borderWidth: 1,
      borderColor:
        '#116466',
      color:
        '#ffffff',
      paddingHorizontal:
        16,
      paddingTop: 12,
      paddingBottom: 10,
      fontSize: 14,
    },

    sendButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        '#FFCB9A',
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    sendButtonDisabled: {
      opacity: 0.35,
    },

    sendButtonText: {
      color:
        '#0F1715',
      fontSize: 22,
      marginLeft: 2,
    },

    // --------------------------------------------------------
    // MODAL
    // --------------------------------------------------------

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.72)',
      justifyContent:
        'flex-end',
    },

    voiceModal: {
      backgroundColor:
        '#111E1A',
      borderTopLeftRadius:
        24,
      borderTopRightRadius:
        24,
      maxHeight:
        '75%',
      paddingBottom:
        25,
    },

    modalHeader: {
      height: 64,
      paddingHorizontal:
        18,
      flexDirection:
        'row',
      alignItems:
        'center',
      borderBottomWidth:
        1,
      borderBottomColor:
        '#116466',
    },

    modalTitle: {
      flex: 1,
      color:
        '#ffffff',
      fontSize: 18,
      fontWeight:
        '700',
    },

    closeButton: {
      color:
        '#ffffff',
      fontSize: 22,
    },

    voiceList: {
      paddingHorizontal:
        15,
      paddingTop: 10,
    },

    voiceItem: {
      padding: 14,
      borderRadius: 12,
      backgroundColor:
        '#182C25',
      borderWidth: 1,
      borderColor:
        '#116466',
      marginBottom: 8,
    },

    voiceName: {
      color:
        '#ffffff',
      fontSize: 14,
      fontWeight:
        '600',
    },

    voiceLanguage: {
      color:
        '#94A3B8',
      fontSize: 11,
      marginTop: 3,
    },

    emptyVoiceBox: {
      padding: 30,
      alignItems:
        'center',
    },

    emptyVoiceText: {
      color:
        '#94A3B8',
      fontSize: 13,
    },
  });