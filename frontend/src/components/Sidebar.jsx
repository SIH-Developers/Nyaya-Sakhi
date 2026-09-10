import React from 'react';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Radio,
  UserCheck,
  Settings,
  Shield,
  Circle,
  ExternalLink,
  ChevronRight,
  BarChart2,
  Compass
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  userRole,
  alertsCount = 0,
  patientsCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  onOpenWalkthrough
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Triage Dashboard',
      description: 'Executive overview & KPIs',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'patients',
      label: 'All Patients',
      description: 'Directory, case files & actions',
      icon: Users,
      badge: patientsCount > 0 ? patientsCount : null,
      badgeColor: 'rgba(99, 102, 241, 0.2)',
      badgeTextColor: '#a5b4fc'
    },
    {
      id: 'alerts',
      label: 'Live Alerts Feed',
      description: 'Urgent distress escalations',
      icon: AlertTriangle,
      badge: alertsCount > 0 ? alertsCount : null,
      badgeColor: 'rgba(239, 68, 68, 0.2)',
      badgeTextColor: '#fca5a5',
      pulse: alertsCount > 0
    },
    {
      id: 'simulator',
      label: 'Live Simulator',
      description: 'WhatsApp, Telegram, IVRS, SMS',
      icon: Radio,
      badge: 'Live',
      badgeColor: 'rgba(16, 185, 129, 0.2)',
      badgeTextColor: '#6ee7b7'
    },
    {
      id: 'patient',
      label: 'Citizen & Case Portal',
      description: 'Victim OTP login & milestones',
      icon: UserCheck,
      badge: 'Self-Serve',
      badgeColor: 'rgba(6, 182, 212, 0.15)',
      badgeTextColor: '#67e8f9'
    },
    {
      id: 'ministry',
      label: 'Ministry Analytics',
      description: 'Aggregate KPIs, district trends',
      icon: BarChart2,
      badge: 'Read-Only',
      badgeColor: 'rgba(92,107,192,0.2)',
      badgeTextColor: '#9fa8da'
    },
    {
      id: 'settings',
      label: 'Settings & Profile',
      description: 'Roles, officer key & DPDP Act',
      icon: Settings,
      badge: null
    }
  ];

  const roleLabels = {
    counselor: 'On-Duty Counselor',
    supervisor: 'District Officer',
    patient: 'Citizen / Patient',
    read_only_investigator: 'Masked Investigator'
  };

  return (
    <aside
      style={{
        width: '270px',
        minWidth: '270px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'linear-gradient(180deg, rgba(14, 18, 28, 0.98) 0%, rgba(9, 12, 18, 0.99) 100%)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.4)',
        userSelect: 'none'
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.45)',
              flexShrink: 0
            }}
          >
            <Shield size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: 'var(--font-display)'
                }}
              >
                Nyaya-Sakhi
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  color: '#a5b4fc',
                  fontWeight: 700,
                  border: '1px solid rgba(99, 102, 241, 0.4)'
                }}
              >
                PS 26094
              </span>
            </div>
            <p
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginTop: '2px',
                fontWeight: 500
              }}
            >
              MoSJE • NHAA 14566 System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav
        style={{
          flex: 1,
          padding: '18px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            padding: '4px 10px 8px 10px'
          }}
        >
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: isActive
                  ? '1px solid rgba(99, 102, 241, 0.4)'
                  : '1px solid transparent',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.05) 100%)'
                  : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                textAlign: 'left',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {/* Left Accent Bar for Active State */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    height: '60%',
                    width: '3px',
                    borderRadius: '0 4px 4px 0',
                    background: '#6366f1',
                    boxShadow: '0 0 8px #6366f1'
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon
                  size={18}
                  color={isActive ? '#818cf8' : '#94a3b8'}
                  style={{ flexShrink: 0 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      marginTop: '1px'
                    }}
                  >
                    {item.description}
                  </div>
                </div>
              </div>

              {/* Badge if present */}
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: item.badgeColor || 'rgba(255, 255, 255, 0.08)',
                    color: item.badgeTextColor || '#ffffff',
                    border: `1px solid ${item.badgeTextColor || '#ffffff'}40`,
                    animation: item.pulse ? 'pulse 2s infinite' : 'none'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Emergency & Compliance Box */}
      <div
        style={{
          margin: '0 14px 14px 14px',
          padding: '12px 14px',
          background: 'rgba(255, 255, 255, 0.025)',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fca5a5' }}>
            🚨 Atrocity Helpline
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff' }}>
            14566
          </span>
        </div>
        <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
          National Helpline Against Atrocities (PoA Act). DPDP Act 2023 AES-256 compliant.
        </p>
      </div>

      {/* Guided Tour Banner Button */}
      <div style={{ padding: '0 16px 14px 16px' }}>
        <button
          onClick={() => onOpenWalkthrough && onOpenWalkthrough()}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.45)',
            color: '#c7d2fe',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={16} style={{ color: '#818cf8' }} />
            <span>Take Guided Tour</span>
          </div>
          <ChevronRight size={14} style={{ color: '#818cf8' }} />
        </button>
      </div>

      {/* Officer Profile Footer */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div
          onClick={() => setActiveTab('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            flex: 1
          }}
          title="Click to view Settings & Officer Profile"
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: '#f8fafc',
              position: 'relative'
            }}
          >
            OP
            {/* Online Pulse Dot */}
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #0a0d14'
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
              Officer Console
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {roleLabels[userRole] || 'Counselor'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Configure Settings"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  );
}
