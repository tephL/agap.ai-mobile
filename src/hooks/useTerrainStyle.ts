/**
 * useTerrainStyle
 *
 * Fetches the MapTiler dataviz style once, then augments it with:
 *  - A RasterDEM source for terrain elevation
 *  - A hillshade layer over the DEM
 *  - Terrain configuration so vector fills / lines bend over terrain
 *  - A sky / atmosphere layer for the horizon
 *
 * The result is a StyleSpecification object ready to pass to <Map mapStyle={...}>.
 * While loading, returns null (caller keeps its original URL style until ready).
 */

import { useEffect, useState } from "react";
import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";

const TERRAIN_EXAGGERATION = 1.5;

let cachedStyle: StyleSpecification | null = null;

export function useTerrainStyle(baseStyleUrl: string): StyleSpecification | null {
  const [style, setStyle] = useState<StyleSpecification | null>(cachedStyle);

  useEffect(() => {
    if (cachedStyle) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(baseStyleUrl);
        if (!res.ok) throw new Error(`Style fetch failed: ${res.status}`);
        const base: StyleSpecification = await res.json();

        // ── DEM source (Mapbox Terrain-RGB encoding) ──
        const demKey = new URL(baseStyleUrl).searchParams.get("key") ?? "";
        (base as any).sources["terrain-rgb"] = {
          type: "raster-dem",
          url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${demKey}`,
          tileSize: 512,
          maxzoom: 12,
        };

        // ── Terrain config — lifts everything over the DEM ──
        (base as any).terrain = {
          source: "terrain-rgb",
          exaggeration: TERRAIN_EXAGGERATION,
        };

        // ── Hillshade layer — subtle shading so terrain reads as 3-D ──
        (base as any).layers = [
          ...(base as any).layers,
          {
            id: "hillshade-3d",
            type: "hillshade",
            source: "terrain-rgb",
            paint: {
              "hillshade-illumination-direction": 315,
              "hillshade-exaggeration": 0.5,
              "hillshade-shadow-color": "#1e3a5f",
              "hillshade-highlight-color": "#ffffff",
              "hillshade-accent-color": "#1e3a5f",
            },
          },
        ];

        // ── Sky atmosphere layer ──
        (base as any).layers = [
          ...(base as any).layers,
          {
            id: "sky-3d",
            type: "sky",
            paint: {
              "sky-type": "atmosphere",
              "sky-atmosphere-sun": [0.0, 90.0],
              "sky-atmosphere-sun-intensity": 15,
            },
          },
        ];

        // ── Horizon fog — soft white fade at the horizon line ──
        (base as any).fog = {
          range: [0.5, 10],
          color: "rgba(186, 210, 235, 0.4)",
          "horizon-blend": 0.08,
          "high-color": "#87ceeb",
          "space-color": "#1a1a2e",
          "star-intensity": 0.3,
        };

        if (!cancelled) {
          cachedStyle = base as any;
          setStyle(base);
        }
      } catch (e) {
        console.warn("useTerrainStyle: failed to load terrain style, falling back to flat map", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseStyleUrl]);

  return style;
}
