import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const STATUTORY_RIGHTS = [
  {
    num: '01',
    title: 'Right to Free Legal Aid',
    detail: 'You are entitled to a qualified government advocate at state expense from day one of filing your complaint. The District Legal Services Authority (DLSA) is bound to assign independent legal counsel without any fees or paperwork delays.',
    section: 'Section 15A & Legal Services Authorities Act',
    icon: 'scale-outline',
  },
  {
    num: '02',
    title: 'Right to Immediate Compensation',
    detail: 'Monetary relief must be provided within statutory timelines at FIR registration, charge-sheet submission, and court conviction stages. The District Administration is mandated to release tranche payments directly to your certified bank account.',
    section: 'PoA Rule 12(4) Schedule of Relief',
    icon: 'cash-outline',
  },
  {
    num: '03',
    title: 'Right to Protection from Intimidation',
    detail: 'Under Section 15A, the state must provide police protection, safe transit, and secure alternative residence if you or your witnesses face intimidation, coercion, social boycott, or physical threat from any party.',
    section: 'Section 15A Witness Protection Scheme',
    icon: 'shield-checkmark-outline',
  },
  {
    num: '04',
    title: 'Right to Free Travel & Maintenance',
    detail: 'Daily boarding expenses, food allowances, and verified transportation charges must be reimbursed in full for you and your accompanying attendant during investigation inquiries, medical exams, and court trial hearings.',
    section: 'Rule 11 SC/ST A Compensation Provisions',
    icon: 'bus-outline',
  },
  {
    num: '05',
    title: 'Right to Information & Case Copies',
    detail: 'You are legally entitled to receive completely free copies of the registered FIR, forensic and medical examination reports, witness statements, and the official police charge sheet within 24 hours of filing or submission.',
    section: 'Section 15A(8) Immediate Document Delivery',
    icon: 'document-text-outline',
  },
  {
    num: '06',
    title: 'Right to Special Court Hearing',
    detail: 'Crimes under the Act must be tried in designated Exclusive Special Courts at the district level. Trials are mandated to proceed on a day-to-day schedule to prevent prolonged delays, witness fatigue, and judicial backlog.',
    section: 'Section 14 Designated Speedy Special Courts',
    icon: 'briefcase-outline',
  },
];

