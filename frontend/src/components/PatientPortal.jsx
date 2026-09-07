import React, { useState, useEffect } from 'react';
import {
  Shield, KeyRound, Mail, CheckCircle2, AlertCircle, PhoneCall,
  Heart, Send, LogOut, Clock, ArrowRight, RefreshCw, FileText
} from 'lucide-react';
import { API_BASE } from '../config';

export default function PatientPortal() {
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('patient_token') || null);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('identifier'); // 'identifier' | 'otp'
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Authenticated dashboard data
  const [dashboard, setDashboard] = useState(null);
  const [checkinText, setCheckinText] = useState('');
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(null);

  const fetchDashboard = async (token) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/patient/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to Patient Portal service.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionToken) {
      fetchDashboard(sessionToken);
    }
  }, [sessionToken]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setIsLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/patient/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      const data = await res.json();

      if (res.status === 429) {
        setErrorMsg("Too many attempts. Rate limit reached (max 3 per 15 mins). Please wait.");
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.detail || "Unable to find a profile with that ID or email.");
        return;
      }

      if (data.success) {
        setStatusMsg(data.message);
        setStep('otp');
      } else {
        setErrorMsg(data.message);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error requesting verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setIsLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/patient/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), otp: otp.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || "Invalid or expired verification code.");
        return;
      }

      if (data.success && data.token) {
        localStorage.setItem('patient_token', data.token);
        setSessionToken(data.token);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error verifying code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await fetch(`${API_BASE}/patient/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
      }
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('patient_token');
    setSessionToken(null);
    setDashboard(null);
    setStep('identifier');
    setOtp('');
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleSendCheckin = async (e) => {
    e.preventDefault();
    if (!checkinText.trim()) return;
    setIsSubmittingCheckin(true);
    setCheckinSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/patient/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ message: checkinText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setCheckinSuccess(data.message);
        setCheckinText('');
        fetchDashboard(sessionToken);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Unauthenticated Login Screen
  // ─────────────────────────────────────────────────────────────
  if (!sessionToken || !dashboard) {
    return (
      <div style={{ maxWidth: '480px', margin: '40px auto', padding: '0 16px' }}>
        <div className="glass-panel" style={{
          padding: '36px',
          background: 'rgba(17, 24, 39, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              borderRadius: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(79, 70, 229, 0.4)',
              marginBottom: '16px'
            }}>
              <Shield size={28} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Citizen & Case Portal
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              MoSJE NHAA 14566 • Secure, Confidential Case Status & Milestone Tracking
            </p>
          </div>

          {/* Feedback messages */}
          {statusMsg && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              color: '#34d399',
              fontSize: '0.82rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '0.82rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Identifier Input */}
          {step === 'identifier' ? (
            <form onSubmit={handleRequestOtp}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                  Victim ID or Registered Email
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '10px 14px'
                }}>
                  <Mail size={18} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="e.g. VIC-AMIT-102 or name@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                {isLoading ? <RefreshCw size={16} className="spin-anim" /> : <KeyRound size={16} />}
                Send Login Verification Code
              </button>
            </form>
          ) : (
            /* Step 2: OTP Verification */
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                  Enter 6-Digit Email Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '1.8rem',
                    letterSpacing: '8px',
                    fontWeight: 800,
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '2px solid #4f46e5',
                    borderRadius: '10px',
                    color: '#38bdf8',
                    outline: 'none'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                  Single-use code valid for 10 minutes. Delivered via Brevo Email.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setStep('identifier'); setOtp(''); }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isLoading ? <RefreshCw size={16} className="spin-anim" /> : <ArrowRight size={16} />}
                  Verify & Enter
                </button>
              </div>
            </form>
          )}

          {/* Privacy Note */}
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.4' }}>
              🔒 Protected under DPDP Act 2023 & SC/ST (PoA) Act 1989 Section 15A.<br />
              Emergency helpline: <strong>14566</strong> (Toll-Free 24x7)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Authenticated Patient Dashboard View
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 16px 40px 16px' }}>
      {/* Top Banner: Emergency Helplines Pinned */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.25) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '14px',
        padding: '16px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: '#dc2626',
            color: '#ffffff',
            padding: '8px',
            borderRadius: '10px'
          }}>
            <PhoneCall size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fca5a5' }}>
              Emergency Safety & Atrocity Helpline Support:
            </span>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '2px 0 0 0' }}>
              If you are facing active threats or danger, call immediately for statutory police intervention.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a
            href="tel:112"
            style={{
              background: '#dc2626',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            Police: 112
          </a>
          <a
            href="tel:14566"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            NHAA: 14566 (Toll-Free)
          </a>
        </div>
      </div>

      {/* Header Profile Bar */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Namaste, {dashboard.name_masked}
            </h1>
            <span style={{
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {dashboard.victim_id}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Active Case Monitoring • Section 15A Witness Protection
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Column: Visual Milestone Progress */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileText size={18} color="#38bdf8" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Legal Case Milestones
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Official trial and statutory relief progress under SC/ST (PoA) Act 1989
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {dashboard.case_milestones.map((m, idx) => {
              const isCompleted = m.status === 'completed';
              const isInProgress = m.status === 'in_progress';
              const isMonitored = m.status === 'monitored';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: isCompleted ? 'rgba(16, 185, 129, 0.08)' : (isInProgress ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.03)'),
                    border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.25)' : (isInProgress ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.06)')}`
                  }}
                >
                  <div style={{
                    marginTop: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isCompleted ? '#10b981' : (isInProgress ? '#6366f1' : '#334155'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                        {m.stage}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : (isInProgress ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)'),
                        color: isCompleted ? '#34d399' : (isInProgress ? '#a5b4fc' : '#94a3b8')
                      }}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      {m.details}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Proactive Check-in & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Check-in Widget */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Heart size={18} color="#ec4899" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                How are you feeling today?
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              You can check in anytime to update your support counselor on your well-being.
            </p>

            {checkinSuccess && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '0.8rem',
                marginBottom: '12px'
              }}>
                {checkinSuccess}
              </div>
            )}

            <form onSubmit={handleSendCheckin}>
              <textarea
                placeholder="Share anything on your mind — how you are coping, if you feel safe, or need assistance..."
                value={checkinText}
                onChange={(e) => setCheckinText(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: '10px'
                }}
              />
              <button
                type="submit"
                disabled={isSubmittingCheckin || !checkinText.trim()}
                style={{
                  float: 'right',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'var(--accent-indigo)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSubmittingCheckin ? <RefreshCw size={14} className="spin-anim" /> : <Send size={14} />}
                Send Check-in
              </button>
              <div style={{ clear: 'both' }}></div>
            </form>
          </div>

          {/* Safe Check-in History */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={18} color="#a855f7" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Recent Check-ins
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Log of your interactions across Telegram, SMS, WhatsApp, and Web Portal
            </p>

            {dashboard.checkin_history.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
                No past check-ins recorded yet. You can submit one above anytime!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dashboard.checkin_history.slice(0, 5).map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                        {new Date(log.date).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {log.channel}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      color: '#34d399',
                      fontWeight: 600
                    }}>
                      ✓ {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
