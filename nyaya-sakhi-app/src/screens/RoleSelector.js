import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoleSelector({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#022448" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emblem}>🏛️</Text>
        <Text style={styles.title}>Nyaya-Sakhi</Text>
        <Text style={styles.subtitle}>Ministry of Social Justice & Empowerment</Text>
        <Text style={styles.tagline}>NHAA · SC/ST PoA Crisis Support System</Text>
      </View>

      {/* Role buttons */}
      <View style={styles.body}>
        <Text style={styles.prompt}>Select your role to continue</Text>

        <TouchableOpacity
          style={[styles.roleCard, styles.cardCounselor]}
          onPress={() => navigation.navigate('CounselorLogin')}
          activeOpacity={0.85}
        >
          <Text style={styles.roleIcon}>🛡️</Text>
          <View style={styles.roleTextBlock}>
            <Text style={styles.roleTitle}>Counselor / Officer</Text>
            <Text style={styles.roleDesc}>Monitor cases, respond to SOS alerts, track escalations</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, styles.cardVictim]}
          onPress={() => navigation.navigate('SOSHome')}
          activeOpacity={0.85}
        >
          <Text style={styles.roleIcon}>🆘</Text>
          <View style={styles.roleTextBlock}>
            <Text style={styles.roleTitle}>Survivor / Victim</Text>
            <Text style={styles.roleDesc}>Send emergency SOS, access legal rights & helplines</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          National Helpline Against Atrocities · 14566
        </Text>
        <Text style={styles.footerSub}>
          Govt. of India · Ministry of Women & Child Development
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#022448' },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  emblem: { fontSize: 48, marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#a5c8f0',
    marginTop: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 11,
    color: '#6b9cbf',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  prompt: {
    color: '#8ab4d4',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardCounselor: {
    backgroundColor: '#1a3a5c',
    borderWidth: 1,
    borderColor: '#2a5a8c',
  },
  cardVictim: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  roleIcon: { fontSize: 36, marginRight: 16 },
  roleTextBlock: { flex: 1 },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  arrow: {
    fontSize: 28,
    color: '#94a3b8',
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  footerText: {
    color: '#60a5d4',
    fontSize: 12,
    fontWeight: '600',
  },
  footerSub: {
    color: '#4a6a80',
    fontSize: 11,
    marginTop: 2,
  },
});
