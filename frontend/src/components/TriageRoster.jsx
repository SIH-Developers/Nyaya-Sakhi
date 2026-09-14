import React, { useState } from 'react';
import VictimDetailModal from './VictimDetailModal';

const CHANNEL_META = {
  telegram_mobile: { label: 'Telegram', color: '#0088cc', icon: '📱' },
  ivrs:            { label: 'IVRS Call', color: '#7c3aed', icon: '📞' },
  chatbot:         { label: 'Chatbot',   color: '#0ea5e9', icon: '💬' },
  web_chat:        { label: 'Web Chat',  color: '#0ea5e9', icon: '🌐' },
  whatsapp:        { label: 'WhatsApp',  color: '#25D366', icon: '💬' },
  sms:             { label: 'SMS',       color: '#f59e0b', icon: '📨' },
  email:           { label: 'Email',     color: '#6366f1', icon: '📧' },
};

function ChannelBadge({ channel }) {
  const meta = CHANNEL_META[channel] || { label: channel || 'Web Chat', color: '#006a61', icon: '🌐' };
  return (
    <span className="inline-flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-full text-xs font-semibold text-on-surface">
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}

export default function TriageRoster({ victims = [], onSelectVictim, selectedVictimId, selectedVictimDetails, selectedVictimHistory = [], userRole = 'counselor', onRefresh, onRefreshData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  // When a victim detail is open, render the detail inline replacing the list
  if (selectedVictimDetails) {
    return (
      <VictimDetailModal
        victim={selectedVictimDetails}
        history={selectedVictimHistory}
        onClose={() => onSelectVictim && onSelectVictim(null)}
        userRole={userRole}
        onRefreshData={onRefreshData || onRefresh}
      />
    );
  }

  const criticalCount = victims.filter(v => v.current_risk_tier === 'Urgent' || v.current_risk_tier === 'Critical').length;
  const elevatedCount = victims.filter(v => v.current_risk_tier === 'Counselor Outreach').length;
  const stableCount   = victims.filter(v => v.current_risk_tier === 'Watch' || v.current_risk_tier === 'Routine').length;

  const filteredVictims = victims.filter((v) => {
    const matchesSearch =
      (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.victim_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.district || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.fir_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTier = true;
    if (tierFilter === 'critical') matchesTier = v.current_risk_tier === 'Urgent' || v.current_risk_tier === 'Critical';
    if (tierFilter === 'elevated') matchesTier = v.current_risk_tier === 'Counselor Outreach';
    if (tierFilter === 'stable')   matchesTier = v.current_risk_tier === 'Watch' || v.current_risk_tier === 'Routine';

    return matchesSearch && matchesTier;
  });

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Urgent':
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-error-container text-on-error-container border border-error/30">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
            Urgent Risk
          </span>
        );
      case 'Counselor Outreach':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Elevated Risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container border border-secondary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            Stable Track
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Sub-bar: Trauma-Informed Caseload Context & Jurisdiction */}
      <div className="w-full bg-surface-container-lowest px-6 py-4 rounded-xl shadow-sm border border-outline-variant/30">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">shield_person</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-base text-primary font-bold tracking-tight">One-Stop Crisis Center (OSC) — Case Workspace</span>
                <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-xs font-semibold">Secured Terminal</span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">District Jurisdictional Unit: Central Division | Protocol v4.2 Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-label-sm text-xs text-on-surface-variant">Confidential Record Auto-Lock:</span>
            <span className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-label-sm text-xs font-mono font-semibold">12:45 min</span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">sync</span>
                <span>Refresh Queue</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top Overview & Caseload KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant font-semibold">Active Survivors</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">supervisor_account</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-xl text-2xl text-primary font-bold">{victims.length}</span>
            <span className="font-label-sm text-xs text-secondary bg-surface-container-low px-2 py-0.5 rounded font-semibold">All Triaged</span>
          </div>
          <div className="mt-2 w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-xs text-error font-semibold">Urgent / Critical Risk</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-error-container flex items-center justify-center text-on-error-container">
              <span className="material-symbols-outlined text-lg">warning</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-xl text-2xl text-error font-bold">{criticalCount}</span>
            <span className="font-label-sm text-xs text-error bg-error-container px-2 py-0.5 rounded font-semibold">Immediate Outreach</span>
          </div>
          <div className="mt-2 w-full bg-error-container h-1.5 rounded-full overflow-hidden">
            <div className="bg-error h-full rounded-full" style={{ width: `${Math.min(100, (criticalCount / (victims.length || 1)) * 100)}%` }}></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant font-semibold">Elevated Cases</span>
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">gavel</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-xl text-2xl text-on-surface font-bold">{elevatedCount}</span>
            <span className="font-label-sm text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-semibold">Counselor Review</span>
          </div>
          <div className="mt-2 w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary-container h-full rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-xs text-on-surface-variant font-semibold">Stable Track</span>
            <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined text-lg">event_available</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-xl text-2xl text-secondary font-bold">{stableCount}</span>
            <span className="font-label-sm text-xs text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded font-semibold">Routine Watch</span>
          </div>
          <div className="mt-2 w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      </div>

      {/* Main Operational Workspace Grid */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
        {/* Queue Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-headline-sm text-lg text-primary font-bold">Triaged Caseload & Active Escalations</h2>
            <p className="font-body-sm text-xs text-on-surface-variant">Filtered priority index sorted by threat matrix & statutory legal deadlines.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30">
            <span className="material-symbols-outlined text-base text-on-surface-variant">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Case ID, name, district..."
              className="bg-transparent font-body-sm text-xs text-on-surface focus:outline-none placeholder:text-on-surface-variant w-48"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTierFilter('all')}
            className={`px-3 py-1 rounded-full font-label-sm text-xs transition-all cursor-pointer ${
              tierFilter === 'all' ? 'bg-primary-container text-on-primary font-semibold shadow-sm' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            All Cases ({victims.length})
          </button>
          <button
            onClick={() => setTierFilter('critical')}
            className={`px-3 py-1 rounded-full font-label-sm text-xs transition-all cursor-pointer ${
              tierFilter === 'critical' ? 'bg-error-container text-on-error-container font-semibold shadow-sm' : 'bg-surface-container text-on-surface hover:bg-error-container'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-error mr-1"></span>
            Critical / Urgent ({criticalCount})
          </button>
          <button
            onClick={() => setTierFilter('elevated')}
            className={`px-3 py-1 rounded-full font-label-sm text-xs transition-all cursor-pointer ${
              tierFilter === 'elevated' ? 'bg-amber-200 text-amber-900 font-semibold shadow-sm' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1"></span>
            Elevated ({elevatedCount})
          </button>
          <button
            onClick={() => setTierFilter('stable')}
            className={`px-3 py-1 rounded-full font-label-sm text-xs transition-all cursor-pointer ${
              tierFilter === 'stable' ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-secondary mr-1"></span>
            Stable ({stableCount})
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-outline-variant/30 rounded-lg">
          <table className="w-full text-left font-body-sm text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase tracking-wider border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-4">Victim & Community</th>
                <th className="py-3 px-4">Location & FIR</th>
                <th className="py-3 px-4">Triage Tier</th>
                <th className="py-3 px-4">Distress Score</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
              {filteredVictims.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-on-surface-variant font-body-sm">
                    No active cases found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredVictims.map((v) => {
                  const isSelected = selectedVictimId === v.victim_id;
                  const rawScore = v.current_risk_score ?? v.fused_risk_score ?? v.risk_score ?? 0;
                  const score = rawScore > 1 ? rawScore / 100 : rawScore;
                  return (
                    <tr
                      key={v.victim_id}
                      onClick={() => onSelectVictim && onSelectVictim(v.victim_id)}
                      className={`hover:bg-surface-container-low/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary-container/10 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary text-sm">{v.name || 'Anonymous Victim'}</span>
                          <span className="text-[11px] text-on-surface-variant font-mono">{v.victim_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-on-surface font-medium">{v.district || 'Patna, Bihar'}</span>
                          <span className="text-[11px] text-on-surface-variant">{v.fir_number || 'FIR-2026/312'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getTierBadge(v.current_risk_tier)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-surface-container h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(score * 100)}%`,
                                backgroundColor: score >= 0.75 ? '#ba1a1a' : score >= 0.4 ? '#d97706' : '#006a61'
                              }}
                            ></div>
                          </div>
                          <span className="font-mono text-xs font-bold text-on-surface">{(score * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <ChannelBadge channel={v.last_channel} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectVictim) onSelectVictim(v.victim_id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-container bg-surface-container px-2.5 py-1 rounded transition-colors"
                        >
                          <span>Inspect</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
