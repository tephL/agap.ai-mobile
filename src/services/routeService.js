/**
 * Planned-route lookup for dispatched teams.
 *
 * Turns a team base coordinate + its assigned cluster coordinate into a
 * road-following LineString via the public OSRM demo server (no API key).
 * Good enough for a dev-grade "planned route" preview; swap the base URL
 * for a self-hosted OSRM or a keyed provider before production scale.
 *
 * Responses are cached in-memory per origin/destination pair (LRU) so the
 * map's minute refresh loop doesn't re-request unchanged routes.
 */

const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";
const CACHE_LIMIT = 100;

/** teamId/cluster pair -> LineString coordinates ([lng, lat, ...]) */
const cache = new Map();
const etaCache = new Map();

function cacheKey(from, to) {
  return `${from[0].toFixed(5)},${from[1].toFixed(5)}|${to[0].toFixed(5)},${to[1].toFixed(5)}`;
}

async function fetchOsrmRoute(from, to) {
  if (
    !Array.isArray(from) ||
    !Array.isArray(to) ||
    from.length < 2 ||
    to.length < 2
  ) {
    return null;
  }

  const key = cacheKey(from, to);
  if (cache.has(key)) {
    const hit = cache.get(key);
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  try {
    const path = `${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
    const res = await fetch(`${OSRM_ROUTE_URL}/${path}`);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

    const data = await res.json();
    const route = data?.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;

    const result = { coords, duration: route.duration ?? null };
    cache.set(key, coords);
    etaCache.set(key, route.duration ?? null);
    if (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
      etaCache.delete(oldest);
    }
    return result;
  } catch (err) {
    console.log("route fetch failed:", err?.message || err);
    return null;
  }
}

/**
 * @param {number[]} from - [lng, lat] team base
 * @param {number[]} to   - [lng, lat] cluster position
 * @returns {Promise<number[][]|null>} road geometry coordinates, null on failure
 */
export async function getRouteCoordinates(from, to) {
  const result = await fetchOsrmRoute(from, to);
  return result?.coords ?? null;
}

/**
 * @param {number[]} from - [lng, lat] team position
 * @param {number[]} to   - [lng, lat] cluster position
 * @returns {Promise<number|null>} duration in seconds, null on failure
 */
export async function getRouteETA(from, to) {
  if (
    !Array.isArray(from) ||
    !Array.isArray(to) ||
    from.length < 2 ||
    to.length < 2
  ) {
    return null;
  }

  const key = cacheKey(from, to);
  if (etaCache.has(key)) {
    return etaCache.get(key);
  }

  const result = await fetchOsrmRoute(from, to);
  return result?.duration ?? null;
}

/**
 * Format OSRM duration (seconds) into a human-readable ETA string.
 * @param {number|null} seconds
 * @returns {string}
 */
export function formatETA(seconds) {
  if (seconds == null) return "Calculating...";
  const mins = Math.ceil(seconds / 60);
  if (mins < 1) return "Arriving now";
  if (mins === 1) return "1 min away";
  return `${mins} min away`;
}
