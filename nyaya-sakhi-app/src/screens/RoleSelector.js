import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LANGUAGES = ['English', 'हिंदी', 'বাংলা'];

const STRINGS = {
  English: {
    title: 'Nyaya-Sakhi',
    subtitle: 'न्याय-सखी',
    tagline: 'Legal & Crisis Companion for Support & Justice',
    needHelp: 'I Need Help',
    needHelpSub: 'Confidential crisis & legal rights support',
    safe: 'SAFE',
    counselor: "I'm a Counselor / Officer",
    counselorSub: 'Access alerts, legal logs & case triage',
    free: '100% Free',
    freeTag: 'Govt Recognized',
    anon: 'Anonymous',
    anonTag: 'No Login Required',
    poa: 'PoA & BNS',
    poaTag: 'Statutory Protections',
    emergency: 'Immediate Emergency?',
    emergencySub: 'Toll-free 24x7 crisis hotlines',
    footer: 'Secured under Digital Personal Data Protection (DPDP) Act.',
  },
  'हिंदी': {
    title: 'न्याय-सखी',
    subtitle: 'Nyaya-Sakhi',
    tagline: 'न्याय और सहायता के लिए कानूनी और संकट साथी',
    needHelp: 'मुझे सहायता चाहिए',
    needHelpSub: 'गोपनीय संकट और कानूनी अधिकार सहायता',
    safe: 'सुरक्षित',
    counselor: 'मैं परामर्शदाता / अधिकारी हूं',
    counselorSub: 'अलर्ट, कानूनी लॉग और केस ट्राइएज',
    free: '100% निःशुल्क',
    freeTag: 'सरकार मान्यता',
    anon: 'गुमनाम',
    anonTag: 'लॉगिन नहीं',
    poa: 'PoA & BNS',
    poaTag: 'कानूनी सुरक्षा',
    emergency: 'तत्काल आपातकाल?',
    emergencySub: 'टोल-फ्री 24x7 हेल्पलाइन',
    footer: 'DPDP अधिनियम के तहत सुरक्षित।',
  },
  'বাংলা': {
    title: 'ন্যায়-সখী',
    subtitle: 'Nyaya-Sakhi',
    tagline: 'ন্যায় ও সহায়তার জন্য আইনি ও সংকট সঙ্গী',
    needHelp: 'আমার সাহায্য দরকার',
    needHelpSub: 'গোপনীয় সংকট ও আইনি অধিকার সহায়তা',
    safe: 'নিরাপদ',
    counselor: 'আমি কাউন্সেলর / অফিসার',
    counselorSub: 'সতর্কতা, আইনি লগ ও কেস ট্রায়াজ',
    free: '১০০% বিনামূল্যে',
    freeTag: 'সরকার স্বীকৃত',
    anon: 'বেনামী',
    anonTag: 'লগইন নেই',
    poa: 'PoA & BNS',
    poaTag: 'সংবিধিবদ্ধ সুরক্ষা',
    emergency: 'তাৎক্ষণিক জরুরি?',
    emergencySub: 'বিনামূল্যে 24x7 হেল্পলাইন',
    footer: 'DPDP আইনের অধীনে সুরক্ষিত।',
  },
};

