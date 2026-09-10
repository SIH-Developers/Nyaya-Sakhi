import React from 'react';
import {
  Search,
  RefreshCw,
  Lock,
  Bell,
  PhoneCall,
  UserCheck,
  ShieldCheck,
  Compass
} from 'lucide-react';

export default function TopHeader({
  searchTerm,
  setSearchTerm,
  onSearchSubmit,
  userRole,
  setUserRole,
  onRefresh,
  isRefreshing,
  alertsCount = 0,
  onOpenAlerts,
  onOpenWalkthrough
}) {
  return (
    <header
      style={{
        height: '70px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 13, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}
    >
      {/* Search Bar */}
      <div style={{ flex: 1, maxWidth: '480px', position: 'relative' }}>
        <Search
          size={16}
          color="#64748b"
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSearchSubmit) {
              onSearchSubmit(searchTerm);
            }
          }}
          placeholder="Search patient by name, FIR #, victim ID, or district..."
          style={{
            width: '100%',
            padding: '9px 16px 9px 38px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
            e.target.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-subtle)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* National Helpline Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          <PhoneCall size={12} color="#ef4444" />
          <span>NHAA Helpline: <strong>14566</strong></span>
        </div>

        {/* DPDP Act Compliance Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.08)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}
        >
          <Lock size={12} />
          <span>DPDP Act 2023 AES-256</span>
        </div>

        {/* Guided Tour Walkthrough Launcher Button */}
        {onOpenWalkthrough && (
          <button
            onClick={onOpenWalkthrough}
            style={{
              padding: '7px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#a5b4fc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            title="Start Interactive Guided Tour"
          >
            <Compass size={14} style={{ color: '#818cf8' }} />
            <span>Guided Tour</span>
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="btn btn-secondary"
          style={{
            padding: '7px 12px',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Refresh live data"
        >
          <RefreshCw size={13} className={isRefreshing ? 'spin-anim' : ''} />
          <span>Sync</span>
        </button>

        {/* Alerts Bell */}
        <button
          onClick={onOpenAlerts}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px',
            color: alertsCount > 0 ? '#fca5a5' : 'var(--text-secondary)',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={`${alertsCount} Active Escalation Alerts`}
        >
          <Bell size={16} />
          {alertsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)'
              }}
            >
              {alertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
