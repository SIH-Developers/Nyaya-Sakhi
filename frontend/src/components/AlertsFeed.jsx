import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, ArrowRight, UserCheck } from 'lucide-react';

export default function AlertsFeed({ alerts, onAcknowledgeAlert, onSelectVictim }) {
  const [notes, setNotes] = useState({});

  const handleNoteChange = (alertId, text) => {
    setNotes((prev) => ({ ...prev, [alertId]: text }));
  };

  const pendingAlerts = alerts.filter((a) => a.status === 'Pending');
  const resolvedAlerts = alerts.filter((a) => a.status !== 'Pending');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
          Real-Time Counselor Alert & Triage Feed
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          High-priority cases requiring mandatory human counselor acknowledgment and follow-up
        </p>
      </div>

      {/* Pending Alerts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px' }}>
        {pendingAlerts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--routine-green)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              All High-Risk Alerts Acknowledged
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No critical alerts pending counselor review at this time.
            </p>
          </div>
        ) : (
          pendingAlerts.map((alert) => {
            const isP1 = alert.priority === 'P1-CRITICAL';
            return (
              <div
                key={alert.alert_id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderLeft: `5px solid ${isP1 ? 'var(--urgent-red)' : 'var(--outreach-amber)'}`,
                  background: isP1 ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge ${isP1 ? 'badge-urgent' : 'badge-outreach'}`}>
                        <span className="pulse-dot" style={{ background: 'currentColor' }}></span>
                        {alert.priority}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {alert.alert_id}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
                      {alert.victim_name} ({alert.victim_id})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {alert.caste_category} • {alert.district}, {alert.state} • FIR: {alert.fir_number}
                    </p>
                  </div>

                  {/* Score & Action */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: isP1 ? 'var(--urgent-red)' : 'var(--outreach-amber)',
                      fontFamily: 'var(--font-display)'
                    }}>
                      {(alert.fused_risk_score * 100).toFixed(0)}%
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Score</p>
                  </div>
                </div>

                {/* Recommended Action */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px'
                }}>
                  <p style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
                    🎯 Recommended Action: {alert.recommended_action}
                  </p>
                  <ul style={{ marginTop: '8px', paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {alert.clinical_reasons && alert.clinical_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Counselor Response Input */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Enter counselor triage notes (e.g., Contacted via phone, assigned local legal aid)..."
                    value={notes[alert.alert_id] || ''}
                    onChange={(e) => handleNoteChange(alert.alert_id, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => onAcknowledgeAlert(alert.alert_id, notes[alert.alert_id] || 'Counselor acknowledged alert.')}
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <UserCheck size={16} /> Acknowledge & Deploy Action
                  </button>
                  <button
                    onClick={() => onSelectVictim(alert.victim_id)}
                    className="btn btn-secondary"
                  >
                    View History
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
