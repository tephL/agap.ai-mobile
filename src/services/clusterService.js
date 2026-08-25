// Reports Cluster tab backend client.
//
// Talks to GET /api/clusters (city-scoped, merged via PR #25). The
// payload is a BARE ARRAY of clusters shipped exactly as the DB stores
// them: priority_level (renamed attribute), latitude/longitude as
// numeric(9,6) which node-postgres delivers as STRINGS, no name column,
// no status filter, and no ORDER BY. Everything below compensates
// client-side until the endpoint matures.
import { api } from "./api";

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function normalizeCluster(row) {
  if (!row || typeof row !== "object") return null;

  // A dispatcher whose profile has no resolvable city produces exactly
  // one all-NULL phantom row server-side; drop it here.
  const id = row.cluster_id ?? null;
  if (id == null) return null;

  return {
    id,
    // There is no name column yet — per PM, the id doubles as the title.
    title: `Cluster ${id}`,
    city: typeof row.city === "string" ? row.city : "",
    lat: row.latitude == null ? null : Number(row.latitude),
    lng: row.longitude == null ? null : Number(row.longitude),
    priority: row.priority_level ?? "low",
    status: row.status ?? "open",
    reportCount: row.report_count ?? 0,
    peopleAffected: row.people_affected ?? 0,
    aiSeverity: row.ai_severity ?? null,
    aiDisasterType: row.ai_disaster_type ?? null,
    aiAnalyzedAt: row.ai_analyzed_at ?? null,
  };
}

export async function getCityClusters() {
  const { data } = await api.get("/api/clusters");
  const rows = Array.isArray(data) ? data : [];

  return rows
    .map(normalizeCluster)
    // Server returns every status; the tab only shows actionable ones.
    .filter((c) => c.status === "open")
    // Highest severity first, busier clusters within a tier, stable by id.
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
        b.reportCount - a.reportCount ||
        a.id - b.id
    );
}
