import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

const REFRESH_MS = 60000;
const C = {
  urgent:'#ef5350', outreach:'#ffa726', watch:'#42a5f5', routine:'#66bb6a',
  sos:'#e53935', nlp:'#5c6bc0', resolved:'#26a69a',
  border:'rgba(255,255,255,0.08)', surface:'rgba(255,255,255,0.04)',
  text:'#e8eaf6', muted:'rgba(232,234,246,0.55)',
};
const fmt = n => (n ?? 0).toLocaleString('en-IN');
const pct = (p, t) => (t ? Math.round((p / t) * 100) : 0);

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background:C.surface, borderRadius:14, padding:'20px 24px',
      border:`1px solid ${C.border}`, flex:'1 1 160px', minWidth:140 }}>
      <div style={{ fontSize:'2rem', fontWeight:800, color:color||C.text }}>{fmt(value)}</div>
      <div style={{ fontWeight:600, color:C.text, marginTop:2, fontSize:'0.9rem' }}>{label}</div>
      {sub && <div style={{ color:C.muted, fontSize:'0.75rem', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function RiskBar({ dist }) {
  const total = Object.values(dist).reduce((a,b)=>a+b,0) || 1;
  const segs = [
    {key:'urgent',label:'Urgent',color:C.urgent},
    {key:'counselor_outreach',label:'Outreach',color:C.outreach},
    {key:'watch',label:'Watch',color:C.watch},
    {key:'routine',label:'Routine',color:C.routine},
  ];
  return (
    <div>
      <div style={{ display:'flex', height:28, borderRadius:8, overflow:'hidden', marginBottom:10 }}>
        {segs.map(s => (
          <div key={s.key}
            style={{ width:`${pct(dist[s.key]||0, total)}%`, background:s.color, transition:'width 0.6s' }}
            title={`${s.label}: ${dist[s.key]||0}`}
          />
        ))}
      </div>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        {segs.map(s => (
          <span key={s.key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', color:C.muted }}>
            <span style={{ width:10, height:10, borderRadius:2, background:s.color, display:'inline-block' }}/>
            {s.label}: <strong style={{ color:C.text }}>{dist[s.key]||0}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data, valueKey, color='#5c6bc0', height=80 }) {
  if (!data || data.length < 2) return (
    <div style={{ color:C.muted, fontSize:'0.78rem', padding:8 }}>
      Insufficient data (min 5/day privacy threshold)
    </div>
  );
  const vals = data.map(d => d[valueKey] || 0);
  const max = Math.max(...vals, 1);
  const w = 600, h = height;
  const pts = vals.map((v, i) =>
    `${(i / (vals.length - 1)) * w},${h - (v / max) * h}`
  ).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}22`} stroke="none"/>
    </svg>
  );
}

function DistrictTable({ rows }) {
  if (!rows || !rows.length) return (
    <div style={{ padding:'24px', textAlign:'center', color:C.muted, fontSize:'0.85rem' }}>
      No districts meet the minimum count threshold (5 victims required).
      <br/><span style={{ fontSize:'0.75rem' }}>This is by design — privacy protection.</span>
    </div>
  );
  const cols = ['District','State','Victims','Avg Risk','Urgent','Outreach','Alerts','SOS'];
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
        <thead>
          <tr style={{ borderBottom:`1px solid ${C.border}` }}>
            {cols.map(h => (
              <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:C.muted, fontWeight:600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom:`1px solid ${C.border}`, background:i%2?C.surface:'transparent' }}>
              <td style={{ padding:'9px 12px', color:C.text, fontWeight:600 }}>{r.district}</td>
              <td style={{ padding:'9px 12px', color:C.muted }}>{r.state}</td>
              <td style={{ padding:'9px 12px', color:C.text }}>{r.victim_count}</td>
              <td style={{ padding:'9px 12px' }}>
                <span style={{ color:r.avg_risk_score>0.7?C.urgent:r.avg_risk_score>0.4?C.outreach:C.routine, fontWeight:700 }}>
                  {(r.avg_risk_score * 100).toFixed(1)}%
                </span>
              </td>
              <td style={{ padding:'9px 12px', color:C.urgent }}>{r.urgent_count}</td>
              <td style={{ padding:'9px 12px', color:C.outreach }}>{r.outreach_count}</td>
              <td style={{ padding:'9px 12px', color:C.muted }}>{r.total_alerts}</td>
              <td style={{ padding:'9px 12px', color:r.sos_alerts>0?C.sos:C.muted, fontWeight:r.sos_alerts>0?700:400 }}>
                {r.sos_alerts > 0 ? `SOS ${r.sos_alerts}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MinistryDashboard() {
  const [overview,  setOverview]  = useState(null);
  const [districts, setDistricts] = useState([]);
  const [timeline,  setTimeline]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [days, setDays] = useState(30);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ov, dist, tl] = await Promise.all([
        fetch(`${API_BASE}/analytics/overview`).then(r => r.json()),
        fetch(`${API_BASE}/analytics/districts`).then(r => r.json()),
        fetch(`${API_BASE}/analytics/timeline?days=${days}`).then(r => r.json()),
      ]);
      setOverview(ov); setDistricts(dist); setTimeline(tl);
      setLastUpdated(new Date());
    } catch (e) {
      setError('Failed to load analytics. Check your connection.');
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const card = {
    background:'rgba(255,255,255,0.03)', borderRadius:16,
    border:`1px solid ${C.border}`, padding:24, marginBottom:24,
  };

  if (loading && !overview) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400, color:C.muted }}>
      Loading Ministry Analytics...
    </div>
  );
  if (error) return (
    <div style={{ padding:32, color:'#ef5350', background:'rgba(239,83,80,0.08)', borderRadius:12, margin:24 }}>
      {error}
      <button onClick={fetchAll} style={{ marginLeft:16, background:'#ef5350', color:'#fff', border:'none', borderRadius:6, padding:'4px 14px', cursor:'pointer' }}>
        Retry
      </button>
    </div>
  );

  const { risk_distribution:dist={}, alerts={}, total_monitored_victims=0, total_interactions=0 } = overview || {};

  return (
    <div style={{ padding:'4px 0', maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800, color:C.text }}>
            Ministry Analytics Dashboard
          </h1>
          <p style={{ margin:'4px 0 0', color:C.muted, fontSize:'0.82rem' }}>
            MoSJE / NHAA 14566 — Aggregate-only view · Privacy-safe · No individual victim data
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString('en-IN')}`}
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            style={{ background:C.surface, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:'6px 12px', fontSize:'0.82rem' }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={fetchAll}
            style={{ background:'rgba(92,107,192,0.2)', border:'1px solid rgba(92,107,192,0.4)', color:'#9fa8da', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:'0.82rem' }}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Privacy notice */}
      <div style={{ background:'rgba(92,107,192,0.08)', border:'1px solid rgba(92,107,192,0.25)', borderRadius:10, padding:'10px 16px', marginBottom:24, fontSize:'0.78rem', color:'#9fa8da' }}>
        Privacy safeguard active: Districts with fewer than 5 victims are automatically suppressed.
        Aggregate counts only — no names, case numbers, or identifiable data.
      </div>

      {/* KPI row */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:24 }}>
        <KpiCard label="Monitored Victims"  value={total_monitored_victims} color={C.text}/>
        <KpiCard label="Urgent Cases"       value={dist.urgent}             color={C.urgent}   sub="Active P1-CRITICAL"/>
        <KpiCard label="Outreach Cases"     value={dist.counselor_outreach} color={C.outreach} sub="P2-HIGH follow-up"/>
        <KpiCard label="Total Interactions" value={total_interactions}       color={C.watch}/>
        <KpiCard label="Manual SOS Alerts"  value={alerts.manual_sos}       color={C.sos}      sub="Panic button presses"/>
        <KpiCard label="NLP-Detected"       value={alerts.nlp_detected}     color={C.nlp}      sub="Auto-escalated by AI"/>
        <KpiCard label="Resolution Rate"    value={`${alerts.resolution_rate??0}%`} color={C.resolved} sub={`${alerts.resolved||0}/${alerts.total||0} resolved`}/>
      </div>

      {/* Risk bar */}
      <div style={card}>
        <h2 style={{ margin:'0 0 16px', fontSize:'1rem', fontWeight:700, color:C.text }}>Risk Distribution</h2>
        <RiskBar dist={dist}/>
      </div>

      {/* Alert origin */}
      <div style={{ ...card }}>
        <h2 style={{ margin:'0 0 16px', fontSize:'1rem', fontWeight:700, color:C.text }}>Alert Origin</h2>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {[
            {label:'SOS Manual',    value:alerts.manual_sos||0,   color:C.sos,      note:'Panic button'},
            {label:'NLP-Detected',  value:alerts.nlp_detected||0, color:C.nlp,      note:'AI escalation'},
            {label:'Resolved',      value:alerts.resolved||0,     color:C.resolved,  note:'Acknowledged'},
          ].map(item => (
            <div key={item.label} style={{ flex:'1 1 140px', background:C.surface, borderRadius:10, padding:'14px 16px', border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:'1.6rem', fontWeight:800, color:item.color }}>{fmt(item.value)}</div>
              <div style={{ color:C.text, fontSize:'0.82rem', fontWeight:600, marginTop:2 }}>{item.label}</div>
              <div style={{ color:C.muted, fontSize:'0.72rem' }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interaction sparkline */}
      <div style={card}>
        <h2 style={{ margin:'0 0 6px', fontSize:'1rem', fontWeight:700, color:C.text }}>Daily Interaction Trend — last {days} days</h2>
        <div style={{ color:C.muted, fontSize:'0.75rem', marginBottom:12 }}>Days with fewer than 5 interactions are hidden</div>
        <Sparkline data={timeline} valueKey="interactions" color={C.watch} height={100}/>
      </div>

      {/* 3-column sparklines */}
      <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
        {[
          {title:'Daily Alerts',        key:'alerts',       color:C.outreach},
          {title:'Daily SOS Presses',   key:'sos',          color:C.sos},
          {title:'Avg Daily Risk Score', key:'avg_risk',    color:C.urgent},
        ].map(s => (
          <div key={s.key} style={{ ...card, flex:'1 1 280px', marginBottom:20 }}>
            <h2 style={{ margin:'0 0 6px', fontSize:'1rem', fontWeight:700, color:C.text }}>{s.title}</h2>
            <Sparkline data={timeline} valueKey={s.key} color={s.color} height={80}/>
          </div>
        ))}
      </div>

      {/* District table */}
      <div style={card}>
        <h2 style={{ margin:'0 0 6px', fontSize:'1rem', fontWeight:700, color:C.text }}>District-Level Breakdown</h2>
        <div style={{ color:C.muted, fontSize:'0.75rem', marginBottom:16 }}>Only districts with 5+ monitored victims shown.</div>
        <DistrictTable rows={districts}/>
      </div>

      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16, marginTop:8, fontSize:'0.72rem', color:C.muted, textAlign:'center' }}>
        Ministry of Social Justice and Empowerment (MoSJE) | NHAA 14566 | SIH 26094 | DPDP Act 2023 Compliant
      </div>
    </div>
  );
}
