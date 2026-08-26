import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { getRouteETA } from "../services/routeService";

const POLL_INTERVAL_MS = 15_000;

/**
 * Polls /api/my-assignments for active dispatches and computes ETAs
 * via OSRM. Returns a list of enriched dispatch objects.
 *
 * Dismissed assignment_ids are tracked in-memory and reset when
 * `resetDismissed()` is called (e.g. on map tab focus).
 */
export default function useActiveDispatches() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const dismissedRef = useRef(new Set());
  const [dismissedVersion, setDismissedVersion] = useState(0);
  const cancelledRef = useRef(false);

  const fetchDispatches = useCallback(async () => {
    if (cancelledRef.current) return;
    try {
      const { data } = await api.get("/api/my-assignments");
      const active = (data.assignments ?? []).filter(
        (a) => a.status === "dispatched" || a.status === "pending"
      );

      const enriched = await Promise.all(
        active.map(async (a) => {
          let etaSeconds = null;
          if (a.team?.lat != null && a.team?.lng != null && a.cluster?.lat != null && a.cluster?.lng != null) {
            etaSeconds = await getRouteETA(
              [a.team.lng, a.team.lat],
              [a.cluster.lng, a.cluster.lat]
            );
          }
          return { ...a, etaSeconds };
        })
      );

      if (!cancelledRef.current) {
        setDispatches(enriched);
        setLoading(false);
      }
    } catch (err) {
      console.log("useActiveDispatches fetch error:", err?.message);
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    fetchDispatches();
    const interval = setInterval(fetchDispatches, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [fetchDispatches]);

  const dismiss = useCallback((assignmentId) => {
    dismissedRef.current.add(assignmentId);
    setDismissedVersion((v) => v + 1);
  }, []);

  const resetDismissed = useCallback(() => {
    dismissedRef.current.clear();
    setDismissedVersion((v) => v + 1);
  }, []);

  const visible = dispatches.filter((d) => !dismissedRef.current.has(d.assignment_id));

  return {
    dispatches: visible,
    allDispatches: dispatches,
    loading,
    dismiss,
    resetDismissed,
    // bump key forces re-render when dismissed set changes
    dismissedVersion,
  };
}
