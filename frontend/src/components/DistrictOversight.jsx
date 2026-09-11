import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function DistrictOversight({ victims = [], onRefreshData }) {
  const [selectedVictimId, setSelectedVictimId] = useState(null);
  const [firInput, setFirInput] = useState('');
  const [districtInput, setDistrictInput] = useState('South Delhi');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingVictims = victims.filter(v => v.registration_status === 'self_registered_pending_verification');

  const handleVerifyVictim = async (victimId) => {
    if (!firInput.trim()) {
      setActionMsg({ type: 'error', text: 'Please enter an official FIR Number to verify.' });
      return;
    }
    setIsSubmitting(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/victim/${victimId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': 'nhaa-officer-2024'
        },
        body: JSON.stringify({
          fir_number: firInput.trim(),
          district: districtInput.trim() || 'Central Delhi'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg({ type: 'success', text: `✅ Record ${victimId} verified & attached to FIR ${firInput}!` });
        setFirInput('');
        if (onRefreshData) onRefreshData();
      } else {
        setActionMsg({ type: 'error', text: data.detail || 'Failed to verify record.' });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setActionMsg({ type: 'error', text: 'Network error during verification.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateLinkCode = async (victimId) => {
    setIsSubmitting(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/case/generate-link-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-officer-key': 'nhaa-officer-2024'
        },
        body: JSON.stringify({ victim_id: victimId })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedCode(data.link_code);
        setActionMsg({ type: 'success', text: `🔑 6-Digit Link Code ${data.link_code} generated (valid for 7 days)!` });
      } else {
        setActionMsg({ type: 'error', text: data.detail || 'Failed to generate code.' });
      }
    } catch (err) {
      console.error("Link code error:", err);
      setActionMsg({ type: 'error', text: 'Network error generating code.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* TOP BANNER: DISTRICT EXECUTIVE & STATUTORY OVERSIGHT */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4 border border-outline-variant/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline-md text-lg text-primary font-bold tracking-tight">District Magistrate & Protection Officer Oversight</span>
                <span className="font-label-sm text-xs text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded uppercase font-semibold">Jurisdiction: Tier-1</span>
                <span className="font-label-sm text-xs text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded font-mono">DL-SD-PWDVA-09</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant font-body-sm text-xs mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary">badge</span>
                  <strong>Designated Protection Officer:</strong> Smt. Rajeshwari Iyer, IAS
                </span>
                <span className="text-outline-variant">|</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-secondary">gavel</span>
                  Court Liaison: Saket District Court
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Inter-Agency Deploy Notice dispatched to District Police HQ & Legal Aid Panel.")}
              className="inline-flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-base">local_police</span>
              <span>Deploy Inter-Agency Notice</span>
            </button>
          </div>
        </div>

        {/* SLA Urgency Banner */}
        <div className="bg-tertiary-fixed/70 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 border border-tertiary/20">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-tertiary"></span>
            </span>
            <span className="material-symbols-outlined text-tertiary text-xl">gavel</span>
            <p className="font-label-md text-xs text-on-tertiary-fixed-variant">
              <strong>Urgent Statutory Notice:</strong> {pendingVictims.length} Pending Verifications requiring District Officer sign-off (&lt; 24h statutory deadline).
            </p>
          </div>
        </div>
      </section>

      {/* INTER-AGENCY COORDINATION STATS */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Police Coordination */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Police Coordination</span>
              <span className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-lg">policy</span>
              </span>
            </div>
            <div className="font-headline-xl text-2xl text-primary font-bold">42 FIRs</div>
            <p className="font-title-md text-xs text-on-surface mt-1">Zero-FIR / PWDVA Track</p>
          </div>
          <div className="mt-3 text-xs text-secondary font-semibold">90.4% verified on-track</div>
        </div>

        {/* Free Legal Aid Panel */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-semibold">DLSA Legal Panel</span>
              <span className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-lg">balance</span>
              </span>
            </div>
            <div className="font-headline-xl text-2xl text-primary font-bold">51 Panelists</div>
            <p className="font-title-md text-xs text-on-surface mt-1">Free Advocates Empanelled</p>
          </div>
          <div className="mt-3 text-xs text-secondary font-semibold">98% 24h Allocation SLA</div>
        </div>

        {/* Protection Orders */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Protection Orders</span>
              <span className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-lg">verified</span>
              </span>
            </div>
            <div className="font-headline-xl text-2xl text-primary font-bold">19 Issued</div>
            <p className="font-title-md text-xs text-on-surface mt-1">Section 18 PWDVA Track</p>
          </div>
          <div className="mt-3 text-xs text-secondary font-semibold">100% In-Force Enforcement</div>
        </div>

        {/* Relief Fund */}
        <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Statutory Relief</span>
              <span className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-lg">payments</span>
              </span>
            </div>
            <div className="font-headline-xl text-2xl text-secondary font-bold">₹14.2 Lakhs</div>
            <p className="font-title-md text-xs text-on-surface mt-1">Compensation Disbursed</p>
          </div>
          <div className="mt-3 text-xs text-secondary font-semibold">Direct DBTL Transfer</div>
        </div>
      </section>

      {/* PENDING VERIFICATION & LINK CODE GENERATION WORKSPACE */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/30 flex flex-col gap-4">
        <div>
          <h2 className="font-headline-sm text-lg text-primary font-bold">Pending Registrations & Link Code Generator</h2>
          <p className="font-body-sm text-xs text-on-surface-variant">Review self-registered victims, verify official FIR numbers, and issue 7-Day Access PINs.</p>
        </div>

        {actionMsg && (
          <div className={`p-3 rounded-lg text-xs font-semibold ${
            actionMsg.type === 'success' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'
          }`}>
            {actionMsg.text}
          </div>
        )}

        <div className="overflow-x-auto border border-outline-variant/30 rounded-lg">
          <table className="w-full text-left font-body-sm text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase tracking-wider border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-4">Victim Identifier</th>
                <th className="py-3 px-4">Name / Alias</th>
                <th className="py-3 px-4">Registration Status</th>
                <th className="py-3 px-4">FIR Number</th>
                <th className="py-3 px-4 text-right">District Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
              {victims.map((v) => {
                const isPending = v.registration_status === 'self_registered_pending_verification';
                const isSelected = selectedVictimId === v.victim_id;
                return (
                  <tr key={v.victim_id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-primary font-semibold">{v.victim_id}</td>
                    <td className="py-3 px-4 font-semibold text-on-surface">{v.name}</td>
                    <td className="py-3 px-4">
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          Pending Verification
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary-container text-on-secondary-container">
                          Verified & Lodged
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">{v.fir_number || 'Pending Input'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedVictimId(v.victim_id); handleGenerateLinkCode(v.victim_id); }}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-variant text-primary font-semibold rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Generate PIN
                        </button>

                        {isPending && (
                          <button
                            onClick={() => setSelectedVictimId(v.victim_id)}
                            className="px-2.5 py-1 bg-primary text-on-primary hover:bg-primary-container font-semibold rounded text-xs transition-colors cursor-pointer"
                          >
                            Verify & FIR
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Verification Action Drawer / Form */}
        {selectedVictimId && (
          <div className="mt-4 p-4 bg-surface-container-low rounded-xl border border-primary/30 flex flex-col gap-3">
            <h3 className="font-headline-sm text-sm text-primary font-bold">
              Verify Victim: <span className="font-mono">{selectedVictimId}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={firInput}
                onChange={(e) => setFirInput(e.target.value)}
                placeholder="Enter Official FIR Number (e.g. FIR-2026/894)"
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded text-xs text-on-surface focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={districtInput}
                onChange={(e) => setDistrictInput(e.target.value)}
                placeholder="District (e.g. South Delhi)"
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setSelectedVictimId(null)}
                className="px-3 py-1.5 rounded text-xs font-medium text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyVictim(selectedVictimId)}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-primary text-on-primary font-semibold rounded text-xs hover:bg-primary-container shadow cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Confirm Verification & Attach FIR'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
