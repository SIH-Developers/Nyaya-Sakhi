import React from 'react';
import { Shield, Activity, Lock, UserCheck, RefreshCw } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, userRole, setUserRole, onRefresh, isRefreshing }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 13, 20, 0.85)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '14px 28px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand & Emblem */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <Shield size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'var(--font-display)'
              }}>
                MoSJE • NHAA 14566
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                fontWeight: 700,
                border: '1px solid rgba(99, 102, 241, 0.4)'
              }}>
                PS 26094
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              AI-Powered Dynamic Distress Prediction & SC/ST PoA Monitoring System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          {[
            { id: 'dashboard', label: 'Triage Dashboard' },
            { id: 'alerts', label: 'Live Alerts Feed' },
            { id: 'simulator', label: 'Live Channel Simulator' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === tab.id ? 'var(--accent-indigo)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Security & Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            title="Refresh live data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            Refresh
          </button>

          {/* DPDP Act Compliance Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <Lock size={12} />
            <span>DPDP Act 2023 AES-256</span>
          </div>

          {/* Role Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px 8px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <UserCheck size={14} color="#94a3b8" />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="counselor" style={{ background: '#111726' }}>On-Duty Counselor</option>
              <option value="supervisor" style={{ background: '#111726' }}>District Officer</option>
              <option value="read_only_investigator" style={{ background: '#111726' }}>Investigator (Masked)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
