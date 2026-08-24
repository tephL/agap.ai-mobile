// Which dams "can affect or influence" the user?
//
// Tier 1 model (no hydrology data yet): a dam qualifies when its severity
// class is allowed to reach that far — danger travels farthest, normal only
// counts as proximity awareness. When real river-basin data lands (Tier 2),
// replace getInfluencingDams()'s internals with basin matching; every
// consumer (map, drawer chips, AI context) already speaks this output shape.

import { haversineMeters } from "../../utils/haversine";
import { resolveDamSeverity } from "./damSeverity";

export const INFLUENCE_RADIUS_KM = {
  danger: 100,
  caution: 60,
  normal: 30,
};

export const MAX_INFLUENCING_DAMS = 4;

/**
 * Select the dams relevant to the user, nearest first.
 * @param {Array<object>} dams - records from /api/dams
 * @param {{latitude:number|null, longitude:number|null}} userLocation
 * @returns {Array<{dam:object, distanceMeters:number}>}
 */
export function getInfluencingDams(dams, userLocation) {
  if (
    !Array.isArray(dams) ||
    dams.length === 0 ||
    userLocation?.latitude == null ||
    userLocation?.longitude == null
  ) {
    return [];
  }

  const origin = { lat: userLocation.latitude, lng: userLocation.longitude };

  const candidates = [];
  for (const dam of dams) {
    if (!dam.coordinates) continue;
    const distanceMeters = haversineMeters(origin, dam.coordinates);
    if (distanceMeters == null) continue;

    const radiusKm = INFLUENCE_RADIUS_KM[resolveDamSeverity(dam).level];
    if (radiusKm != null && distanceMeters / 1000 <= radiusKm) {
      candidates.push({ dam, distanceMeters });
    }
  }

  candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Fallback: far from everything — surface the single closest dam so the
  // UI and AI context never go empty.
  if (candidates.length === 0) {
    let fallback = null;
    for (const dam of dams) {
      if (!dam.coordinates) continue;
      const distanceMeters = haversineMeters(origin, dam.coordinates);
      if (distanceMeters == null) continue;
      if (fallback == null || distanceMeters < fallback.distanceMeters) {
        fallback = { dam, distanceMeters };
      }
    }
    return fallback ? [fallback] : [];
  }

  return candidates.slice(0, MAX_INFLUENCING_DAMS);
}
