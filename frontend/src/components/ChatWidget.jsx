import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../config';

/**
 * ChatWidget — Dual-mode floating chat widget with GOI MoSJE Design System
 *
 * Modes:
 *   'info'              → RAG chatbot (SC/ST rights Q&A)
 *   'calming_companion' → Automatic switch when NLP detects distress ≥ 50%
 */

const SESSION_ID = `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const EMERGENCY_KEYWORDS = [
  'suicide', 'kill myself', 'want to die', 'end my life',
  'attack', 'knife', 'weapon', 'gun', 'help me', 'emergency',
  'danger', 'threatened', 'rape', 'assault', 'dying',
];
const isEmergencyMessage = (text) =>
  EMERGENCY_KEYWORDS.some(kw => text.toLowerCase().includes(kw));

const SESSION_KEY = 'nyaya_consent_given';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [consentGiven, setConsentState] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  );
  const setConsent = (val) => {
    sessionStorage.setItem(SESSION_KEY, val ? 'true' : 'false');
    setConsentState(val);
  };

  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'bot',
      text: 'Namaste 🙏 I am your Nyaya-Sakhi assistant. I can guide you on your legal rights under the SC/ST (Prevention of Atrocities) Act, NHAA 14566 helpline, victim compensation schemes, and confidential emotional support.\n\nHow can I help you today?',
      mode: 'info',
      suggestions: [
        'How do I file an FIR?',
        'What compensation am I entitled to?',
        'The accused is out on bail. What can I do?',
        'How do I get mental health support?',
      ],
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('info');
  const [showEmergency, setShowEmergency] = useState(false);
  const [sosState, setSosState] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'cooldown'
  const [sosCooldown, setSosCooldown] = useState(0);
  const bottomRef = useRef(null);
  const sosTimerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const isEmergency = isEmergencyMessage(text);
    if (!text.trim() || loading) return;
    if (!consentGiven && !isEmergency) return;

    const userMsg = { id: Date.now(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/chat/web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: SESSION_ID, message: text, consent_given: consentGiven }),
      });
      const data = await resp.json();

      setMode(data.mode || 'info');
      if (data.show_emergency_banner) setShowEmergency(true);

      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: data.answer,
        mode: data.mode,
        suggestions: data.suggestions || [],
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: '⚠️ Network error. Please call NHAA 14566 directly.',
        mode: 'info',
        suggestions: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async () => {
    if (sosState === 'sending' || sosState === 'cooldown') return;
    setSosState('sending');
    try {
      await fetch(`${API_BASE}/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          victim_id: `WEB-${SESSION_ID}`,
          channel: 'web_chat',
          triggered_by: 'victim',
        }),
      });
      setSosState('sent');
      setShowEmergency(true);
      setSosCooldown(300);
      sosTimerRef.current = setInterval(() => {
        setSosCooldown(prev => {
          if (prev <= 1) {
            clearInterval(sosTimerRef.current);
            setSosState('idle');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      setSosState('idle');
      alert('Network error. Please call 112 (Police) or 14566 (NHAA) immediately.');
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating SOS Emergency Button */}
      <button
        id="sos-fab"
        type="button"
        onClick={handleSOS}
        disabled={sosState === 'sending' || sosState === 'cooldown'}
        title="🆘 SOS Emergency Button — dispatches instant alert to officers"
        className={`fixed bottom-24 right-24 z-[10000] w-14 h-14 rounded-full text-white font-extrabold flex flex-col items-center justify-center border-2 border-white/40 shadow-xl transition-all ${
          sosState === 'sent' || sosState === 'cooldown'
            ? 'bg-emerald-600 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 animate-pulse'
        }`}
      >
        <span className="text-xs leading-none">
          {sosState === 'sending' ? '…' : sosState === 'sent' || sosState === 'cooldown' ? '✓' : '🆘'}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
          {sosState === 'cooldown' ? `${sosCooldown}s` : 'SOS'}
        </span>
      </button>

      {/* Floating Action Button (FAB) */}
      <button
        id="chat-widget-fab"
        type="button"
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close Nyaya-Sakhi Assistant' : 'Open Nyaya-Sakhi AI Assistant'}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl border border-white/30 transition-all ${
          mode === 'calming_companion'
            ? 'bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900'
            : 'bg-gradient-to-r from-[#022448] to-[#1b3a60] hover:from-[#011b37] hover:to-[#152e4d]'
        }`}
      >
        <span className="material-symbols-outlined text-2xl">
          {open ? 'close' : mode === 'calming_companion' ? 'eco' : 'forum'}
        </span>
      </button>

      {/* Main Chat Floating Window */}
      {open && (
        <div
          id="chat-widget-window"
          className="fixed bottom-24 right-6 z-[9998] w-[380px] max-h-[78vh] flex flex-col bg-white border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden font-body-md animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div
            className={`p-4 flex items-center justify-between text-white shadow-sm transition-colors ${
              mode === 'calming_companion'
                ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
                : 'bg-gradient-to-r from-[#022448] to-[#1b3a60]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <span className="material-symbols-outlined text-lg">
                  {mode === 'calming_companion' ? 'eco' : 'balance'}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight">
                  {mode === 'calming_companion' ? '🌿 Nyaya-Sakhi Companion' : '⚖️ Nyaya-Sakhi Info'}
                </h4>
                <p className="text-[11px] text-white/80 font-medium">
                  {mode === 'calming_companion'
                    ? 'Calming Emotional Companion • 14566'
                    : 'SC/ST PoA Rights Assistant • NHAA 14566'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Emergency Banner */}
          {showEmergency && (
            <div id="chat-emergency-banner" className="bg-red-50 border-b border-red-200 p-3 text-xs text-red-900 flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-base">warning</span>
                <span>
                  <strong>Emergency?</strong> Call <strong>112</strong> (Police) or <strong>14566</strong> (NHAA) now.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmergency(false)}
                className="text-red-700 hover:text-red-900 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Consent Banner */}
          {!consentGiven && (
            <div className="bg-surface-container-low border-b border-outline-variant/30 p-3.5 text-xs text-on-surface-variant space-y-2">
              <p>
                <strong>Data Privacy Notice:</strong> Messages are processed securely by AI for legal guidance and emotional support, protected under DPDP Act 2023.
              </p>
              <button
                id="chat-consent-accept"
                type="button"
                onClick={() => setConsent(true)}
                className="py-1.5 px-3 rounded-lg bg-[#022448] text-white font-semibold text-xs hover:bg-[#1b3a60] transition-colors shadow-sm"
              >
                I Understand & Accept
              </button>
            </div>
          )}

          {/* Messages Container */}
          <div id="chat-messages" className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-surface-container-lowest">
            {messages.map(msg => (
              <div key={msg.id} className="space-y-2">
                <div
                  className={`max-w-[86%] text-xs leading-relaxed p-3.5 shadow-xs ${
                    msg.role === 'user'
                      ? 'ml-auto bg-[#022448] text-white rounded-2xl rounded-tr-none font-medium'
                      : 'mr-auto bg-surface-container-low border border-outline-variant/20 text-on-surface rounded-2xl rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}
                  {msg.role === 'bot' && msg.mode && (
                    <span className="block text-[10px] text-on-surface-variant/70 mt-1 font-semibold uppercase tracking-wider">
                      {msg.mode === 'calming_companion' ? '🌿 Calming Companion' : '⚖️ Info Mode'}
                    </span>
                  )}
                </div>

                {/* Suggestions / Chips */}
                {msg.suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (consentGiven) sendMessage(s);
                          else setConsent(true);
                        }}
                        className="px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 text-[11px] font-semibold transition-all text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="mr-auto bg-surface-container-low border border-outline-variant/20 p-3 rounded-2xl rounded-tl-none w-16 flex justify-center items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-outline-variant/20 bg-white flex items-center gap-2">
            <textarea
              id="chat-input"
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={consentGiven ? 'Type your question or request…' : 'In danger? Type now — or accept notice above.'}
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <button
              id="chat-send-btn"
              type="button"
              onClick={() => sendMessage(input)}
              disabled={(!consentGiven && !isEmergencyMessage(input)) || loading}
              className="w-8 h-8 rounded-xl bg-[#022448] text-white flex items-center justify-center hover:bg-[#1b3a60] disabled:opacity-40 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
