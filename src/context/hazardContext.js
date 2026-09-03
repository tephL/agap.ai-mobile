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
} from "../components/hazards/dams/damSeverity";
import { getInfluencingDams } from "../components/hazards/dams/damInfluence";
import { getImpactTier } from "../data/hydrology";
import {
  getStormSignals,
  getCachedStormSignals,
} from "../services/stormSignalService";
import {
  resolveSignalsToProvinces,
  provinceAtPoint,
} from "../lib/stormSignals/provinceSignals";
import {
  getTyphoons,
  getCachedTyphoons,
} from "../services/typhoonService";
import { statusKeyFromWindspeed } from "../lib/typhoonTracks/trackJson";
import phProvinces from "../data/phProvinces.json";

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
 * @param {number|null} [userElevation] ground elevation (m ASL), optional
 * @returns {Promise<object|null>} null when no dam data is available at all
 */
export async function getNearestDamContext(userLocation, userElevation = null) {
  const { dams } = await getDamStatuses();
  if (!Array.isArray(dams) || dams.length === 0) return null;

  // Hydrology-first selection: corridor dams that can actually reach the
  // user, nearest first; single-nearest fallback when nothing matches.
  const influencing = getInfluencingDams(dams, userLocation, { userElevation });
  if (influencing.length === 0) return null;

  const hasOrigin =
    userLocation?.latitude != null && userLocation?.longitude != null;

  const relevantDams = influencing.map(({ dam, distanceMeters, impact, tierNote, minor }) => {
    const severity = resolveDamSeverity(dam);
    const tier = getImpactTier(impact.key);
    return {
      name: dam.name,
      slug: dam.slug,
      distanceMeters,
      distanceText: formatDistance(distanceMeters),
      impactTier: { ...impact, plainSummary: tier?.plainSummary ?? null },
      tierNote: tierNote ?? null,
      minor,
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

  return {
    generatedAt: new Date().toISOString(),
    userLocation: hasOrigin
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null,
    userElevation: userElevation ?? null,
    nearestDamSlug,
    relevantDams,
    summary: summaryParts.join(" "),
  };
}

let latestStormSignalContext = null;

export function getLatestStormSignalsContext() {
  return latestStormSignalContext;
}

/**
 * Snapshot of the current PAGASA TCWS (storm signal) situation per the user's
 * province. Returns null when the live bulletin cannot be fetched; otherwise
 * a structured context with a model-friendly narrative.
 * @param {{latitude:number|null, longitude:number|null}} userLocation
 * @returns {Promise<object|null>}
 */
export async function getStormSignalsContext(userLocation) {
  const signalsData = getCachedStormSignals() ?? (await getStormSignals());
  if (!signalsData || signalsData.unavailable) {
    latestStormSignalContext = null;
    return null;
  }

  const { byProvince, unmapped } = resolveSignalsToProvinces(signalsData.signals ?? []);
  const hasOrigin =
    userLocation?.latitude != null && userLocation?.longitude != null;
  const userProvince = hasOrigin
    ? provinceAtPoint(userLocation.latitude, userLocation.longitude, phProvinces.features)
    : null;
  const userSignalLevel =
    userProvince != null ? byProvince[userProvince] ?? null : null;

  const activeLevels = {};
  for (const [province, level] of Object.entries(byProvince)) {
    if (!activeLevels[level]) activeLevels[level] = [];
    activeLevels[level].push(province);
  }
  for (const level of Object.keys(activeLevels)) {
    activeLevels[level].sort();
  }

  const highestLevel = Math.max(0, ...Object.keys(activeLevels).map(Number));
  const cyclone = signalsData.cyclone;
  const bulletin = signalsData.bulletin;

  const summaryParts = [];
  if (signalsData.active) {
    const cycloneName = cyclone?.name ?? "a tropical cyclone";
    summaryParts.push(
      `PAGASA storm signals are active for ${cycloneName} as of the bulletin issued at ${bulletin?.issuedAt ?? "unknown"} (bulletin #${bulletin?.count ?? "?"}).`
    );
    for (const level of Object.keys(activeLevels)
      .map(Number)
      .sort((a, b) => b - a)) {
      summaryParts.push(
        `Signal #${level} (${activeLevels[level].length} area(s)): ${activeLevels[level].join(", ")}.`
      );
    }
    if (userProvince) {
      summaryParts.push(
        userSignalLevel
          ? `The user is in ${userProvince}, which is under Signal #${userSignalLevel}.`
          : `The user is in ${userProvince}, which is NOT under any signal.`
      );
    } else if (hasOrigin) {
      summaryParts.push("The user's province could not be determined from GPS.");
    }
    if (unmapped.length > 0) {
      summaryParts.push(
        `Note: PAGASA also lists ${unmapped.join(", ")} (no polygon geometry available).`
      );
    }
  } else {
    summaryParts.push(
      `There are currently no active PAGASA tropical cyclone wind signals. Last bulletin examined: ${bulletin?.title ?? "none"}.`
    );
  }

  const context = {
    generatedAt: new Date().toISOString(),
    source: signalsData.sample ? "PAGASA (sample demo data)" : "PAGASA (pagasa.chlod.net)",
    sample: Boolean(signalsData.sample),
    active: Boolean(signalsData.active),
    bulletin: bulletin
      ? {
          count: bulletin.count,
          title: bulletin.title,
          issuedAt: bulletin.issuedAt,
          expiresAt: bulletin.expiresAt,
          final: bulletin.final,
          url: bulletin.url,
        }
      : null,
    cyclone: cyclone
      ? {
          name: cyclone.name,
          internationalName: cyclone.internationalName,
          category: cyclone.category,
          center: cyclone.center,
          movement: cyclone.movement,
        }
      : null,
    activeLevels,
    highestSignalLevel: highestLevel > 0 ? highestLevel : null,
    userProvince,
    userSignalLevel,
    userLocation: hasOrigin
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null,
    summary: summaryParts.join(" "),
  };
  latestStormSignalContext = context;
  return context;
}

let latestTyphoonContext = null;

export function getLatestTyphoonsContext() {
  return latestTyphoonContext;
}

/**
 * Snapshot of the current active typhoons (GDACS tracks) relevant to the
 * Philippines. Returns null when no data can be fetched. Reads the cached pool
 * when available to avoid on-demand network latency during a chat.
 * @returns {Promise<object|null>}
 */
export async function getTyphoonsContext() {
  const data = getCachedTyphoons() ?? (await getTyphoons());
  if (!data || data.unavailable) {
    latestTyphoonContext = null;
    return null;
  }

  const list = data.typhoons ?? [];
  const storms = list
    .sort(
      (a, b) =>
        (b.current?.windspeed ?? b.overallWindspeed ?? 0) -
        (a.current?.windspeed ?? a.overallWindspeed ?? 0)
    )
    .map((t) => {
      const current = t.current ?? {};
      const key = statusKeyFromWindspeed(current.windspeed ?? t.overallWindspeed);
      return {
        name: t.name ?? `Event ${t.eventId}`,
        eventId: t.eventId,
        status: current.status ?? t.overallStormstatus ?? "Tropical cyclone",
        windspeedKmh: current.windspeed ?? t.overallWindspeed ?? null,
        intensity: key ?? "unknown",
        alertLevel: t.alertLevel ?? null,
        center:
          current.lon != null && current.lat != null
            ? { latitude: current.lat, longitude: current.lon }
            : null,
        pastPositions: t.past.length,
        forecastPositions: t.forecast.length,
      };
    });

  const summaryParts = [];
  if (storms.length === 0) {
    summaryParts.push(
      "There are currently no active tropical cyclones relevant to the Philippines (source: GDACS)."
    );
  } else {
    summaryParts.push(
      `${storms.length} active tropical cyclone(s) relevant to the Philippines (source: GDACS, ${data.generatedAt}):`
    );
    for (const s of storms) {
      const center = s.center
        ? ` centered near ${s.center.latitude.toFixed(1)}°N, ${s.center.longitude.toFixed(1)}°E`
        : "";
      summaryParts.push(
        `${s.name}: ${s.status}${
          s.windspeedKmh != null ? ` (${Math.round(s.windspeedKmh)} km/h)` : ""
        }${center}, track shows ${s.pastPositions} past and ${s.forecastPositions} forecast positions.`
      );
    }
  }

  const context = {
    generatedAt: data.generatedAt,
    source: "GDACS",
    active: data.active,
    count: storms.length,
    typhoons: storms,
    summary: summaryParts.join(" "),
  };
  latestTyphoonContext = context;
  return context;
}
