// Weekly rainfall forecast service. Currently sample-only: returns the bundled
// fixture behind a demo switch, structured so a live source could be added
// later without changing consumers. Mirrors the other hazard services' cache +
// envelope patterns.
import { buildSampleRainForecast } from "../lib/weather/rainForecastSample.js";

const RAIN_CACHE_KEY = "rain:weekly";
const cache = new Map();
const CACHE_MAX = 8;

function cacheSet(key, data) {
  cache.set(key, data);
  if (cache.size > CACHE_MAX) {
    cache.delete(cache.keys().next().value);
  }
}

export function getCachedRainForecast() {
  return cache.get(RAIN_CACHE_KEY) ?? null;
}

function emptyResult(details) {
  return {
    active: false,
    generatedAt: new Date().toISOString(),
    source: null,
    days: [],
    regions: [],
    rawRegionCount: 0,
    ...details,
  };
}

/** Live fetch placeholder. */
async function fetchLiveRainForecast() {
  return emptyResult({ unavailable: true });
}

export function getSampleRainForecast() {
  return buildSampleRainForecast();
}

export async function getRainForecast({ force = false } = {}) {
  const cached = cache.get(RAIN_CACHE_KEY);
  if (cached && !force) return cached;

  const live = await fetchLiveRainForecast();
  const result = live.unavailable
    ? emptyResult({ unavailable: true })
    : {
        active: live.active,
        generatedAt: new Date().toISOString(),
        source: live.source ?? null,
        days: live.days ?? [],
        regions: live.regions ?? [],
        rawRegionCount: live.rawRegionCount ?? 0,
      };
  cacheSet(RAIN_CACHE_KEY, result);
  return result;
}
