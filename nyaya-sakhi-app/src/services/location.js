import * as Location from 'expo-location';

const LOCATION_TIMEOUT_MS = 4000; // hard cap — never delays SOS beyond 4s

/**
 * Best-effort GPS capture for SOS.
 * Returns { lat, lng, accuracy_meters } or null on any failure.
 * NEVER throws — all errors are swallowed so SOS always proceeds.
 */
export async function getLocationForSOS() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { status: requested } = await Location.requestForegroundPermissionsAsync();
      if (requested !== 'granted') {
        console.log('[Location] Permission denied — SOS proceeds without location.');
        return null;
      }
    }

    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // Hard timeout — SOS never waits more than 4s for GPS
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS)
    );

    const result = await Promise.race([locationPromise, timeoutPromise]);
    if (!result) {
      console.log('[Location] Timed out — SOS proceeds without location.');
      return null;
    }

    return {
      lat: result.coords.latitude,
      lng: result.coords.longitude,
      accuracy_meters: result.coords.accuracy,
    };
  } catch (err) {
    console.log('[Location] Error — SOS proceeds without location.', err?.message);
    return null;
  }
}
