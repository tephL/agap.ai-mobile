// Static hydrology reference data for dam influence scoring.
//
// Scope note: downstream corridors are SOURCED but APPROXIMATE — town-center
// waypoints + straight-line distances, calibrated against documented
// spillway-release flooding (Bulacan PDRRMO advisories / news coverage).
// Not official flood maps. The app shows a disclaimer wherever these tiers
// are displayed until PHIVOLCS/MGB/PDRRMO hazard data is integrated.

import { haversineMeters } from "../utils/haversine";

// ---- Rivers (verified: which watershed each dam drains to) -----------------
export const DAM_RIVERS = {
  angat: "Angat River",
  ipo: "Angat River",
  "la-mesa": "Tullahan River",
  ambuklao: "Agno River",
  binga: "Agno River",
  "san-roque": "Agno River",
  magat: "Magat River (Cagayan basin)",
  pantabangan: "Pampanga River",
  caliraya: "Caliraya River (Laguna de Bay)",
};

// Small structures whose release impact is far below the primary dams.
export const MINOR_DAMS = new Set(["ipo"]);

// ---- Impact tiers -----------------------------------------------------------
// Flood-wave attenuation bands for a large reservoir release, worst first.
// `plainSummary` is the user-facing one-liner; `criteria[]` explains exactly
// how a dam lands in this tier (shown in the ImpactZoneDetail explainer).
export const IMPACT_TIERS = [
  {
    key: "catastrophic",
    label: "Catastrophic",
    maxKm: 5,
    color: "#7F1D1D",
    plainSummary:
      "You are directly below the dam — floodwater could arrive within minutes, with little time to react.",
    criteria: [
      "Within 5 km of the dam structure.",
      "A large release or breach arrives before warning systems can help — near-total danger zone.",
    ],
  },
  {
    key: "severe",
    label: "Severe",
    maxKm: 15,
    color: "#DC2626",
    plainSummary:
      "Serious flooding could happen fast. Evacuations have taken place here during real spillway releases.",
    criteria: [
      "Between 5–15 km from the dam.",
      "Flood wave stays deep and fast-moving on this stretch.",
      "Angat corridor: precautionary evacuations are documented at these distances.",
    ],
  },
  {
    key: "high",
    label: "High risk",
    maxKm: 30,
    color: "#EA580C",
    plainSummary:
      "Dangerous flooding is possible within hours if the dam releases water.",
    criteria: [
      "Between 15–30 km from the dam.",
      "The flood wave weakens with distance but still carries dangerous depth and speed.",
      "Angat corridor towns here have documented flooding history (e.g., Calumpit's 1–6 ft during past releases).",
    ],
  },
  {
    key: "moderate",
    label: "Moderate",
    maxKm: 60,
    color: "#D97706",
    plainSummary:
      "River levels may rise and low-lying areas can flood, but you would have hours of warning.",
    criteria: [
      "Between 30–60 km from the dam.",
      "Mostly affects low-lying ground near the river; effects build over hours.",
    ],
  },
  {
    key: "watch",
    label: "Watch",
    maxKm: Infinity,
    color: "#2563EB",
    plainSummary:
      "You are far downstream — listed for awareness only, not an expected threat.",
    criteria: [
      "More than 60 km from the dam.",
      "Only very large reservoirs can still matter at this range; effects would be indirect.",
    ],
  },
];

export function getImpactTier(key) {
  return IMPACT_TIERS.find((tier) => tier.key === key) ?? null;
}

export function classifyImpact(distanceKm) {
  return (
    IMPACT_TIERS.find((tier) => distanceKm < tier.maxKm) ??
    IMPACT_TIERS[IMPACT_TIERS.length - 1]
  );
}

function tierIndex(key) {
  return IMPACT_TIERS.findIndex((tier) => tier.key === key);
}

// ---- Downstream corridors ----------------------------------------------------
// A corridor lists towns the dam's water actually reaches. Users within
// `bufferKm` of any waypoint are considered inside that dam's influence;
// `minTier` floors the computed band using sourced spill-event data.
export const CORRIDOR_BUFFER_KM = 10;

