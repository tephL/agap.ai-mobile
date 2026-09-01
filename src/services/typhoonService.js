import { create as createAxios } from "axios";
import { api } from "./api";
import { parsePagasaBulletinText } from "../lib/typhoonTracks/trackJson";
import { extractBulletinText } from "../lib/pagasaPdf/extractText";
import { buildSampleTyphoons } from "../lib/typhoonTracks/sampleTyphoons";

// When true, getTyphoons() serves the bundled sample pool instead of the live
// PAGASA backend/mirror, so every part of the Typhoons feature is always fully
// exercised regardless of what the mirror or backend currently reports.
export const USE_SAMPLE_TYPHOONS = true;

/**
 * Sample / seed typhoon pool (never touches the network). Mirrors the shape of
 * the live getTyphoons() envelope so every UI consumer works unchanged.
 */
export function getSampleTyphoons() {
  return buildSampleTyphoons();
}

// The PAGASA mirror (pagasa.chlod.net) mirrors the official PAGASA bulletin
// archive and serves the original bulletin PDFs plus parsed JSON. Using it here
// keeps the app frontend-only (no backend); forecast + intensity text comes from
// the raw PDF parsed in-app.
const PAGASA_API_BASE = "https://pagasa.chlod.net";
const pane = createAxios({
  baseURL: PAGASA_API_BASE,
  timeout: 25000,
});

const TYPHOON_CACHE_KEY = "typhoons:latest";
const cache = new Map();
const CACHE_MAX = 8;

function cacheSet(key, data) {
  cache.set(key, data);
  if (cache.size > CACHE_MAX) {
    cache.delete(cache.keys().next().value);
  }
}

export function getCachedTyphoons() {
  return cache.get(TYPHOON_CACHE_KEY) ?? null;
}

// Drop storms whose latest bulletin is older than this many days (safety net
// against the mirror not flagging `final` for a storm that has moved on).
const MAX_STORM_AGE_DAYS = 10;

// Fetch the list of active tropical cyclone bulletins from the mirror. Active
// = the highest bulletin number per storm name with final === false.
async function fetchActiveBulletins() {
  const { data } = await pane.get("/api/v1/bulletin/list");
  const bulletins = Array.isArray(data?.bulletins) ? data.bulletins : [];
  const byName = new Map();
  for (const b of bulletins) {
    if (!b?.name || b.final === true) continue;
    const key = String(b.name).toLowerCase();
    const prev = byName.get(key);
    if (!prev || (Number(b.count) ?? 0) > (Number(prev.count) ?? 0)) {
      byName.set(key, b);
    }
  }
  return [...byName.values()];
}

// Fetch one bulletin's PDF bytes from the mirror. Uses global fetch (not
// axios) because axios `responseType: "arraybuffer"` is unreliable under
// React Native/Hermes, whereas fetch's arrayBuffer() is well-supported.
async function fetchBulletinPdf(file) {
  const res = await fetch(`${PAGASA_API_BASE}/api/v1/bulletin/get/${encodeURIComponent(file)}`);
  if (!res.ok) throw new Error(`bulletin http ${res.status}`);
  const buffer = await res.arrayBuffer();
  return buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
}

// Fetch one bulletin's parsed JSON (issued/expires meta + cyclone + signals).
async function fetchBulletinMeta(file) {
  const { data } = await pane.get(`/api/v1/bulletin/parse/${encodeURIComponent(file)}`);
  return data?.bulletin ?? null;
}

function daysSinceMs(ms) {
  if (ms == null) return null;
  return (Date.now() - ms) / (24 * 60 * 60 * 1000);
}

/**
 * Parse one bulletin into the PAGASA typhoon model. The raw PDF is the primary
 * source (it carries the forecast track + intensity that the parsed JSON omits);
 * the mirror JSON enriches issued/expires + signal meta, and backs the record up
 * if PDF extraction fails.
 */
