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

export async function getDamStatuses() {
  const response = await api.get("/api/dams");
  return { ...response.data, dams: dedupeDams(response.data?.dams) };
}

// Returns { reportedAt, scrapedAt, source, stale?, staleReason?, dam } or null
// when the backend answers 204 (unknown slug).
export async function getDamStatusBySlug(slug) {
  const response = await api.get(`/api/dams/${encodeURIComponent(slug)}`);
  if (!response.data) return null;
  return response.data;
}