export const CORRIDORS = [
  {
    river: "Angat River",
    dams: ["angat", "ipo"],
    bufferKm: CORRIDOR_BUFFER_KM,
    note: null,
    waypoints: [
      { name: "Norzagaray", lat: 14.885, lng: 121.033, minTier: "severe" },
      { name: "San Rafael", lat: 14.9727, lng: 120.9414, minTier: "severe" },
      { name: "Bustos", lat: 14.9464, lng: 120.9183, minTier: "high" },
      { name: "Baliwag", lat: 14.9589, lng: 120.8972, minTier: "high" },
      { name: "Plaridel", lat: 14.8852, lng: 120.8533, minTier: "high" },
      { name: "Pulilan", lat: 14.9019, lng: 120.8499, minTier: "high" },
      {
        name: "Malolos",
        lat: 14.844, lng: 120.8139,
        minTier: "high",
        note: "Advisory-level on its own; worsens with tidal and Pampanga backflow.",
      },
      {
        name: "Calumpit",
        lat: 14.9128, lng: 120.8264,
        minTier: "high",
        note: "Catch-basin town: 1–6 ft flooding documented during real spillway releases; compounded by tide and Pampanga backflow.",
      },
      { name: "Hagonoy", lat: 14.8322, lng: 120.73, minTier: "high", note: "Catch-basin; same compounding as Calumpit." },
      { name: "Paombong", lat: 14.8286, lng: 120.7869, minTier: "high" },
    ],
  },
  {
    river: "Pampanga River",
    dams: ["pantabangan"],
    bufferKm: CORRIDOR_BUFFER_KM,
    // Deliberately stops at the delta towns — the Calumpit/Malolos confluence
    // zone is Angat+Ipo territory; Pampanga backflow there is captured as a
    // note on those Angat-corridor waypoints instead of corridor membership.
    note: "Coarse corridor; Candaba Swamp retains and slows releases upstream of the delta.",
    waypoints: [
      { name: "Pantabangan", lat: 15.8051, lng: 121.1053 },
      { name: "Rizal, Nueva Ecija", lat: 15.65, lng: 121.08 },
      { name: "Cabanatuan City", lat: 15.487, lng: 120.972 },
      { name: "Santa Rosa, Nueva Ecija", lat: 15.3855, lng: 120.9855 },
      { name: "Candaba", lat: 15.09, lng: 120.83 },
      { name: "Arayat", lat: 15.15, lng: 120.76 },
      { name: "Mexico, Pampanga", lat: 15.064, lng: 120.72 },
      { name: "Santo Tomas, Pampanga", lat: 15.011, lng: 120.684 },
      { name: "Apalit", lat: 14.957, lng: 120.759 },
      { name: "Masantol", lat: 14.893, lng: 120.7 },
    ],
  },
];

// Dams without a corridor (ambuklao, binga, san-roque, magat, la-mesa,
// caliraya) never claim multi-dam influence — they only surface through the
// absolute-nearest fallback in getInfluencingDams.

// ---- Crest elevations (m ASL), used by the elevation risk factor -------------
export const CREST_ELEVATIONS = {
  angat: 219,
  "la-mesa": 82.5,
  pantabangan: 232,
  caliraya: 292,
};

// ---- Single-dam impact context (shared by list rows and the sheet card) ------

/**
 * Full impact assessment for one dam relative to the user.
 * @returns {{distanceMeters:number, impact:{key,label}, tierNote:string|null, minor:boolean}|null}
 */
export function getDamImpact(dam, userLocation) {
  if (
    !dam?.coordinates ||
    userLocation?.latitude == null ||
    userLocation?.longitude == null
  ) {
    return null;
  }

  const origin = { lat: userLocation.latitude, lng: userLocation.longitude };
  const distanceMeters = haversineMeters(origin, dam.coordinates);
  if (distanceMeters == null) return null;

  const distanceKm = distanceMeters / 1000;
  let impact = classifyImpact(distanceKm);
  let tierNote = null;

  const corridor = CORRIDORS.find((entry) => entry.dams.includes(dam.slug));
  if (corridor) {
    for (const waypoint of corridor.waypoints) {
      const offsetMeters = haversineMeters(origin, waypoint);
      if (offsetMeters == null || offsetMeters / 1000 > corridor.bufferKm) continue;
      const floorIndex = tierIndex(waypoint.minTier);
      if (floorIndex !== -1 && floorIndex < tierIndex(impact.key)) {
        impact = IMPACT_TIERS[floorIndex];
      }
      if (waypoint.note && !tierNote) tierNote = waypoint.note;
    }
  }

  return {
    distanceMeters,
    impact: { key: impact.key, label: impact.label },
    tierNote,
    minor: MINOR_DAMS.has(dam.slug),
  };
}
