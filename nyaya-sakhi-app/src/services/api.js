import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/api';

const SOS_QUEUE_KEY = 'sos_offline_queue';

/**
 * Get or create a unique anonymous victim ID for this install.
 * Format: VIC-APP-{12 hex chars} — never a shared 'ANONYMOUS' string.
 */
export async function getOrCreateAnonymousId() {
  const existing = await AsyncStorage.getItem('anon_victim_id');
  if (existing) return existing;

  // Generate 12 random hex chars
  const hex = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('').toUpperCase();
  const newId = `VIC-APP-${hex}`;
  await AsyncStorage.setItem('anon_victim_id', newId);
  return newId;
}

/**
 * Send SOS to backend. Returns { success: boolean, message: string }.
 */
export async function sendSOS(victimId) {
  const res = await fetch(`${API_BASE}/sos/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ victim_id: victimId, channel: 'app_sos' }),
  });
  const data = await res.json();
  return { success: res.ok, message: data.message || data.detail || 'SOS dispatched.' };
}

/**
 * Enqueue an SOS for offline retry.
 */
export async function enqueueSOSForRetry(victimId) {
  const queue = JSON.parse(await AsyncStorage.getItem(SOS_QUEUE_KEY) || '[]');
  queue.push({ victimId, timestamp: Date.now() });
  await AsyncStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Flush the offline SOS queue. Call this when network comes back online.
 */
export async function flushSOSQueue() {
  const queue = JSON.parse(await AsyncStorage.getItem(SOS_QUEUE_KEY) || '[]');
  if (queue.length === 0) return;
  const remaining = [];
  for (const item of queue) {
    try {
      await sendSOS(item.victimId);
    } catch {
      remaining.push(item);
    }
  }
  await AsyncStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(remaining));
  return queue.length - remaining.length; // number sent
}

/**
 * Fetch all victims for the counselor alert feed.
 */
export async function fetchVictims(officerKey) {
  const res = await fetch(`${API_BASE}/victims?role=counselor`, {
    headers: { 'x-officer-key': officerKey },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.victims || [];
}

/**
 * Fetch full victim history for alert detail.
 */
export async function fetchVictimHistory(victimId, officerKey) {
  const res = await fetch(`${API_BASE}/victim/${victimId}/history?role=counselor`, {
    headers: { 'x-officer-key': officerKey },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
