import { create as createAxios } from "axios";

const PAGASA_API_BASE = "https://pagasa.chlod.net";

export const PAGASA_TCWS_COLORS = {
  1: "#00aaff",
  2: "#fff200",
  3: "#ffaa00",
  4: "#ff0000",
  5: "#cd00cd",
};

export const PAGASA_TCWS_LABELS = {
  1: "Bagyong hangin (60 km/h)",
  2: "Malakas na hangin (60–100 km/h)",
  3: "Mapinsalang hangin (100–185 km/h)",
  4: "Napakapinsalang hangin (≤250 km/h)",
  5: "Labis na mapinsalang hangin (>250 km/h)",
};

const pane = createAxios({
  baseURL: PAGASA_API_BASE,
  timeout: 15000,
});

const STORM_SIGNAL_CACHE_KEY = "signals:latest";
const cache = new Map();
const CACHE_MAX = 8;

function cacheSet(key, data) {
  cache.set(key, data);
  if (cache.size > CACHE_MAX) {
    cache.delete(cache.keys().next().value);
  }
}

export function getCachedStormSignals() {
  return cache.get(STORM_SIGNAL_CACHE_KEY) ?? null;
}

function toAreas(level) {
  if (!level) return [];
  const areas = [];
  for (const landmass of Object.values(level.areas ?? {})) {
    for (const area of landmass ?? []) {
      if (area?.name) areas.push({ name: area.name });
    }
  }
  return areas;
}

function normalizeBulletin(data) {
  const b = data?.bulletin;
  if (!b) return null;
  const signals = [];
  let rawCount = 0;
  for (let lvl = 1; lvl <= 5; lvl += 1) {
    const plugin = b.signals?.[String(lvl)];
    if (!plugin) continue;
    const areas = toAreas(plugin);
    if (areas.length === 0) continue;
    signals.push({ level: lvl, areas });
    rawCount += areas.length;
  }
  if (signals.length === 0) return null;
  const cyclone = b.cyclone ?? {};
  return {
    active: true,
    generatedAt: new Date().toISOString(),
    bulletin: {
      count: b.info?.count ?? null,
      title: b.info?.title ?? null,
      issuedAt: b.info?.issued ?? null,
      expiresAt: b.info?.expires ?? null,
      final: Boolean(b.info?.final),
      url: b.info?.url ?? null,
    },
    cyclone: {
      name: cyclone.name ?? null,
      internationalName: cyclone.internationalName ?? null,
      category: cyclone.category ?? null,
      center: cyclone.center ?? null,
      movement: cyclone.movement ?? null,
    },
    signals,
    rawAreaCount: rawCount,
  };
}

function latestNonFinalBulletin(bulletins) {
  const candidates = (bulletins ?? []).filter(
    (b) => b && !b.final && b.file && b.file.toLowerCase().startsWith("tcb")
  );
  candidates.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  return candidates[0] ?? null;
}

function bulletinMeta(info) {
  if (!info) return null;
  return {
    count: info.count ?? null,
    title: info.title ?? null,
    issuedAt: info.issued ?? null,
    expiresAt: info.expires ?? null,
    final: Boolean(info.final),
    url: info.url ?? null,
  };
}

async function fetchLiveSignals() {
  const listResponse = await pane.get("/api/v1/bulletin/list");
  const bulletins = listResponse.data?.bulletins;
  const bulletin = latestNonFinalBulletin(bulletins);
  if (!bulletin) {
    return { unavailable: false, active: false, bulletin: null };
  }
  const file = encodeURIComponent(bulletin.file);
  const parseResponse = await pane.get(`/api/v1/format/json/${file}`);
  if (!parseResponse.data || parseResponse.data.error) {
    return { unavailable: true };
  }
  const signals = normalizeBulletin(parseResponse.data);
  if (!signals) {
    return {
      unavailable: false,
      active: false,
      bulletin: bulletinMeta(parseResponse.data?.bulletin?.info) ?? {
        count: bulletin.count,
        title: bulletin.file,
      },
    };
  }
  return {
    unavailable: false,
    active: true,
    ...signals,
    sourceBulletin: bulletin.file,
  };
}

function emptyResult(details) {
  return {
    active: false,
    generatedAt: new Date().toISOString(),
    sourceBulletin: null,
    bulletin: null,
    cyclone: null,
    signals: [],
    rawAreaCount: 0,
    ...details,
  };
}

export async function getStormSignals({ force = false } = {}) {
  const cached = cache.get(STORM_SIGNAL_CACHE_KEY);
  if (cached && !force) return cached;

  try {
    const live = await fetchLiveSignals();
    if (live.unavailable) {
      const result = emptyResult({ unavailable: true });
      cacheSet(STORM_SIGNAL_CACHE_KEY, result);
      return result;
    }
    const result = {
      active: live.active,
      generatedAt: new Date().toISOString(),
      bulletin: live.bulletin ?? null,
      cyclone: live.cyclone ?? null,
      signals: live.signals ?? [],
      rawAreaCount: live.rawAreaCount ?? 0,
      sourceBulletin: live.sourceBulletin ?? null,
    };
    cacheSet(STORM_SIGNAL_CACHE_KEY, result);
    return result;
  } catch {
    const result = emptyResult({ unavailable: true });
    cacheSet(STORM_SIGNAL_CACHE_KEY, result);
    return result;
  }
}

// Luzon-centric demo fixture: eye over northern Luzon, tapering to Signal #1
// covering Metro Manila so the user's own province is involved in previews.
const SAMPLE_LUZON = {
  bulletin: {
    count: 12,
    title: "Tropical Cyclone Bulletin #12",
    issuedAt: "2021-12-17T03:00:00.000Z",
    expiresAt: null,
    final: false,
    url: null,
  },
  cyclone: {
    name: "ODETTE",
    internationalName: "RAI",
    category: "TYPHOON",
    center: "Cardinal points at around the center",
    movement: "Moving westward across northern Luzon",
  },
  signals: [
    {
      level: 3,
      areas: [{ name: "Ilocos Norte" }, { name: "Ilocos Sur" }, { name: "Cagayan" }],
    },
    {
      level: 2,
      areas: [
        { name: "Abra" },
        { name: "Isabela" },
        { name: "La Union" },
        { name: "Pangasinan" },
      ],
    },
    {
      level: 1,
      areas: [
        { name: "Nueva Ecija" },
        { name: "Tarlac" },
        { name: "Bulacan" },
        { name: "Zambales" },
        { name: "Aurora" },
        { name: "Metro Manila" },
      ],
    },
  ],
  rawAreaCount: 13,
};

function sampleFromFixture() {
  return {
    active: true,
    generatedAt: new Date().toISOString(),
    sample: true,
    ...SAMPLE_LUZON,
  };
}

export function getSampleStormSignals() {
  return sampleFromFixture();
}