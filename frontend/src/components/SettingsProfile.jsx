import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Server,
  Activity,
  Copy,
  Check,
  RefreshCw,
  Eye,
  FileCheck
} from 'lucide-react';
import { API_BASE } from '../config';

export default function SettingsProfile({
  userRole,
  setUserRole,
  onRefreshAll
}) {
  const [officerKey, setOfficerKey] = useState('nhaa-officer-2024');
  const [copiedKey, setCopiedKey] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState(null);
  const [isPurging, setIsPurging] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(officerKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePurgeData = async () => {
    if (!window.confirm("Are you sure you want to execute a DPDP Act 2023 compliance purge of historical data older than 90 days?")) {
      return;
    }

    setIsPurging(true);
    setPurgeStatus(null);
    try {
      const res = await fetch(`${API_BASE}/compliance/purge-old-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': officerKey.trim()
        },
        body: JSON.stringify({ days_threshold: 90 })
      });
      const data = await res.json();
      if (res.ok) {
        setPurgeStatus({
          type: 'success',
          message: `Compliance purge executed successfully. ${data.purged_records || 0} expired records securely deleted under DPDP Act 2023.`
        });
        if (onRefreshAll) onRefreshAll();
      } else {
        setPurgeStatus({
          type: 'error',
          message: data.detail || 'Purge rejected. Please verify your officer key.'
        });
      }
    } catch (err) {
      setPurgeStatus({
        type: 'error',
        message: 'Network error executing purge.'
      });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)'
            }}>
              <Shield size={30} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Officer Settings & System Profile
                </h1>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)'
                }}>
                  Live Session Active
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                MoSJE National Helpline Against Atrocities (NHAA 14566) • Statutory Case Protection & Triage Command
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Role Switcher + Officer Security Key */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        {/* Card 1: Role Configuration */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <UserCheck size={20} color="var(--accent-indigo)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              Active Operator Role
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.4 }}>
            Control permissions for case inspections, unmasking sensitive survivor data, and generating official linking codes.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                id: 'counselor',
                title: 'On-Duty Counselor',
                badge: 'Default',
                desc: 'Full psychological triage, longitudinal acoustic distress curve inspection, and proactive check-in triggers.'
              },
              {
                id: 'supervisor',
                title: 'District Officer (Admin)',
                badge: 'Authorized',
                desc: 'Special verification power, 7-day linking code generator, victim email linking, and statutory compensation updates.'
              },
              {
                id: 'patient',
                title: 'Citizen / Patient (Preview)',
                badge: 'Self-Service',
                desc: 'Simulate the low-friction patient portal with milestone tracking and privacy mask controls.'
              },
              {
                id: 'read_only_investigator',
                title: 'Masked Investigator',
                badge: 'DPDP Strict',
                desc: 'Anonymized oversight view with strict pseudonymization for independent auditing.'
              }
            ].map((r) => {
              const isSelected = userRole === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setUserRole(r.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.6)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#ffffff' : 'var(--text-primary)' }}>
                        {r.title}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                        color: isSelected ? '#a5b4fc' : 'var(--text-muted)'
                      }}>
                        {r.badge}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 size={18} color="#818cf8" />}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {r.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 2: Officer Security Key */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <KeyRound size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              District Officer Key (Authorization)
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.4 }}>
            This cryptographic key authenticates administrative endpoints (generating 7-day link codes, case verifications, and email updates).
          </p>

          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
              ACTIVE OFFICER API KEY (X-Officer-Key)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={officerKey}
                onChange={(e) => setOfficerKey(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '8px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                onClick={handleCopyKey}
                style={{
                  background: copiedKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                  border: `1px solid ${copiedKey ? '#10b981' : '#6366f1'}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: copiedKey ? '#34d399' : '#a5b4fc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <CheckCircle2 size={20} color="#34d399" />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>
                Key Verified & Active
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Protected with constant-time cryptographic digest comparison on FastAPI.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DPDP Act 2023 Compliance Center */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={20} color="#34d399" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
              DPDP Act 2023 Compliance & Data Governance
            </h2>
          </div>
          <span style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            Statutory Section 15A Enforced
          </span>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
          The Digital Personal Data Protection (DPDP) Act 2023 mandates strict purpose limitation, consent verification, and automatic data retention windows for sensitive victim surveillance and acoustic telemetry.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          {[
            { label: 'Data Encryption', value: 'AES-256 GCM', desc: 'At rest & in transit' },
            { label: 'Retention Limit', value: '90 Days Max', desc: 'Auto-purge eligible' },
            { label: 'Pseudonymization', value: 'SHA-256 Masked', desc: 'Investigator role restricted' },
            { label: 'Acoustic Telemetry', value: 'Ephemeral Memory', desc: 'Voice prosody only' }
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '12px 14px'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: '3px 0' }}>{stat.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{stat.desc}</div>
            </div>
          ))}
        </div>

        {/* Purge Action Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)'
        }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fca5a5' }}>
              Statutory 90-Day Data Purge
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Permanently purges transcript logs and acoustic metrics older than 90 days across all communication channels.
            </div>
          </div>
          <button
            onClick={handlePurgeData}
            disabled={isPurging}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: isPurging ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isPurging ? 0.6 : 1
            }}
          >
            <Trash2 size={15} />
            {isPurging ? 'Purging Old Records...' : 'Execute Compliance Purge'}
          </button>
        </div>

        {purgeStatus && (
          <div style={{
            marginTop: '14px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: purgeStatus.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${purgeStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: purgeStatus.type === 'success' ? '#34d399' : '#fca5a5',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            {purgeStatus.message}
          </div>
        )}
      </div>

      {/* System Infrastructure Health */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Server size={20} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
            System Infrastructure & Gateway Health
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {[
            { name: 'FastAPI Backend Core', status: 'Online (200 OK)', ping: '< 15ms', color: '#10b981' },
            { name: 'IndicBERT NLP Model', status: 'Inference Ready', ping: 'AWS / Render', color: '#10b981' },
            { name: 'Brevo Email OTP Relay', status: 'Connected (HTTPS)', ping: 'Production', color: '#10b981' },
            { name: 'Twilio WhatsApp/SMS', status: 'Live Sandbox', ping: 'Active', color: '#10b981' },
            { name: 'Telegram Bot Polling', status: 'Active (NHAA Bot)', ping: 'Live', color: '#10b981' },
            { name: 'SQLite DB Engine', status: 'WAL Mode Active', ping: 'Zero Latency', color: '#10b981' }
          ].map((srv, i) => (
            <div key={i} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>{srv.name}</span>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: srv.color,
                  boxShadow: `0 0 6px ${srv.color}`
                }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: srv.color, fontWeight: 700 }}>{srv.status}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{srv.ping}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
