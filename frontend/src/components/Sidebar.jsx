import React from 'react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  userRole,
  alertsCount = 0,
  patientsCount = 0,
  onOpenWalkthrough
}) {
  const navItems = [
    {
      id: 'landing',
      label: 'Public Portal & Intake',
      icon: 'public',
      badge: 'Citizen Access'
    },
    {
      id: 'patient',
      label: 'Sakhi Sahayata (Survivor Desk)',
      icon: 'front_hand',
      badge: 'Self-Serve'
    },
    {
      id: 'dashboard',
      label: 'Counselor Workspace',
      icon: 'clinical_notes',
      badge: patientsCount > 0 ? `${patientsCount} Cases` : null
    },
    {
      id: 'district',
      label: 'District Oversight',
      icon: 'policy',
      badge: 'Action SLA'
    },
    {
      id: 'ministry',
      label: 'Ministry Analytics',
      icon: 'query_stats',
      badge: 'Aggregate'
    },
    {
      id: 'simulator',
      label: 'Multi-Channel Live Simulator',
      icon: 'podcasts',
      badge: 'Testing'
    }
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-72 bg-surface-container-lowest z-40 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-outline-variant/30">
      <div className="p-4 flex flex-col gap-2 overflow-y-auto">
        <div className="px-3 py-1.5 mb-2 bg-surface-container-low rounded border border-outline-variant/20">
          <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            Operational Units
          </span>
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-colors text-left font-medium cursor-pointer ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                    isActive ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Guided Tour Banner Button */}
        {onOpenWalkthrough && (
          <div className="mt-4 pt-3 border-t border-outline-variant/20">
            <button
              onClick={onOpenWalkthrough}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold border border-outline-variant/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-secondary">explore</span>
                <span>Interactive Guided Tour</span>
              </div>
              <span className="material-symbols-outlined text-sm text-secondary">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="p-4 bg-surface-container-low border-t border-outline-variant/30">
        <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-xs font-semibold">
          <span>Status: Active Duty</span>
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
        </div>
        <p className="font-label-sm text-[11px] text-on-surface-variant/80 mt-1">
          Trauma-Informed Protocol v4.2 • DPDP Compliant
        </p>
      </div>
    </aside>
  );
}
