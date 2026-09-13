import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { fetchVictims } from '../services/api';
import { OFFICER_KEY_STORE_KEY, OWNER_ID_STORE_KEY } from '../config/api';

const TIER_META = {
  Urgent:           { color: '#dc2626', bg: '#450a0a', badge: '#ef4444', emoji: '🔴' },
  Critical:         { color: '#dc2626', bg: '#450a0a', badge: '#ef4444', emoji: '🔴' },
  'Counselor Outreach': { color: '#d97706', bg: '#451a03', badge: '#f59e0b', emoji: '🟡' },
  Watch:            { color: '#16a34a', bg: '#052e16', badge: '#22c55e', emoji: '🟢' },
  Routine:          { color: '#16a34a', bg: '#052e16', badge: '#22c55e', emoji: '🟢' },
};

const tierPriority = (t) => {
  if (t === 'Urgent' || t === 'Critical') return 0;
  if (t === 'Counselor Outreach') return 1;
  return 2;
};

function VictimCard({ item, onPress }) {
  const meta = TIER_META[item.current_risk_tier] || TIER_META['Routine'];
  const score = Math.round((item.risk_score || 0) * 100);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: meta.bg, borderColor: meta.badge + '44' }]}
      onPress={() => onPress(item)}
      activeOpacity={0.82}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.victimName}>{item.name || 'Anonymous'}</Text>
          <Text style={styles.victimId}>{item.victim_id}</Text>
          <Text style={styles.location}>{item.district}, {item.state}</Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.tierBadge, { backgroundColor: meta.badge + '22', borderColor: meta.badge }]}>
            <Text style={{ color: meta.badge, fontSize: 11, fontWeight: '700' }}>
              {meta.emoji} {item.current_risk_tier}
            </Text>
          </View>
          <Text style={[styles.scoreText, { color: meta.badge }]}>{score}% risk</Text>
          <Text style={styles.channelText}>{item.last_channel || 'unknown'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function AlertFeed({ navigation, route }) {
  const officerKey = route?.params?.officerKey;
  const [victims, setVictims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadVictims = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const key = officerKey || await SecureStore.getItemAsync(OFFICER_KEY_STORE_KEY);
      const data = await fetchVictims(key);
      // Sort by priority
      const sorted = [...data].sort((a, b) =>
        tierPriority(a.current_risk_tier) - tierPriority(b.current_risk_tier)
      );
      setVictims(sorted);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError('Failed to load alerts. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [officerKey]);

  useEffect(() => {
    loadVictims();
    // 30-second auto-refresh
    const interval = setInterval(() => loadVictims(true), 30000);
    return () => clearInterval(interval);
  }, [loadVictims]);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Clear session and return to role selection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync(OFFICER_KEY_STORE_KEY);
          await SecureStore.deleteItemAsync(OWNER_ID_STORE_KEY);
          navigation.replace('RoleSelector');
        },
      },
    ]);
  };

  const handleSelect = (victim) => {
    navigation.navigate('AlertDetail', {
      victimId: victim.victim_id,
      officerKey: officerKey,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading alert feed…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const urgent = victims.filter(v => v.current_risk_tier === 'Urgent' || v.current_risk_tier === 'Critical');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛡️ Alert Feed</Text>
          <Text style={styles.headerSub}>
            {urgent.length > 0 ? `⚠️ ${urgent.length} URGENT` : '✅ All Stable'} · {victims.length} total
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Last updated */}
      {lastUpdated && (
        <Text style={styles.lastUpdated}>Updated: {lastUpdated} · auto-refreshes every 30s</Text>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={() => loadVictims()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={victims}
        keyExtractor={(item) => item.victim_id}
        renderItem={({ item }) => (
          <VictimCard item={item} onPress={handleSelect} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadVictims(true)}
            tintColor="#3b82f6"
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>✅ No active cases found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
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
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  lastUpdated: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#0a1628',
  },
  errorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#450a0a',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  retryText: { color: '#60a5fa', fontSize: 13, fontWeight: '700' },
  list: { padding: 12, gap: 10 },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 2,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, marginRight: 12 },
  victimName: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  victimId: { color: '#64748b', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
  location: { color: '#94a3b8', fontSize: 12 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  scoreText: { fontSize: 12, fontWeight: '700' },
  channelText: { color: '#475569', fontSize: 11 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#475569', fontSize: 16 },
});
