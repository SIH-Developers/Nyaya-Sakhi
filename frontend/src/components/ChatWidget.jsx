import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../config';

/**
 * ChatWidget — Dual-mode floating chat widget (TASK 3 + 4)
 *
 * Modes:
 *   'info'              → RAG chatbot (SC/ST rights Q&A)
 *   'calming_companion' → Switches automatically when NLP detects distress ≥ 50%
 *
 * Features:
 *  - Consent banner before first message
 *  - Emergency banner (112 / 14566) when distress ≥ 75%
 *  - Suggested quick-reply chips
 *  - Smooth fade-in animations
 */

const SESSION_ID = `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const COLORS = {
  info:    { header: 'linear-gradient(135deg,#1a237e,#283593)', accent: '#5c6bc0' },
  calming: { header: 'linear-gradient(135deg,#1b5e20,#2e7d32)', accent: '#66bb6a' },
};

export default function ChatWidget() {
  const [open, setOpen]             = useState(false);
  const [consentGiven, setConsent]  = useState(false);
  const [messages, setMessages]     = useState([
    {
      id: 0,
      role: 'bot',
      text: 'Namaste 🙏 I can help you with your rights under the SC/ST (Prevention of Atrocities) Act, NHAA 14566 helpline, compensation, and mental health support.\n\nWhat would you like to know?',
      mode: 'info',
      suggestions: [
        'How do I file an FIR?',
        'What compensation am I entitled to?',
        'The accused is out on bail. What can I do?',
        'How do I get mental health support?',
      ],
    }
  ]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [mode, setMode]             = useState('info');
  const [showEmergency, setShowEmergency] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const themeColors = mode === 'calming_companion' ? COLORS.calming : COLORS.info;

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
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
        text: '⚠️ Network error. Please call NHAA **14566** directly.',
        mode: 'info',
        suggestions: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const styles = {
    fab: {
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      width: 60, height: 60, borderRadius: '50%',
      background: mode === 'calming_companion' ? '#2e7d32' : '#1a237e',
      color: '#fff', border: 'none', cursor: 'pointer',
      fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      transition: 'transform 0.2s',
    },
    window: {
      position: 'fixed', bottom: 100, right: 28, zIndex: 9998,
      width: 370, maxHeight: '78vh',
      display: 'flex', flexDirection: 'column',
      borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
      background: '#0d1117',
      border: '1px solid rgba(255,255,255,0.08)',
      animation: 'fadeSlideUp 0.25s ease',
    },
    header: {
      background: themeColors.header,
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    headerTitle: { color: '#fff', fontWeight: 700, fontSize: '0.95rem' },
    headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' },
    emergency: {
      background: '#b71c1c', color: '#fff',
      padding: '10px 14px', fontSize: '0.82rem',
      display: 'flex', gap: 10, alignItems: 'center',
    },
    consent: {
      background: 'rgba(255,255,255,0.04)',
      padding: '12px 16px', fontSize: '0.78rem', color: '#ccc',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    },
    messages: {
      flex: 1, overflowY: 'auto', padding: '14px 12px',
      display: 'flex', flexDirection: 'column', gap: 10,
    },
    msgUser: {
      alignSelf: 'flex-end', background: themeColors.accent,
      color: '#fff', borderRadius: '16px 16px 4px 16px',
      padding: '10px 14px', maxWidth: '82%', fontSize: '0.875rem', lineHeight: 1.5,
    },
    msgBot: {
      alignSelf: 'flex-start', background: 'rgba(255,255,255,0.07)',
      color: '#e8eaf6', borderRadius: '16px 16px 16px 4px',
      padding: '10px 14px', maxWidth: '86%', fontSize: '0.875rem', lineHeight: 1.5,
      whiteSpace: 'pre-wrap',
    },
    modeTag: {
      fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)',
      marginTop: 4, display: 'block',
    },
    chips: {
      display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6,
    },
    chip: {
      background: 'rgba(255,255,255,0.08)', color: '#90caf9',
      border: '1px solid rgba(144,202,249,0.3)',
      borderRadius: 999, padding: '4px 10px', fontSize: '0.72rem',
      cursor: 'pointer', transition: 'all 0.15s',
    },
    inputRow: {
      display: 'flex', gap: 8, padding: '10px 12px',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    },
    textArea: {
      flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none',
      borderRadius: 10, color: '#fff', padding: '9px 12px',
      fontSize: '0.875rem', outline: 'none', resize: 'none',
      fontFamily: 'inherit',
    },
    sendBtn: {
      background: themeColors.accent, color: '#fff',
      border: 'none', borderRadius: 10, padding: '0 14px',
      cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
      transition: 'opacity 0.15s',
    },
    loadingDot: {
      display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
      background: '#90caf9', margin: '0 2px',
      animation: 'pulse 1s infinite',
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { opacity:0.3; transform:scale(0.8); }
          50%      { opacity:1;   transform:scale(1.2); }
        }
        .chat-chip:hover { background: rgba(144,202,249,0.18) !important; }
      `}</style>

      {/* Floating Action Button */}
      <button
        id="chat-widget-fab"
        style={styles.fab}
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close chat' : 'Open Nyaya-Sakhi Chat'}
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div style={styles.window} id="chat-widget-window">
          {/* Header */}
          <div style={styles.header}>
            <div>
              <div style={styles.headerTitle}>
                {mode === 'calming_companion' ? '🌿 Nyaya-Sakhi Support' : '⚖️ Nyaya-Sakhi Info'}
              </div>
              <div style={styles.headerSub}>
                {mode === 'calming_companion'
                  ? 'Calming Companion • NHAA 14566'
                  : 'SC/ST PoA Act Rights Assistant • NHAA 14566'}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 18 }}
            >✕</button>
          </div>

          {/* Emergency Banner */}
          {showEmergency && (
            <div style={styles.emergency} id="chat-emergency-banner">
              🚨 <span>
                <strong>Emergency?</strong> Call <strong>112</strong> (Police) or{' '}
                <strong>14566</strong> (NHAA) immediately.
                <button
                  onClick={() => setShowEmergency(false)}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12 }}
                >Dismiss</button>
              </span>
            </div>
          )}

          {/* Consent Banner */}
          {!consentGiven && (
            <div style={styles.consent}>
              <strong>Data Privacy Notice:</strong> Messages are processed by AI for emotional support
              and kept confidential under DPDP Act 2023.
              <br />
              <button
                id="chat-consent-accept"
                onClick={() => setConsent(true)}
                style={{
                  marginTop: 8, background: '#1565c0', color: '#fff',
                  border: 'none', borderRadius: 6, padding: '5px 14px',
                  cursor: 'pointer', fontSize: '0.78rem',
                }}
              >I Understand &amp; Accept</button>
            </div>
          )}

          {/* Messages */}
          <div style={styles.messages} id="chat-messages">
            {messages.map(msg => (
              <div key={msg.id}>
                <div style={msg.role === 'user' ? styles.msgUser : styles.msgBot}>
                  {msg.text}
                  {msg.role === 'bot' && msg.mode && (
                    <span style={styles.modeTag}>
                      {msg.mode === 'calming_companion' ? '🌿 calming companion' : '⚖️ info mode'}
                    </span>
                  )}
                </div>
                {msg.suggestions?.length > 0 && (
                  <div style={styles.chips}>
                    {msg.suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="chat-chip"
                        style={styles.chip}
                        onClick={() => { if (consentGiven) sendMessage(s); else setConsent(true); }}
                      >{s}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={styles.msgBot}>
                <span style={styles.loadingDot} /><span style={{ ...styles.loadingDot, animationDelay: '0.2s' }} /><span style={{ ...styles.loadingDot, animationDelay: '0.4s' }} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Row */}
          <div style={styles.inputRow}>
            <textarea
              id="chat-input"
              rows={1}
              style={styles.textArea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your question…"
              disabled={!consentGiven}
            />
            <button
              id="chat-send-btn"
              style={{ ...styles.sendBtn, opacity: !consentGiven || loading ? 0.4 : 1 }}
              onClick={() => sendMessage(input)}
              disabled={!consentGiven || loading}
            >↑</button>
          </div>
        </div>
      )}
    </>
  );
}
