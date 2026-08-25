import { useCallback, useEffect, useRef, useState } from "react";
import { HAZARD_LAYERS } from "@/lib/pmtiles/downloadLayer";
import {
  getHazardLayerPrefs,
  setHazardLayerPref,
} from "@/services/hazardPrefsDb";

const ALL_LAYER_IDS = HAZARD_LAYERS.map((layer) => layer.id);

/**
 * Which hazard layers the user wants overlaid on the map, persisted in
 * sqlite so their choices survive restarts. Layers with no saved pref are
 * shown (all-on default), matching first-launch behavior.
 */
export function useHazardLayerVisibility() {
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(ALL_LAYER_IDS)
  );
  // Mirror for toggle(): keeps it stable without re-creating on every state
  // change while still reading the latest set when the user taps.
  const enabledRef = useRef(enabledIds);
  useEffect(() => {
    enabledRef.current = enabledIds;
  }, [enabledIds]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const prefs = await getHazardLayerPrefs();
        if (!cancelled) {
          setEnabledIds(
            new Set(ALL_LAYER_IDS.filter((id) => prefs[id] !== false))
          );
        }
      } catch {
        // Prefs unavailable: keep all-on defaults rather than blanking layers.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((layerId: string) => {
    const nowEnabled = !enabledRef.current.has(layerId);

    const next = new Set(enabledRef.current);
    if (nowEnabled) {
      next.add(layerId);
    } else {
      next.delete(layerId);
    }
    enabledRef.current = next;
    setEnabledIds(next);

    // Best-effort persist; a failed write only costs the preference.
    setHazardLayerPref(layerId, nowEnabled).catch(() => undefined);
  }, []);

  return { enabledIds, toggle };
}

export default useHazardLayerVisibility;
