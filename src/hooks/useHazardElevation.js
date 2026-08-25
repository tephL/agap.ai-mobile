// useHazardElevation.js
//
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
}
