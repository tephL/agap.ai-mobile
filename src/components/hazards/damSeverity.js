// Single source of truth for dam danger levels. Consumed by the map layers
// (marker/halo colors), the drawer list dots, the sheet's summary card, and
// the AI context provider — tune the thresholds here and everything follows.

import { CREST_ELEVATIONS } from "../../data/hydrology";

export const SEVERITY_LEVELS = {
  normal: {
    level: "normal",
    label: "Normal",
    color: "#4287f5",
    icon: "checkmark-circle",
    title: "Water levels are within safe limits.",
    advice: "No unusual activity at this reservoir right now.",
  },
  caution: {
    level: "caution",
    label: "Caution",
    color: "#EAB308",
    icon: "alert-circle",
    title: "The reservoir is running higher than usual.",
    advice: "Conditions are being monitored — stay aware of updates.",
  },
  danger: {
    level: "danger",
    label: "Danger",
    color: "#E32F31",
    icon: "warning",
    title: "The reservoir is near capacity.",
    advice: "Stay alert for official dam advisories in your area.",
  },
  unknown: {
    level: "unknown",
    label: "Unknown",
    color: "#a9a9a9",
    icon: "help-circle",
    title: "No current reading available.",
    advice: "Latest observation data is unavailable for this dam.",
  },
};

const DANGER_MARGIN_M = 0.5; // within half a meter of NHWL ≈ spill threshold
const CAUTION_MARGIN_M = 2; // within two meters of NHWL
const CAUTION_RULE_CURVE_M = 1; // ≥1 m above rule curve
const CAUTION_RISE_24H_M = 0.5; // fast rise while near-full
const CAUTION_RISE_NHWL_WINDOW_M = 4;

// ---- Decision criteria (consumed by SeverityDetail modal) -------------------

export const SEVERITY_CRITERIA = {
  danger: {
    label: "Danger",
    color: "#E32F31",
    summary: "The reservoir is near capacity.",
    criteria: [
      `Water level is within ${DANGER_MARGIN_M} m of the normal high water level (NHWL) — the spill threshold.`,
      "The dam may need to release water through its spillway to prevent overtopping.",
      "Stay alert for official dam advisories in your area.",
    ],
  },
  caution: {
    label: "Caution",
    color: "#EAB308",
    summary: "The reservoir is running higher than usual.",
    criteria: [
      `Water level is within ${CAUTION_MARGIN_M} m of the NHWL.`,
      `Rule curve deviation is ${CAUTION_RULE_CURVE_M} m or more above the target curve.`,
      `Water is rising fast — ${CAUTION_RISE_24H_M} m or more in 24 hours while within ${CAUTION_RISE_NHWL_WINDOW_M} m of the NHWL.`,
    ],
  },
  normal: {
    label: "Normal",
    color: "#4287f5",
    summary: "Water levels are within safe limits.",
    criteria: [
      "Water level is well below the NHWL (more than 2 m below).",
      "No fast rising detected.",
      "No unusual activity at this reservoir right now.",
    ],
  },
  unknown: {
    label: "Unknown",
    color: "#a9a9a9",
    summary: "No current reading available.",
    criteria: [
      "Latest observation data is unavailable for this dam.",
      "Severity cannot be determined without a reservoir water level reading.",
    ],
  },
};

function num(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

/**
 * Resolve a dam record to a severity profile.
 * @param {object} dam - dam record from /api/dams or /api/dams/:slug
 * @returns {{level,string,color,string,label,string,icon,string,title,string,advice,string}}
 */
export function resolveDamSeverity(dam) {
  if (!dam || num(dam.reservoirWaterLevel) == null) {
    return SEVERITY_LEVELS.unknown;
  }

  const rwl = dam.reservoirWaterLevel;
  const rawDevNHWL = num(dam.deviationFromNHWL);
  const rawNHWL = num(dam.normalHighWaterLevel);

  // When upstream reports NHWL as 0 (e.g. Caliraya), use static crest as fallback
  const crestFallback = dam.slug ? (CREST_ELEVATIONS[dam.slug] ?? null) : null;
  const effectiveNHWL = (rawNHWL != null && rawNHWL > 0) ? rawNHWL : crestFallback;

  // Recompute deviation when using fallback and raw value is 0
  const devNHWL =
    effectiveNHWL != null && (rawDevNHWL === 0 || rawDevNHWL == null)
      ? Math.round((rwl - effectiveNHWL) * 100) / 100
      : rawDevNHWL;

  const rawDevRuleCurve = num(dam.deviationFromRuleCurve);
  const rawRuleCurve = num(dam.ruleCurveElevation);
  const effectiveRuleCurve = rawRuleCurve != null && rawRuleCurve > 0 ? rawRuleCurve : null;

  const devRuleCurve =
    effectiveRuleCurve != null && (rawDevRuleCurve === 0 || rawDevRuleCurve == null)
      ? Math.round((rwl - effectiveRuleCurve) * 100) / 100
      : (rawDevRuleCurve != null && rawDevRuleCurve !== 0 ? rawDevRuleCurve : null);

  const trend24h = num(dam.waterLevelDeviation?.amount);

  // devNHWL is meters relative to NHWL (negative = below it), so values
  // close to zero mean the reservoir is near its spill threshold.
  if (devNHWL != null && devNHWL >= -DANGER_MARGIN_M) {
    return SEVERITY_LEVELS.danger;
  }

  const risingFast =
    trend24h != null &&
    trend24h >= CAUTION_RISE_24H_M &&
    devNHWL != null &&
    devNHWL >= -CAUTION_RISE_NHWL_WINDOW_M;

  if (
    (devNHWL != null && devNHWL >= -CAUTION_MARGIN_M) ||
    (devRuleCurve != null && devRuleCurve >= CAUTION_RULE_CURVE_M) ||
    risingFast
  ) {
    return SEVERITY_LEVELS.caution;
  }

  return SEVERITY_LEVELS.normal;
}

/** Short human-readable sentence describing where the water sits. */
export function describeDamStatus(dam, severity) {
  const rwl = num(dam?.reservoirWaterLevel);
  const devNHWL = num(dam?.deviationFromNHWL);
  if (rwl == null) return "Readings are unavailable for this dam.";

  const position =
    devNHWL != null
      ? `${Math.abs(devNHWL).toFixed(1)} m ${devNHWL < 0 ? "below" : "above"} its normal high water level`
      : `at ${rwl} m`;
  return `The reservoir is currently ${position}.`;
}
