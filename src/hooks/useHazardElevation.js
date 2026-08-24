// useHazardElevation.js
//
<<<<<<< HEAD
// Fetches the user's ground elevation (m ASL) from the backend, which
// caches lookups in Postgres/OpenTopoData. Coordinates come from the map
// screen's existing location tracking — no second permission prompt or GPS
// fix. Fails gracefully: a failed lookup never blocks the app and callers
// simply treat elevation as unknown.

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api";

export function useHazardElevation(lat, lng) {
  const [elevation, setElevation] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  // ~110 m rounding keeps the effect stable while GPS jitters.
  const roundedKey =
    lat != null && lng != null
      ? `${lat.toFixed(3)},${lng.toFixed(3)}`
      : null;

  useEffect(() => {
    if (!roundedKey) return;

    let cancelled = false;
    const [queryLat, queryLng] = roundedKey.split(",");

    async function run() {
      setStatus("loading");
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/elevation?lat=${queryLat}&lng=${queryLng}`
        );
        if (!res.ok) throw new Error(`Elevation request failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setElevation(data.elevation ?? null);
          setStatus("ready");
        }
      } catch (err) {
        console.warn("Elevation lookup failed, continuing without it:", err);
        if (!cancelled) setStatus("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [roundedKey]);

  return { elevation, status };
=======
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
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
}
