import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Activity,
  Scale,
  ShieldAlert,
  PhoneCall,
  HeartPulse,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Send,
  KeyRound,
  Mail,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  MessageSquare,
  Users,
  Sparkles,
  Lock
} from 'lucide-react';
import { API_BASE } from '../config';

const CHANNEL_META = {
  telegram_mobile: { label: 'Telegram', color: '#0088cc', icon: '📱' },
  ivrs:            { label: 'IVRS Call', color: '#7c3aed', icon: '📞' },
  chatbot:         { label: 'Chatbot',   color: '#0ea5e9', icon: '💬' },
  web_chat:        { label: 'Web Chat',  color: '#0ea5e9', icon: '🌐' },
  whatsapp:        { label: 'WhatsApp',  color: '#25D366', icon: '💬' },
  sms:             { label: 'SMS',       color: '#f59e0b', icon: '📨' },
  email:           { label: 'Email',     color: '#6366f1', icon: '📧' }
};

export default function PatientsDirectory({
  victims = [],
  selectedVictimId,
  onSelectVictim,
  onClearSelectedVictim,
  userRole = 'counselor',
  onRefreshData
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detailed victim state when a patient is selected
  const [victimDetails, setVictimDetails] = useState(null);
  const [victimHistory, setVictimHistory] = useState([]);
  const [fullHistory, setFullHistory] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Actions state
  const [promptType, setPromptType] = useState('safety_check');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSendingOutreach, setIsSendingOutreach] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // District Officer actions
  const [generatedCode, setGeneratedCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFir, setNewFir] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [officerMsg, setOfficerMsg] = useState(null);
  const [isProcessingOfficer, setIsProcessingOfficer] = useState(false);

  // Load details whenever selectedVictimId changes
  useEffect(() => {
    if (!selectedVictimId) {
      setVictimDetails(null);
      setVictimHistory([]);
      setFullHistory(null);
      return;
    }

    setIsLoadingDetails(true);
    setActionSuccess(null);
    setOfficerMsg(null);
    setGeneratedCode(null);

    Promise.all([
      fetch(`${API_BASE}/victim/${selectedVictimId}/history?role=${userRole}`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/victim/${selectedVictimId}/full-history`).then(r => r.json()).catch(() => null)
    ]).then(([histData, fullData]) => {
      if (histData) {
        setVictimDetails(histData.victim);
        setVictimHistory(histData.history || []);
        setNewEmail(histData.victim?.email || '');
        setNewDistrict(histData.victim?.district || '');
      }
      if (fullData) {
        setFullHistory(fullData);
      }
      setIsLoadingDetails(false);
    });
  }, [selectedVictimId, userRole]);

  // Handle Counselor Outreach
  const handleSendOutreach = async (e) => {
    e.preventDefault();
    if (!victimDetails) return;

    setIsSendingOutreach(true);
    setActionSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/victim/${victimDetails.victim_id}/checkin-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_type: promptType,
          custom_message: customPrompt
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setActionSuccess(`Welfare outreach dispatched via ${data.channel} successfully.`);
        setCustomPrompt('');
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error("Outreach error:", err);
    } finally {
      setIsSendingOutreach(false);
    }
  };

  // Handle Officer Generate 7-Day Link Code
  const handleGenerateLinkCode = async () => {
    if (!victimDetails) return;
    setIsProcessingOfficer(true);
    try {
      const res = await fetch(`${API_BASE}/case/generate-link-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': 'nhaa-officer-2024'
        },
        body: JSON.stringify({ victim_id: victimDetails.victim_id })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedCode(data.link_code);
        setOfficerMsg(`6-Digit Link Code ${data.link_code} generated (valid for 7 days)!`);
      } else {
        setOfficerMsg(data.detail || "Error generating code");
      }
    } catch (err) {
      setOfficerMsg("Network error generating code");
    } finally {
      setIsProcessingOfficer(false);
    }
  };

  // Handle Officer Update Email
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!victimDetails || !newEmail.trim()) return;
    setIsProcessingOfficer(true);
    try {
      const res = await fetch(`${API_BASE}/victim/${victimDetails.victim_id}/update-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': 'nhaa-officer-2024'
        },
        body: JSON.stringify({ email: newEmail.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setOfficerMsg(`Email updated to ${newEmail} for Patient Portal access!`);
        if (onRefreshData) onRefreshData();
      } else {
        setOfficerMsg(data.detail || "Error updating email");
      }
    } catch (err) {
      setOfficerMsg("Network error updating email");
    } finally {
      setIsProcessingOfficer(false);
    }
  };

  // Handle Officer Verify Case
  const handleVerifyCase = async (e) => {
    e.preventDefault();
    if (!victimDetails) return;
    setIsProcessingOfficer(true);
    try {
      const res = await fetch(`${API_BASE}/victim/${victimDetails.victim_id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': 'nhaa-officer-2024'
        },
        body: JSON.stringify({
          fir_number: newFir.trim() || undefined,
          district: newDistrict.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setOfficerMsg("Victim verified and upgraded to full statutory legal protection!");
        setVictimDetails(prev => ({ ...prev, registration_status: 'verified' }));
        if (onRefreshData) onRefreshData();
      } else {
        setOfficerMsg(data.detail || "Error verifying victim");
      }
    } catch (err) {
      setOfficerMsg("Network error verifying case");
    } finally {
      setIsProcessingOfficer(false);
    }
  };

  // Filtered Victims List
  const pendingCount = victims.filter(v => v.registration_status === 'self_registered_pending_verification').length;

  const filteredVictims = victims.filter((v) => {
    const matchesSearch =
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.victim_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.district && v.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.fir_number && v.fir_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTier = tierFilter === 'ALL' || v.current_risk_tier?.toUpperCase() === tierFilter;
    const matchesChannel = channelFilter === 'ALL' || v.last_channel === channelFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'VERIFIED' && v.registration_status !== 'self_registered_pending_verification') ||
      (statusFilter === 'PENDING' && v.registration_status === 'self_registered_pending_verification');
    return matchesSearch && matchesTier && matchesChannel && matchesStatus;
  });

  // Render Longitudinal Chart SVG Helper
  const renderTrendChart = () => {
    const scores = victimHistory.map(h => h.fused_risk_score ?? 0.1);
    if (scores.length === 0) {
      return (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No longitudinal turns recorded yet. Check back after next automated check-in.
        </div>
      );
    }

    const chartWidth = 520;
    const chartHeight = 170;
    const padding = 32;

    const points = scores.map((score, idx) => {
      const x = padding + (idx / Math.max(scores.length - 1, 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - score * (chartHeight - 2 * padding);
      return { x, y, score, turn: idx + 1 };
    });

    const pathData = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

    return (
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
        {/* Urgent Threshold line */}
        <line
          x1={padding}
          y1={chartHeight - padding - 0.75 * (chartHeight - 2 * padding)}
          x2={chartWidth - padding}
          y2={chartHeight - padding - 0.75 * (chartHeight - 2 * padding)}
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.65"
        />

        {/* Path curve */}
        <path d={pathData} fill="none" stroke="url(#dir-grad-line)" strokeWidth="3.5" strokeLinecap="round" />

        <defs>
          <linearGradient id="dir-grad-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke={p.score >= 0.75 ? '#ef4444' : p.score >= 0.4 ? '#f59e0b' : '#3b82f6'} strokeWidth="2.5" />
            <text x={p.x} y={p.y - 10} fill="#f8fafc" fontSize="10" fontWeight="700" textAnchor="middle">
              T{p.turn}: {p.score.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  // ==========================================
  // VIEW 1: PATIENT DETAIL FILE VIEW (When selected)
  // ==========================================
  if (selectedVictimId && victimDetails) {
    const isPending = victimDetails.registration_status === 'self_registered_pending_verification';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Navigation Breadcrumb Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={onClearSelectedVictim}
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
          >
            <ArrowLeft size={16} />
            Back to All Patients
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
            {isPending ? (
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                ⚠️ Pending Verification
              </span>
            ) : (
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                ✅ Verified Case File
              </span>
            )}
          </div>
        </div>

        {/* Patient Profile Banner */}
        <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  {victimDetails.name}
                </h1>
                <span className={`badge ${
                  victimDetails.current_risk_tier?.toLowerCase().includes('urgent') ? 'badge-urgent' :
                  victimDetails.current_risk_tier?.toLowerCase().includes('outreach') ? 'badge-outreach' :
                  victimDetails.current_risk_tier?.toLowerCase().includes('watch') ? 'badge-watch' : 'badge-routine'
                }`}>
                  {victimDetails.current_risk_tier || 'Routine Monitoring'}
                </span>
                {victimDetails.email && (
                  <span style={{
                    fontSize: '0.72rem',
                    color: '#67e8f9',
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    📧 {victimDetails.email}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Victim ID: <strong>{victimDetails.victim_id}</strong> • Community: <strong>{victimDetails.caste_category || 'Scheduled Caste'}</strong> • District: <strong>{victimDetails.district || 'Unassigned'}</strong>, {victimDetails.state || 'India'}
              </p>

              {/* Multi-Channel Activity Badges */}
              {fullHistory?.channels_used && fullHistory.channels_used.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Channels:</span>
                  {fullHistory.channels_used.map(ch => {
                    const meta = CHANNEL_META[ch] || { label: ch, color: '#6366f1', icon: '📡' };
                    return (
                      <span key={ch} style={{
                        background: `${meta.color}20`,
                        color: meta.color,
                        border: `1px solid ${meta.color}45`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}>
                        {meta.icon} {meta.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Stats Pill */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '12px 18px',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Current Fused Risk
              </div>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: (victimDetails.fused_risk_score ?? 0.1) >= 0.75 ? '#ef4444' :
                       (victimDetails.fused_risk_score ?? 0.1) >= 0.4 ? '#f59e0b' : '#34d399'
              }}>
                {Math.round((victimDetails.fused_risk_score ?? 0.1) * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Grid: Longitudinal Distress Curve & SC/ST Legal Case Record */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '22px' }}>
          {/* Longitudinal Distress Trajectory */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--accent-indigo)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  Longitudinal Distress Curve Over Turns
                </h3>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>
                - - Urgent Threshold (0.75)
              </span>
            </div>

            {renderTrendChart()}
          </div>

          {/* SC/ST Legal Case Record */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Scale size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                SC/ST PoA Statutory Legal Record
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>FIR & Station</span>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0' }}>
                  {victimDetails.fir_number || 'Pending FIR'}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {victimDetails.police_station || 'District Police HQ'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Trial Stage</span>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0' }}>
                  {victimDetails.case_stage || 'Intake / Pre-Trial'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Accused Bail Status</span>
                <p style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  margin: '2px 0 0 0',
                  color: victimDetails.accused_bail_status === 'Granted' ? '#ef4444' : '#10b981'
                }}>
                  {victimDetails.accused_bail_status || 'Under Custody / Denied'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Compensation Relief</span>
                <p style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  margin: '2px 0 0 0',
                  color: victimDetails.compensation_status === 'Disbursed' ? '#10b981' : '#f59e0b'
                }}>
                  {victimDetails.compensation_status || 'Under Review (50% Stage)'}
                </p>
              </div>
            </div>

            {/* Threat indicator */}
            {victimDetails.threat_reported ? (
              <div style={{
                marginTop: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <ShieldAlert size={16} color="#ef4444" />
                <span style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 600 }}>
                  Active Witness Threat / Intimidation Incident Logged
                </span>
              </div>
            ) : (
              <div style={{
                marginTop: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <ShieldCheck size={16} color="#34d399" />
                <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                  Witness Protection Secure • No Active Threats Reported
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Agent Explainability Drivers */}
        {victimDetails.explainability_reasons && victimDetails.explainability_reasons.length > 0 && (
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sparkles size={18} color="var(--accent-indigo)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                Multi-Agent Explainability Drivers (Latest Assessment)
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {victimDetails.explainability_reasons.map((reason, i) => (
                <div key={i} style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  color: reason.includes('Critical') ? '#fca5a5' : 'var(--text-secondary)'
                }}>
                  {reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '22px' }}>
          {/* Action 1: Counselor Outreach */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <PhoneCall size={18} color="var(--accent-indigo)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                Counselor Welfare Outreach
              </h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Trigger an automated empathetic welfare check-in across the victim's primary channel.
            </p>

            <form onSubmit={handleSendOutreach} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Outreach Protocol:
                </label>
                <select
                  value={promptType}
                  onChange={(e) => setPromptType(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="safety_check" style={{ background: '#111726' }}>Safety & Location Check-in</option>
                  <option value="legal_update" style={{ background: '#111726' }}>Legal Rights & Bail Notification</option>
                  <option value="emotional_support" style={{ background: '#111726' }}>Empathetic Psychological Outreach</option>
                  <option value="custom" style={{ background: '#111726' }}>Custom Message</option>
                </select>
              </div>

              {promptType === 'custom' && (
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Type tailored outreach message..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '0.8rem'
                  }}
                />
              )}

              <button
                type="submit"
                disabled={isSendingOutreach}
                className="btn btn-primary"
                style={{
                  padding: '9px 16px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Send size={14} />
                {isSendingOutreach ? 'Dispatching Outreach...' : 'Dispatch Welfare Outreach'}
              </button>

              {actionSuccess && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}>
                  {actionSuccess}
                </div>
              )}
            </form>
          </div>

          {/* Action 2: District Officer Management (Link Code & Email) */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <KeyRound size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                District Officer Actions & Verification
              </h3>
            </div>

            {/* 7-Day Link Code Generator */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                    Generate 7-Day Link Code
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Allows survivor to link this case via Telegram or Web
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateLinkCode}
                  disabled={isProcessingOfficer}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    color: '#a5b4fc',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Generate Code
                </button>
              </div>

              {generatedCode && (
                <div style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                    {generatedCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedCode ? '#34d399' : '#a5b4fc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem'
                    }}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {/* Email Updater */}
            <form onSubmit={handleUpdateEmail} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '12px'
            }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '4px' }}>
                Link / Update Email for Patient Portal
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="survivor@example.com"
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: '#ffffff',
                    fontSize: '0.78rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={isProcessingOfficer}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Email
                </button>
              </div>
            </form>

            {/* Verification Form if Pending */}
            {isPending && (
              <form onSubmit={handleVerifyCase} style={{
                marginTop: '12px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                padding: '12px'
              }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', display: 'block', marginBottom: '6px' }}>
                  Verify & Upgrade Case File
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={newFir}
                    onChange={(e) => setNewFir(e.target.value)}
                    placeholder="Assign Official FIR #"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#ffffff',
                      fontSize: '0.78rem'
                    }}
                  />
                  <input
                    type="text"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="Confirm District"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#ffffff',
                      fontSize: '0.78rem'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessingOfficer}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    background: '#f59e0b',
                    border: 'none',
                    color: '#111827',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Verify & Approve Case File
                </button>
              </form>
            )}

            {officerMsg && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {officerMsg}
              </div>
            )}
          </div>
        </div>

        {/* Multi-Channel Interaction History */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <MessageSquare size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              Multi-Channel Conversation & Escalation History
            </h3>
          </div>

          {victimHistory.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No interaction logs recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {victimHistory.map((item, idx) => {
                const meta = CHANNEL_META[item.channel] || { label: item.channel, color: '#6366f1', icon: '📡' };
                return (
                  <div key={idx} style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: `${meta.color}22`,
                          color: meta.color,
                          border: `1px solid ${meta.color}44`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}>
                          {meta.icon} {meta.label}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.created_at || 'Recent Turn'}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: (item.fused_risk_score ?? 0.1) >= 0.75 ? '#ef4444' : '#34d399'
                      }}>
                        Score: {Math.round((item.fused_risk_score ?? 0.1) * 100)}%
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: '#f1f5f9', margin: '2px 0' }}>
                      "{item.transcript || item.message_text || 'Live voice check-in logged'}"
                    </p>

                    {item.voice_metrics && (
                      <div style={{ fontSize: '0.7rem', color: '#a5b4fc', display: 'flex', gap: '12px' }}>
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
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ALL PATIENTS DIRECTORY LIST VIEW
  // ==========================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Directory Title Bar */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={22} color="var(--accent-indigo)" />
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                All Patients & Atrocity Case Directory
              </h1>
              <span style={{
                padding: '3px 9px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid rgba(99, 102, 241, 0.35)'
              }}>
                {filteredVictims.length} Cases
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Statutory monitoring roster under SC/ST (Prevention of Atrocities) Act 1989. Click any patient to inspect full history and trigger interventions.
            </p>
          </div>

          {/* Pending Review Badge if any */}
          {pendingCount > 0 && (
            <div
              onClick={() => setStatusFilter('PENDING')}
              style={{
                cursor: 'pointer',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              {pendingCount} Self-Registered Pending Verification
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '18px',
          flexWrap: 'wrap'
        }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, ID, FIR, or district..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Risk Tier Filter */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['ALL', 'URGENT', 'COUNSELOR OUTREACH', 'WATCHLIST', 'ROUTINE MONITORING'].map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: tierFilter === tier ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                  color: tierFilter === tier ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                {tier === 'COUNSELOR OUTREACH' ? 'OUTREACH' : tier}
              </button>
            ))}
          </div>

          {/* Verification Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '0.75rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL" style={{ background: '#111726' }}>All Statuses</option>
            <option value="VERIFIED" style={{ background: '#111726' }}>✅ Verified</option>
            <option value="PENDING" style={{ background: '#111726' }}>⚠️ Pending Verification</option>
          </select>
        </div>
      </div>

      {/* Patients Roster Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filteredVictims.map((v) => {
          const isPending = v.registration_status === 'self_registered_pending_verification';
          const channelMeta = CHANNEL_META[v.last_channel] || { label: v.last_channel || 'Multi-Channel', color: '#6366f1', icon: '📡' };

          return (
            <div
              key={v.victim_id}
              onClick={() => onSelectVictim(v.victim_id)}
              className="glass-panel"
              style={{
                padding: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {/* Header: Name + Tier */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {v.name}
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {v.victim_id} • {v.district || 'Location N/A'}
                  </div>
                </div>

                <span className={`badge ${
                  v.current_risk_tier?.toLowerCase().includes('urgent') ? 'badge-urgent' :
                  v.current_risk_tier?.toLowerCase().includes('outreach') ? 'badge-outreach' :
                  v.current_risk_tier?.toLowerCase().includes('watch') ? 'badge-watch' : 'badge-routine'
                }`} style={{ fontSize: '0.65rem' }}>
                  {v.current_risk_tier || 'Routine'}
                </span>
              </div>

              {/* Case details */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  FIR: <strong>{v.fir_number || 'Pending'}</strong>
                </span>

                <span style={{
                  background: `${channelMeta.color}18`,
                  color: channelMeta.color,
                  border: `1px solid ${channelMeta.color}35`,
                  padding: '2px 7px',
                  borderRadius: '5px',
                  fontSize: '0.68rem',
                  fontWeight: 600
                }}>
                  {channelMeta.icon} {channelMeta.label}
                </span>
              </div>

              {/* Status & Action prompt */}
              <div style={{
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                {isPending ? (
                  <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700 }}>
                    ⚠️ Review Needed
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>
                    ✅ Case Verified
                  </span>
                )}

                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--accent-indigo)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Inspect Details & Actions <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