async function parseBulletin(bulletin) {
  const file = bulletin.file;
  let model = null;
  let extractionFailed = false;
  try {
    const pdfBytes = await fetchBulletinPdf(file);
    const text = await extractBulletinText(pdfBytes);
    model = parsePagasaBulletinText(text);
  } catch (e) {
    extractionFailed = true;
    console.log("bulletin pdf extract failed", file, e?.message);
  }

  let meta = null;
  try {
    meta = await fetchBulletinMeta(file);
  } catch (e) {
    console.log("bulletin meta failed", file, e?.message);
  }

  const info = meta?.info ?? {};
  const issuedMs = model?.issuedAt ?? null;
  const ageDays = daysSinceMs(issuedMs ?? info?.issued ? new Date(info.issued).getTime() : null);
  if (ageDays != null && ageDays > MAX_STORM_AGE_DAYS) return null;

  // The PDF extracted fine but the parser rejected it (e.g. the storm has
  // weakened into a Low Pressure Area). Such a bulletin is not an active
  // tropical cyclone — drop it rather than resurrect it from mirror meta.
  if (!extractionFailed && model == null) return null;
  if (model == null && !meta) return null;

  // Build/merge the normalized model. When PDF extraction fails, still emit a
  // track-less record from the mirror meta so the storm is listed and never
  // collides with another storm's eventId (a bare `pagasa-tcb` id repeated for
  // several storms caused duplicate rows and broken map overlays).
  const merged = model ?? {};
  const metaName = meta?.cyclone?.name ?? null;
  const metaCount = info?.count ?? null;
  const category = merged.category ?? meta?.cyclone?.category ?? null;
  const center = merged.current?.lon != null
    ? merged.current
    : {
        lon: meta?.cyclone?.center?.lon ?? null,
        lat: meta?.cyclone?.center?.lat ?? null,
      };
  const movementStr = meta?.cyclone?.movement ?? null;
  if (!merged.movement && movementStr) {
    merged.movement = { text: movementStr, direction: null, directionName: movementStr, speed: null };
  }
  if (!merged.signalsSummary && meta?.signals) {
    const hoisted = Object.entries(meta.signals)
      .filter(([, v]) => v != null)
      .map(([n]) => `Signal No. ${n}`)
      .join(", ");
    merged.signalsSummary = hoisted || "No Wind Signal is currently hoisted";
  }
  if (merged.issuedAt == null && info.issued) {
    const ms = new Date(info.issued).getTime();
    if (!Number.isNaN(ms)) {
      merged.issuedAt = ms;
      merged.issuedAtText = merged.issuedAtText ?? info.title ?? null;
    }
  }

  // Always produce a globally unique eventId. Prefer the extracted name/count,
  // then the mirror name/count, then a stable slug from the bulletin filename.
  const idName = (merged.name || metaName || "").toLowerCase().replace(/\s+/g, "-");
  const idCount = merged.bulletinNumber ?? metaCount;
  const fileSlug = String(bulletin.file).replace(/\.[^.]*$/, "");
  const eventId =
    merged.eventId && !/^pagasa-tcb/i.test(merged.eventId)
      ? merged.eventId
      : idName
        ? `${idName}-tcb${idCount ?? ""}`
        : `pagasa-tcb-${fileSlug}`;
  const name = merged.name ?? metaName ?? null;

  return {
    ...merged,
    eventId,
    name,
    category: category ?? merged.category ?? null,
    current: center,
    overallWindspeed: merged.overallWindspeed ?? null,
    overallStormstatus: merged.overallStormstatus ?? category ?? name,
    source: "PAGASA",
    bulletinFile: bulletin.file,
    link: bulletin.link ?? info.url ?? null,
    expiresAt: info.expires ? new Date(info.expires).getTime() : null,
    final: info.final ?? bulletin.final ?? false,
    signals: model?.signals ?? [],
  };
}

/**
 * Load the typhoon pool from the backend PAGASA endpoint (forecast tracks are
 * derived server-side and cached ~30 min so the device stays light). Falls back
 * to the direct mirror PDF path when the backend is unreachable or the user is
 * not logged in (the endpoint requires auth).
 * @param {{force?: boolean}} [opts]
 */
export async function getTyphoons({ force = false } = {}) {
  const cached = cache.get(TYPHOON_CACHE_KEY);
  if (cached && !force) return cached;

  // Sample mode: return the bundled pool (still cached so repeated calls are
  // cheap and the AI context reads the same object as the map).
  if (USE_SAMPLE_TYPHOONS) {
    const sample = buildSampleTyphoons();
    cacheSet(TYPHOON_CACHE_KEY, sample);
    return sample;
  }

  try {
    const { data } = await api.get("/api/typhoons/active-pagasa");
    if (data && Array.isArray(data.typhoons) && !data.unavailable) {
      cacheSet(TYPHOON_CACHE_KEY, data);
      return data;
    }
  } catch (e) {
    // Backend unreachable or not authenticated — fall back to the in-app path.
    console.log("Backend typhoons unavailable, using mirror fallback:", e?.message);
  }

  return loadTyphoonsFromMirror();
}

// Direct mirror-PDF fallback: parses bulletins in-app so the typhoon overlay
// still works even when the backend route is down.
async function loadTyphoonsFromMirror() {
  try {
    const active = await fetchActiveBulletins();
    if (active.length === 0) {
      const empty = {
        active: false,
        unavailable: false,
        generatedAt: new Date().toISOString(),
        source: "PAGASA",
        typhoons: [],
        rawCount: 0,
      };
      cacheSet(TYPHOON_CACHE_KEY, empty);
      return empty;
    }

    const typhoons = [];
    // Resolve all bulletins concurrently (bounded) instead of serially: each
    // storm costs 2 network round-trips + a PDF decompress/parse, so a serial
    // loop is orders of magnitude slower on a device.
    await mapWithConcurrency(active, 4, async (bulletin) => {
      try {
        const parsed = await parseBulletin(bulletin);
        if (parsed) typhoons.push(parsed);
      } catch (e) {
        console.log("bulletin failed", bulletin.file, e?.message);
      }
    });

    const result = {
      active: typhoons.length > 0,
      unavailable: false,
      generatedAt: new Date().toISOString(),
      source: "PAGASA",
      typhoons,
      rawCount: typhoons.length,
    };
    cacheSet(TYPHOON_CACHE_KEY, result);
    return result;
  } catch (e) {
    console.log("Failed to fetch typhoons", e?.message);
    const result = {
      active: false,
      unavailable: true,
      generatedAt: new Date().toISOString(),
      source: "PAGASA",
      typhoons: [],
      rawCount: 0,
    };
    cacheSet(TYPHOON_CACHE_KEY, result);
    return result;
  }
}

// Backend-driven typhoon alert for the citizen banner (kept as-is; the existing
// backend /api/typhoons/active stub feeds the TyphoonAlertBanner).
export async function getActiveTyphoon() {
  const response = await api.get("/api/typhoons/active");
  return response.data;
}

// Run `fn` over `items` with at most `limit` concurrent promises at a time.
async function mapWithConcurrency(items, limit, fn) {
  const iterator = items[Symbol.iterator]();
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let next = iterator.next(); !next.done; next = iterator.next()) {
      await fn(next.value);
    }
  });
  await Promise.all(workers);
}