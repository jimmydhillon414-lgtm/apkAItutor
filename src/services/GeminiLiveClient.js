/**
 * GeminiLiveClient - Manages WebSocket connection, Real-time audio streaming (Mic -> Gemini),
 * and audio playback queue (Gemini -> Speaker) for Gemini Multimodal Live API.
 */
export class GeminiLiveClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey ? apiKey.trim() : '';
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.audioInputSource = null;
    
    // Callbacks for UI updates
    this.onTranscription = options.onTranscription || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    
    // Audio playback queue management
    this.nextPlayTime = 0;
  }

  async connect() {
    try {
      if (!this.apiKey) {
        console.error("GeminiLiveClient Error: API Key is missing or empty.");
        this.onStatusChange('error');
        return;
      }

      this.onStatusChange('connecting');
      
      // Gemini Multimodal Live WebSocket endpoint (v1alpha protocol)
      const wssUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      
      this.ws = new WebSocket(wssUrl);

      this.ws.onopen = async () => {
        console.log("Gemini Live WebSocket Connected successfully.");
        this.sendInitialSetup();
        await this.startMicrophoneStreaming();
        this.onStatusChange('connected');
      };

      this.ws.onmessage = async (event) => {
        await this.handleServerMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error("Gemini Live WebSocket Error Details:", error);
        this.onStatusChange('error');
      };

      this.ws.onclose = (event) => {
        console.log(`Gemini Live WebSocket Closed. Code: ${event.code}, Reason: ${event.reason}`);
        this.disconnect();
        this.onStatusChange('disconnected');
      };

    } catch (err) {
      console.error("Failed to connect to Gemini Live API:", err);
      this.onStatusChange('error');
    }
  }

  sendInitialSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupMessage = {
      setup: {
        model: "models/gemini-2.5-flash",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Puck" }
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: "You are an expert, highly adaptive AI language tutor and coach. Have a natural, friendly, and fluid voice conversation with the user. Help them improve their language skills dynamically."
          }]
        }
      }
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  async startMicrophoneStreaming() {
    try {
      // 1. Initialize AudioContext at 16kHz sample rate required by Live API
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });

      // Crucial Fix: Handle browser autoplay policy restrictions
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // 2. Request microphone access with constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 1, 
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      this.audioInputSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // 3. Using ScriptProcessor for capturing raw PCM chunks (Buffer size: 4096)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const base64PCM = this.floatToPCM16Base64(inputData);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const clientContent = {
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: base64PCM
              }]
            }
          };
          this.ws.send(JSON.stringify(clientContent));
        }
      };

      this.audioInputSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

    } catch (err) {
      console.error("Microphone access denied or audio stream error:", err);
      this.onStatusChange('mic_error');
    }
  }

  floatToPCM16Base64(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const output = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async handleServerMessage(event) {
    try {
      let responseData;
      if (event.data instanceof Blob) {
        const textData = await event.data.text();
        responseData = JSON.parse(textData);
      } else {
        responseData = JSON.parse(event.data);
      }

      // 1. Handle Model Audio Output & AI Transcriptions
      if (responseData.serverContent?.modelTurn?.parts) {
        for (const part of responseData.serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/")) {
            this.playAudioChunk(part.inlineData.data);
          }
          if (part.text) {
            this.onTranscription(part.text, 'ai'); // Tagged explicitly as 'ai'
          }
        }
      }

      // 2. Handle User Speech Transcription (if returned by server turn completion)
      if (responseData.serverContent?.turnComplete) {
        // Optional hook if model signals turn completion
      }

    } catch (err) {
      console.error("Error parsing server WebSocket message:", err);
    }
  }

  async playAudioChunk(base64Audio) {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') return;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM 16-bit to AudioBuffer
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 16000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;

    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
  }

  disconnect() {
    try {
      if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
      }
      if (this.audioInputSource) {
        this.audioInputSource.disconnect();
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      if (this.ws) {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      }
    } catch (err) {
      console.error("Error during GeminiLiveClient cleanup:", err);
    } finally {
      this.ws = null;
      this.audioContext = null;
      this.mediaStream = null;
      this.processor = null;
      console.log("GeminiLiveClient session terminated cleanly.");
    }
  }
}
