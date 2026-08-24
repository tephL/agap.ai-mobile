import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteLayer,
  downloadLayer,
  getLocalUri,
  isDownloaded,
} from "@/lib/pmtiles/downloadLayer";
import { pmtilesUrlFor, registerLocalPMTiles, unregisterLocalPMTiles } from "@/lib/pmtiles/protocol";

export type HazardLayerStatus = "not-downloaded" | "downloading" | "ready" | "error";

interface UseOfflinePMTilesLayerResult {
  status: HazardLayerStatus;
  /** 0..100 while downloading; 0 otherwise. */
  progress: number;
  /** Pass straight to <VectorSource url={...}> once ready. */
  sourceUrl: string | null;
  download: () => void;
  remove: () => void;
}

/**
 * Tracks the download lifecycle of a single offline PMTiles hazard layer and
 * exposes a `pmtiles://file://...` URL that can be handed directly to
 * MapLibreRN's VectorSource once the archive is on disk.
 *
 * WHY NOT OfflineManager (again, for future maintainers): MapLibreRN's
 * offline packs cannot capture PMTiles sources; downloads are done with
 * expo-file-system and rendering goes through MapLibre Native's built-in
 * `pmtiles://` protocol — see lib/pmtiles/protocol.ts before changing this.
 */
export function useOfflinePMTilesLayer(layerId: string): UseOfflinePMTilesLayerResult {
  const [status, setStatus] = useState<HazardLayerStatus>("not-downloaded");
  const [progress, setProgress] = useState(0);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  // Adjust state during render when switching layers (React-recommended
  // alternative to resetting state inside an effect body).
  const [renderedLayerId, setRenderedLayerId] = useState(layerId);
  if (renderedLayerId !== layerId) {
    setRenderedLayerId(layerId);
    setStatus("not-downloaded");
    setProgress(0);
    setSourceUrl(null);
  }

  const mountedRef = useRef(true);
  const downloadSeqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const adoptReadyLayer = useCallback((localUri: string) => {
    registerLocalPMTiles(layerId, localUri);
    if (!mountedRef.current) return;
    setSourceUrl(pmtilesUrlFor(localUri));
    setStatus("ready");
    setProgress(0);
  }, [layerId]);

  // Initial state resolution: is the archive already on disk?
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (await isDownloaded(layerId)) {
          if (cancelled) return;
          registerLocalPMTiles(layerId, getLocalUri(layerId));
          if (cancelled) return;
          setSourceUrl(pmtilesUrlFor(getLocalUri(layerId)));
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [layerId]);

  const download = useCallback(() => {
    // Sequence guard so a stale in-flight download can't clobber newer state.
    const seq = ++downloadSeqRef.current;

    setStatus("downloading");
    setProgress(0);

    downloadLayer(layerId, (pct) => {
      if (mountedRef.current && downloadSeqRef.current === seq) {
        setProgress(pct);
      }
    })
      .then((localUri) => {
        if (downloadSeqRef.current === seq) {
          adoptReadyLayer(localUri);
        }
      })
      .catch(() => {
        // Network/server failures land here; surface 'error' instead of
        // crashing. The UI offers retry by simply calling download() again.
        if (mountedRef.current && downloadSeqRef.current === seq) {
          setStatus("error");
          setProgress(0);
        }
      });
  }, [adoptReadyLayer, layerId]);

  const remove = useCallback(() => {
    ++downloadSeqRef.current; // invalidate any in-flight download

    deleteLayer(layerId)
      .catch(() => undefined)
      .finally(() => {
        unregisterLocalPMTiles(layerId);
        if (mountedRef.current) {
          setSourceUrl(null);
          setProgress(0);
          setStatus("not-downloaded");
        }
      });
  }, [layerId]);

  return { status, progress, sourceUrl, download, remove };
}

export default useOfflinePMTilesLayer;
