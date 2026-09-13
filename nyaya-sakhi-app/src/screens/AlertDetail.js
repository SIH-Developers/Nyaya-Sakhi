import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { fetchVictimHistory } from '../services/api';
import { OFFICER_KEY_STORE_KEY, API_BASE } from '../config/api';

export default function AlertDetail({ navigation, route }) {
  const { victimId, officerKey: passedKey } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const key = passedKey || await SecureStore.getItemAsync(OFFICER_KEY_STORE_KEY);
        const res = await fetchVictimHistory(victimId, key);
        setData(res);
      } catch (err) {
        setError('Failed to load victim details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [victimId]);

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      const key = passedKey || await SecureStore.getItemAsync(OFFICER_KEY_STORE_KEY);
      await fetch(`${API_BASE}/victim/${victimId}/acknowledge`, {
        method: 'POST',
        headers: { 'x-officer-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_by: 'mobile_counselor' }),
      });
      Alert.alert('✅ Acknowledged', 'Case marked as reviewed.');
    } catch {
      Alert.alert('Error', 'Could not acknowledge. Try again.');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleCall = (phone) => {
    const tel = `tel:${phone || '14566'}`;
    Linking.openURL(tel).catch(() =>
      Alert.alert('Error', 'Could not open dialler.')
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading case details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'No data found.'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const v = data.victim || {};
  const history = data.history || [];
  const latestTurn = history[history.length - 1] || {};
  const reasons = latestTurn.explainability_reasons || [];
  const score = Math.round((v.risk_score || latestTurn.fused_risk_score || 0) * 100);
  const tier = v.current_risk_tier || 'Unknown';

  const tierColor = tier === 'Urgent' || tier === 'Critical'
    ? '#ef4444'
    : tier === 'Counselor Outreach'
    ? '#f59e0b'
    : '#22c55e';

  return (
    <SafeAreaView style={styles.container}>
      {/* Back header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Case Detail</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Victim header */}
        <View style={[styles.card, { borderColor: tierColor + '44' }]}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{v.name || 'Anonymous'}</Text>
            <View style={[styles.tierBadge, { backgroundColor: tierColor + '22', borderColor: tierColor }]}>
              <Text style={{ color: tierColor, fontWeight: '700', fontSize: 12 }}>{tier}</Text>
            </View>
          </View>
          <Text style={styles.victimId}>{victimId}</Text>
          <Text style={styles.meta}>{v.district}, {v.state} · {v.caste_category}</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Risk Score</Text>
            <Text style={[styles.scoreValue, { color: tierColor }]}>{score}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: tierColor }]} />
          </View>
        </View>

        {/* Legal Context */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>⚖️ Legal Case Context</Text>
          <Row label="FIR Number" value={v.fir_number || 'Not filed'} />
          <Row label="Police Station" value={v.police_station || '—'} />
          <Row label="Trial Stage" value={v.case_stage || '—'} />
          <Row label="Accused Bail" value={v.accused_bail_status || '—'} accent={v.accused_bail_status === 'Granted'} />
          <Row label="Compensation" value={v.compensation_status || '—'} />
          {v.threat_reported && (
            <View style={styles.threatBanner}>
              <Text style={styles.threatText}>⚠️ Witness Threat / Intimidation Reported</Text>
            </View>
          )}
        </View>

        {/* Explainability Reasons */}
        {reasons.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🔍 AI Distress Drivers (Latest Turn)</Text>
            {reasons.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.reasonText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Risk trend */}
        {history.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📈 Risk Trend (Last {history.length} turns)</Text>
            <View style={styles.trendRow}>
              {history.slice(-8).map((turn, i) => {
                const s = turn.fused_risk_score || 0;
                const h = Math.max(4, Math.round(s * 60));
                const c = s >= 0.75 ? '#ef4444' : s >= 0.4 ? '#f59e0b' : '#22c55e';
                return (
                  <View key={i} style={styles.trendBar}>
                    <View style={[styles.bar, { height: h, backgroundColor: c }]} />
                    <Text style={styles.trendLabel}>{Math.round(s * 100)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>⚡ Actions</Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
            onPress={() => handleCall(v.phone_number)}
          >
            <Text style={styles.actionText}>📞 Call Victim ({v.phone_number || '14566'})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1e5fa8' }, acknowledging && styles.btnDisabled]}
            onPress={handleAcknowledge}
            disabled={acknowledging}
          >
            {acknowledging
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.actionText}>✅ Acknowledge Alert</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#374151' }]}
            onPress={() => navigation.navigate('AlertFeed')}
          >
            <Text style={styles.actionText}>📋 Open Full Case Feed</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, accent }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, accent && rowStyles.accent]}>{value}</Text>
    </View>
  );
}
const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  label: { color: '#64748b', fontSize: 13 },
  value: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  accent: { color: '#f87171' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  errorText: { color: '#fca5a5', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  backBtn: { padding: 12 },
  backText: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#022448',
    borderBottomWidth: 1,
    borderBottomColor: '#1a3a5c',
  },
  back: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 14, gap: 12 },
  card: {
    backgroundColor: '#0d1f30',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a50',
    marginBottom: 2,
  },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: '#ffffff', fontSize: 20, fontWeight: '800', flex: 1 },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
  victimId: { color: '#475569', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
  meta: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreLabel: { color: '#64748b', fontSize: 12 },
  scoreValue: { fontSize: 12, fontWeight: '800' },
  progressBar: { height: 6, backgroundColor: '#1e3a50', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bullet: { color: '#4f46e5', fontWeight: '800', marginRight: 6, fontSize: 14 },
  reasonText: { color: '#cbd5e1', fontSize: 13, flex: 1, lineHeight: 18 },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70 },
  trendBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  trendLabel: { color: '#475569', fontSize: 9, marginTop: 2 },
  threatBanner: {
    backgroundColor: '#450a0a',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  threatText: { color: '#fca5a5', fontSize: 12, fontWeight: '600' },
  actionsCard: {
    backgroundColor: '#0d1f30',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a50',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  actionText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
