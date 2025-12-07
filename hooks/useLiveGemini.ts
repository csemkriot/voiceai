import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SessionStatus } from '../types';
import { GEMINI_API_MODEL, SYSTEM_INSTRUCTION, VOICE_NAME } from '../constants';
import { createBlob, decodeAudioData, decodeBase64String } from '../utils/audioUtils';

export const useLiveGemini = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.DISCONNECTED);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false); // Used for visualizer

  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  
  // State for gapless playback
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // API Client and Session
  const aiClientRef = useRef<GoogleGenAI | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSessionRef = useRef<any>(null);

  const disconnect = useCallback(() => {
    // 1. Cleanup Audio Input Resources
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    
    // 2. Cleanup Audio Contexts safely (check state to avoid "Cannot close a closed AudioContext")
    if (inputAudioContextRef.current) {
        if (inputAudioContextRef.current.state !== 'closed') {
            try { inputAudioContextRef.current.close(); } catch (e) { console.error("Error closing input context", e); }
        }
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        if (outputAudioContextRef.current.state !== 'closed') {
            try { outputAudioContextRef.current.close(); } catch (e) { console.error("Error closing output context", e); }
        }
        outputAudioContextRef.current = null;
    }

    // 3. Stop all scheduled playback
    scheduledSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) { /* ignore */ }
    });
    scheduledSourcesRef.current.clear();

    // 4. Close Session if active
    if (activeSessionRef.current) {
        const session = activeSessionRef.current;
        activeSessionRef.current = null; 
        try { session.close(); } catch (e) { console.error("Error closing session", e); }
    }
    
    // 5. Reset UI State
    setIsTalking(false);
  }, []);

  // Helper to completely stop and reset state
  const stopSession = useCallback(() => {
    disconnect();
    setStatus(SessionStatus.DISCONNECTED);
  }, [disconnect]);

  const sendTextMessage = useCallback((text: string) => {
    if (activeSessionRef.current) {
        try {
            activeSessionRef.current.send({
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [{ text: text }]
                    }],
                    turnComplete: true
                }
            });
        } catch (e) {
            console.error("Failed to send text message", e);
        }
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      // Ensure we start fresh
      disconnect(); 
      setStatus(SessionStatus.CONNECTING);
      setErrorMessage(null);

      // 1. Initialize API
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is missing.");
      }
      aiClientRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 2. Setup Audio Contexts
      // Input: 16kHz for better compatibility with speech recognition models
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz matching Gemini's native output
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      nextStartTimeRef.current = 0;

      // 3. Get Microphone Access
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3b. Get User Location (Async)
      const getUserLocation = (): Promise<string> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve("Unknown (Not supported by browser)");
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
                (err) => {
                    console.warn("Location access denied:", err);
                    resolve("Unknown (Permission denied)");
                },
                { timeout: 5000, enableHighAccuracy: false }
            );
        });
      };
      
      const userLocationCoords = await getUserLocation();
      
      // Calculate current date/time context
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
      const currentDate = now.toLocaleDateString('en-IN', dateOptions);
      const currentTime = now.toLocaleTimeString('en-IN', timeOptions);

      const dynamicSystemInstruction = `
      ${SYSTEM_INSTRUCTION}

      **Real-time Session Context:**
      - **Current Date:** ${currentDate}
      - **Current Time:** ${currentTime}
      - **Hotel Location:** Hotel MKR, Marine Drive Road, Puri, Odisha (Coordinates: 19.7984, 85.8249).
      - **User's Current Location (Lat, Long):** ${userLocationCoords}

      **STRICT Booking Validation Rules:**
      - You are strictly prohibited from accepting bookings for dates in the past.
      - Always compare the user's requested booking date against the "**Current Date**" provided above.
      - If the requested date is in the past, politely inform the user of today's date and ask for a future date.

      **Location & Routing Instructions:**
      - If the user asks for distance or route, compare their coordinates with the Hotel's coordinates (19.7984, 85.8249).
      - If User Location is "Unknown", kindly ask them to check if their device location is enabled so you can guide them better.
      `;

      // 4. Connect to Gemini Live
      const config = {
        model: GEMINI_API_MODEL,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
            },
            systemInstruction: dynamicSystemInstruction,
        },
      };

      const sessionPromise = aiClientRef.current.live.connect({
        ...config,
        callbacks: {
            onopen: () => {
                setStatus(SessionStatus.CONNECTED);
                console.log("Gemini Live Session Opened");

                // Start Audio Input Stream
                if (!inputAudioContextRef.current || !streamRef.current) return;
                
                inputSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                // Reduced buffer size from 4096 to 2048 to lower latency
                // 2048 samples @ 16kHz = ~128ms latency
                processorRef.current = inputAudioContextRef.current.createScriptProcessor(2048, 1, 1);
                
                processorRef.current.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createBlob(inputData);
                    
                    // Send to Gemini
                    sessionPromise.then(session => {
                        try {
                            session.sendRealtimeInput({ media: pcmBlob });
                        } catch (e) {
                            console.error("Error sending audio", e);
                        }
                    });
                };

                inputSourceRef.current.connect(processorRef.current);
                processorRef.current.connect(inputAudioContextRef.current.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
                // Handle Audio Output
                const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                
                if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
                    setIsTalking(true); 
                    const ctx = outputAudioContextRef.current;
                    try {
                        // Check if context is valid before using
                        if (ctx.state === 'closed') return;

                        const audioData = decodeBase64String(base64Audio);
                        // Ensure context is running (mobile browsers sometimes suspend it)
                        if(ctx.state === 'suspended') await ctx.resume();

                        const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
                        
                        // Schedule playback
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                        
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNodeRef.current);
                        
                        source.addEventListener('ended', () => {
                            scheduledSourcesRef.current.delete(source);
                            if (scheduledSourcesRef.current.size === 0) {
                                 setIsTalking(false);
                            }
                        });

                        source.start(nextStartTimeRef.current);
                        scheduledSourcesRef.current.add(source);
                        
                        nextStartTimeRef.current += audioBuffer.duration;
                    } catch (e) {
                        console.error("Error processing audio message", e);
                    }
                }

                // Handle Interruption
                if (msg.serverContent?.interrupted) {
                    console.log("Model interrupted");
                    scheduledSourcesRef.current.forEach(s => {
                        try { s.stop(); } catch(e){}
                    });
                    scheduledSourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                    setIsTalking(false);
                }
            },
            onclose: (e) => {
                console.log("Gemini Live Session Closed", e);
                disconnect();
                setStatus(prev => prev === SessionStatus.ERROR ? prev : SessionStatus.DISCONNECTED);
            },
            onerror: (err) => {
                console.error("Gemini Live Session Error", err);
                setErrorMessage("Connection error. Please try again.");
                disconnect();
                setStatus(SessionStatus.ERROR);
            }
        }
      });
      
      // Store session for cleanup
      sessionPromise.then(sess => {
          activeSessionRef.current = sess;
      }).catch(err => {
          console.error("Session connection promise failed", err);
          setErrorMessage("Failed to initiate connection.");
          setStatus(SessionStatus.ERROR);
          disconnect();
      });

    } catch (error: any) {
      console.error("Failed to connect:", error);
      setErrorMessage(error.message || "Failed to connect.");
      setStatus(SessionStatus.ERROR);
      disconnect();
    }
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect: stopSession, 
    errorMessage,
    isTalking,
    sendTextMessage
  };
};