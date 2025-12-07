import React, { useState } from 'react';
import { Mic, Phone, PhoneOff, MapPin, Loader2, Globe, Star, Send } from 'lucide-react';
import { useLiveGemini } from './hooks/useLiveGemini';
import Visualizer from './components/Visualizer';
import { SessionStatus } from './types';

export default function App() {
  const { status, connect, disconnect, errorMessage, isTalking, sendTextMessage } = useLiveGemini();
  const [textInput, setTextInput] = useState('');

  const handleToggleConnection = () => {
    if (status === SessionStatus.CONNECTED || status === SessionStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleSendText = () => {
    if (!textInput.trim()) return;
    sendTextMessage(textInput);
    setTextInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleSendText();
    }
  };

  return (
    <div className="min-h-screen bg-[url('https://picsum.photos/1920/1080')] bg-cover bg-center flex items-center justify-center p-4 relative">
      {/* Overlay to darken background image */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"></div>

      <div className="relative z-10 w-full max-w-md bg-stone-900/90 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md text-stone-100">
        
        {/* Header Image Area */}
        <div className="h-48 bg-stone-800 relative group overflow-hidden">
          <img 
            src="https://picsum.photos/800/400" 
            alt="Hotel Lobby" 
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent"></div>
          
          <div className="absolute bottom-4 left-6">
            <h1 className="text-3xl font-serif text-amber-500 font-bold tracking-wide">Hotel MKR</h1>
            <div className="flex items-center text-stone-300 text-sm gap-1">
                <MapPin size={14} className="text-amber-500"/>
                <span>Puri, Odisha</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          
          {/* Agent Avatar */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-full border-4 border-amber-600/50 p-1 ${isTalking ? 'shadow-[0_0_20px_rgba(245,158,11,0.5)]' : ''} transition-all duration-300`}>
                <img 
                    src="https://picsum.photos/200/200" 
                    alt="Anjali Receptionist" 
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
            <div className="absolute -bottom-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                Anjali
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Namaste! How can I help?</h2>
            <p className="text-stone-400 text-sm max-w-[250px]">
                Ask me about room booking, the Jagannath Temple, or beach activities.
            </p>
          </div>

          {/* Language Badges */}
          <div className="flex gap-2 justify-center flex-wrap">
             {['Odia', 'Hindi', 'Bangla', 'English'].map(lang => (
                 <span key={lang} className="text-[10px] uppercase tracking-wider font-semibold bg-stone-800 text-stone-400 px-2 py-1 rounded border border-stone-700">
                     {lang}
                 </span>
             ))}
          </div>

          {/* Visualizer Area */}
          <div className="w-full h-16 flex items-center justify-center bg-stone-800/50 rounded-xl border border-stone-700/50">
             <Visualizer isActive={isTalking} status={status} />
          </div>

          {/* Text Input Area (Visible when connected) */}
          {status === SessionStatus.CONNECTED && (
            <div className="w-full flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <input 
                    type="text" 
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-stone-800/50 border border-stone-700 rounded-full px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-stone-500"
                />
                <button 
                    onClick={handleSendText}
                    className="p-2 bg-amber-600 hover:bg-amber-500 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20"
                    disabled={!textInput.trim()}
                >
                    <Send size={16} />
                </button>
            </div>
          )}

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
                group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
                ${status === SessionStatus.CONNECTED 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                }
            `}
          >
            {status === SessionStatus.CONNECTING ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : status === SessionStatus.CONNECTED ? (
              <PhoneOff className="w-8 h-8 text-white" />
            ) : (
              <Phone className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            )}
            
            {/* Pulse effect when connecting or call active */}
            {(status === SessionStatus.CONNECTING || status === SessionStatus.CONNECTED) && (
                 <span className="absolute inset-0 rounded-full animate-ping bg-white/20"></span>
            )}
          </button>
          
          <div className="text-xs text-stone-500 font-medium">
            {status === SessionStatus.DISCONNECTED && "Tap to start conversation"}
            {status === SessionStatus.CONNECTING && "Connecting to Anjali..."}
            {status === SessionStatus.CONNECTED && "Listening..."}
          </div>

        </div>

        {/* Footer Info */}
        <div className="bg-stone-950 p-4 text-center border-t border-stone-800 flex justify-between items-center text-stone-500 text-xs">
           <div className="flex items-center gap-1">
             <Globe size={12} />
             <span>Live Translation</span>
           </div>
           <div className="flex items-center gap-1">
             <Star size={12} className="text-amber-500" />
             <span>4.8 Rating</span>
           </div>
        </div>
      </div>
    </div>
  );
}