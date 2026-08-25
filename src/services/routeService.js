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

function cacheKey(from, to) {
  return `${from[0].toFixed(5)},${from[1].toFixed(5)}|${to[0].toFixed(5)},${to[1].toFixed(5)}`;
}

/**
 * @param {number[]} from - [lng, lat] team base
 * @param {number[]} to   - [lng, lat] cluster position
 * @returns {Promise<number[][]|null>} road geometry coordinates, null on failure
 */
export async function getRouteCoordinates(from, to) {
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
    // bump to most-recently-used position
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
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;

    cache.set(key, coords);
    if (cache.size > CACHE_LIMIT) {
      cache.delete(cache.keys().next().value);
    }
    return coords;
  } catch (err) {
    console.log("route fetch failed:", err?.message || err);
    return null;
  }
}
