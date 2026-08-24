// AI context provider. Gathers a structured, model-ready snapshot of the
// hazard situation around the user — designed so a future assistant can call
// this verbatim and drop `summary` + `relevantDams` straight into its prompt.
//
// Deliberately frontend-only: dam relevance depends on the device GPS that
// the app already owns; the backend would just be re-sent coordinates to
// compute the same thing.

import { getDamStatuses } from "../services/hazardService";
import { formatDistance } from "../utils/haversine";
import {
  resolveDamSeverity,
  describeDamStatus,
} from "../components/hazards/damSeverity";
import { getInfluencingDams } from "../components/hazards/damInfluence";
<<<<<<< HEAD
import { getImpactTier } from "../data/hydrology";
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)

function severitySentence(dam) {
  const severity = resolveDamSeverity(dam);
  const parts = [describeDamStatus(dam, severity)];

  const trend24h = dam.waterLevelDeviation?.amount;
  if (trend24h != null) {
    parts.push(
      `Water level has ${trend24h >= 0 ? "risen" : "fallen"} ${Math.abs(trend24h)} m over the last 24 hours.`
    );
  }
  if (dam.gateOpening?.gates != null) {
    parts.push(
      `${dam.gateOpening.gates} gate(s) open at ${dam.gateOpening.meters ?? "?"} m.`
    );
  }

  return parts.join(" ");
}

/**
 * Build the hazard context snapshot for the given user location.
 * @param {{latitude:number|null, longitude:number|null}} userLocation
<<<<<<< HEAD
 * @param {number|null} [userElevation] ground elevation (m ASL), optional
 * @returns {Promise<object|null>} null when no dam data is available at all
 */
export async function getNearestDamContext(userLocation, userElevation = null) {
  const { dams } = await getDamStatuses();
  if (!Array.isArray(dams) || dams.length === 0) return null;

  // Hydrology-first selection: corridor dams that can actually reach the
  // user, nearest first; single-nearest fallback when nothing matches.
  const influencing = getInfluencingDams(dams, userLocation, { userElevation });
=======
 * @returns {Promise<object|null>} null when no dam data is available at all
 */
export async function getNearestDamContext(userLocation) {
  const { dams } = await getDamStatuses();
  if (!Array.isArray(dams) || dams.length === 0) return null;

  // Dams that can plausibly affect the user (severity-weighted radius),
  // nearest first. Falls back to the single closest dam when none qualify.
  const influencing = getInfluencingDams(dams, userLocation);
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
  if (influencing.length === 0) return null;

  const hasOrigin =
    userLocation?.latitude != null && userLocation?.longitude != null;

<<<<<<< HEAD
  const relevantDams = influencing.map(({ dam, distanceMeters, impact, tierNote, minor }) => {
    const severity = resolveDamSeverity(dam);
    const tier = getImpactTier(impact.key);
=======
  const relevantDams = influencing.map(({ dam, distanceMeters }) => {
    const severity = resolveDamSeverity(dam);
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
    return {
      name: dam.name,
      slug: dam.slug,
      distanceMeters,
      distanceText: formatDistance(distanceMeters),
<<<<<<< HEAD
      impactTier: { ...impact, plainSummary: tier?.plainSummary ?? null },
      tierNote: tierNote ?? null,
      minor,
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
      reservoirWaterLevel: dam.reservoirWaterLevel ?? null,
      normalHighWaterLevel: dam.normalHighWaterLevel ?? null,
      deviationFromNHWL: dam.deviationFromNHWL ?? null,
      ruleCurveElevation: dam.ruleCurveElevation ?? null,
      deviationFromRuleCurve: dam.deviationFromRuleCurve ?? null,
      change24h: dam.waterLevelDeviation?.amount ?? null,
      gateOpening: dam.gateOpening ?? null,
      observedAt:
        [dam.observationDate, dam.observationTime].filter(Boolean).join(" ") ||
        null,
      severity: {
        level: severity.level,
        label: severity.label,
        color: severity.color,
        title: severity.title,
        advice: severity.advice,
      },
    };
  });

  const nearestDamSlug = relevantDams[0].slug;

  // Urgency-first narrative: worst status leads, then distance.
  const urgencyRank = { danger: 0, caution: 1, normal: 2, unknown: 3 };
  const ordered = [...relevantDams].sort(
    (a, b) =>
      urgencyRank[a.severity.level] - urgencyRank[b.severity.level] ||
      a.distanceMeters - b.distanceMeters
  );

  const summaryParts = [
    `Dams that may affect this user (${ordered.length}):`,
    ...ordered.flatMap((entry) => [
<<<<<<< HEAD
      [
        `${entry.name}${entry.minor ? " (minor structure)" : ""} — ${entry.distanceText} away.`,
        entry.impactTier.plainSummary
          ? `${entry.impactTier.label} impact: ${entry.impactTier.plainSummary}`
          : `${entry.impactTier.label} impact zone.`,
        `Reservoir status: ${entry.severity.label}.`,
        severitySentence(dams.find((d) => d.slug === entry.slug)),
        entry.tierNote ? `Note: ${entry.tierNote}` : null,
      ]
        .filter(Boolean)
        .join(" "),
    ]),
  ];
  if (
    hasOrigin &&
    userElevation != null
  ) {
    summaryParts.push(
      `User ground elevation: ~${Math.round(userElevation)} m above sea level.`
    );
  }
  summaryParts.push(
    "Impact zones are approximate estimates pending official flood maps."
  );
=======
      `${entry.name} — ${entry.distanceText} away, status ${entry.severity.label}: ${severitySentence(
        dams.find((d) => d.slug === entry.slug)
      )}`,
    ]),
  ];
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)

  return {
    generatedAt: new Date().toISOString(),
    userLocation: hasOrigin
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null,
<<<<<<< HEAD
    userElevation: userElevation ?? null,
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
    nearestDamSlug,
    relevantDams,
    summary: summaryParts.join(" "),
  };
}
