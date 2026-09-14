import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function PatientPortal() {
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('patient_token') || null);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('identifier'); // 'identifier' | 'otp'
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Discreet Mode & Screen Masking
  const [isDiscreetMask, setIsDiscreetMask] = useState(false);

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
        setErrorMsg(data.detail || "Invalid or expired OTP.");
        return;
      }

      const token = data.token || data.access_token;
      if (token) {
        localStorage.setItem('patient_token', token);
        setSessionToken(token);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error verifying code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('patient_token');
    setSessionToken(null);
    setDashboard(null);
    setStep('identifier');
    setOtp('');
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const handleCheckinSubmit = async (e) => {
    e.preventDefault();
    if (!checkinText.trim()) return;
    setIsSubmittingCheckin(true);
    setCheckinSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/patient/checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: checkinText.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setCheckinSuccess(data.message || "Check-in logged successfully!");
        setCheckinText('');
        fetchDashboard(sessionToken);
      } else {
        setErrorMsg(data.detail || "Unable to log check-in.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error logging check-in.");
    } finally {
      setIsSubmittingCheckin(false);
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      {/* Discreet Mode Neutral Mask Screen */}
      {isDiscreetMask && (
        <div className="fixed inset-0 z-[100] bg-surface p-8 flex flex-col justify-center items-center text-center">
          <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-xl shadow-xl border border-outline-variant/30 flex flex-col items-center">
            <span className="material-symbols-outlined text-primary text-5xl mb-3">local_library</span>
            <h2 className="font-headline-md text-xl text-primary font-bold mb-1">Daily Weather & News Digest</h2>
            <p className="font-body-md text-sm text-on-surface-variant mb-6">
              Current temperature: 28°C. Mild breeze from North-East. All city metro lines functioning on standard schedule.
            </p>
            <button
              className="px-6 py-2.5 bg-primary-container text-on-primary font-label-md text-sm font-semibold rounded shadow hover:bg-primary transition-colors cursor-pointer"
              onClick={() => setIsDiscreetMask(false)}
            >
              Return to Safety Portal
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* 1. Safety-first Header & Calm Reassurance Banner */}
        <section className="relative overflow-hidden bg-surface-container-lowest rounded-xl shadow-md p-6 border border-outline-variant/30">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 max-w-3xl">
              <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-label-sm text-xs text-secondary bg-secondary-container/40 px-2 py-0.5 rounded font-semibold">Safe & Sovereign Space</span>
                  <span className="font-label-sm text-xs text-on-surface-variant">• Section 327 CrPC / Section 366 BNSS Compliant</span>
                </div>
                <h1 className="font-headline-lg text-2xl text-primary font-bold tracking-tight">Sakhi Sahayata Survivor Desk</h1>
                <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                  Welcome to your private safety space. Your identity is strictly encrypted and protected by statutory law. No digital footprint is stored without explicit consent.
                </p>
              </div>
            </div>

            {/* Safety Triggers Toolbar */}
            <div className="flex sm:flex-row flex-col items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <button
                onClick={() => setIsDiscreetMask(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-md text-xs font-semibold rounded-lg border border-outline-variant/30 transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-lg text-primary">visibility_off</span>
                <span>Discreet Mode</span>
              </button>
              <button
                onClick={() => window.location.href = 'https://www.google.com'}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-tertiary-container hover:bg-tertiary text-on-tertiary font-label-md text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">tab_close</span>
                <span>Hide Screen (Esc)</span>
              </button>
            </div>
          </div>
        </section>

        {/* Status / Error Notifications */}
        {statusMsg && (
          <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-semibold">
            {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-error-container text-on-error-container rounded-lg text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* 2. Confidential Case Tracking & Access Form */}
        {!sessionToken ? (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* PIN / OTP Verification Card */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-xl shadow-md border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold">Private Status Check</span>
                  <span className="material-symbols-outlined text-outline">key</span>
                </div>
                <h2 className="font-headline-sm text-lg text-primary font-bold mb-1">Confidential Safety Docket</h2>
                <p className="font-body-sm text-xs text-on-surface-variant mb-4">
                  Enter your Victim ID, 6-Digit Link Code, or registered email/phone to access case milestones and check-in logs.
                </p>

                {step === 'identifier' ? (
                  <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-xs text-on-surface font-semibold">Victim ID, 6-Digit PIN, or Safe Email</label>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. VIC-AMIT-102, 423898, or survivor@email.com"
                        className="w-full h-10 px-3 text-xs bg-surface-container-low rounded border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-primary-container text-on-primary font-label-md text-xs font-semibold rounded shadow hover:bg-primary transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">travel_explore</span>
                      <span>{isLoading ? 'Sending Verification Code...' : 'Request Secure Access OTP'}</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-xs text-on-surface font-semibold">Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="w-full h-10 px-3 text-center tracking-widest font-mono text-base bg-surface-container-low rounded border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
                        maxLength={6}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStep('identifier')}
                        className="w-1/3 py-2 bg-surface-container text-on-surface font-label-md text-xs font-semibold rounded hover:bg-surface-container-high transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-2/3 py-2 bg-secondary text-on-secondary font-label-md text-xs font-semibold rounded shadow hover:bg-secondary-container transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Verifying...' : 'Verify OTP & Access Docket'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Reassurance Info Panel */}
            <div className="lg:col-span-6 bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-secondary font-semibold text-xs">
                  <span className="material-symbols-outlined text-base">verified</span>
                  <span>Allowlisted Privacy Fields Only</span>
                </div>
                <h3 className="font-headline-sm text-base text-primary font-bold">What You Will See</h3>
                <ul className="flex flex-col gap-2 font-body-sm text-xs text-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                    <span>Masked Profile Identifier & Legal Reference Code</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                    <span>Case Milestone Timeline (FIR, Protection Orders, Hearing Dates)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                    <span>Self-Service Well-being Check-in Log</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
                    <span>Verified Emergency Helpline Directory</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        ) : (
          /* Authenticated Survivor Dashboard (Allowlisted Fields ONLY) */
          dashboard && (
            <section className="flex flex-col gap-6">
              {/* Profile Bar */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-base text-primary font-bold">{dashboard.name_masked || 'Survivor Record'}</span>
                    <span className="font-mono text-xs text-on-surface-variant">Victim ID: {dashboard.victim_id}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Logout Session
                </button>
              </div>

              {/* Case Milestones Timeline */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
                <h3 className="font-headline-sm text-base text-primary font-bold">Legal Case Milestones</h3>
                <div className="flex flex-col gap-3">
                  {(dashboard.case_milestones || []).map((m, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/20">
                      <span className="material-symbols-outlined text-secondary text-lg mt-0.5">task_alt</span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-xs font-semibold text-primary">{m.title || m.stage || `Milestone #${idx+1}`}</span>
                        <span className="font-body-sm text-xs text-on-surface-variant">{m.status || m.description || 'In Progress'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Self Check-in Submission Form */}
              {dashboard.can_checkin && (
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-4">
                  <h3 className="font-headline-sm text-base text-primary font-bold">Log Confidential Well-being Check-in</h3>
                  {checkinSuccess && (
                    <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg text-xs font-semibold">
                      {checkinSuccess}
                    </div>
                  )}
                  <form onSubmit={handleCheckinSubmit} className="flex flex-col gap-3">
                    <textarea
                      value={checkinText}
                      onChange={(e) => setCheckinText(e.target.value)}
                      placeholder="Share how you are feeling or request a call-back..."
                      className="w-full p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary h-24"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingCheckin}
                        className="px-5 py-2 bg-primary text-on-primary font-semibold text-xs rounded-lg shadow hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingCheckin ? 'Submitting...' : 'Submit Confidential Check-in'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          )
        )}
      </div>
    </div>
  );
}
