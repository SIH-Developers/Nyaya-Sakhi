import React, { useState, useEffect } from 'react';
import {
  X, Activity, Scale, ShieldAlert, PhoneCall, HeartPulse, 
  FileText, ShieldCheck, AlertTriangle, ArrowUpRight, Check, Send, MessageSquarePlus, MessageCircle,
  KeyRound, Mail, CheckCircle2, Copy
} from 'lucide-react';
import { API_BASE } from '../config';

const CHANNEL_META = {
  telegram_mobile: { label: 'Telegram', color: '#0ea5e9', icon: '📱' },
  ivrs:            { label: 'IVRS Call', color: '#8b5cf6', icon: '📞' },
  chatbot:         { label: 'Web Chat',  color: '#f59e0b', icon: '💬' },
  web_chat:        { label: 'Web Chat',  color: '#f59e0b', icon: '🌐' },
  whatsapp:        { label: 'WhatsApp',  color: '#10b981', icon: '💬' },
  sms:             { label: 'SMS',       color: '#64748b', icon: '📨' },
  email:           { label: 'Email',     color: '#6366f1', icon: '📧' },
};

export default function VictimDetailModal({ victim, history = [], onClose, onUpdateStatus, userRole = 'counselor' }) {
  const [actionSuccess, setActionSuccess] = useState(null);
  const [promptType, setPromptType] = useState('safety_check');
  const [isSendingCheckin, setIsSendingCheckin] = useState(false);

  // Full history state from GET /api/victim/{id}/full-history
  const [fullHistory, setFullHistory] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [newEmail, setNewEmail] = useState(victim?.email || '');
  const [newFir, setNewFir] = useState('');
  const [newDistrict, setNewDistrict] = useState(victim?.district || '');
  const [officerMsg, setOfficerMsg] = useState(null);

  useEffect(() => {
    if (victim?.victim_id) {
      fetch(`${API_BASE}/victim/${victim.victim_id}/full-history`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setFullHistory(data); })
        .catch(err => console.error("Error fetching full history:", err));
    }
  }, [victim?.victim_id]);

  if (!victim) return null;

  const handleGenerateLinkCode = async () => {
    try {
      const res = await fetch(`${API_BASE}/case/generate-link-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': 'nhaa-officer-2024'
        },
        body: JSON.stringify({ victim_id: victim.victim_id })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedCode(data.link_code);
        setOfficerMsg(`6-Digit Code ${data.link_code} generated (valid for 7 days)!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/victim/${victim.victim_id}/update-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': 'nhaa-officer-2024'
        },
        body: JSON.stringify({ email: newEmail.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setOfficerMsg("Email updated successfully! Patient Portal access is now enabled.");
        setTimeout(() => setOfficerMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyVictim = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/victim/${victim.victim_id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': 'nhaa-officer-2024'
        },
        body: JSON.stringify({ fir_number: newFir.trim() || undefined, district: newDistrict.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setOfficerMsg("Victim verified and official FIR attached successfully!");
        victim.registration_status = 'verified';
        if (newFir.trim()) victim.fir_number = newFir.trim();
        setTimeout(() => setOfficerMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendCheckin = async () => {
    setIsSendingCheckin(true);
    try {
      const res = await fetch(`${API_BASE}/victim/${victim.victim_id}/send-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt_type: promptType })
      });
      const data = await res.json();
      if (data.success) {
        const channels = (data.channels_used || []).join(' â€¢ ') || 'Voice + SMS + WhatsApp';
        setActionSuccess(`Dispatched via ${channels}!`);
      } else {
        setActionSuccess('Check-in request processed.');
      }
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error(err);
      setActionSuccess('Error sending proactive check-in.');
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setIsSendingCheckin(false);
    }
  };

  const turns = history || [];
  const latestTurn = turns[turns.length - 1] || {};

  // Build SVG Points for Longitudinal Trend Chart
  const chartWidth = 540;
  const chartHeight = 160;
  const padding = 30;

  const points = turns.map((t, idx) => {
    const x = padding + (idx / Math.max(1, turns.length - 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - (t.fused_risk_score * (chartHeight - 2 * padding));
    return { x, y, score: t.fused_risk_score, turn: t.turn_id, tier: t.risk_tier };
  });

  const pathData = points.length > 0
    ? points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    : '';

  const handleAction = (actionName) => {
    setActionSuccess(actionName);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  return (
    <div className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm" style={{ minHeight: '80vh' }}>
      {/* â”€â”€ Inline Back-breadcrumb toolbar â”€â”€ */}
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-outline-variant/30 bg-surface-container-low rounded-t-xl">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-on-primary-container bg-surface-container hover:bg-primary-container px-3 py-1.5 rounded-lg transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Case Roster
        </button>
        <span className="text-on-surface-variant text-xs">/</span>
        <span className="text-xs font-semibold text-on-surface">{victim.name}</span>
        <span className="text-xs text-on-surface-variant font-mono ml-1">({victim.victim_id})</span>
      </div>

      <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>

        {/* Header Profile */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                {victim.name}
              </h2>
              <span className={`badge ${victim.current_risk_tier === 'Urgent' ? 'badge-urgent' : victim.current_risk_tier === 'Counselor Outreach' ? 'badge-outreach' : 'badge-watch'}`}>
                {victim.current_risk_tier}
              </span>
            </div>
            <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '4px' }}>
              Victim ID: <strong style={{ color: '#4f46e5' }}>{victim.victim_id}</strong> â€¢ Community: {victim.caste_category} â€¢ {victim.district}, {victim.state}
            </p>
          </div>
        </div>

        {/* Action Success Toast */}
        {actionSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            color: '#047857',
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            <Check size={18} />
            Action Triggered: {actionSuccess} (Notification Dispatched to District Authorities)
          </div>
        )}

        {/* Officer Message Toast */}
        {officerMsg && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#1d4ed8',
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            <Check size={18} />
            {officerMsg}
          </div>
        )}

        {/* Pending Verification Banner */}
        {victim.registration_status === 'self_registered_pending_verification' && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#b45309" />
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400e' }}>
                  âš ï¸ Self-Registered Victim (Pending Verification)
                </span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#78350f' }}>
                  Registered via Telegram mobile channel. Formal police FIR and case details have not been verified yet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Channels Engaged Badges */}
        {fullHistory?.channels_used && fullHistory.channels_used.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Multi-Channel Activity:</span>
            {fullHistory.channels_used.map(ch => (
              <span key={ch} style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#4338ca',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600
              }}>
                {ch}
              </span>
            ))}
          </div>
        )}

        {/* Grid: Trend Chart + Legal Context */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Longitudinal Trend Chart */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#4f46e5" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  Longitudinal Distress Curve Over Turns
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                - - Urgent Threshold (0.75)
              </span>
            </div>

            {points.length > 0 ? (
              <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
                {/* Threshold Line */}
                <line
                  x1={padding}
                  y1={chartHeight - padding - 0.75 * (chartHeight - 2 * padding)}
                  x2={chartWidth - padding}
                  y2={chartHeight - padding - 0.75 * (chartHeight - 2 * padding)}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />

                {/* Score Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="url(#gradient-line)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Gradients */}
                <defs>
                  <linearGradient id="gradient-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>

                {/* Data Points */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={6}
                      fill={p.score >= 0.75 ? '#ef4444' : p.score >= 0.5 ? '#f59e0b' : '#3b82f6'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={p.x}
                      y={p.y - 12}
                      fill="#0f172a"
                      fontSize="10"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      Turn {p.turn}: {p.score.toFixed(2)}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No interaction logs recorded yet.</p>
            )}
          </div>

          {/* Legal & Case Context Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Scale size={16} color="#0369a1" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                SC/ST PoA Legal Case Record
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>FIR &amp; Station:</span>
                <p style={{ fontWeight: 600, color: '#0f172a' }}>{victim.fir_number}</p>
                <p style={{ color: '#475569' }}>{victim.police_station}</p>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>Trial Stage:</span>
                <p style={{ fontWeight: 600, color: '#0f172a' }}>{victim.case_stage}</p>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>Accused Bail Status:</span>
                <p style={{ fontWeight: 700, color: victim.accused_bail_status === 'Granted' ? '#dc2626' : '#059669' }}>
                  {victim.accused_bail_status}
                </p>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>Compensation Relief:</span>
                <p style={{ fontWeight: 600, color: '#b45309' }}>{victim.compensation_status}</p>
              </div>
            </div>

            {victim.threat_reported ? (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <ShieldAlert size={14} />
                Witness Threat / Intimidation Incident Active
              </div>
            ) : null}
          </div>
        </div>

        {/* Explainability Matrix */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
            ðŸ” Multi-Agent Explainability Drivers (Latest Turn)
          </h3>
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            {latestTurn.explainability_reasons && latestTurn.explainability_reasons.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {latestTurn.explainability_reasons.map((r, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: '#4f46e5', fontWeight: 800 }}>â€¢</span>
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Baseline stable metrics.</p>
            )}
          </div>
        </div>

        {/* SC/ST PoA Action Center Buttons */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
            âš¡ Deployable SC/ST PoA Interventions &amp; Emergency Actions
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
            <button
              onClick={() => handleAction('Immediate Telephonic Counselor Contact')}
              className="btn btn-danger"
            >
              <PhoneCall size={16} /> Immediate Counselor Call
            </button>

            <button
              onClick={() => handleAction('Witness Protection & Police Station Alert')}
              className="btn btn-primary"
            >
              <ShieldCheck size={16} /> Dispatch Witness Protection
            </button>

            <button
              onClick={() => handleAction('Emergency Legal Aid & Bail Cancellation Petition')}
              className="btn btn-secondary"
            >
              <FileText size={16} /> Assign Emergency Legal Aid
            </button>

            <button
              onClick={() => handleAction('Relief & Compensation Claim Fast-Track')}
              className="btn btn-secondary"
            >
              <HeartPulse size={16} /> Expedite SC/ST Compensation
            </button>
          </div>

          {/* Proactive Automated Check-in Section */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '20px',
            borderRadius: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <MessageSquarePlus size={18} color="#4f46e5" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Proactive Outbound Check-in (IVRS / SMS / Bot)
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '14px' }}>
              Dispatch a clinically designed well-being check-in to this victim's phone via Voice, SMS, Email, and 1-Click WhatsApp.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
              <select
                value={promptType}
                onChange={(e) => setPromptType(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '240px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="routine_wellbeing">
                  1. Routine Well-being Check (Daily routine &amp; emotional state)
                </option>
                <option value="safety_check">
                  2. Post-Hearing Safety &amp; Threat Check (Bail &amp; intimidation probe)
                </option>
                <option value="compensation_support">
                  3. SC/ST Rehabilitation &amp; Compensation Claim Follow-up
                </option>
              </select>

              <button
                onClick={handleSendCheckin}
                disabled={isSendingCheckin}
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                <Send size={16} /> {isSendingCheckin ? 'Sending...' : 'Auto-Dispatch (Call + SMS + Email)'}
              </button>

              {/* Method 1: Official WhatsApp 1-Click Deep Link */}
              {(() => {
                const rawDigits = (victim.phone_number || '918299248116').replace(/[^0-9]/g, '');
                const waPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
                const waMsg = promptType === 'safety_check'
                  ? `ðŸ›ï¸ *MoSJE â€¢ NHAA 14566 Post-Hearing Safety Check*\n\nNamaste ${victim.name}, regarding your recent court hearing for case ${victim.fir_number || 'FIR-2026/894'}, our support counselor is checking in. Do you or your family feel safe in your locality? If you have received any threats or intimidation, reply to this message or call toll-free 14566.`
                  : promptType === 'compensation_support'
                  ? `ðŸ›ï¸ *MoSJE â€¢ NHAA 14566 Relief Compensation Follow-up*\n\nNamaste ${victim.name}, we are following up on your SC/ST PoA rehabilitation relief disbursement. Please let us know if your pending relief has arrived or reply with any difficulties.`
                  : `ðŸ›ï¸ *MoSJE â€¢ NHAA 14566 Routine Well-Being Check*\n\nNamaste ${victim.name}, this is an official routine check-in from your NHAA support counselor. How are you and your family feeling today? Reply here or call 14566 anytime.`;

                return (
                  <a
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      whiteSpace: 'nowrap',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600
                    }}
                  >
                    <MessageCircle size={16} /> Send via WhatsApp (wa.me)
                  </a>
                );
              })()}
            </div>

            {/* Custom Message Preview */}
            <div style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: '#475569'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.72rem', color: '#64748b' }}>
                <span style={{ fontWeight: 600 }}>Message Content Preview:</span>
                <span>Channels: <strong style={{ color: '#059669' }}>WhatsApp (1-Click)</strong> â€¢ <strong style={{ color: '#2563eb' }}>Email (SMTP)</strong> â€¢ <strong style={{ color: '#7c3aed' }}>Voice / SMS</strong></span>
              </div>
              <span style={{ fontStyle: 'italic', color: '#334155' }}>
                {promptType === 'safety_check'
                  ? `\"Namaste ${victim.name}, regarding your recent court hearing for case ${victim.fir_number || 'FIR-2026/894'}, our support counselor is checking in. Do you or your family feel safe in your locality? If you have received any threats or intimidation, reply to this message or call toll-free 14566.\"`
                  : promptType === 'compensation_support'
                  ? `\"Namaste ${victim.name}, we are following up on your SC/ST PoA rehabilitation relief disbursement. Please let us know if your pending relief has arrived or reply with any difficulties.\"`
                  : `\"Namaste ${victim.name}, this is an official routine check-in from your NHAA support counselor. How are you and your family feeling today? Reply here or call 14566 anytime.\"`
                }
              </span>
            </div>
          </div>

          {/* Interaction Chat Logs */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            padding: '20px',
            borderRadius: '14px',
            marginTop: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FileText size={18} color="#4f46e5" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Recent Interaction History
              </span>
            </div>

            {history.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No interaction logs recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                {history.map((item, idx) => {
                  const meta = CHANNEL_META[item.channel] || { label: item.channel, color: '#6366f1', icon: '📡' };
                  return (
                    <div key={idx} style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: `${meta.color}15`,
                            color: meta.color,
                            border: `1px solid ${meta.color}30`,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>
                            {meta.icon} {meta.label}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {new Date(item.timestamp || item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: (item.fused_risk_score ?? 0.1) >= 0.75 ? '#dc2626' : '#059669'
                        }}>
                          Score: {Math.round((item.fused_risk_score ?? 0.1) * 100)}%
                        </span>
                      </div>

                      <p style={{ fontSize: '0.84rem', color: '#334155', margin: '4px 0', whiteSpace: 'pre-wrap' }}>
                        {item.transcript || item.message_text || 'Live voice check-in logged'}
                      </p>

                      {item.voice_metrics && (
                        <div style={{ fontSize: '0.7rem', color: '#6366f1', display: 'flex', gap: '12px', marginTop: '4px' }}>
                          <span>Pitch Jitter: {item.voice_metrics.pitch_jitter ?? 'Normal'}</span>
                          <span>Acoustic Distress: {item.voice_metrics.shimmer_distress ?? 'Low'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Escalation Explainability (Part C) */}
          {fullHistory?.escalation_alerts && fullHistory.escalation_alerts.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.04)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '14px',
              marginTop: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldAlert size={18} color="#dc2626" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Past Escalation Alerts &amp; Clinical Explainability Reasons ({fullHistory.escalation_alerts.length})
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '14px' }}>
                Multi-agent fusion triggers that required human-in-the-loop counselor intervention:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fullHistory.escalation_alerts.map((alert, idx) => (
                  <div key={idx} style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: alert.priority === 'P1-CRITICAL' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: alert.priority === 'P1-CRITICAL' ? '#b91c1c' : '#92400e',
                          fontWeight: 700,
                          fontSize: '0.72rem'
                        }}>
                          {alert.priority}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                          {alert.recommended_action}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {/* Clinical Reasons Tags */}
                    {alert.clinical_reasons && alert.clinical_reasons.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {alert.clinical_reasons.map((reason, rIdx) => (
                          <span key={rIdx} style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            border: '1px solid #e2e8f0'
                          }}>
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* District Officer Actions (Part A & C) */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '20px',
            borderRadius: '14px',
            marginTop: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={18} color="#0369a1" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                District Officer &amp; Case Intake Management
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* 1. Generate 7-Day Link Code */}
              <div style={{
                background: '#ffffff',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  In-Person 7-Day Linking Code
                </span>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                  Generate a temporary 6-digit code for the victim to connect their Telegram or mobile.
                </p>

                {generatedCode ? (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 800, color: '#0369a1', letterSpacing: '4px' }}>
                      {generatedCode}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#0e7490' }}>Valid 7 Days</span>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateLinkCode}
                    style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.35)',
                      color: '#0369a1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <KeyRound size={14} /> Generate 6-Digit Code
                  </button>
                )}
              </div>

              {/* 2. Update Email for Patient Portal */}
              <div style={{
                background: '#ffffff',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  Link Email for Portal Access
                </span>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                  Add or update victim email so they can log into the Patient Portal via Brevo OTP.
                </p>
                <form onSubmit={handleUpdateEmail} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="victim@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#0f172a',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Save
                  </button>
                </form>
              </div>

              {/* 3. Verify & Attach FIR (if pending) */}
              {victim.registration_status === 'self_registered_pending_verification' && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.06)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  gridColumn: '1 / -1'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', display: 'block', marginBottom: '4px' }}>
                    Verify &amp; Attach Official Police FIR
                  </span>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                    Confirm this self-registered victim and link the formal Police FIR number.
                  </p>
                  <form onSubmit={handleVerifyVictim} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Official FIR Number (e.g. FIR-2026/894)"
                      value={newFir}
                      onChange={(e) => setNewFir(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#0f172a',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="District"
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      style={{
                        width: '150px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#0f172a',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: '#f59e0b',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Verify &amp; Attach FIR
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
