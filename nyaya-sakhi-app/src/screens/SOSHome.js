import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Animated, Clipboard, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { getOrCreateAnonymousId, sendSOS, enqueueSOSForRetry, flushSOSQueue } from '../services/api';

// SOS button states
const STATE_IDLE = 'idle';
const STATE_LOADING = 'loading';
const STATE_SENT = 'sent';
const STATE_QUEUED = 'queued';

export default function SOSHome({ navigation }) {
  const [victimId, setVictimId] = useState(null);
  const [sosState, setSosState] = useState(STATE_IDLE);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [copied, setCopied] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // ✅ Ref always reflects the latest isOnline value — readable inside closures
  const isOnlineRef = useRef(true);

  // Pulsing animation for the SOS button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Initialize unique victim ID
  useEffect(() => {
    getOrCreateAnonymousId().then(setVictimId);
  }, []);

  // ✅ FIX: Subscribe ONCE (empty dep array) using a ref to avoid stale closure.
  // The callback always reads isOnlineRef.current — never a stale captured value.
  useEffect(() => {
    // Seed initial state immediately from a one-time fetch
    NetInfo.fetch().then((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      isOnlineRef.current = online;
      setIsOnline(online);
    });

    // Then keep a persistent listener for all future changes
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      const wasOffline = !isOnlineRef.current;  // ✅ reads ref, never stale
      isOnlineRef.current = online;             // ✅ update ref immediately
      setIsOnline(online);                      // update state for UI

      if (wasOffline && online) {
        // Genuinely came back online — flush the queue
        flushSOSQueue().then((count) => {
          if (count > 0) {
            setStatusMsg(`✅ ${count} queued SOS sent automatically.`);
            setTimeout(() => setStatusMsg(null), 5000);
          }
        });
      }
    });

    return () => unsub(); // cleanup on unmount only
  }, []); // ✅ empty dep array — subscribe once, never re-subscribes

  const handleSOS = async () => {
    if (sosState === STATE_LOADING || sosState === STATE_SENT) return;
    if (!victimId) return;

    // Haptic feedback immediately — before network call
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    setSosState(STATE_LOADING);
    setStatusMsg(null);

    if (!isOnlineRef.current) {
      // Offline — queue for later
      await enqueueSOSForRetry(victimId);
      setSosState(STATE_QUEUED);
      setStatusMsg('📴 Offline — SOS saved. Will send automatically when internet returns.');
      return;
    }

    try {
      const result = await sendSOS(victimId);
      if (result.success) {
        setSosState(STATE_SENT);
        setStatusMsg('🚨 SOS dispatched! Help is on the way. Your ID: ' + victimId);
        setTimeout(() => {
          setSosState(STATE_IDLE);
          setStatusMsg(null);
        }, 15000);
      } else {
        setSosState(STATE_QUEUED);
        await enqueueSOSForRetry(victimId);
        setStatusMsg('⚠️ Server error — SOS saved locally. Will retry automatically.');
      }
    } catch {
      setSosState(STATE_QUEUED);
      await enqueueSOSForRetry(victimId);
      setStatusMsg('📴 Could not reach server — SOS queued. Will send when online.');
    }
  };

  const handleCopyId = () => {
    if (!victimId) return;
    Clipboard.setString(victimId);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const btnColor = sosState === STATE_SENT
    ? '#16a34a'
    : sosState === STATE_QUEUED
    ? '#d97706'
    : '#dc2626';

  const btnLabel = sosState === STATE_LOADING
    ? '...'
    : sosState === STATE_SENT
    ? '✓ SOS SENT'
    : sosState === STATE_QUEUED
    ? '📴 QUEUED'
    : 'SOS';

  return (
    <SafeAreaView style={styles.container}>
      {/* Network status bar */}
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>📴 Offline — SOS will be queued and sent automatically when you reconnect</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🆘 Emergency SOS</Text>
        <Text style={styles.headerSub}>Nyaya-Sakhi · NHAA Crisis Line</Text>
      </View>

      <View style={styles.body}>
        {/* Victim ID display */}
        <View style={styles.idCard}>
          <Text style={styles.idLabel}>Your Anonymous Safety ID</Text>
          <Text style={styles.idValue}>{victimId || '…generating…'}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyId}>
            <Text style={styles.copyText}>{copied ? '✅ Copied!' : '📋 Copy ID'}</Text>
          </TouchableOpacity>
          <Text style={styles.idHint}>Share this with an officer so they can link your case</Text>
        </View>

        {/* SOS Button */}
        <View style={styles.sosContainer}>
          <Animated.View style={{ transform: [{ scale: sosState === STATE_IDLE ? pulseAnim : 1 }] }}>
            <TouchableOpacity
              style={[
                styles.sosButton,
                { backgroundColor: btnColor },
                (sosState === STATE_LOADING || sosState === STATE_SENT) && styles.sosDisabled
              ]}
              onPress={handleSOS}
              disabled={sosState === STATE_LOADING || sosState === STATE_SENT}
              activeOpacity={0.8}
            >
              {sosState === STATE_LOADING
                ? <ActivityIndicator size="large" color="#fff" />
                : <Text style={styles.sosLabel}>{btnLabel}</Text>
              }
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.sosInstructions}>
            {sosState === STATE_IDLE
              ? 'Press and hold for 1 second\nto send emergency alert'
              : statusMsg || 'Processing…'}
          </Text>
        </View>

        {/* Status message */}
        {statusMsg && sosState !== STATE_IDLE && (
          <View style={[styles.statusBanner, {
            backgroundColor: sosState === STATE_SENT ? '#052e16' : '#451a03',
            borderColor: sosState === STATE_SENT ? '#22c55e' : '#f59e0b'
          }]}>
            <Text style={[styles.statusText, {
              color: sosState === STATE_SENT ? '#86efac' : '#fcd34d'
            }]}>{statusMsg}</Text>
          </View>
        )}

        {/* Emergency numbers */}
        <View style={styles.helplines}>
          <Text style={styles.helplinesTitle}>📞 Emergency Helplines</Text>
          <Text style={styles.helpline}>🏛️ NHAA Helpline: <Text style={styles.helplineNum}>14566</Text></Text>
          <Text style={styles.helpline}>👮 Police: <Text style={styles.helplineNum}>100</Text></Text>
          <Text style={styles.helpline}>🚑 Ambulance: <Text style={styles.helplineNum}>108</Text></Text>
          <Text style={styles.helpline}>🤝 Women Helpline: <Text style={styles.helplineNum}>181</Text></Text>
        </View>

        {/* Legal rights nav */}
        <TouchableOpacity
          style={styles.infoLink}
          onPress={() => navigation.navigate('EmergencyInfo')}
        >
          <Text style={styles.infoLinkText}>📋 Know Your Legal Rights (SC/ST PoA) →</Text>
        </TouchableOpacity>
      </View>

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Change Role</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000' },
  offlineBar: {
    backgroundColor: '#451a03',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
  },
  offlineText: { color: '#fcd34d', fontSize: 12, textAlign: 'center' },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#2a0000',
    borderBottomWidth: 1,
    borderBottomColor: '#7f1d1d',
  },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#fca5a5', fontSize: 12, marginTop: 2 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  idCard: {
    backgroundColor: '#2d0000',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#7f1d1d',
    marginBottom: 28,
    alignItems: 'center',
  },
  idLabel: { color: '#fca5a5', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  idValue: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    marginBottom: 10,
  },
  copyBtn: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  copyText: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  idHint: { color: '#64748b', fontSize: 11, textAlign: 'center' },
  sosContainer: { alignItems: 'center', marginBottom: 24 },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 16,
  },
  sosDisabled: { shadowOpacity: 0.2, elevation: 4 },
  sosLabel: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sosInstructions: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  statusBanner: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  helplines: {
    backgroundColor: '#0a1628',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a50',
    gap: 6,
  },
  helplinesTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  helpline: { color: '#cbd5e1', fontSize: 13 },
  helplineNum: { color: '#60a5fa', fontWeight: '800' },
  infoLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  infoLinkText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backText: { color: '#475569', fontSize: 13 },
});
