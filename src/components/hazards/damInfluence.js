// Which dams "can affect or influence" the user?
//
// v2 model — hydrology-first:
//   1. Dams with a sourced downstream corridor (see data/hydrology.js)
//      influence users near any corridor waypoint.
//   2. Dams without a corridor never claim multi-dam influence; if nothing
//      matches, only the single absolute nearest dam surfaces (awareness).
//   3. Ground elevation filters the result: standing above a reservoir's
//      crest removes it entirely; sitting above its NHWL downgrades the
//      impact tier one step. Water does not flow uphill.
//
// Severity (dam readings) still drives colors/urgency — it no longer gates
// inclusion. Tier 2 basin polygons would slot into getInfluencingDams().

import { haversineMeters } from "../../utils/haversine";
import {
  CORRIDORS,
  CREST_ELEVATIONS,
  MINOR_DAMS,
  classifyImpact,
} from "../../data/hydrology";

export const MAX_INFLUENCING_DAMS = 4;

const ELEVATION_EXCLUSION_MARGIN_M = 2;

// Mirrors IMPACT_TIERS order/labels in data/hydrology.js.
const TIER_ORDER = ["catastrophic", "severe", "high", "moderate", "watch"];
const TIER_LABELS = {
  catastrophic: "Catastrophic",
  severe: "Severe",
  high: "High risk",
  moderate: "Moderate",
  watch: "Watch",
};

function downgradeTier(impact) {
  const nextIndex = Math.min(tierIndexSafe(impact) + 1, TIER_ORDER.length - 1);
  const key = TIER_ORDER[nextIndex];
  return { key, label: TIER_LABELS[key] };
}

function tierIndexSafe(impact) {
  const index = TIER_ORDER.indexOf(impact?.key);
  return index === -1 ? TIER_ORDER.length - 1 : index;
}

/**
 * Select the dams relevant to the user, nearest first.
 * @param {Array<object>} dams - records from /api/dams
 * @param {{latitude:number|null, longitude:number|null}} userLocation
 * @param {{userElevation?:number|null}} [options]
 * @returns {Array<{dam:object, distanceMeters:number, impact:{key,label},
 *                   tierNote:string|null, minor:boolean, nearestFallback:boolean}>}
 */
export function getInfluencingDams(dams, userLocation, options = {}) {
  if (
    !Array.isArray(dams) ||
    dams.length === 0 ||
    userLocation?.latitude == null ||
    userLocation?.longitude == null
  ) {
    return [];
  }

  const origin = { lat: userLocation.latitude, lng: userLocation.longitude };
  const userElevation = options.userElevation ?? null;

  // Distance to every dam once.
  const distances = new Map();
  for (const dam of dams) {
    if (!dam.coordinates) continue;
    const distanceMeters = haversineMeters(origin, dam.coordinates);
    if (distanceMeters != null) distances.set(dam.slug, distanceMeters);
  }

  const candidates = [];

  // Pass 1: corridor-matched dams.
  for (const corridor of CORRIDORS) {
    for (const slug of corridor.dams) {
      const distanceMeters = distances.get(slug);
      if (distanceMeters == null) continue;
      const dam = dams.find((entry) => entry.slug === slug);
      if (!dam) continue;

      // Nearest matching waypoint decides tier floor + note.
      let matchedWaypoint = null;
      for (const waypoint of corridor.waypoints) {
        const offsetMeters = haversineMeters(origin, waypoint);
        if (offsetMeters == null || offsetMeters / 1000 > corridor.bufferKm) continue;
        if (
          matchedWaypoint == null ||
          offsetMeters < matchedWaypoint.offsetMeters
        ) {
          matchedWaypoint = { waypoint, offsetMeters };
        }
      }
      if (!matchedWaypoint) continue;

      candidates.push({
        dam,
        distanceMeters,
        matchedWaypoint: matchedWaypoint.waypoint,
        corridorNote: corridor.note,
        nearestFallback: false,
      });
    }
  }

  // Pass 2: fallback — far from every verified corridor, surface only the
  // single absolute nearest dam so the UI and AI context never go empty.
  if (candidates.length === 0 && distances.size > 0) {
    let bestSlug = null;
    for (const [slug, distanceMeters] of distances) {
      if (bestSlug == null || distanceMeters < distances.get(bestSlug)) {
        bestSlug = slug;
      }
    }
    if (bestSlug != null) {
      const dam = dams.find((entry) => entry.slug === bestSlug);
      candidates.push({ dam, distanceMeters: distances.get(bestSlug), nearestFallback: true });
    }
  }

  // Enrich + elevation filter.
  const enriched = [];
  for (const candidate of candidates) {
    const { dam, matchedWaypoint } = candidate;
    let impact = classifyImpact(candidate.distanceMeters / 1000);

    // Sourced tier floor from the matched town (e.g., San Rafael never
    // rates below Severe regardless of raw distance band).
    const floorIndex = TIER_ORDER.indexOf(matchedWaypoint?.minTier ?? "");
    if (floorIndex !== -1 && floorIndex < TIER_ORDER.indexOf(impact.key)) {
      impact = { key: TIER_ORDER[floorIndex], label: TIER_LABELS[TIER_ORDER[floorIndex]] };
    }

    const crest =
      CREST_ELEVATIONS[dam.slug] ?? dam.normalHighWaterLevel ?? null;

    if (
      userElevation != null &&
      crest != null &&
      userElevation >= crest + ELEVATION_EXCLUSION_MARGIN_M
    ) {
      continue; // above reservoir level — floodwater cannot reach here
    }

    let finalImpact = impact;
    let tierNote =
      matchedWaypoint?.note ?? candidate.corridorNote ?? null;
    if (
      userElevation != null &&
      dam.normalHighWaterLevel != null &&
      userElevation >= dam.normalHighWaterLevel
    ) {
      finalImpact = downgradeTier(impact);
      tierNote = `Reduced reach: you are above this reservoir's normal high water level (${dam.normalHighWaterLevel} m ASL).`;
    }

    enriched.push({
      ...candidate,
      impact: finalImpact,
      tierNote,
      minor: MINOR_DAMS.has(dam.slug),
    });
  }

  enriched.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return enriched.slice(0, MAX_INFLUENCING_DAMS);
}
