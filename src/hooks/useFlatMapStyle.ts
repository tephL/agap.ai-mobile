/**
 * useFlatMapStyle
 *
 * Fetches the MapTiler dataviz style once, then strips every 3-D component
 * so the map renders as a flat 2-D basemap:
 *  - `terrain` elevation config
 *  - the `sky` style / atmosphere
 *  - the `fog` / horizon haze
 *  - `raster-dem` sources (e.g. terrain-rgb) and any hillshade / sky layers
 *    that visualize them
 *
 * The result is a StyleSpecification object ready to pass to <Map mapStyle={...}>.
 * While loading, returns null (caller keeps its original URL style until ready).
 */

import { useEffect, useState } from "react";
import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";

let cachedStyle: StyleSpecification | null = null;

function strip3D(style: StyleSpecification): StyleSpecification {
  const flat: any = JSON.parse(JSON.stringify(style));

  delete flat.terrain;
  delete flat.sky;
  delete flat.fog;

  if (flat.sources) {
    for (const [id, source] of Object.entries(flat.sources)) {
      if ((source as any)?.type === "raster-dem") delete flat.sources[id];
    }
  }

  if (Array.isArray(flat.layers)) {
    const demLayerIds = new Set<string>();
    for (const layer of flat.layers) {
      if (layer.type === "hillshade" || layer.type === "sky") {
        demLayerIds.add(layer.id);
      }
    }
    flat.layers = flat.layers.filter((layer: any) => !demLayerIds.has(layer.id));
  }

  return flat as StyleSpecification;
}

export function useFlatMapStyle(baseStyleUrl: string): StyleSpecification | null {
  const [style, setStyle] = useState<StyleSpecification | null>(cachedStyle);

  useEffect(() => {
    if (cachedStyle) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(baseStyleUrl);
        if (!res.ok) throw new Error(`Style fetch failed: ${res.status}`);
        const base: StyleSpecification = await res.json();
        const flat = strip3D(base);

        if (!cancelled) {
          cachedStyle = flat;
          setStyle(flat);
        }
      } catch (e) {
        console.warn("useFlatMapStyle: failed to load flat style, falling back to base style", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseStyleUrl]);

  return style;
}