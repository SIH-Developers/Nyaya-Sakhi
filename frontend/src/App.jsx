import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import KPICards from './components/KPICards';
import TriageRoster from './components/TriageRoster';
import VictimDetailModal from './components/VictimDetailModal';
import AlertsFeed from './components/AlertsFeed';
import LiveSimulator from './components/LiveSimulator';

import { API_BASE } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('counselor');
  
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
      setSelectedVictimHistory(data.history);
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        onRefresh={fetchDashboardData}
        isRefreshing={isRefreshing}
      />

      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '28px 24px' }}>
        {/* KPI Statistics */}
        <KPICards stats={stats} />

        {/* View Switcher */}
        {activeTab === 'dashboard' && (
          <TriageRoster
            victims={victims}
            onSelectVictim={handleSelectVictim}
            selectedVictimId={selectedVictimId}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsFeed
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onSelectVictim={handleSelectVictim}
          />
        )}

        {activeTab === 'simulator' && (
          <LiveSimulator
            victims={victims}
            onMessageSent={handleSendMessage}
            onCallSent={handleSendCall}
          />
        )}
      </main>

      {/* Victim Detailed History Modal */}
      {selectedVictimDetails && (
        <VictimDetailModal
          victim={selectedVictimDetails}
          history={selectedVictimHistory}
          onClose={handleCloseModal}
          onAcknowledge={handleAcknowledgeAlert}
        />
      )}

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '18px 24px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        background: 'rgba(10, 13, 20, 0.9)'
      }}>
        Ministry of Social Justice and Empowerment (MoSJE) • National Helpline Against Atrocities (14566) • SIH Problem Statement 26094 • Powered by LangGraph & Hugging Face
      </footer>
    </div>
  );
}
