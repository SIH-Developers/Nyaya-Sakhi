import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import KPICards from './components/KPICards';
import TriageRoster from './components/TriageRoster';
import PatientsDirectory from './components/PatientsDirectory';
import VictimDetailModal from './components/VictimDetailModal';
import AlertsFeed from './components/AlertsFeed';
import LiveSimulator from './components/LiveSimulator';
import ChatWidget from './components/ChatWidget';
import PatientPortal from './components/PatientPortal';
import SettingsProfile from './components/SettingsProfile';
import MinistryDashboard from './components/MinistryDashboard';
import GuidedWalkthrough from './components/GuidedWalkthrough';

import { API_BASE } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('counselor');
  const [globalSearch, setGlobalSearch] = useState('');
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

  const handleCloseModal = () => {
    setSelectedVictimId(null);
    setSelectedVictimDetails(null);
    setSelectedVictimHistory([]);
  };

  const handleAcknowledgeAlert = async (alertId, notes) => {
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselor_notes: notes })
      });
      fetchDashboardData();
    } catch (err) {
      console.error("Error acknowledging alert:", err);
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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'patients') {
            setSelectedVictimDetails(null);
          }
        }}
        userRole={userRole}
        alertsCount={alerts.filter(a => !a.acknowledged).length}
        patientsCount={victims.length}
        onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Top Header Bar */}
        <TopHeader
          searchTerm={globalSearch}
          setSearchTerm={setGlobalSearch}
          onSearchSubmit={(q) => {
            setActiveTab('patients');
          }}
          userRole={userRole}
          setUserRole={setUserRole}
          onRefresh={fetchDashboardData}
          isRefreshing={isRefreshing}
          alertsCount={alerts.filter(a => !a.acknowledged).length}
          onOpenAlerts={() => setActiveTab('alerts')}
          onOpenWalkthrough={() => setIsWalkthroughOpen(true)}
        />

        {/* View Switcher Main Container */}
        <main style={{ flex: 1, width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '28px 32px' }}>
          {/* VIEW 1: Overview Dashboard */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <KPICards stats={stats} />
              <TriageRoster
                victims={victims}
                onSelectVictim={(id) => {
                  handleSelectVictim(id);
                  setActiveTab('patients');
                }}
                selectedVictimId={selectedVictimId}
                userRole={userRole}
              />
            </div>
          )}

          {/* VIEW 2: All Patients Directory (Integrated Master-Detail) */}
          {activeTab === 'patients' && (
            <PatientsDirectory
              victims={victims}
              selectedVictimId={selectedVictimId}
              onSelectVictim={handleSelectVictim}
              onClearSelectedVictim={() => {
                setSelectedVictimId(null);
                setSelectedVictimDetails(null);
              }}
              userRole={userRole}
              onRefreshData={fetchDashboardData}
            />
          )}

          {/* VIEW 3: Live Alerts Feed */}
          {activeTab === 'alerts' && (
            <AlertsFeed
              alerts={alerts}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onSelectVictim={(id) => {
                handleSelectVictim(id);
                setActiveTab('patients');
              }}
            />
          )}

          {/* VIEW 4: Live Channel Simulator */}
          {activeTab === 'simulator' && (
            <LiveSimulator
              victims={victims}
              onMessageSent={handleSendMessage}
              onCallSent={handleSendCall}
            />
          )}

          {/* VIEW 5: Citizen & Case Portal */}
          {activeTab === 'patient' && (
            <PatientPortal />
          )}

          {/* VIEW 6: Settings & Officer Profile */}
          {activeTab === 'settings' && (
            <SettingsProfile
              userRole={userRole}
              setUserRole={setUserRole}
              onRefreshAll={fetchDashboardData}
            />
          )}

          {/* VIEW 7: Ministry Analytics Dashboard */}
          {activeTab === 'ministry' && (
            <MinistryDashboard />
          )}
        </main>

        {/* Institutional Footer */}
        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.76rem',
          color: 'var(--text-muted)',
          background: 'rgba(10, 13, 20, 0.95)',
          marginTop: 'auto',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            Ministry of Social Justice and Empowerment (MoSJE) • National Helpline Against Atrocities (14566)
          </div>
          <div>
            SIH Problem Statement 26094 • Section 15A SC/ST (PoA) Act 1989
          </div>
        </footer>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidget />

      {/* Guided Walkthrough Feature Tour Modal */}
      <GuidedWalkthrough
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
