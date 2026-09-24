import React, { useState, useEffect, useRef } from 'react';

export default function VoiceLiveModal({ apiKey, onClose }) {
  const [status, setStatus] = useState('listening'); // listening, speaking, disconnected
  const [conversation, setConversation] = useState([
    { sender: 'system', text: 'Live Voice Tutor ready. Speak anytime!' }
  ]);
  const [tick, setTick] = useState(0);
  const recognitionRef = useRef(null);
  const isRunningRef = useRef(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 100);

    startListeningSession();

    return () => {
      isRunningRef.current = false;
      clearInterval(interval);
      stopSpeechRecognition();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startListeningSession = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setConversation(prev => [...prev, { sender: 'system', text: 'Speech recognition not supported in this browser.' }]);
      setStatus('disconnected');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = async (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        if (transcript) {
          setConversation(prev => [...prev, { sender: 'user', text: transcript }]);
          await handleAiVoiceReply(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        // Auto restart listening if session is still active
        if (isRunningRef.current && status === 'listening') {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Mic start error:", err);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const handleAiVoiceReply = async (userText) => {
    setStatus('speaking');
    setConversation(prev => [...prev, { sender: 'ai', text: 'Thinking...' }]);

    try {
      // Call Supabase AI proxy or standard Gemini endpoint for quick response
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are an expert, friendly interactive AI language tutor. Keep your spoken response brief, conversational, and natural (1-2 sentences max). User said: "${userText}"` }] }]
        })
      });

      const data = await response.json();
      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "That's interesting! Tell me more.";

      // Update conversation with AI response
      setConversation(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { sender: 'ai', text: aiReply };
        return updated;
      });

      // Speak out loud using browser speech synthesis
      speakText(aiReply, () => {
        if (isRunningRef.current) {
          setStatus('listening');
        }
      });

    } catch (err) {
      console.error("AI error:", err);
      setStatus('listening');
    }
  };

  const speakText = (text, onComplete) => {
    if (!window.speechSynthesis) {
      if (onComplete) onComplete();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onend = () => {
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleEndSession = () => {
    isRunningRef.current = false;
    stopSpeechRecognition();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalContainer}>
        <div style={styles.header}>
          <h3 style={styles.title}>AI Voice Tutor (Live Mode)</h3>
          <span style={{ ...styles.badge, backgroundColor: status === 'listening' ? '#10B981' : '#6366F1' }}>
            {status.toUpperCase()}
          </span>
        </div>

        <div style={styles.visualizerContainer}>
          <div style={styles.waveformWrapper}>
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.waveBar,
                  height: `${Math.max(15, Math.sin(i + tick * 0.5) * 45 + 30)}px`,
                  backgroundColor: status === 'listening' ? '#34D399' : '#A78BFA',
                }}
              />
            ))}
          </div>
          <div style={styles.micIconCircle}>
            {status === 'listening' ? '🎙️' : '🔊'}
          </div>
        </div>

        <div style={styles.transcriptBox}>
          {conversation.slice(-3).map((item, index) => (
            <p key={index} style={{
              ...styles.transcriptText,
              color: item.sender === 'ai' ? '#C4B5FD' : item.sender === 'user' ? '#34D399' : '#94A3B8'
            }}>
              <strong>{item.sender === 'ai' ? 'Tutor: ' : item.sender === 'user' ? 'You: ' : ''}</strong>
              {item.text}
            </p>
          ))}
        </div>

        <div style={styles.controls}>
          <button onClick={handleEndSession} style={styles.endButton}>
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    width: '90%',
    maxWidth: '400px',
    backgroundColor: '#1E1B4B',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1.5px solid rgba(255, 255, 255, 0.2)',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    color: '#FFFFFF',
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
  },
  badge: {
    color: '#FFFFFF',
    fontSize: '10px',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '12px',
  },
  visualizerContainer: {
    position: 'relative',
    height: '110px',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
  },
  waveformWrapper: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    height: '60px',
    zIndex: 1,
  },
  waveBar: {
    width: '4px',
    borderRadius: '4px',
    transition: 'height 0.1s ease-in-out',
  },
  micIconCircle: {
    width: '55px',
    height: '55px',
    backgroundColor: '#4338CA',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '22px',
    zIndex: 2,
    boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
  },
  transcriptBox: {
    width: '100%',
    minHeight: '90px',
    maxHeight: '120px',
    overflowY: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    justifyContent: 'flex-start',
  },
  transcriptText: {
    fontSize: '13px',
    margin: 0,
    lineHeight: '1.4',
  },
  controls: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
  },
};
