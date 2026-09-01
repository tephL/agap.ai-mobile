import { api } from "./api";

// Guards against a backend regression returning repeated entries for the same
// dam (duplicate slugs crash keyed lists). Keeps the first entry per slug,
// preferring one that actually carries a reading.
function dedupeDams(dams) {
  if (!Array.isArray(dams)) return [];
  const bySlug = new Map();
  for (const dam of dams) {
    if (!dam?.slug) continue;
    const existing = bySlug.get(dam.slug);
    if (
      !existing ||
      (existing.reservoirWaterLevel == null && dam.reservoirWaterLevel != null)
    ) {
      bySlug.set(dam.slug, dam);
    }
  }
  return [...bySlug.values()];
}

// ── Offline LRU cache ────────────────────────────────────────────────────────
// Caches the last N API responses in memory so the UI can fall back to stale
// data when the network is unavailable. Max 20 entries (1 all-dams + ~19 per-slug).
const damCache = new Map();
const DAM_CACHE_MAX = 20;

function cacheSet(key, data) {
  damCache.set(key, data);
  if (damCache.size > DAM_CACHE_MAX) {
    damCache.delete(damCache.keys().next().value);
  }
}

export function getCachedDamStatuses() {
  return damCache.get("all") ?? null;
}

export function getCachedDamStatus(slug) {
  return damCache.get(`slug:${slug}`) ?? null;
}

export async function getDamStatuses() {
  const response = await api.get("/api/dams");
  const data = { ...response.data, dams: dedupeDams(response.data?.dams) };
  cacheSet("all", data);
  return data;
}

// Returns { reportedAt, scrapedAt, source, stale?, staleReason?, dam } or null
// when the backend answers 204 (unknown slug).
export async function getDamStatusBySlug(slug) {
  const response = await api.get(`/api/dams/${encodeURIComponent(slug)}`);
  if (!response.data) return null;
  cacheSet(`slug:${slug}`, response.data);
  return response.data;
}