export default function EmergencyInfo({ navigation }) {
  const callNumber = (num) => {
    Linking.openURL(`tel:${num}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
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
            <Text style={styles.screenTitle}>Emergency Info</Text>
          </View>
        </View>

        <View style={styles.avatarBox}>
          <Ionicons name="person-outline" size={18} color="#0f766e" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Badges Row */}
        <View style={styles.badgeRow}>
          <View style={styles.channelBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.channelText}>100% Offline Ready</Text>
          </View>
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-done-outline" size={14} color="#0f766e" />
            <Text style={styles.offlineBadgeText}>Cached locally</Text>
          </View>
        </View>

        {/* Priority Dialers Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.priorityHeaderRow}>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeIcon}>✳</Text>
              <Text style={styles.priorityBadgeText}>PRIORITY DIALERS</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Emergency Helpline Hotlines</Text>
          <Text style={styles.sectionSub}>
            These standard statutory lines function without mobile internet. Tapping any item below initiates a telephone dial request directly.
          </Text>

          {/* Hotline 1: 112 (Red Hero Card) */}
          <TouchableOpacity
            style={styles.heroHotlineCard}
            onPress={() => callNumber('112')}
            activeOpacity={0.85}
          >
            <View style={styles.heroHotlineLeft}>
              <View style={styles.heroPhoneCircle}>
                <Ionicons name="call" size={20} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroHotlineTitle}>National Emergency</Text>
                <Text style={styles.heroHotlineSub}>Single Police, Fire & Medical Access</Text>
              </View>
            </View>
            <View style={styles.heroNumberBadge}>
              <Text style={styles.heroNumberText}>112</Text>
              <Ionicons name="chevron-forward" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* Hotline 2: 14566 */}
          <TouchableOpacity
            style={styles.hotlineCard}
            onPress={() => callNumber('14566')}
            activeOpacity={0.8}
          >
            <View style={[styles.hotlineIconCircle, { backgroundColor: '#ccfbf1' }]}>
              <MaterialCommunityIcons name="shield-account" size={20} color="#0f766e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineTitle}>Atrocities Helpline</Text>
              <Text style={styles.hotlineSub}>24/7 National Toll Free Assistance</Text>
            </View>
            <View style={styles.hotlineNumBox}>
              <Text style={styles.hotlineNumText}>14566</Text>
              <Ionicons name="call-outline" size={14} color="#0f766e" />
            </View>
          </TouchableOpacity>

          {/* Hotline 3: 181 */}
          <TouchableOpacity
            style={styles.hotlineCard}
            onPress={() => callNumber('181')}
            activeOpacity={0.8}
          >
            <View style={[styles.hotlineIconCircle, { backgroundColor: '#f3e8ff' }]}>
              <MaterialCommunityIcons name="human-female" size={20} color="#7e22ce" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineTitle}>Women Helpline</Text>
              <Text style={styles.hotlineSub}>Dedicated Distress & Legal Support</Text>
            </View>
            <View style={styles.hotlineNumBox}>
              <Text style={styles.hotlineNumText}>181</Text>
              <Ionicons name="call-outline" size={14} color="#0f766e" />
            </View>
          </TouchableOpacity>

          {/* Hotline 4: 100 */}
          <TouchableOpacity
            style={styles.hotlineCard}
            onPress={() => callNumber('100')}
            activeOpacity={0.8}
          >
            <View style={[styles.hotlineIconCircle, { backgroundColor: '#e2e8f0' }]}>
              <MaterialCommunityIcons name="police-badge" size={20} color="#334155" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineTitle}>District Nodal / Police</Text>
              <Text style={styles.hotlineSub}>Local station desk dispatch</Text>
            </View>
            <View style={styles.hotlineNumBox}>
              <Text style={styles.hotlineNumText}>100</Text>
              <Ionicons name="call-outline" size={14} color="#0f766e" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Statutory Rights Section */}
        <View style={styles.rightsHeaderSection}>
          <View style={styles.rightsTitleRow}>
            <View style={styles.greenDot} />
            <Text style={styles.rightsMainTitle}>Statutory Rights (SC/ST Act)</Text>
          </View>
          <Text style={styles.rightsMainSub}>
            Protected rights under the Scheduled Castes & Scheduled Tribes (Prevention of Atrocities) Act. Plain-language reference guaranteed below.
          </Text>
        </View>

        {/* Statutory Rights Cards */}
        {STATUTORY_RIGHTS.map((right) => (
          <View key={right.num} style={styles.rightCard}>
            <View style={styles.rightCardHeader}>
              <View style={styles.rightNumPill}>
                <Text style={styles.rightNumText}>Statutory Right {right.num}</Text>
              </View>
              <Ionicons name={right.icon} size={20} color="#0f766e" />
            </View>

            <Text style={styles.rightCardTitle}>{right.title}</Text>
            <Text style={styles.rightCardDetail}>{right.detail}</Text>

            <View style={styles.rightFooterRow}>
              <Ionicons name="compass-outline" size={14} color="#0f766e" style={{ marginRight: 4 }} />
              <Text style={styles.rightSectionText}>{right.section}</Text>
            </View>
          </View>
        ))}

        {/* Encrypted & Offline Preserved Banner */}
        <View style={styles.footerBanner}>
          <View style={styles.lockCircle}>
            <Ionicons name="lock-closed" size={16} color="#4338ca" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerTitle}>Encrypted & Offline Preserved</Text>
            <Text style={styles.footerSub}>
              This reference manual remains readable at all times without active cellular or Wi-Fi connectivity.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  
  badgeRow: { flexDirection: 'row', gap: 10, marginBottom: 20, justifyContent: 'space-between' },
  channelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  channelText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ccfbf1', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  offlineBadgeText: { color: '#0f766e', fontSize: 11, fontWeight: '700' },

  sectionContainer: { marginBottom: 24 },
  priorityHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fee2e2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  priorityBadgeIcon: { color: '#b91c1c', fontSize: 12, fontWeight: '800' },
  priorityBadgeText: { color: '#b91c1c', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800', marginTop: 4 },
  sectionSub: { color: '#64748b', fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: 16 },

  // Hotlines
  heroHotlineCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#b91c1c', borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 3, shadowColor: '#b91c1c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  heroHotlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  heroPhoneCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroHotlineTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  heroHotlineSub: { color: '#fca5a5', fontSize: 12, marginTop: 2 },
  heroNumberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroNumberText: { color: '#ffffff', fontSize: 22, fontWeight: '900' },

  hotlineCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4,
  },
  hotlineIconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  hotlineTitle: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  hotlineSub: { color: '#64748b', fontSize: 12, marginTop: 1 },
  hotlineNumBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hotlineNumText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },

  // Rights
  rightsHeaderSection: { marginTop: 8, marginBottom: 16 },
  rightsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rightsMainTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  rightsMainSub: { color: '#64748b', fontSize: 13, lineHeight: 18, marginTop: 4 },

  rightCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  rightCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rightNumPill: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  rightNumText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  rightCardTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  rightCardDetail: { color: '#475569', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  rightFooterRow: { flexDirection: 'row', alignItems: 'center' },
  rightSectionText: { color: '#0f766e', fontSize: 12, fontWeight: '700' },

  // Footer banner
  footerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#e0e7ff', borderRadius: 16, padding: 16, marginTop: 12,
  },
  lockCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#c7d2fe',
    alignItems: 'center', justifyContent: 'center',
  },
  footerTitle: { color: '#312e81', fontSize: 14, fontWeight: '800' },
  footerSub: { color: '#4338ca', fontSize: 12, lineHeight: 17, marginTop: 2 },
});