export default function RoleSelector({ navigation }) {
  const [lang, setLang] = useState('English');
  const s = STRINGS[lang];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.securityBadge}>
          <Text style={styles.securityText}>🔒 Confidential & Encrypted</Text>
        </View>
        <TouchableOpacity style={styles.quickExit}
          onPress={() => Linking.openURL('https://google.com')}>
          <Text style={styles.quickExitText}>⚡ Quick Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Logo + Title */}
      <View style={styles.hero}>
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🔒</Text>
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.subtitle}>{s.subtitle}</Text>
        <Text style={styles.tagline}>{s.tagline}</Text>

        {/* Language toggle */}
        <View style={styles.langRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.langBtn, lang === l && styles.langBtnActive]}
              onPress={() => setLang(l)}
            >
              <Text style={[styles.langText, lang === l && styles.langTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.langBtn}>
            <Text style={styles.langText}>🌐</Text>
          </View>
        </View>
      </View>

      {/* Role Cards */}
      <View style={styles.cards}>
        {/* Victim / Help */}
        <TouchableOpacity
          style={styles.helpCard}
          onPress={() => navigation.navigate('SOSHome')}
          activeOpacity={0.88}
        >
          <View style={styles.cardIconBox}>
            <Text style={styles.cardIcon}>🎧</Text>
          </View>
          <View style={styles.cardText}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{s.needHelp}</Text>
              <View style={styles.safeBadge}><Text style={styles.safeText}>{s.safe}</Text></View>
            </View>
            <Text style={styles.cardSub}>{s.needHelpSub}</Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>

        {/* Counselor */}
        <TouchableOpacity
          style={styles.counselorCard}
          onPress={() => navigation.navigate('CounselorLogin')}
          activeOpacity={0.88}
        >
          <View style={[styles.cardIconBox, styles.counselorIconBox]}>
            <Text style={styles.cardIcon}>🛡️</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: '#1a2e44' }]}>{s.counselor}</Text>
            <Text style={styles.cardSub}>{s.counselorSub}</Text>
          </View>
          <Text style={[styles.cardArrow, { color: '#64748b' }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Feature badges */}
      <View style={styles.badges}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>🛡️</Text>
          <Text style={styles.badgeTitle}>{s.free}</Text>
          <Text style={styles.badgeTag}>{s.freeTag}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>👁️</Text>
          <Text style={styles.badgeTitle}>{s.anon}</Text>
          <Text style={styles.badgeTag}>{s.anonTag}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>⚖️</Text>
          <Text style={styles.badgeTitle}>{s.poa}</Text>
          <Text style={styles.badgeTag}>{s.poaTag}</Text>
        </View>
      </View>

      {/* Emergency strip */}
      <View style={styles.emergencyStrip}>
        <View style={styles.emergencyLeft}>
          <View style={styles.phoneCircle}><Text>📞</Text></View>
          <View>
            <Text style={styles.emergencyTitle}>{s.emergency}</Text>
            <Text style={styles.emergencySub}>{s.emergencySub}</Text>
          </View>
        </View>
        <View style={styles.emergencyBtns}>
          <TouchableOpacity style={styles.emergencyBtn} onPress={() => Linking.openURL('tel:112')}>
            <Text style={styles.emergencyBtnText}>112</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emergencyBtn} onPress={() => Linking.openURL('tel:14566')}>
            <Text style={styles.emergencyBtnText}>14566</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.footer}>{s.footer}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  securityBadge: {
    backgroundColor: '#e8f5f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  securityText: { color: '#0d9488', fontSize: 11, fontWeight: '600' },
  quickExit: {
    backgroundColor: '#fff0f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#fecaca',
  },
  quickExitText: { color: '#dc2626', fontSize: 11, fontWeight: '600' },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#0f2d3d',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoEmoji: { fontSize: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: 0.3 },
  subtitle: { fontSize: 16, color: '#0d9488', fontWeight: '700', marginTop: 2 },
  tagline: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  langRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  langBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  langBtnActive: { backgroundColor: '#f0fdf9', borderColor: '#0d9488' },
  langText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  langTextActive: { color: '#0d9488' },
  cards: { paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  helpCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d6e64',
    borderRadius: 16, padding: 16, gap: 12,
  },
  counselorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  counselorIconBox: { backgroundColor: '#f1f5f9' },
  cardIcon: { fontSize: 22 },
  cardText: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  safeBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  safeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  cardSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  cardArrow: { color: 'rgba(255,255,255,0.6)', fontSize: 24, fontWeight: '300' },
  badges: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, marginBottom: 14,
  },
  badge: { alignItems: 'center', gap: 3 },
  badgeIcon: { fontSize: 20, color: '#0d9488' },
  badgeTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  badgeTag: { fontSize: 10, color: '#64748b' },
  emergencyStrip: {
    marginHorizontal: 16, backgroundColor: '#fff5f5', borderRadius: 14,
    padding: 14, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', marginBottom: 12,
  },
  emergencyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  phoneCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
  },
  emergencyTitle: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  emergencySub: { color: '#64748b', fontSize: 11 },
  emergencyBtns: { flexDirection: 'row', gap: 6 },
  emergencyBtn: {
    backgroundColor: '#dc2626', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  emergencyBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  footer: { textAlign: 'center', color: '#94a3b8', fontSize: 11, paddingBottom: 8 },
});
