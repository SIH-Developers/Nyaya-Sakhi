import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HELPLINES = [
  { label: 'NHAA National Helpline', number: '14566', emoji: '🏛️', color: '#3b82f6' },
  { label: 'Police Emergency', number: '100', emoji: '👮', color: '#dc2626' },
  { label: 'Ambulance', number: '108', emoji: '🚑', color: '#dc2626' },
  { label: 'Women Helpline', number: '181', emoji: '🤝', color: '#9333ea' },
  { label: 'Child Helpline', number: '1098', emoji: '👶', color: '#f59e0b' },
  { label: 'National Legal Aid', number: '15100', emoji: '⚖️', color: '#22c55e' },
];

const RIGHTS = [
  {
    title: 'Right to File FIR',
    detail:
      'Under SC/ST PoA Act Section 18A, a victim has the right to register an FIR at any police station. Police CANNOT refuse to register it. If refused, contact the SP/DSP directly.',
    icon: '📋',
  },
  {
    title: 'Protection from Bail (Section 18)',
    detail:
      'Accused in SC/ST atrocity cases CANNOT get anticipatory bail under Section 438 CrPC. If bail was wrongly granted, your legal aid officer can file for bail cancellation.',
    icon: '🔒',
  },
  {
    title: 'Right to Compensation',
    detail:
      'You are entitled to interim relief within 7 days of FIR as per SC/ST PoA Rules 2016. Final compensation varies by offense. Contact your District Social Welfare Officer.',
    icon: '💰',
  },
  {
    title: 'Witness Protection (Section 15A)',
    detail:
      'As a victim-witness, you have the right to protection from intimidation, relocation if needed, and in-camera trial. Report all threats immediately to the Special Court.',
    icon: '🛡️',
  },
  {
    title: 'Free Legal Aid',
    detail:
      'Every SC/ST atrocity victim is entitled to free legal representation under the Legal Services Authorities Act. Contact DLSA (District Legal Services Authority) or call 15100.',
    icon: '⚖️',
  },
  {
    title: 'Medical Examination Right',
    detail:
      'In cases of assault, rape, or grievous hurt, the victim has the right to a free medical examination and report under Section 164A CrPC. This report is crucial evidence.',
    icon: '🏥',
  },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
];

const TRANSLATIONS = {
  rightToFile: {
    en: 'Right to File FIR',
    hi: 'FIR दर्ज करने का अधिकार',
    bn: 'FIR দায়ের করার অধিকার',
  },
  freeAid: {
    en: 'Free Legal Aid',
    hi: 'नि:शुल्क कानूनी सहायता',
    bn: 'বিনামূল্যে আইনি সহায়তা',
  },
};

export default function EmergencyInfo({ navigation }) {
  const [lang, setLang] = useState('en');

  const callNumber = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Your Legal Rights</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Language toggle */}
        <View style={styles.langRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
              onPress={() => setLang(l.code)}
            >
              <Text style={[styles.langText, lang === l.code && styles.langTextActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Complaint banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            {lang === 'hi'
              ? '⚠️ SC/ST अत्याचार रोकथाम अधिनियम के अंतर्गत आपके अधिकार'
              : lang === 'bn'
              ? '⚠️ SC/ST নৃশংসতা প্রতিরোধ আইনের অধীনে আপনার অধিকার'
              : '⚠️ Know Your Rights Under SC/ST PoA Act'}
          </Text>
          <Text style={styles.bannerSub}>
            {lang === 'hi'
              ? 'यह जानकारी 100% गोपनीय है। कोई डिजिटल फुटप्रिंट नहीं।'
              : lang === 'bn'
              ? 'এই তথ্য ১০০% গোপনীয়। কোনো ডিজিটাল ফুটপ্রিন্ট নেই।'
              : 'This information is 100% confidential. No digital footprint stored.'}
          </Text>
        </View>

        {/* Rights cards */}
        {RIGHTS.map((right, i) => (
          <View key={i} style={styles.rightCard}>
            <View style={styles.rightHeader}>
              <Text style={styles.rightIcon}>{right.icon}</Text>
              <Text style={styles.rightTitle}>{right.title}</Text>
            </View>
            <Text style={styles.rightDetail}>{right.detail}</Text>
          </View>
        ))}

        {/* Helplines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Emergency Helplines</Text>
          <Text style={styles.sectionSub}>Tap any number to call directly</Text>
          {HELPLINES.map((h, i) => (
            <TouchableOpacity
              key={i}
              style={styles.helplineCard}
              onPress={() => callNumber(h.number)}
              activeOpacity={0.8}
            >
              <Text style={styles.helplineEmoji}>{h.emoji}</Text>
              <View style={styles.helplineInfo}>
                <Text style={styles.helplineLabel}>{h.label}</Text>
                <Text style={[styles.helplineNumber, { color: h.color }]}>{h.number}</Text>
              </View>
              <Text style={styles.callIcon}>📲</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Onestop centers */}
        <View style={[styles.section, styles.osc]}>
          <Text style={styles.sectionTitle}>🏥 Sakhi One-Stop Centres</Text>
          <Text style={styles.oscText}>
            Sakhi OSCs provide free medical aid, legal assistance, police assistance,
            psycho-social counselling and temporary shelter — all under one roof.
            {'\n\n'}Available in all 36 states/UTs across India. No fees. Fully confidential.
          </Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL('https://wcd.nic.in/schemes/sakhi-one-stop-centre')
            }
          >
            <Text style={styles.oscLink}>Find your nearest OSC →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
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
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1a3a5c',
    borderWidth: 1,
    borderColor: '#2a5a8c',
  },
  langBtnActive: { backgroundColor: '#1e5fa8', borderColor: '#3b82f6' },
  langText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  langTextActive: { color: '#ffffff' },
  banner: {
    backgroundColor: '#450a0a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dc2626',
    marginBottom: 4,
  },
  bannerTitle: { color: '#fca5a5', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  bannerSub: { color: '#94a3b8', fontSize: 12 },
  rightCard: {
    backgroundColor: '#0d1f30',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e3a50',
  },
  rightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  rightIcon: { fontSize: 22 },
  rightTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700', flex: 1 },
  rightDetail: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  section: { marginTop: 8 },
  sectionTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sectionSub: { color: '#64748b', fontSize: 12, marginBottom: 10 },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1f30',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e3a50',
  },
  helplineEmoji: { fontSize: 24, marginRight: 12 },
  helplineInfo: { flex: 1 },
  helplineLabel: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  helplineNumber: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  callIcon: { fontSize: 20 },
  osc: {
    backgroundColor: '#022448',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e4060',
  },
  oscText: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginTop: 8 },
  oscLink: { color: '#60a5fa', fontSize: 14, fontWeight: '700', marginTop: 10 },
});
