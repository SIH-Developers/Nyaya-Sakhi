import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { OFFICER_KEY_STORE_KEY, OWNER_ID_STORE_KEY, API_BASE } from '../config/api';

export default function CounselorLogin({ navigation }) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter your Officer Access Key.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/victims?role=counselor`, {
        headers: { 'x-officer-key': trimmed },
      });
      if (res.status === 403 || res.status === 401) {
        Alert.alert('Invalid Key', 'Officer key not recognised. Please check and try again.');
        return;
      }
      if (!res.ok) {
        Alert.alert('Error', `Server error (${res.status}). Please try again.`);
        return;
      }
      await SecureStore.setItemAsync(OFFICER_KEY_STORE_KEY, trimmed);
      await SecureStore.setItemAsync(OWNER_ID_STORE_KEY, 'counselor');
      navigation.replace('AlertFeed', { officerKey: trimmed });
    } catch (err) {
      Alert.alert('Network Error', 'Could not connect. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Top nav */}
          <View style={styles.topNav}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={styles.authBadge}>
              <Text style={styles.authIcon}>🛡️</Text>
              <Text style={styles.authText}>AUTHORIZED ACCESS</Text>
            </View>
          </View>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <View style={styles.iconBox}>
              <Text style={styles.iconEmoji}>🛡️</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Counselor Login</Text>
          <Text style={styles.subtitle}>
            Enter credential credentials to decrypt{'\n'}casework records and active triage feeds.
          </Text>

          {/* Key input */}
          <View style={styles.form}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Officer Key</Text>
              <Text style={styles.labelHint}>8-digit format</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={key}
                onChangeText={setKey}
                placeholder="Enter your assigned 8-digit key"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showKey}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowKey(!showKey)}>
                <Text style={styles.eyeIcon}>{showKey ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.signInText}>Sign In  →</Text>
              }
            </TouchableOpacity>

            {/* Biometrics */}
            <TouchableOpacity style={styles.biometricsBtn}>
              <Text style={styles.biometricsIcon}>🪪</Text>
              <Text style={styles.biometricsText}>Use Hardware Key / Biometrics</Text>
            </TouchableOpacity>
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>🔒</Text>
            <Text style={styles.infoText}>
              Contact your district administrator if you don't have a key or your assignment token requires statutory re-issuance.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  topNav: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  backArrow: { fontSize: 18, color: '#0f172a', fontWeight: '600' },
  authBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0fdf9', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  authIcon: { fontSize: 12 },
  authText: { color: '#0d9488', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  iconWrap: { alignItems: 'center', marginTop: 20, marginBottom: 16 },
  iconBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#f0fdf9',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#d1fae5',
  },
  iconEmoji: { fontSize: 34 },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19, marginBottom: 28 },
  form: { gap: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  labelHint: { fontSize: 12, color: '#94a3b8' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  input: {
    flex: 1, paddingVertical: 14, fontSize: 15, color: '#0f172a',
  },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },
  signInBtn: {
    backgroundColor: '#0d6e64', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#0d6e64', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  signInText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  biometricsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
  },
  biometricsIcon: { fontSize: 16 },
  biometricsText: { color: '#0d9488', fontSize: 14, fontWeight: '600' },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0', marginTop: 20,
  },
  infoIcon: { fontSize: 18, marginTop: 1 },
  infoText: { flex: 1, color: '#64748b', fontSize: 13, lineHeight: 19 },
});
