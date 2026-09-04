import React from 'react';
import { Users, AlertTriangle, Activity, CheckCircle, ShieldCheck } from 'lucide-react';

export default function KPICards({ stats }) {
  const cards = [
    {
      title: 'Monitored Victims',
      value: stats?.total_monitored_victims || 0,
      subtitle: 'SC/ST PoA Act 1989 Registered',
      icon: Users,
      color: '#6366f1',
      bgGlow: 'rgba(99, 102, 241, 0.15)'
    },
    {
      title: 'P1 Urgent Alerts',
      value: stats?.pending_critical_alerts || 0,
      subtitle: 'Immediate Outreach Required',
      icon: AlertTriangle,
      color: '#ef4444',
      bgGlow: 'rgba(239, 68, 68, 0.15)',
      isAlert: (stats?.pending_critical_alerts || 0) > 0
    },
    {
      title: 'Urgent / Outreach Cases',
      value: (stats?.urgent_cases || 0) + (stats?.outreach_cases || 0),
      subtitle: `${stats?.urgent_cases || 0} Urgent • ${stats?.outreach_cases || 0} Outreach`,
      icon: Activity,
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.15)'
    },
    {
      title: 'Interactions Analyzed',
      value: stats?.total_interactions_logged || 0,
      subtitle: 'Chatbot, 14566 IVRS & Mobile App',
      icon: CheckCircle,
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '28px'
    }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="glass-panel"
            style={{
              padding: '20px 24px',
              position: 'relative',
              overflow: 'hidden',
              borderLeft: `4px solid ${card.color}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {card.title}
              </span>
              <div style={{
                background: card.bgGlow,
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={18} color={card.color} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'var(--font-display)'
              }}>
                {card.value}
              </span>
              {card.isAlert && (
                <span className="pulse-dot" style={{ background: '#ef4444' }}></span>
              )}
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {card.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}
