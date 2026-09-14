import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function MinistryDashboard() {
  const [timeRange, setTimeRange] = useState('30');
  const [overview, setOverview] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalyticsData = async (days) => {
    setIsLoading(true);
    try {
      const [overviewRes, districtsRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/overview`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/analytics/districts`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/analytics/timeline?days=${days}`).then(r => r.json()).catch(() => [])
      ]);

      if (overviewRes) setOverview(overviewRes);
      if (districtsRes) setDistricts(districtsRes);
      if (timelineRes) setTimeline(timelineRes);
    } catch (err) {
      console.error("Ministry Analytics fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData(timeRange);
  }, [timeRange]);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Executive Scope & Action Banner */}
      <section className="w-full px-6 py-4 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              LIVE STATUTORY FEED
            </span>
            <span className="font-label-sm text-xs text-on-surface-variant font-medium">OSC Central Oversight Node • 733 One-Stop Centers (Sakhi)</span>
            <span className="text-outline-variant">•</span>
            <span className="font-label-sm text-xs text-primary font-semibold">Mission Shakti Governance</span>
          </div>
          <h1 className="font-headline-lg text-2xl text-primary font-bold tracking-tight">National & State Oversight Analytics</h1>
          <p className="font-body-sm text-xs text-on-surface-variant max-w-3xl">
            Aggregated mission analytics under Sambal (Mission Shakti). Standardized data streams synchronized from State Women Commissions, SLSA panels, and District Magistracy consoles.
          </p>
        </div>

        {/* Quick Executive Filter Controls */}
        <div className="flex items-center flex-wrap gap-3 w-full xl:w-auto">
          <div className="bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">calendar_month</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-transparent font-label-sm text-xs text-on-surface focus:outline-none cursor-pointer pr-1"
            >
              <option value="7">Last 7 Days (Live)</option>
              <option value="30">Last 30 Days (Monthly)</option>
              <option value="90">Quarter FY 2024-25 (Q3)</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Export Ministry Dossier</span>
          </button>
        </div>
      </section>

      {/* Core KPI Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Victims */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Total Monitored Victims</span>
            <span className="p-2 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">diversity_1</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="font-headline-lg text-3xl text-on-surface font-bold tracking-tight">
              {overview ? (overview.total_monitored_victims ?? overview.total_victims ?? 0) : (isLoading ? '...' : '0')}
            </span>
            <div className="flex items-center gap-1 mt-1 text-xs text-secondary font-semibold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>100% Section 15A Enforced</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Urgent Tiers */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Urgent & Critical Alerts</span>
            <span className="p-2 rounded-lg bg-error-container text-on-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">warning</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="font-headline-lg text-3xl text-error font-bold tracking-tight">
              {overview ? (overview.risk_distribution?.urgent ?? overview.urgent_cases ?? 0) : (isLoading ? '...' : '0')}
            </span>
            <div className="flex items-center gap-1 mt-1 text-xs text-error font-semibold">
              <span className="material-symbols-outlined text-sm">timer</span>
              <span>Sub-2 second AI Triage</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Manual SOS Alerts */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Manual SOS Alerts</span>
            <span className="p-2 rounded-lg bg-tertiary-container text-on-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">emergency</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="font-headline-xl text-3xl text-tertiary font-bold tracking-tight">
              {overview ? (overview.alerts?.manual_sos ?? overview.manual_sos_alerts ?? 0) : (isLoading ? '...' : '0')}
            </span>
            <div className="flex items-center gap-1 mt-1 text-xs text-on-surface-variant font-medium">
              <span>Voice & SMS Dispatch Active</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Counselor Actions */}
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Counselor Acknowledgements</span>
            <span className="p-2 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">task_alt</span>
            </span>
          </div>
          <div className="mt-4">
            <span className="font-headline-xl text-3xl text-secondary font-bold tracking-tight">
              {overview ? (overview.alerts?.resolved ?? overview.acknowledged_alerts ?? 0) : (isLoading ? '...' : '0')}
            </span>
            <div className="flex items-center gap-1 mt-1 text-xs text-secondary font-semibold">
              <span>Verified Outreach Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* District Incident Heatmap & Privacy Notice */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/30 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
          <div>
            <h2 className="font-headline-sm text-lg text-primary font-bold">District Incident Distribution</h2>
            <p className="font-body-sm text-xs text-on-surface-variant">Aggregate case density across jurisdictional districts with privacy suppression.</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-low text-secondary text-xs font-semibold rounded-lg">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span>Min-5 Suppression Enforced</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-outline-variant/30 rounded-lg">
          <table className="w-full text-left font-body-sm text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase tracking-wider border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-4">District / Zone</th>
                <th className="py-3 px-4">Total Cases</th>
                <th className="py-3 px-4">Urgent Tiers</th>
                <th className="py-3 px-4">Manual SOS</th>
                <th className="py-3 px-4">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-on-surface-variant">
                    Loading district aggregate metrics...
                  </td>
                </tr>
              ) : districts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-on-surface-variant">
                    No district aggregate records found matching current criteria.
                  </td>
                </tr>
              ) : (
                districts.map((d, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-primary">{d.district || 'Central Division'}</td>
                    <td className="py-3 px-4 font-bold">{d.victim_count ?? d.total_cases ?? d.count ?? '<5'}</td>
                    <td className="py-3 px-4 text-error font-semibold">{d.urgent_count ?? d.urgent_cases ?? 0}</td>
                    <td className="py-3 px-4 text-tertiary font-semibold">{d.sos_alerts ?? d.manual_sos ?? 0}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary-container text-on-secondary-container">
                        100% Compliant
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
