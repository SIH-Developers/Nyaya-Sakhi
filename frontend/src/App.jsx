import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import LandingPage from './components/LandingPage';
import TriageRoster from './components/TriageRoster';
import DistrictOversight from './components/DistrictOversight';
import PatientPortal from './components/PatientPortal';
import MinistryDashboard from './components/MinistryDashboard';
import LiveSimulator from './components/LiveSimulator';
import ChatWidget from './components/ChatWidget';
import GuidedWalkthrough from './components/GuidedWalkthrough';

import { API_BASE } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [userRole, setUserRole] = useState('counselor');
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  
  const [stats, setStats] = useState(null);
  const [victims, setVictims] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const [selectedVictimId, setSelectedVictimId] = useState(null);
  const [selectedVictimDetails, setSelectedVictimDetails] = useState(null);
  const [selectedVictimHistory, setSelectedVictimHistory] = useState([]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, victimsRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/victims`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/alerts`).then(r => r.json()).catch(() => [])
      ]);

      if (statsRes) setStats(statsRes);
      if (victimsRes) setVictims(victimsRes);
      if (alertsRes) setAlerts(alertsRes);
    } catch (err) {
      console.error("Error fetching data from backend:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSelectVictim = async (victimId) => {
    // null means "go back to list"
    if (!victimId) {
      setSelectedVictimId(null);
      setSelectedVictimDetails(null);
      setSelectedVictimHistory([]);
      return;
    }
    setSelectedVictimId(victimId);
    try {
      const res = await fetch(`${API_BASE}/victim/${victimId}/history?role=${userRole}`);
      const data = await res.json();
      setSelectedVictimDetails(data.victim);
      setSelectedVictimHistory(data.history || []);
    } catch (err) {
      console.error("Error fetching victim details:", err);
    }
  };

  const handleTriggerSOS = async () => {
    try {
      await fetch(`${API_BASE}/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          victim_id: 'WEB-PUBLIC-SOS',
          channel: 'web_chat',
          triggered_by: 'victim'
        })
      });
      fetchDashboardData();
      alert("🆘 MANUAL SOS ACTIVATED! Emergency P0 Voice Call dispatched to counselors & District Officer.");
    } catch (err) {
      console.error("SOS trigger error:", err);
    }
  };

  const handleSendMessage = async (payload) => {
    const res = await fetch(`${API_BASE}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    fetchDashboardData();
    return data;
  };

  const handleSendCall = async (payload) => {
    const res = await fetch(`${API_BASE}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    fetchDashboardData();
    return data;
  };

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col">
      {/* Top Header Bar */}
      <TopHeader
        userRole={userRole}
        setUserRole={setUserRole}
        onRefresh={fetchDashboardData}
        isRefreshing={isRefreshing}
        alertsCount={alerts.filter(a => !a.acknowledged).length}
        onOpenAlerts={() => setActiveTab('dashboard')}
      />

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        alertsCount={alerts.filter(a => !a.acknowledged).length}
        patientsCount={victims.length}
        onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
      />

      {/* Main Content Area */}
      <div className="pl-72 pt-16 flex-1 flex flex-col min-w-0">
        <main className="flex-1 w-full max-w-[1440px] mx-auto p-6">
          {/* VIEW 1: Public Landing & Intake */}
          {activeTab === 'landing' && (
            <LandingPage onNavigate={setActiveTab} onTriggerSOS={handleTriggerSOS} />
          )}

          {/* VIEW 2: Sakhi Sahayata (Survivor Desk) */}
          {activeTab === 'patient' && (
            <PatientPortal />
          )}

          {/* VIEW 3: Counselor Workspace — inline patient detail replaces list */}
          {activeTab === 'dashboard' && (
            <TriageRoster
              victims={victims}
              onSelectVictim={handleSelectVictim}
              selectedVictimId={selectedVictimId}
              selectedVictimDetails={selectedVictimDetails}
              selectedVictimHistory={selectedVictimHistory}
              userRole={userRole}
              onRefresh={fetchDashboardData}
              onRefreshData={fetchDashboardData}
            />
          )}

          {/* VIEW 4: District Oversight */}
          {activeTab === 'district' && (
            <DistrictOversight
              victims={victims}
              onRefreshData={fetchDashboardData}
            />
          )}

          {/* VIEW 5: Ministry Analytics */}
          {activeTab === 'ministry' && (
            <MinistryDashboard />
          )}

          {/* VIEW 6: Live Multi-Channel Simulator */}
          {activeTab === 'simulator' && (
            <LiveSimulator
              victims={victims}
              onMessageSent={handleSendMessage}
              onCallSent={handleSendCall}
            />
          )}
        </main>

        {/* Institutional Footer */}
        <footer className="border-t border-outline-variant/30 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-on-surface-variant bg-surface-container-lowest mt-auto">
          <div>
            Government of India | Ministry of Women & Child Development • Sakhi One-Stop Center Scheme
          </div>
          <div>
            National Helpline Against Atrocities (14566) • Women Helpline (181) • SIH Problem Statement 26094
          </div>
        </footer>
      </div>

      {/* Floating SOS Panic Button & Chat Widget */}
      <ChatWidget />

      {/* Interactive Guided Walkthrough Modal */}
      <GuidedWalkthrough
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
