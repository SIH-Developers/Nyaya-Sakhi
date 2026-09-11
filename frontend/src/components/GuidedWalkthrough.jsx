import React, { useState, useEffect } from 'react';

export const WALKTHROUGH_STEPS = [
  {
    id: 'header-role',
    tab: 'dashboard',
    title: '1. Top Header & Role Switcher',
    category: 'Navigation & Security',
    icon: 'shield',
    badge: 'Top Header',
    description: 'The header displays system status, national helpline 14566 details, global search, and the Officer Role Switcher.',
    details: [
      'Toggle between Counselor (Intake) & District Magistrate / Officer (Statutory Action) roles.',
      'Access national emergency lifelines (181, 112, 14566) directly.',
      'Instant Quick Exit (Esc) shield button for safe browsing.'
    ]
  },
  {
    id: 'landing-hero',
    tab: 'landing',
    title: '2. Public Landing & Crisis Intake',
    category: 'Public Access',
    icon: 'public',
    badge: 'Public Desk',
    description: 'Zero-barrier confidential entrance for citizens seeking immediate shelter, legal aid, or trauma counseling.',
    details: [
      'Seek Immediate Assistance: Anonymous intake generating a 6-digit access PIN.',
      'Track Existing Case by PIN: Instant case progress checking without passwords.',
      'Discreet Browsing Notice: ESC key shortcut & local session wiping.'
    ]
  },
  {
    id: 'triage-roster',
    tab: 'dashboard',
    title: '3. Counselor Workspace & AI Risk Badges',
    category: 'AI Clinical Triage',
    icon: 'clinical_notes',
    badge: 'OSC Workspace',
    description: 'Central AI triage queue displaying incoming victim cases sorted by threat matrix & legal urgency.',
    details: [
      'Color-coded risk badges: Urgent Risk (Red), Elevated Risk (Amber), Stable Track (Green).',
      'AI Confidence scores generated via fused IndicBERT NLP & risk heuristics.',
      'Click Inspect to open full legal records, conversation transcript, and FIR status.'
    ]
  },
  {
    id: 'district-oversight',
    tab: 'district',
    title: '4. District Officer & Legal Oversight',
    category: 'Statutory Action',
    icon: 'policy',
    badge: 'District Magistrate',
    description: 'Inter-agency coordination console for FIR verifications, free legal aid panels, and protection orders.',
    details: [
      'Generate 7-Day Link Code: Issues 6-digit PINs (e.g. 423898) to link Telegram / Web chats to legal records.',
      'Verify & Attach FIR: Official protection officer verification of pending self-registered cases.',
      'Deploy Inter-Agency Notice: Instant dispatch to District Police HQ & Legal Aid Panel.'
    ]
  },
  {
    id: 'patient-portal',
    tab: 'patient',
    title: '5. Sakhi Sahayata Desk (Survivor Portal)',
    category: 'Survivor Self-Serve',
    icon: 'front_hand',
    badge: 'Survivor Docket',
    description: 'Private safety space for survivors to view case milestones and submit confidential well-being check-ins.',
    details: [
      '6-Digit PIN & OTP Login: Zero password friction for survivors.',
      'Allowlisted Data Protection: Renders only non-sensitive milestones & helpline directory.',
      'Discreet Mode: Toggle neutral Daily Weather & News Digest screen mask.'
    ]
  },
  {
    id: 'ministry-dashboard',
    tab: 'ministry',
    title: '6. Ministry & State Oversight Analytics',
    category: 'Executive Governance',
    icon: 'query_stats',
    badge: 'MoSJE Governance',
    description: 'High-level executive analytics for Ministry of Social Justice & Empowerment compliance under Mission Shakti.',
    details: [
      'District-wise incident distribution heatmap across Telangana districts.',
      '30-Day escalation timeline breakdown distinguishing NLP-detected vs Manual SOS alerts.',
      'Min-5 Privacy Threshold auto-enforcement to prevent victim re-identification.'
    ]
  },
  {
    id: 'chat-widget',
    tab: 'landing',
    title: '7. Floating SOS Panic Button & Calming AI Chat',
    category: 'Emergency Assistance',
    icon: 'emergency',
    badge: 'P0 Emergency',
    description: 'Always-on bottom-right red SOS Panic FAB button and Calming Companion AI chat widget.',
    details: [
      'SOS Panic Button: 1-click trigger bypassing NLP to dispatch P0-EMERGENCY Voice call to counselors.',
      'Calming Companion Chatbot: Trauma-informed conversational support in English & Hindi.',
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Central Guide Card matching GOI / MoSJE Design System */}
      <div className="w-full max-w-xl bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col font-body-md text-on-surface">
        
        {/* Top Progress Line */}
        <div className="h-1.5 w-full bg-surface-container-high">
          <div
            className="h-full bg-secondary transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / WALKTHROUGH_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="bg-primary text-on-primary px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0 border border-outline-variant/20">
              <span className="material-symbols-outlined text-xl">{step.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-[11px] uppercase tracking-wider font-semibold text-secondary-container">
                  {step.category}
                </span>
                <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded font-bold">
                  {step.badge}
                </span>
              </div>
              <h2 className="font-headline-sm text-base font-bold text-on-primary leading-tight mt-0.5">
                {step.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-primary-container/40 hover:bg-primary-container text-on-primary flex items-center justify-center cursor-pointer transition-colors"
            title="Close Tour"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 flex flex-col gap-4">
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            {step.description}
          </p>

          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-2.5">
            <span className="font-label-sm text-xs font-bold text-primary uppercase tracking-wider">
              Key Features & Capabilities:
            </span>
            {step.details.map((detail, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-on-surface leading-normal">
                <span className="material-symbols-outlined text-secondary text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center justify-between">
          {/* Step Bullets */}
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-xs font-semibold text-on-surface-variant mr-1">
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
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === currentStepIndex ? 'w-5 bg-primary' : 'w-2 bg-outline-variant/40'
                }`}
                title={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
            >
              {currentStepIndex === WALKTHROUGH_STEPS.length - 1 ? (
                <>
                  <span>Finish Tour</span>
                  <span className="material-symbols-outlined text-base">check</span>
                </>
              ) : (
                <>
                  <span>Next Feature</span>
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
