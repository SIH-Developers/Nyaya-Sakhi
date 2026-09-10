import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Shield,
  BarChart2,
  Users,
  Radio,
  AlertTriangle,
  MessageSquare,
  Activity,
  Compass
} from 'lucide-react';

export const WALKTHROUGH_STEPS = [
  {
    id: 'header-role',
    tab: 'dashboard',
    title: '1. Top Header & Role Switcher',
    category: 'Navigation & Security',
    icon: Shield,
    badge: 'Top Header',
    description: 'The header displays system status, national helpline 14566 details, global search, and the Officer Role Switcher.',
    details: [
      'Toggle between Counselor (Intake) & District Magistrate / Officer (Statutory Action) roles.',
      'Search across victim names, FIR numbers, or 6-digit link codes globally.',
      'Real-time backend API connectivity badge & Manual Refresh button.'
    ]
  },
  {
    id: 'kpi-cards',
    tab: 'dashboard',
    title: '2. Statutory KPI Cards',
    category: 'Real-Time Metrics',
    icon: Activity,
    badge: 'Statutory Dashboard',
    description: 'Real-time counters tracking SC/ST (PoA) Act monitoring performance across all districts.',
    details: [
      'Total Monitored Victims under Section 15A rights protection.',
      'Urgent & Critical risk count requiring 24-hour intervention.',
      'Pending District Officer verifications and average AI triage response speed (sub-2 seconds).'
    ]
  },
  {
    id: 'triage-roster',
    tab: 'dashboard',
    title: '3. Triage Roster & AI Risk Badges',
    category: 'AI Clinical Triage',
    icon: AlertTriangle,
    badge: 'Live Feed',
    description: 'Central AI triage queue displaying incoming victim cases sorted by risk severity.',
    details: [
      'Color-coded risk badges: Critical (Red), Urgent (Orange), Watch (Yellow), Routine (Green).',
      'AI Confidence scores generated via fused IndicBERT NLP & risk heuristics.',
      'Click any row to open full legal records, conversation transcript, and FIR status.'
    ]
  },
  {
    id: 'patients-directory',
    tab: 'patients',
    title: '4. Master Patients Directory & 6-Digit Link Code',
    category: 'Survivor Case Management',
    icon: Users,
    badge: 'Case Registry',
    description: 'Comprehensive directory of all registered survivors with FIR status and District Officer actions.',
    details: [
      'Generate 7-Day Link Code: Generates a 6-digit PIN (e.g. 423898) allowing survivors to link their Telegram or Web chat to their legal record.',
      'Update Patient Email: Link survivor email for web portal access.',
      'Filter by district, risk level, or FIR verification status.'
    ]
  },
  {
    id: 'live-simulator',
    tab: 'simulator',
    title: '5. Multi-Channel Live Simulator',
    category: 'System Diagnostics',
    icon: Radio,
    badge: 'Interactive Testing',
    description: 'Simulate multi-channel distress signals live to test AI triage and escalation logic.',
    details: [
      'Simulate Web Chat messages, Telegram voice notes/text, WhatsApp, and Twilio phone calls.',
      'Real-time NLP risk scoring preview & immediate fallback verification.',
      'Test counselor WhatsApp/SMS/Voice dispatch pipelines directly.'
    ]
  },
  {
    id: 'ministry-dashboard',
    tab: 'ministry',
    title: '6. Ministry Analytics Dashboard',
    category: 'Executive Oversight',
    icon: BarChart2,
    badge: 'MoSJE Governance',
    description: 'High-level executive analytics for Ministry of Social Justice & Empowerment compliance.',
    details: [
      'District-wise incident distribution heatmap across Telangana districts.',
      '30-Day escalation timeline breakdown distinguishing NLP-detected vs Manual SOS alerts.',
      'Min-5 privacy threshold auto-enforcement to prevent victim re-identification.'
    ]
  },
  {
    id: 'chat-widget',
    tab: 'dashboard',
    title: '7. Floating SOS Panic Button & Calming AI Chat',
    category: 'Emergency Assistance',
    icon: MessageSquare,
    badge: 'SOS Panic Button',
    description: 'Always-on bottom-right red SOS Panic FAB button and Calming Companion AI chat.',
    details: [
      'SOS Panic Button: 1-click trigger bypassing NLP to dispatch P0-EMERGENCY Voice call to counselors.',
      'Calming Companion Chatbot: Provides immediate trauma-informed response in English & Hindi.',
      '5-minute anti-spam deduplication window to protect counselor helplines.'
    ]
  }
];

export default function GuidedWalkthrough({
  isOpen,
  onClose,
  activeTab,
  setActiveTab
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = WALKTHROUGH_STEPS[currentStepIndex];
  const StepIcon = step?.icon || Compass;

  useEffect(() => {
    if (isOpen && step) {
      if (step.tab && activeTab !== step.tab) {
        setActiveTab(step.tab);
      }
    }
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < WALKTHROUGH_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (WALKTHROUGH_STEPS[nextIdx].tab) {
        setActiveTab(WALKTHROUGH_STEPS[nextIdx].tab);
      }
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      if (WALKTHROUGH_STEPS[prevIdx].tab) {
        setActiveTab(WALKTHROUGH_STEPS[prevIdx].tab);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 8, 15, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      {/* Central Interactive Guide Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'linear-gradient(145deg, #0d1322 0%, #151d30 100%)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(59, 130, 246, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          position: 'relative'
        }}
      >
        {/* Top Progress Bar */}
        <div style={{ height: '4px', width: '100%', background: 'rgba(255, 255, 255, 0.1)' }}>
          <div
            style={{
              height: '100%',
              width: `${((currentStepIndex + 1) / WALKTHROUGH_STEPS.length) * 100}%`,
              background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>

        {/* Modal Header */}
        <div
          style={{
            padding: '22px 26px 16px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa'
              }}
            >
              <StepIcon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {step.category} • {step.badge}
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0, marginTop: '2px' }}>
                {step.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              borderRadius: '10px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Close Tour"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
            {step.description}
          </p>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Key Features & Capabilities:
            </div>
            {step.details.map((detail, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                <CheckCircle2 size={16} style={{ color: '#34d399', shrink: 0, marginTop: '2px' }} />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '16px 26px',
            background: 'rgba(10, 15, 26, 0.9)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Step Indicator Bullets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginRight: '4px' }}>
              Step {currentStepIndex + 1} of {WALKTHROUGH_STEPS.length}
            </span>
            {WALKTHROUGH_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentStepIndex(i);
                  if (WALKTHROUGH_STEPS[i].tab) {
                    setActiveTab(WALKTHROUGH_STEPS[i].tab);
                  }
                }}
                style={{
                  width: i === currentStepIndex ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === currentStepIndex ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>

          {/* Prev / Next / Finish Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
              }}
            >
              {currentStepIndex === WALKTHROUGH_STEPS.length - 1 ? (
                <>Finish Tour <CheckCircle2 size={16} /></>
              ) : (
                <>Next Feature <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
