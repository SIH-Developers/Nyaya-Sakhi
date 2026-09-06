import React, { useState } from 'react';
import { Search, Filter, AlertCircle, ChevronRight, Scale, ShieldAlert } from 'lucide-react';

// TASK 5: Channel badge config
const CHANNEL_META = {
  telegram_mobile:  { label: 'Telegram',  color: '#0088cc', icon: '📱' },
  ivrs:             { label: 'IVRS Call',  color: '#7c3aed', icon: '📞' },
  chatbot:          { label: 'Chatbot',    color: '#0ea5e9', icon: '💬' },
  web_chat:         { label: 'Web Chat',   color: '#0ea5e9', icon: '🌐' },
  whatsapp:         { label: 'WhatsApp',   color: '#25D366', icon: '💬' },
  sms:              { label: 'SMS',        color: '#f59e0b', icon: '📨' },
  email:            { label: 'Email',      color: '#6366f1', icon: '📧' },
};

function ChannelBadge({ channel }) {
  const meta = CHANNEL_META[channel] || { label: channel || 'Unknown', color: '#4b5563', icon: '❓' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${meta.color}22`, color: meta.color,
      border: `1px solid ${meta.color}55`,
      borderRadius: 999, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

export default function TriageRoster({ victims, onSelectVictim, selectedVictimId }) {
  const [searchTerm, setSearchTerm]     = useState('');
  const [tierFilter, setTierFilter]     = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');

  const filteredVictims = victims.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.victim_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.district && v.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.fir_number && v.fir_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTier    = tierFilter    === 'ALL' || v.current_risk_tier?.toUpperCase() === tierFilter;
    const matchesChannel = channelFilter === 'ALL' || v.last_channel === channelFilter;
    return matchesSearch && matchesTier && matchesChannel;
  });

  const getBadgeClass = (tier) => {
    switch (tier) {
      case 'Urgent': return 'badge-urgent';
      case 'Counselor Outreach': return 'badge-outreach';
      case 'Watch': return 'badge-watch';
      default: return 'badge-routine';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.75) return 'var(--urgent-red)';
    if (score >= 0.50) return 'var(--outreach-amber)';
    if (score >= 0.30) return 'var(--watch-blue)';
    return 'var(--routine-green)';
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
            Victim Triage & Case Monitoring Roster
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Continuously ranked by AI multi-signal distress score and real-world legal risk
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search victim, FIR, district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
                width: '200px'
              }}
            />
          </div>

          {/* Tier Filter Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            gap: '2px'
          }}>
            {['ALL', 'URGENT', 'COUNSELOR OUTREACH', 'WATCH', 'ROUTINE'].map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: tierFilter === tier ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: tierFilter === tier ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                {tier === 'COUNSELOR OUTREACH' ? 'OUTREACH' : tier}
              </button>
            ))}
          </div>

          {/* TASK 5: Channel Filter */}
          <select
            id="channel-filter-select"
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)', color: '#fff',
              border: '1px solid var(--border-subtle)', borderRadius: 8,
              padding: '7px 12px', fontSize: '0.78rem', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="ALL">All Channels</option>
            {Object.entries(CHANNEL_META).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 16px' }}>Victim & Community</th>
              <th style={{ padding: '12px 16px' }}>Location & FIR</th>
              <th style={{ padding: '12px 16px' }}>Legal Stage & Bail</th>
              <th style={{ padding: '12px 16px' }}>Dynamic Distress Score</th>
              <th style={{ padding: '12px 16px' }}>Triage Tier</th>
              <th style={{ padding: '12px 16px' }}>Channel</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredVictims.map((v) => {
              const isSelected = selectedVictimId === v.victim_id;
              const scorePct = Math.round((v.current_risk_score || 0) * 100);
              const scoreColor = getScoreColor(v.current_risk_score || 0);

              return (
                <tr
                  key={v.victim_id}
                  onClick={() => onSelectVictim(v.victim_id)}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Name & ID */}
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600 }}>
                      {v.victim_id} • {v.caste_category}
                    </div>
                  </td>

                  {/* Location & FIR */}
                  <td style={{ padding: '16px' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      {v.district}, {v.state}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {v.fir_number}
                    </div>
                  </td>

                  {/* Legal Case Stage */}
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#ffffff' }}>
                      <Scale size={14} color="var(--accent-cyan)" />
                      {v.case_stage}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                      {v.accused_bail_status === 'Granted' ? (
                        <span style={{ color: '#f87171', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldAlert size={12} /> Bail Granted
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          Bail: {v.accused_bail_status}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Distress Score & Bar */}
                  <td style={{ padding: '16px', minWidth: '160px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: scoreColor }}>
                        {scorePct}%
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {(v.current_risk_score || 0).toFixed(3)}
                      </span>
                    </div>
                    <div style={{
                      height: '6px',
                      borderRadius: '3px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${scorePct}%`,
                        background: scoreColor,
                        borderRadius: '3px',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </td>

                  {/* Tier Badge */}
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${getBadgeClass(v.current_risk_tier)}`}>
                      <span className="pulse-dot" style={{ background: 'currentColor' }}></span>
                      {v.current_risk_tier}
                    </span>
                  </td>

                  {/* TASK 5: Channel Badge */}
                  <td style={{ padding: '16px' }}>
                    {v.last_channel
                      ? <ChannelBadge channel={v.last_channel} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    }
                  </td>

                  {/* Action */}
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      Inspect <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
