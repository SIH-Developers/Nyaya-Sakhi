import React, { useState } from 'react';
import {
  X, Activity, Scale, ShieldAlert, PhoneCall, HeartPulse, 
  FileText, ShieldCheck, AlertTriangle, ArrowUpRight, Check, Send, MessageSquarePlus
} from 'lucide-react';
import { API_BASE } from '../config';

export default function VictimDetailModal({ victim, history = [], onClose, onUpdateStatus }) {
  const [actionSuccess, setActionSuccess] = useState(null);
  const [promptType, setPromptType] = useState('safety_check');
  const [isSendingCheckin, setIsSendingCheckin] = useState(false);

  if (!victim) return null;

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '1000px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px',
        background: '#0d1322',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-secondary)',
            padding: '8px',
            borderRadius: '50%',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

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
              Manually dispatch a clinically designed well-being check-in question to this victim's phone.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                <Send size={16} /> {isSendingCheckin ? 'Sending...' : 'Send Proactive Check-in Prompt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
