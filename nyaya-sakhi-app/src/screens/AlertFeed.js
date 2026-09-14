import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { fetchAlerts } from '../services/api';
import { OFFICER_KEY_STORE_KEY, OWNER_ID_STORE_KEY } from '../config/api';

const REFRESH_INTERVAL = 30000;

const PRIORITY_ORDER = { Critical: 0, Urgent: 1, Watch: 2 };
const PRIORITY_COLOR = {
  Critical: { bg: '#fff0f0', text: '#dc2626', border: '#fecaca' },
  Urgent: { bg: '#fffbeb', text: '#d97706', border: '#fed7aa' },
  Watch: { bg: '#f8faff', text: '#6366f1', border: '#c7d2fe' },
};

const TABS = ['All', 'Critical', 'Urgent', 'Watch'];

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function AlertCard({ item, onPress }) {
  const prio = item.priority || item.risk_tier || 'Watch';
  const colors = PRIORITY_COLOR[prio] || PRIORITY_COLOR.Watch;
  const acked = item.acknowledged || item.status === 'acknowledged';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: colors.text }]} />

      <View style={styles.cardBody}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardIdRow}>
            <Text style={styles.caseId}>NS-{(item.victim_id || item.id || '0000').slice(-4).toUpperCase()}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.victimName}>{item.name || item.victim_name || 'Unknown'}</Text>
          </View>
          <View style={[styles.prioBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.prioText, { color: colors.text }]}>{prio}</Text>
          </View>
        </View>

        {/* Source tag */}
        {item.source_tag && (
          <Text style={styles.sourceTag}>{item.source_tag}</Text>
        )}

        {/* Summary */}
        <Text style={styles.cardSummary} numberOfLines={2}>
          {item.summary || item.alert_message || item.reason || 'No summary available.'}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.timeAgo}>🕐 {timeAgo(item.created_at || item.timestamp)}</Text>
          {acked
            ? <Text style={styles.ackBadge}>✅ Acknowledged</Text>
            : <Text style={styles.unackBadge}>🔴 Unacknowledged</Text>
          }
        </View>

        {/* Assigned to */}
        {item.assigned_to && (
          <Text style={styles.assignedTo}>{item.assigned_to}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AlertFeed({ navigation, route }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('All');
  const [officerKey, setOfficerKey] = useState(route?.params?.officerKey || null);

  const loadAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const key = officerKey || await SecureStore.getItemAsync(OFFICER_KEY_STORE_KEY);
      if (!key) { navigation.replace('RoleSelector'); return; }
      if (!officerKey) setOfficerKey(key);
      const data = await fetchAlerts(key);
      const sorted = [...data].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority || a.risk_tier] ?? 2;
        const pb = PRIORITY_ORDER[b.priority || b.risk_tier] ?? 2;
        return pa !== pb ? pa - pb : new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      setAlerts(sorted);
    } catch (e) {
      if (!silent) Alert.alert('Error', 'Could not load alerts. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [officerKey]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(() => loadAlerts(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync(OFFICER_KEY_STORE_KEY);
    await SecureStore.deleteItemAsync(OWNER_ID_STORE_KEY);
    navigation.replace('RoleSelector');
  };

  const filtered = tab === 'All' ? alerts
    : alerts.filter(a => (a.priority || a.risk_tier) === tab);

  const counts = {
    All: alerts.length,
    Critical: alerts.filter(a => (a.priority || a.risk_tier) === 'Critical').length,
    Urgent: alerts.filter(a => (a.priority || a.risk_tier) === 'Urgent').length,
    Watch: alerts.filter(a => (a.priority || a.risk_tier) === 'Watch').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogoBox}>
            <Text style={styles.headerLogoText}>NS</Text>
          </View>
          <View>
            <Text style={styles.headerMeta}>NYAYA-SAKHI</Text>
            <Text style={styles.headerTitle}>Alert Feed</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={handleLogout}>
          <Text style={styles.avatarText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Sync strip */}
      <TouchableOpacity style={styles.syncStrip} onPress={() => { setRefreshing(true); loadAlerts(); }}>
        <Text style={styles.syncText}>⟳  PULL DOWN TO SYNC ENCRYPTED QUEUE</Text>
      </TouchableOpacity>

      {/* Section header */}
      <View style={styles.sectionRow}>
        <View style={styles.sectionLeft}>
          <View style={styles.activeDot} />
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{counts.All} Pending</Text>
          </View>
        </View>
        <View style={styles.sectionActions}>
          <TouchableOpacity onPress={() => { setRefreshing(true); loadAlerts(); }}>
            <Text style={styles.actionIcon}>⟳</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.actionIcon}>↪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t}{counts[t] > 0 && tab !== t ? ` (${counts[t]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Compliance banner */}
      <View style={styles.complianceBanner}>
        <Text style={styles.complianceIcon}>🛡️</Text>
        <Text style={styles.complianceText}>
          Statutory priority queue governed under POCSO & SC/ST PoA Rule 7(1).
        </Text>
      </View>

      {/* Alert list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.victim_id || item.id || Math.random())}
        renderItem={({ item }) => (
          <AlertCard item={item} onPress={(a) => navigation.navigate('AlertDetail', { alert: a, officerKey })} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAlerts(); }}
            colors={['#0d9488']} tintColor="#0d9488" />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{loading ? '⏳' : '✅'}</Text>
            <Text style={styles.emptyText}>{loading ? 'Loading alerts…' : 'No alerts in this category.'}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogoBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#0d6e64',
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogoText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  headerMeta: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  headerTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#0d6e64',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18 },
  syncStrip: {
    backgroundColor: '#f0fdf9', paddingVertical: 6, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#bbf7d0',
  },
  syncText: { color: '#0d9488', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  countBadge: {
    backgroundColor: '#fee2e2', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },
  sectionActions: { flexDirection: 'row', gap: 12 },
  actionIcon: { fontSize: 20, color: '#64748b' },
  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8,
  },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: { backgroundColor: '#0d6e64' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#ffffff' },
  complianceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderRadius: 10, marginHorizontal: 16,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
  },
  complianceIcon: { fontSize: 13 },
  complianceText: { flex: 1, color: '#3b82f6', fontSize: 11, fontWeight: '500' },
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  card: {
    flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 12, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIdRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  caseId: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  dot: { color: '#cbd5e1', fontSize: 12 },
  victimName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  prioBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1,
  },
  prioText: { fontSize: 11, fontWeight: '700' },
  sourceTag: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 1 },
  cardSummary: { fontSize: 13, color: '#374151', lineHeight: 18, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  timeAgo: { fontSize: 11, color: '#94a3b8' },
  ackBadge: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  unackBadge: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  assignedTo: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
