import { useCallback, useEffect, useRef, useState } from "react";
import {
  HAZARD_LAYERS,
  RECOMMENDED_LAYER_ID,
} from "@/lib/pmtiles/downloadLayer";
import {
  getActiveHazardLayerId,
  setActiveHazardLayerId,
} from "@/services/hazardPrefsDb";

const KNOWN_LAYER_IDS = new Set(HAZARD_LAYERS.map((layer) => layer.id));

/**
 * Which single hazard layer is overlaid on the map. Only one layer renders
 * at a time (selecting a different one unmounts the previous overlay), which
 * keeps tile decoding/GPU work bounded on lower-end phones. The choice is
 * persisted in sqlite; first launch pre-selects the recommended flood layer.
 */
export function useActiveHazardLayer() {
  const [activeId, setActiveId] = useState<string | null>(
    () => RECOMMENDED_LAYER_ID
  );
  // Mirror for select(): keeps the callback stable while still reading the
  // latest id when the user taps.
  const activeRef = useRef(activeId);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const saved = await getActiveHazardLayerId(KNOWN_LAYER_IDS);
        if (!cancelled) {
          setActiveId(saved ?? RECOMMENDED_LAYER_ID);
        }
      } catch {
        // Prefs unavailable: keep the recommended default rather than
        // blanking the map.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const select = useCallback((layerId: string | null) => {
    if (layerId === activeRef.current) return;
    activeRef.current = layerId;
    setActiveId(layerId);

    // Best-effort persist; a failed write only costs the preference.
    setActiveHazardLayerId(layerId).catch(() => undefined);
  }, []);

  return { activeId, select };
}

export default useActiveHazardLayer;
