import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking,
  ActivityIndicator, Animated, Platform, StatusBar, Modal, ScrollView, Clipboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getOrCreateAnonymousId, sendSOS, enqueueSOSForRetry, flushSOSQueue, attachLocationToAlert } from '../services/api';
import { getLocationForSOS } from '../services/location';

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
  const [locationStatus, setLocationStatus] = useState(null); // 'attached' | 'unavailable' | null
  const [showCaseModal, setShowCaseModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isOnlineRef = useRef(true);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    getOrCreateAnonymousId().then(setVictimId);
  }, []);

  // Single persistent NetInfo subscription + startup flush
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      isOnlineRef.current = online;
      setIsOnline(online);
      if (online) {
        flushSOSQueue().then((count) => {
          if (count > 0) {
            setStatusMsg(`✅ ${count} queued SOS sent on startup.`);
            setTimeout(() => setStatusMsg(null), 5000);
          }
        });
      }
    });

    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      const wasOffline = !isOnlineRef.current;
      isOnlineRef.current = online;
      setIsOnline(online);
      if (wasOffline && online) {
        flushSOSQueue().then((count) => {
          if (count > 0) {
            setStatusMsg(`✅ ${count} queued SOS sent automatically.`);
            setTimeout(() => setStatusMsg(null), 5000);
          }
        });
      }
    });
    return () => unsub();
  }, []);

  const handleSOS = async () => {
    if (sosState === STATE_LOADING || sosState === STATE_SENT) return;
    if (!victimId) return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    setSosState(STATE_LOADING);
    setStatusMsg(null);
    setLocationStatus(null);

    if (!isOnlineRef.current) {
      await enqueueSOSForRetry(victimId);
      setSosState(STATE_QUEUED);
      setStatusMsg('📴 Offline — SOS saved. Will send when internet returns.');
      return;
    }

    // Fire SOS + location capture in parallel
    const sosPromise = sendSOS(victimId);
    const locationPromise = getLocationForSOS();

    const [sosResult, location] = await Promise.all([sosPromise, locationPromise]);

    if (sosResult?.success) {
      setSosState(STATE_SENT);
      setStatusMsg('🚨 SOS dispatched! Help is on the way.');

      if (location && sosResult?.alert_id) {
        attachLocationToAlert(sosResult.alert_id, location)
          .then(() => setLocationStatus('attached'))
          .catch((err) => {
            console.log('[Location] Failed to attach (non-critical):', err?.message);
            setLocationStatus('unavailable');
          });
      } else {
        setLocationStatus('unavailable');
      }

      setTimeout(() => {
        setSosState(STATE_IDLE);
        setStatusMsg(null);
        setLocationStatus(null);
      }, 15000);
    } else {
      setSosState(STATE_QUEUED);
      await enqueueSOSForRetry(victimId);
      setStatusMsg('⚠️ Server error — SOS saved locally. Will retry automatically.');
    }
  };

  const handleCopyId = () => {
    if (!victimId) return;
    Clipboard.setString(victimId);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const btnColor = sosState === STATE_SENT ? '#16a34a'
    : sosState === STATE_QUEUED ? '#d97706'
    : '#b91c1c';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.brandContainer}>
          <View style={styles.brandIconBox}>
            <MaterialCommunityIcons name="shield-half-full" size={16} color="#0d9488" />
          </View>
          <View>
            <Text style={styles.brandTitle}>NYAYA-SAKHI</Text>
            <Text style={styles.screenTitle}>Sos Home</Text>
          </View>
        </View>

        <View style={styles.avatarBox}>
          <Ionicons name="person-outline" size={18} color="#0f766e" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Badges Row */}
        <View style={styles.badgeRow}>
          <View style={styles.channelBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.channelText}>SECURED CHANNEL</Text>
          </View>
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-done-outline" size={14} color="#0f766e" />
            <Text style={styles.offlineBadgeText}>Ready Offline</Text>
          </View>
        </View>

        {/* SOS Interactive Box Container */}
        <View style={styles.heroOuterContainer}>
          <View style={styles.ring3}>
            <View style={styles.ring2}>
              <View style={styles.ring1}>
                <Animated.View style={{ transform: [{ scale: sosState === STATE_IDLE ? pulseAnim : 1 }] }}>
                  <TouchableOpacity
                    style={[styles.sosSquareBtn, { backgroundColor: btnColor }]}
                    onPress={handleSOS}
                    disabled={sosState === STATE_LOADING || sosState === STATE_SENT}
                    activeOpacity={0.85}
                  >
                    {sosState === STATE_LOADING ? (
                      <ActivityIndicator size="large" color="#ffffff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="shield-heart-outline" size={44} color="#ffffff" />
                        <Text style={styles.sosMainText}>
                          {sosState === STATE_SENT ? 'SENT' : sosState === STATE_QUEUED ? 'QUEUED' : 'SOS'}
                        </Text>
                        <Text style={styles.sosSubText}>
                          {sosState === STATE_SENT ? 'HELP DISPATCHED' : sosState === STATE_QUEUED ? 'SAVED LOCALLY' : 'TAP FOR HELP'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </View>
        </View>

        {/* Main Instruction */}
        <Text style={styles.mainInstructionTitle}>Tap the button if you need immediate help.</Text>
        <Text style={styles.mainInstructionSub}>
          Dispatches coordinates silently to national helpline networks.
        </Text>

        {/* Location or Status Toast Banner */}
        {locationStatus === 'attached' && (
          <View style={styles.locBadge}>
            <Ionicons name="location" size={14} color="#16a34a" />
            <Text style={styles.locBadgeText}>GPS location attached to alert</Text>
          </View>
        )}

        {statusMsg && (
          <View style={[styles.statusBanner, {
            backgroundColor: sosState === STATE_SENT ? '#f0fdf4' : '#fffbeb',
            borderColor: sosState === STATE_SENT ? '#86efac' : '#fcd34d',
          }]}>
            <Text style={[styles.statusText, { color: sosState === STATE_SENT ? '#166534' : '#92400e' }]}>
              {statusMsg}
            </Text>
          </View>
        )}

        {/* Outbox Pill Banner */}
        <View style={styles.outboxCard}>
          <MaterialCommunityIcons name="send-clock-outline" size={18} color="#0f766e" style={{ marginRight: 8 }} />
          <Text style={styles.outboxText}>Works offline. Outbox auto-relays when network returns.</Text>
        </View>

        {/* 2-Column Action Cards */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('EmergencyInfo')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="book-outline" size={20} color="#4338ca" />
            </View>
            <Text style={styles.actionTitle}>Emergency Info</Text>
            <Text style={styles.actionSub}>& Legal Rights</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowCaseModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#ccfbf1' }]}>
              <MaterialCommunityIcons name="fingerprint" size={22} color="#0f766e" />
            </View>
            <Text style={styles.actionTitle}>Existing Case?</Text>
            <Text style={styles.actionSub}>Attach Victim ID</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Case Attachment Modal */}
      <Modal visible={showCaseModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Safety ID</Text>
              <TouchableOpacity onPress={() => setShowCaseModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Share this anonymous ID with your officer or counselor to link your existing court case securely.
            </Text>

            <View style={styles.idBox}>
              <Text style={styles.idText}>{victimId || 'Generating…'}</Text>
            </View>

            <TouchableOpacity style={styles.copyButton} onPress={handleCopyId}>
              <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.copyBtnText}>{copied ? 'Copied to Clipboard!' : 'Copy Safety ID'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCaseModal(false)}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBtn: { padding: 4 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center',
  },
  brandTitle: { color: '#0d9488', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  screenTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  avatarBox: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, alignItems: 'center' },
  badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%', justifyContent: 'space-between' },
  channelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  channelText: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ccfbf1', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  offlineBadgeText: { color: '#0f766e', fontSize: 11, fontWeight: '700' },
  
  // Hero Layered Box
  heroOuterContainer: {
    width: '100%', alignItems: 'center', justifyContent: 'center', marginVertical: 10,
  },
  ring3: {
    backgroundColor: '#fdf2f4', padding: 14, borderRadius: 36, width: 280, height: 280,
    alignItems: 'center', justifyContent: 'center',
  },
  ring2: {
    backgroundColor: '#fce7f3', padding: 14, borderRadius: 30, width: 252, height: 252,
    alignItems: 'center', justifyContent: 'center',
  },
  ring1: {
    backgroundColor: '#fbcfe8', padding: 12, borderRadius: 26, width: 224, height: 224,
    alignItems: 'center', justifyContent: 'center',
  },
  sosSquareBtn: {
    width: 200, height: 200, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', padding: 16,
    elevation: 8, shadowColor: '#b91c1c', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12,
  },
  sosMainText: { color: '#ffffff', fontSize: 32, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
  sosSubText: { color: '#fee2e2', fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.8 },

  mainInstructionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  mainInstructionSub: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },

  locBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#86efac', marginTop: 12,
  },
  locBadgeText: { color: '#166534', fontSize: 12, fontWeight: '600' },
  statusBanner: {
    width: '100%', borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 12, alignItems: 'center',
  },
  statusText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  outboxCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0', width: '100%', marginTop: 20,
  },
  outboxText: { color: '#475569', fontSize: 13, flex: 1, fontWeight: '500' },

  actionGrid: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 16 },
  actionCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  actionIconBox: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  actionTitle: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  actionSub: { color: '#64748b', fontSize: 12, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 20, padding: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  modalSub: { color: '#64748b', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  idBox: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#cbd5e1',
    alignItems: 'center', marginBottom: 16,
  },
  idText: { color: '#0f172a', fontSize: 16, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyButton: {
    flexDirection: 'row', backgroundColor: '#0f766e', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  copyBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  closeBtn: { paddingVertical: 10, alignItems: 'center' },
  closeBtnText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
