import React, { useState, useEffect } from 'react';
import {
  X, Activity, Scale, ShieldAlert, PhoneCall, HeartPulse, 
  FileText, ShieldCheck, AlertTriangle, ArrowUpRight, Check, Send, MessageSquarePlus, MessageCircle,
  KeyRound, Mail, CheckCircle2, Copy
} from 'lucide-react';
import { API_BASE } from '../config';

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
        const channels = (data.channels_used || []).join(' • ') || 'Voice + SMS + WhatsApp';
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
      {/* ── Inline Back-breadcrumb toolbar ── */}
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

      <div className="overflow-y-auto rounded-b-xl" style={{ maxHeight: 'calc(100vh - 280px)', background: '#0d1322', padding: '28px 28px 32px 28px' }}>

        {/* Header Profile */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
                {victim.name}
              </h2>
              <span className={`badge ${victim.current_risk_tier === 'Urgent' ? 'badge-urgent' : victim.current_risk_tier === 'Counselor Outreach' ? 'badge-outreach' : 'badge-watch'}`}>
                {victim.current_risk_tier}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Victim ID: <strong style={{ color: '#a5b4fc' }}>{victim.victim_id}</strong> • Community: {victim.caste_category} • {victim.district}, {victim.state}
            </p>
          </div>
        </div>

        {/* Action Success Toast */}
        {actionSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            color: '#6ee7b7',
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
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            color: '#93c5fd',
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
            background: 'rgba(245, 158, 11, 0.15)',
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
              <AlertTriangle size={20} color="#fbbf24" />
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>
                  ⚠️ Self-Registered Victim (Pending Verification)
                </span>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Registered via Telegram mobile channel. Formal police FIR and case details have not been verified yet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Channels Engaged Badges */}
        {fullHistory?.channels_used && fullHistory.channels_used.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Multi-Channel Activity:</span>
            {fullHistory.channels_used.map(ch => (
              <span key={ch} style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#a5b4fc',
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
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="var(--accent-indigo)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                  Longitudinal Distress Curve Over Turns
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>
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
                      fill="#ffffff"
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No interaction logs recorded yet.</p>
            )}
          </div>

          {/* Legal & Case Context Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Scale size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                SC/ST PoA Legal Case Record
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>FIR & Station:</span>
                <p style={{ fontWeight: 600, color: '#ffffff' }}>{victim.fir_number}</p>
                <p style={{ color: 'var(--text-secondary)' }}>{victim.police_station}</p>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Trial Stage:</span>
                <p style={{ fontWeight: 600, color: '#ffffff' }}>{victim.case_stage}</p>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Accused Bail Status:</span>
                <p style={{ fontWeight: 700, color: victim.accused_bail_status === 'Granted' ? '#f87171' : '#34d399' }}>
                  {victim.accused_bail_status}
                </p>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Compensation Relief:</span>
                <p style={{ fontWeight: 600, color: '#fbbf24' }}>{victim.compensation_status}</p>
              </div>
            </div>

            {victim.threat_reported ? (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#fca5a5',
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
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
            🔍 Multi-Agent Explainability Drivers (Latest Turn)
          </h3>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            {latestTurn.explainability_reasons && latestTurn.explainability_reasons.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {latestTurn.explainability_reasons.map((r, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: '#f1f5f9', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-indigo)', fontWeight: 800 }}>•</span>
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Baseline stable metrics.</p>
            )}
          </div>
        </div>

        {/* SC/ST PoA Action Center Buttons */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
            ⚡ Deployable SC/ST PoA Interventions & Emergency Actions
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
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '20px',
            borderRadius: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <MessageSquarePlus size={18} color="#818cf8" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                Proactive Outbound Check-in (IVRS / SMS / Bot)
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="routine_wellbeing" style={{ background: '#111726' }}>
                  1. Routine Well-being Check (Daily routine & emotional state)
                </option>
                <option value="safety_check" style={{ background: '#111726' }}>
                  2. Post-Hearing Safety & Threat Check (Bail & intimidation probe)
                </option>
                <option value="compensation_support" style={{ background: '#111726' }}>
                  3. SC/ST Rehabilitation & Compensation Claim Follow-up
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
                  ? `🏛️ *MoSJE • NHAA 14566 Post-Hearing Safety Check*\n\nNamaste ${victim.name}, regarding your recent court hearing for case ${victim.fir_number || 'FIR-2026/894'}, our support counselor is checking in. Do you or your family feel safe in your locality? If you have received any threats or intimidation, reply to this message or call toll-free 14566.`
                  : promptType === 'compensation_support'
                  ? `🏛️ *MoSJE • NHAA 14566 Relief Compensation Follow-up*\n\nNamaste ${victim.name}, we are following up on your SC/ST PoA rehabilitation relief disbursement. Please let us know if your pending relief has arrived or reply with any difficulties.`
                  : `🏛️ *MoSJE • NHAA 14566 Routine Well-Being Check*\n\nNamaste ${victim.name}, this is an official routine check-in from your NHAA support counselor. How are you and your family feeling today? Reply here or call 14566 anytime.`;

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
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.72rem', color: '#94a3b8' }}>
                <span style={{ fontWeight: 600 }}>Message Content Preview:</span>
                <span>Channels: <strong style={{ color: '#10b981' }}>WhatsApp (1-Click)</strong> • <strong style={{ color: '#60a5fa' }}>Email (SMTP)</strong> • <strong style={{ color: '#a78bfa' }}>Voice / SMS</strong></span>
              </div>
              <span style={{ fontStyle: 'italic', color: '#e2e8f0' }}>
                {promptType === 'safety_check'
                  ? `\"Namaste ${victim.name}, regarding your recent court hearing for case ${victim.fir_number || 'FIR-2026/894'}, our support counselor is checking in. Do you or your family feel safe in your locality? If you have received any threats or intimidation, reply to this message or call toll-free 14566.\"`
                  : promptType === 'compensation_support'
                  ? `\"Namaste ${victim.name}, we are following up on your SC/ST PoA rehabilitation relief disbursement. Please let us know if your pending relief has arrived or reply with any difficulties.\"`
                  : `\"Namaste ${victim.name}, this is an official routine check-in from your NHAA support counselor. How are you and your family feeling today? Reply here or call 14566 anytime.\"`
                }
              </span>
            </div>
          </div>

          {/* Past Escalation Explainability (Part C) */}
          {fullHistory?.escalation_alerts && fullHistory.escalation_alerts.length > 0 && (
            <div className="glass-panel" style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '20px',
              borderRadius: '14px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldAlert size={18} color="#ef4444" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  Past Escalation Alerts & Clinical Explainability Reasons ({fullHistory.escalation_alerts.length})
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Multi-agent fusion triggers that required human-in-the-loop counselor intervention:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {fullHistory.escalation_alerts.map((alert, idx) => (
                  <div key={idx} style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: alert.priority === 'P1-CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: alert.priority === 'P1-CRITICAL' ? '#f87171' : '#fbbf24',
                          fontWeight: 700,
                          fontSize: '0.72rem'
                        }}>
                          {alert.priority}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                          {alert.recommended_action}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {/* Clinical Reasons Tags */}
                    {alert.clinical_reasons && alert.clinical_reasons.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {alert.clinical_reasons.map((reason, rIdx) => (
                          <span key={rIdx} style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: '#e2e8f0',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
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
          <div className="glass-panel" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            padding: '20px',
            borderRadius: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={18} color="#06b6d4" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                District Officer & Case Intake Management
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* 1. Generate 7-Day Link Code */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '4px' }}>
                  In-Person 7-Day Linking Code
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Generate a temporary 6-digit code for the victim to connect their Telegram or mobile.
                </p>

                {generatedCode ? (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '4px' }}>
                      {generatedCode}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#67e8f9' }}>Valid 7 Days</span>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateLinkCode}
                    style={{
                      background: 'rgba(6, 182, 212, 0.2)',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      color: '#67e8f9',
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
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', display: 'block', marginBottom: '4px' }}>
                  Link Email for Portal Access
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
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
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'var(--accent-indigo)',
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
                  background: 'rgba(245, 158, 11, 0.08)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  gridColumn: '1 / -1'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', display: 'block', marginBottom: '4px' }}>
                    Verify & Attach Official Police FIR
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
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
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
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
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#ffffff',
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
                      Verify & Attach FIR
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
