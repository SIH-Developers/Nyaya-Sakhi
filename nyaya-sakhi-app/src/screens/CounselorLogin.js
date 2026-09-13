import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { OFFICER_KEY_STORE_KEY, OWNER_ID_STORE_KEY } from '../config/api';
import { API_BASE } from '../config/api';

export default function CounselorLogin({ navigation }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter your Officer Access Key.');
      return;
    }
    setLoading(true);
    try {
      // Validate the key against the backend
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
      // Store securely
      await SecureStore.setItemAsync(OFFICER_KEY_STORE_KEY, trimmed);
      await SecureStore.setItemAsync(OWNER_ID_STORE_KEY, 'counselor');
      navigation.replace('AlertFeed', { officerKey: trimmed });
    } catch (err) {
      Alert.alert('Network Error', 'Could not connect to the server. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.icon}>🛡️</Text>
            <Text style={styles.title}>Counselor Login</Text>
            <Text style={styles.subtitle}>Enter your NHAA Officer Access Key</Text>
          </View>

          {/* Input */}
          <View style={styles.card}>
            <Text style={styles.label}>Officer Access Key</Text>
            <TextInput
              style={styles.input}
              value={key}
              onChangeText={setKey}
              placeholder="nhaa-officer-xxxx"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>Verify &amp; Login</Text>
              }
            </TouchableOpacity>

            <Text style={styles.hint}>
              Contact your District Officer or OSC supervisor if you do not have a key.
            </Text>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>🔒 Keys are stored securely using device encryption (SecureStore)</Text>
            <Text style={styles.infoText}>📋 This session persists across app restarts until you log out</Text>
          </View>

          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>← Back to Role Selection</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#022448' },
  inner: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  header: { alignItems: 'center', marginBottom: 32 },
  icon: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#a5c8f0', marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: '#0d2a40',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e4060',
    marginBottom: 20,
  },
  label: {
    color: '#94c4e0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1a3a5c',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a5a8c',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  btn: {
    backgroundColor: '#1e5fa8',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  hint: { color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  infoBox: {
    backgroundColor: 'rgba(30, 95, 168, 0.15)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a50',
    gap: 8,
    marginBottom: 24,
  },
  infoText: { color: '#8ab4d4', fontSize: 12, lineHeight: 17 },
  backBtn: { alignItems: 'center', paddingVertical: 8 },
  backText: { color: '#60a5d4', fontSize: 14, fontWeight: '600' },
});
