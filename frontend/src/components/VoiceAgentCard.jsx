import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  PhoneCall, 
  PhoneOff, 
  Volume2, 
  Sparkles, 
  MessageSquare, 
  Terminal, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Bot
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { createWebCall, sendSimulatedVoiceMessage } from '../services/api';
import { RetellWebClient } from 'retell-client-js-sdk';

export function VoiceAgentCard({ onAppointmentBooked, isRetellConfigured }) {
  // Call States: 'disconnected' (Idle) | 'connecting' | 'listening' | 'thinking' (Processing) | 'speaking'
  const [callState, setCallState] = useState('disconnected');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am MedVoice, your AI appointment assistant. How can I help you today? You can ask to see a dermatologist, cardiologist, or general physician.',
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [toolLogs, setToolLogs] = useState([]);
  const [simulationState, setSimulationState] = useState({});
  const [callMode, setCallMode] = useState(isRetellConfigured ? 'retell' : 'browser');

  const retellClientRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const chatScrollRef = useRef(null);
  const isStartingCallRef = useRef(false);

  // Auto-scroll chat stream
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversation]);

  // Call timer effect
  useEffect(() => {
    if (callState !== 'disconnected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
      if (retellClientRef.current) {
        try { retellClientRef.current.stopCall(); } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Format call duration MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Add message to conversation
  const addMessage = (role, text) => {
    setConversation((prev) => [
      ...prev,
      {
        role,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // =========================================================================
  // RETELL AI LIVE WEBRTC CALL HANDLERS
  // =========================================================================
  const startRetellCall = async () => {
    if (isStartingCallRef.current) return;
    isStartingCallRef.current = true;

    try {
      setCallState('connecting');
      const session = await createWebCall();

      if (!session || !session.success || !session.access_token) {
        console.warn('[VoiceCard] Retell session unavailable:', session?.message);
        addMessage('assistant', 'Voice connection failed. Switching to browser voice mode...');
        setCallMode('browser');
        isStartingCallRef.current = false;
        await startBrowserVoiceCall();
        return;
      }

      const client = new RetellWebClient();
      retellClientRef.current = client;

      client.on('call_started', () => {
        setCallState('listening');
      });

      client.on('call_ended', () => {
        setCallState('disconnected');
        if (onAppointmentBooked) onAppointmentBooked();
      });

      client.on('agent_start_talking', () => {
        setCallState('speaking');
      });

      client.on('agent_stop_talking', () => {
        setCallState('listening');
      });

      client.on('update', (update) => {
        if (update?.transcript && update.transcript.length > 0) {
          const lastMsg = update.transcript[update.transcript.length - 1];
          setConversation((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === lastMsg.role) {
              last.text = lastMsg.content;
              return copy;
            }
            return [
              ...copy,
              {
                role: lastMsg.role,
                text: lastMsg.content,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
          });
        }
      });

      client.on('error', (err) => {
        console.error('[Retell Error]', err);
        addMessage('assistant', 'Voice connection failed. Switching to browser voice mode...');
        setCallState('disconnected');
        setCallMode('browser');
      });

      await client.startCall({
        accessToken: session.access_token,
      });

    } catch (err) {
      console.error('[VoiceCard] Failed to start Retell call:', err);
      addMessage('assistant', 'Voice connection failed. Switching to browser voice mode...');
      setCallMode('browser');
      await startBrowserVoiceCall();
    } finally {
      isStartingCallRef.current = false;
    }
  };

  const endRetellCall = () => {
    if (retellClientRef.current) {
      try {
        retellClientRef.current.stopCall();
      } catch (e) {
        console.error(e);
      }
    }
    setCallState('disconnected');
    if (onAppointmentBooked) onAppointmentBooked();
  };

  // =========================================================================
  // BROWSER VOICE / SPEECH SIMULATION ENGINE
  // =========================================================================
  const startBrowserVoiceCall = async () => {
    // Prevent duplicate simultaneous sessions
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Verify microphone permission before proceeding
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release immediate test stream
        stream.getTracks().forEach((t) => t.stop());
      } catch (micErr) {
        console.warn('[Microphone Permission Error]', micErr);
        const micDeniedMsg = 'Microphone permission is required for voice interaction.';
        addMessage('assistant', micDeniedMsg);
        speakText(micDeniedMsg);
        setCallState('disconnected');
        return;
      }
    }

    setCallState('listening');

    // Announce initial greeting via voice
    speakText('Hello! I am MedVoice, your AI appointment assistant. How can I help you today?');

    // Initialize Web Speech Recognition if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setCallState('listening');
      };

      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const spokenText = lastResult[0]?.transcript?.trim();
          if (spokenText && spokenText.length > 0) {
            handleSendVoiceMessage(spokenText);
          }
        }
      };

      recognition.onerror = (err) => {
        console.warn('[Speech Recognition Warn]', err.error);
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          const micDeniedMsg = 'Microphone permission is required for voice interaction.';
          addMessage('assistant', micDeniedMsg);
          speakText(micDeniedMsg);
          setCallState('disconnected');
        }
      };

      recognition.onend = () => {
        // Recognition completed
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    }
  };

  const endBrowserVoiceCall = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCallState('disconnected');
    if (onAppointmentBooked) onAppointmentBooked();
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      utterance.onstart = () => setCallState('speaking');
      utterance.onend = () => setCallState('listening');
      utterance.onerror = () => setCallState('listening');

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
    }
  };

  // Handle message sending (voice transcript or text input)
  const handleSendVoiceMessage = async (msg) => {
    if (!msg || !msg.trim()) return;
    const userText = msg.trim();

    addMessage('user', userText);
    setInputText('');
    setCallState('thinking'); // Processing state

    try {
      const res = await sendSimulatedVoiceMessage(userText, simulationState);

      if (!res || !res.reply) {
        throw new Error('Invalid backend response');
      }

      // Save tool call audit logs
      if (res.toolCalls && res.toolCalls.length > 0) {
        setToolLogs((prev) => [
          ...res.toolCalls.map((tc) => ({
            ...tc,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          })),
          ...prev,
        ]);

        const booked = res.toolCalls.some((tc) => tc.name === 'book_appointment' || tc.name === 'cancel_appointment');
        if (booked && onAppointmentBooked) {
          onAppointmentBooked();
        }
      }

      setSimulationState(res.sessionState || {});

      addMessage('assistant', res.reply);
      speakText(res.reply);

    } catch (err) {
      console.error('[Voice Message Error]', err);
      const failMsg = 'Unable to connect to the appointment service. Please try again.';
      addMessage('assistant', failMsg);
      speakText(failMsg);
      setCallState('disconnected');
    }
  };

  // Master call toggle (prevents simultaneous sessions)
  const toggleCall = () => {
    if (callState === 'disconnected') {
      if (callMode === 'retell' && isRetellConfigured) {
        startRetellCall();
      } else {
        startBrowserVoiceCall();
      }
    } else {
      if (callMode === 'retell') {
        endRetellCall();
      } else {
        endBrowserVoiceCall();
      }
    }
  };

  // Quick suggestion chips
  const sampleSuggestions = [
    'I want to see a dermatologist tomorrow.',
    'Check Dr. Rahul Mehta availability.',
    'I want to see an orthopedic doctor.',
    'Cancel my appointment.',
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden">
      
      {/* Top Banner & Mode Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <span className={`flex h-3 w-3 rounded-full ${callState !== 'disconnected' ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
            <span className={`absolute top-0 left-0 inline-flex rounded-full h-3 w-3 ${callState !== 'disconnected' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight">MedVoice Assistant</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                callMode === 'retell' 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                  : 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
              }`}>
                {callMode === 'retell' ? 'Retell WebRTC' : 'Browser Speech AI'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Low-latency voice scheduling with verified database validation
            </p>
          </div>
        </div>

        {/* Mode Toggle Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (callState !== 'disconnected') {
                if (callMode === 'retell') endRetellCall();
                else endBrowserVoiceCall();
              }
              setCallMode((curr) => (curr === 'retell' ? 'browser' : 'retell'));
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700/80 transition-all hover:text-white"
            title="Switch between Retell AI WebRTC SDK and Browser Voice Engine"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>{callMode === 'retell' ? 'Retell AI WebRTC' : 'Browser Speech AI'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* Left Column: Voice Call Console & Waveform */}
        <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col items-center justify-between border-b lg:border-b-0 lg:border-r border-slate-100 bg-gradient-to-b from-white to-slate-50/60">
          
          {/* Status Header: Idle → Listening → Processing → Speaking → Idle */}
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${
                callState === 'speaking'
                  ? 'bg-brand-50 border-brand-200 text-brand-700'
                  : callState === 'listening'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : callState === 'thinking'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : callState === 'connecting'
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                {callState === 'speaking' && 'Speaking...'}
                {callState === 'listening' && 'Listening...'}
                {callState === 'thinking' && 'Processing...'}
                {callState === 'connecting' && 'Connecting...'}
                {callState === 'disconnected' && 'Idle'}
              </span>
            </div>

            {callState !== 'disconnected' && (
              <div className="flex items-center space-x-1 text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatTimer(callDuration)}</span>
              </div>
            )}
          </div>

          {/* Central Interactive Microphone Button */}
          <div className="my-8 flex flex-col items-center">
            <div className="relative group">
              {callState !== 'disconnected' && (
                <div className="absolute -inset-4 rounded-full bg-brand-500/20 animate-ping opacity-75" />
              )}
              {callState === 'speaking' && (
                <div className="absolute -inset-8 rounded-full bg-teal-400/20 animate-pulse" />
              )}

              <button
                onClick={toggleCall}
                className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 shadow-xl ${
                  callState !== 'disconnected'
                    ? 'bg-gradient-to-tr from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-rose-500/30'
                    : 'bg-gradient-to-tr from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white shadow-brand-500/30 hover:scale-105'
                }`}
              >
                {callState === 'speaking' ? (
                  <>
                    <Volume2 className="w-10 h-10 mb-1 animate-pulse" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Speaking</span>
                  </>
                ) : callState === 'thinking' ? (
                  <>
                    <Sparkles className="w-10 h-10 mb-1 animate-spin" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Processing</span>
                  </>
                ) : callState === 'listening' ? (
                  <>
                    <PhoneOff className="w-10 h-10 mb-1" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Listening</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-10 h-10 mb-1" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Start Call</span>
                  </>
                )}
              </button>
            </div>

            {/* Instruction Text */}
            <p className="mt-4 text-xs font-medium text-slate-500 text-center max-w-xs">
              {callState === 'disconnected'
                ? 'Tap Start Call to begin voice scheduling with MedVoice.'
                : callState === 'listening'
                ? 'Speak clearly into your microphone...'
                : callState === 'thinking'
                ? 'Processing your request with backend database...'
                : 'MedVoice is speaking...'}
            </p>
          </div>

          {/* Audio Visualizer Wave */}
          <div className="w-full flex flex-col items-center">
            <AudioVisualizer state={callState} />
            <div className="mt-3 flex items-center space-x-2 text-[11px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span>Verified Database Availability (Zero-Hallucination)</span>
            </div>
          </div>

        </div>

        {/* Right Column: Live Conversation Transcript & Tool Execution Stream */}
        <div className="lg:col-span-7 flex flex-col h-[520px] bg-slate-50/50">
          
          {/* Conversation Feed Header */}
          <div className="px-6 py-3 border-b border-slate-200/80 bg-white flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-700">
              <MessageSquare className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Live Voice Transcript</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Audio Sync:</span>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                Active
              </span>
            </div>
          </div>

          {/* Transcript Scroll Container */}
          <div 
            ref={chatScrollRef}
            className="flex-1 p-6 overflow-y-auto space-y-4"
          >
            {conversation.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={index} 
                  className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isUser 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-gradient-to-tr from-brand-600 to-teal-500 text-white shadow-xs'
                  }`}>
                    {isUser ? <Mic className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-xs ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                  }`}>
                    <div className="flex items-center justify-between space-x-4 mb-1">
                      <span className={`text-[11px] font-bold ${isUser ? 'text-slate-300' : 'text-brand-600'}`}>
                        {isUser ? 'You (Caller)' : 'MedVoice AI'}
                      </span>
                      <span className="text-[10px] opacity-60 font-mono">
                        {msg.time}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}

            {callState === 'thinking' && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 pl-11 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                <span>Checking doctor schedule and database availability...</span>
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-6 py-2 bg-white/70 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">Try saying:</span>
            {sampleSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendVoiceMessage(suggestion)}
                className="whitespace-nowrap px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Text Input Fallback Bar */}
          <div className="p-4 bg-white border-t border-slate-200/80">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendVoiceMessage(inputText);
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your request or speak through the microphone..."
                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Tool Call Execution Audit Stream */}
      {toolLogs.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-900 text-slate-300 px-6 py-4">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-teal-400 mb-2">
            <Terminal className="w-4 h-4" />
            <span>REAL-TIME BACKEND TOOL EXECUTION AUDIT (RETEL / REST)</span>
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px]">
            {toolLogs.map((log, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
                <span className="text-slate-600">[{log.timestamp}]</span>
                <span className="text-brand-400 font-bold">{log.name}</span>
                <span className="text-slate-500">args:</span>
                <span className="text-emerald-400 truncate max-w-xl">{JSON.stringify(log.args)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
