// LPA (Low Pressure Area) data service. Currently sample-only: it returns the
// bundled fixtures behind a demo switch, structured so a live PAGASA / GDACS
// source could be added later without changing consumers. Mirrors the cache +
// envelope patterns used by the other hazard services.

const LPAS_CACHE_KEY = "lpas:latest";
const cache = new Map();
const CACHE_MAX = 8;

function cacheSet(key, data) {
  cache.set(key, data);
  if (cache.size > CACHE_MAX) {
    cache.delete(cache.keys().next().value);
  }
}

export function getCachedLpas() {
  return cache.get(LPAS_CACHE_KEY) ?? null;
}

function emptyResult(details) {
  return {
    active: false,
    generatedAt: new Date().toISOString(),
    source: null,
    lpas: [],
    rawCount: 0,
    ...details,
  };
}

/**
 * Live fetch placeholder. Returns an empty envelope; a real PAGASA/GDACS
 * source can be wired in here later while keeping `getLowPressures()` stable.
 */
async function fetchLiveLpas() {
  return emptyResult({ unavailable: true });
}

export async function getLowPressures({ force = false } = {}) {
  const cached = cache.get(LPAS_CACHE_KEY);
  if (cached && !force) return cached;

  const live = await fetchLiveLpas();
  const result = live.unavailable
    ? emptyResult({ unavailable: true })
    : {
        active: live.active,
        generatedAt: new Date().toISOString(),
        source: live.source ?? null,
        lpas: live.lpas ?? [],
        rawCount: live.rawCount ?? 0,
      };
  cacheSet(LPAS_CACHE_KEY, result);
  return result;
}
