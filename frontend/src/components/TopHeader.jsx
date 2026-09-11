import React from 'react';
import { Shield, PhoneCall, AlertTriangle, Globe, LogOut, UserCheck } from 'lucide-react';

export default function TopHeader({
  userRole,
  setUserRole,
  onRefresh,
  isRefreshing,
  alertsCount = 0,
  onOpenAlerts,
  onQuickExit
}) {
  const roleDisplayNames = {
    counselor: 'Authorized Counselor',
    supervisor: 'District Magistrate / Officer',
    patient: 'Citizen / Survivor',
    read_only_investigator: 'Masked Investigator'
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/30">
      <div className="h-16 w-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left Emblem & Ministry Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary font-bold shadow-sm">
            <span className="material-symbols-outlined text-2xl">balance</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-lg text-primary leading-tight font-bold tracking-tight">Nyaya-Sakhi</span>
              <span className="text-[10px] bg-primary-container/20 text-primary px-1.5 py-0.5 rounded font-mono font-semibold">MoSJE • 14566</span>
            </div>
            <span className="font-label-sm text-xs text-on-surface-variant hidden sm:inline">
              Government of India | Ministry of Women & Child Development
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Lifelines */}
          <div className="hidden xl:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-sm">support_agent</span>
              <span className="font-label-sm text-xs text-on-surface-variant">Women Helpline:</span>
              <a className="font-label-sm text-xs text-secondary hover:underline font-bold" href="tel:181">181</a>
            </div>
            <span className="text-outline-variant text-xs">|</span>
            <div class="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-error text-sm">emergency</span>
              <span className="font-label-sm text-xs text-on-surface-variant">Emergency:</span>
              <a className="font-label-sm text-xs text-error hover:underline font-bold" href="tel:112">112</a>
            </div>
            <span className="text-outline-variant text-xs">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-label-sm text-xs text-primary font-bold">NHAA:</span>
              <a className="font-label-sm text-xs text-primary hover:underline font-bold" href="tel:14566">14566</a>
            </div>
          </div>

          {/* Quick Exit (Esc) Shield Button */}
          <button
            onClick={onQuickExit || (() => window.location.href = 'https://www.google.com')}
            className="inline-flex items-center gap-1.5 bg-tertiary-container hover:bg-tertiary text-on-tertiary font-label-sm text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            title="Discreet Quick Exit — Redirects immediately (Esc)"
          >
            <span className="material-symbols-outlined text-base">shield</span>
            <span className="font-semibold">Quick Exit (Esc)</span>
          </button>

          {/* Role Selector Badge */}
          <div className="flex items-center bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/30">
            <UserCheck size={14} className="text-primary mr-1.5" />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="bg-transparent font-label-sm text-xs text-primary font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="counselor">Counselor Workspace</option>
              <option value="supervisor">District Officer / Magistrate</option>
              <option value="patient">Survivor / Citizen</option>
              <option value="read_only_investigator">Masked Investigator</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
