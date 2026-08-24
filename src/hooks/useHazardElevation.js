// useHazardElevation.js
//
// Fetches the user's ground elevation once per app session (on mount),
// not continuously. Fails gracefully — a failed lookup never blocks
// app open, consistent with AGAP.ai's offline-first design.

import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE; // adjust to your actual env var name

export function useHazardElevation() {
  const [elevation, setElevation] = useState(null);
  const [severityTier, setSeverityTier] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error | denied

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus('loading');

      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        if (!cancelled) setStatus('denied');
        return;
      }

      try {
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const res = await fetch(
          `${API_BASE}/api/elevation?lat=${coords.latitude}&lng=${coords.longitude}`
        );
        if (!res.ok) throw new Error(`Elevation request failed: ${res.status}`);

        const data = await res.json();
        if (!cancelled) {
          setElevation(data.elevation);
          setSeverityTier(data.severityTier);
          setStatus('ready');
        }
      } catch (err) {
        console.warn('Elevation lookup failed, continuing without it:', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { elevation, severityTier, status };
}
