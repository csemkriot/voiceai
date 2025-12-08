import React, { useState, useEffect, useRef } from 'react';
import { Mic, Phone, PhoneOff, MapPin, Loader2, Globe, Star, Sparkles, MessageCircleQuestion } from 'lucide-react';
import { useLiveGemini } from './hooks/useLiveGemini';
import Visualizer from './components/Visualizer';
import { SessionStatus } from './types';

// Web Speech API type definition for TypeScript
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const SUGGESTIONS = [
    "Ask: 'How far is the Jagannath Temple?'",
    "Ask: 'What time is check-out?'",
    "Ask: 'Is breakfast included in the room?'",
    "Ask: 'Can you book a taxi for sightseeing?'",
    "Ask: 'What are the room rates for tonight?'"
];

export default function App() {
  const { status, connect, disconnect, errorMessage, isTalking, userVolume } = useLiveGemini();
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Images
  const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1920&auto=format&fit=crop"; // Luxury Resort/Hotel
  const AVATAR_IMAGE = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop"; // Professional Indian Woman

  // Silence Detection Logic
  useEffect(() => {
    // Reset activity timer if anyone is speaking
    if (isTalking || userVolume > 0.05) {
        lastActivityRef.current = Date.now();
        setSuggestion(null);
    }
  }, [isTalking, userVolume]);

  useEffect(() => {
    if (status !== SessionStatus.CONNECTED) {
        setSuggestion(null);
        return;
    }

    const interval = setInterval(() => {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        // If silence > 6 seconds and no suggestion is showing
        if (timeSinceActivity > 6000 && !suggestion) {
            const randomSuggestion = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
            setSuggestion(randomSuggestion);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, suggestion]);

  // Wake Word Logic
  useEffect(() => {
    // Only listen for wake word if we are disconnected
    if (status !== SessionStatus.DISCONNECTED) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setWakeWordActive(false);
      }
      return;
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // Listening for English wake word mostly, or Hindi accents

      recognition.onstart = () => {
        setWakeWordActive(true);
      };

      recognition.onend = () => {
        // Auto-restart if still disconnected and supposed to be listening
        if (status === SessionStatus.DISCONNECTED) {
            try {
                recognition.start();
            } catch (e) {
                setWakeWordActive(false);
            }
        } else {
            setWakeWordActive(false);
        }
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.toLowerCase();
            console.log("Wake word listener heard:", transcript);
            
            // Check for variations of "Maitree"
            if (transcript.includes('maitree') || transcript.includes('my tree') || transcript.includes('matri')) {
              console.log("Wake word detected!");
              recognition.stop();
              connect();
            }
          }
        }
      };

      recognitionRef.current = recognition;

      // Start listening (needs user interaction first usually, but we try)
      try {
        recognition.start();
      } catch (e) {
        console.warn("Speech recognition couldn't auto-start without interaction");
      }

      return () => {
        recognition.stop();
      };
    }
  }, [status, connect]);


  const handleToggleConnection = () => {
    if (status === SessionStatus.CONNECTED || status === SessionStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  // Helper to start wake word listener if it failed to auto-start
  const activateWakeWord = () => {
    if (recognitionRef.current && status === SessionStatus.DISCONNECTED && !wakeWordActive) {
        try {
            recognitionRef.current.start();
        } catch(e) {}
    }
  };

  return (
    <div 
        className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative transition-all duration-1000"
        style={{ backgroundImage: `url('${BACKGROUND_IMAGE}')` }}
        onClick={activateWakeWord} // Setup audio context/permissions on first interaction
    >
      {/* Overlay to darken background image */}
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-[2px] z-0"></div>

      <div className="relative z-10 w-full max-w-md bg-stone-900/90 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md text-stone-100">
        
        {/* Header Image Area */}
        <div className="h-48 bg-stone-800 relative group overflow-hidden">
          <img 
            src={BACKGROUND_IMAGE}
            alt="Hotel Lobby" 
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent"></div>
          
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-serif text-amber-500 font-bold tracking-wide">Maitree</h1>
            <div className="flex items-center text-stone-300 text-xs tracking-widest uppercase gap-1">
                <MapPin size={12} className="text-amber-500"/>
                <span>Hotel MKR • Puri</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          
          {/* Agent Avatar */}
          <div className="relative group">
             {/* Wake Word Pulse Ring */}
            {wakeWordActive && status === SessionStatus.DISCONNECTED && (
                <div className="absolute -inset-1 rounded-full bg-amber-500/20 blur animate-pulse"></div>
            )}
            
            <div className={`relative w-28 h-28 rounded-full border-4 border-amber-600/50 p-1 ${isTalking ? 'shadow-[0_0_25px_rgba(245,158,11,0.6)]' : ''} transition-all duration-300 overflow-hidden bg-stone-800`}>
                <img 
                    src={AVATAR_IMAGE} 
                    alt="Maitree Receptionist" 
                    className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
            </div>
            
            {/* Status Badge */}
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-stone-800 shadow-sm ${
                status === SessionStatus.CONNECTED ? 'bg-green-600 text-white' : 
                wakeWordActive ? 'bg-amber-600/90 text-white' : 'bg-stone-700 text-stone-400'
            }`}>
                {status === SessionStatus.CONNECTED ? 'Live' : wakeWordActive ? 'Listening' : 'Offline'}
            </div>
          </div>

          <div className="space-y-2 relative">
             {/* Suggestion Bubble Overlay */}
             {suggestion && status === SessionStatus.CONNECTED && (
                 <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 z-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                     <div className="bg-amber-500 text-stone-950 p-3 rounded-xl rounded-b-none shadow-lg text-sm font-medium flex gap-2 items-center justify-center">
                         <MessageCircleQuestion size={16} className="shrink-0" />
                         <span>{suggestion}</span>
                     </div>
                     <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-amber-500 mx-auto"></div>
                 </div>
             )}

            <h2 className="text-xl font-semibold font-serif text-amber-50">
                {status === SessionStatus.CONNECTED ? "Listening to you..." : "Namaste, I am Maitree"}
            </h2>
            <p className="text-stone-400 text-sm max-w-[260px] leading-relaxed">
               {status === SessionStatus.DISCONNECTED 
                 ? <span>Say <span className="text-amber-400 font-bold">"Hey Maitree"</span> or tap below to start planning your Puri stay.</span>
                 : "Ask me about rooms, the Jagannath Temple, or the beach."
               }
            </p>
          </div>

          {/* Visualizer Area */}
          <div className="w-full h-16 flex items-center justify-center bg-stone-800/50 rounded-xl border border-stone-700/50 relative overflow-hidden">
             {wakeWordActive && status === SessionStatus.DISCONNECTED && (
                 <div className="absolute top-2 right-2 flex gap-1 items-center animate-pulse">
                     <Sparkles size={10} className="text-amber-400" />
                     <span className="text-[10px] text-amber-400">Auto-detect</span>
                 </div>
             )}
             <Visualizer isActive={isTalking} status={status} />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded-lg text-sm w-full border border-red-800">
              {errorMessage}
            </div>
          )}

          {/* Main Action Button */}
          <button
            onClick={handleToggleConnection}
            className={`
                group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-4
                ${status === SessionStatus.CONNECTED 
                    ? 'bg-red-500 hover:bg-red-600 border-red-400/30 shadow-red-500/20' 
                    : 'bg-amber-600 hover:bg-amber-500 border-amber-400/30 shadow-amber-600/20'
                }
            `}
          >
            {status === SessionStatus.CONNECTING ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : status === SessionStatus.CONNECTED ? (
              <PhoneOff className="w-7 h-7 text-white" />
            ) : (
              <Phone className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
            )}
            
            {/* Pulse effect when connecting or call active */}
            {(status === SessionStatus.CONNECTING || status === SessionStatus.CONNECTED || wakeWordActive) && (
                 <span className={`absolute inset-0 rounded-full animate-ping ${wakeWordActive && status === SessionStatus.DISCONNECTED ? 'bg-amber-500/20' : 'bg-white/20'}`}></span>
            )}
          </button>
          
          <div className="text-xs text-stone-500 font-medium">
             <div className="flex gap-2 justify-center flex-wrap opacity-70 mb-2">
                <span className="bg-stone-800 px-1.5 py-0.5 rounded text-[10px]">Odia</span>
                <span className="bg-stone-800 px-1.5 py-0.5 rounded text-[10px]">Hindi</span>
                <span className="bg-stone-800 px-1.5 py-0.5 rounded text-[10px]">Bangla</span>
                <span className="bg-stone-800 px-1.5 py-0.5 rounded text-[10px]">English</span>
             </div>
          </div>

        </div>

        {/* Footer Info */}
        <div className="bg-stone-950 p-4 text-center border-t border-stone-800 flex justify-between items-center text-stone-500 text-xs">
           <div className="flex items-center gap-1">
             <Globe size={12} />
             <span>Hotel MKR Digital Service</span>
           </div>
           <div className="flex items-center gap-1">
             <Star size={12} className="text-amber-500" />
             <span>4.9 (1.2k Reviews)</span>
           </div>
        </div>
      </div>
    </div>
  );
}