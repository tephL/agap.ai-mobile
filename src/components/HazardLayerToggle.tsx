import React, { useMemo } from "react";
import { Layer, VectorSource } from "@maplibre/maplibre-react-native";
import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";

import HAZARD_COLORS, {
  type HazardColorSet,
} from "@/constants/hazardColors";
import { HAZARD_LAYERS, getRemoteSourceUrl } from "@/lib/pmtiles/downloadLayer";
import { useOfflinePMTilesLayer } from "@/hooks/useOfflinePMTilesLayer";

/**
 * Renders ONE hazard layer on an existing MapView (this component does NOT
 * own a MapView):
 *
 *   <MapLibreRN.MapView ...>
 *     <HazardLayerOverlay layerId="flood_5yr" />
 *   </MapLibreRN.MapView>
 *
 * Mount only one overlay at a time — every mounted layer multiplies vector
 * tile decoding and GPU work, which is the main source of lag on phones
 * (see HazardLayersPanel for the single-select UI).
 */

/** Below this zoom hazard polygons cover whole regions; don't draw them. */
const DEFAULT_MIN_ZOOM = 8;

/** Zoom-interpolated value: `from` at `startZoom` easing to `to` at `endZoom`. */
function zoomRamp(
  from: number,
  to: number,
  startZoom: number,
  endZoom: number,
): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    startZoom,
    from,
    endZoom,
    to,
  ];
}

interface HazardLayerOverlayProps {
  layerId: string;
  /** Override default semi-transparent hazard coloring. */
  colors?: Partial<HazardColorSet>;
  /** Don't render below this zoom level. Default 8. */
  minZoom?: number;
  /** Don't render above this zoom level. No upper bound by default. */
  maxZoom?: number;
}

function HazardLayerOverlayInner({
  layerId,
  colors,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom,
}: HazardLayerOverlayProps) {
  const { status, sourceUrl } = useOfflinePMTilesLayer(layerId);
  const config = HAZARD_LAYERS.find((layer) => layer.id === layerId);

  // Memoized so a parent re-render doesn't hand MapLibre freshly-created
  // style objects, which would re-evaluate paint properties on the native
  // side even when nothing changed.
  const palette = useMemo(
    () => ({
      ...HAZARD_COLORS[config?.hazardType ?? "flood"],
      ...colors,
    }),
    [config?.hazardType, colors]
  );

  // Hazard source data is gridded model output, so heavy outlines turn every
  // cell into a visible box. The paint below instead: fades the fill in with
  // zoom, then draws a soft blurred halo under a thin rounded edge line, so
  // coverage reads as one smooth mass instead of a mosaic of squares.
  const fadeStart = minZoom;
  const fadeEnd = minZoom + 2;

  const fillPaint = useMemo(
    () => ({
      "fill-color": palette.fillExpression ?? palette.fill,
      "fill-antialias": true,
      "fill-opacity": zoomRamp(0, palette.opacity, fadeStart, fadeEnd),
    }),
    [palette.fillExpression, palette.fill, palette.opacity, fadeStart, fadeEnd]
  );

  // Wide, blurred, low-opacity halo — the soft glow that hides cell edges.
  const haloPaint = useMemo(
    () => ({
      "line-color": palette.stroke,
      "line-join": "round",
      "line-cap": "round",
      "line-blur": zoomRamp(2, 5, fadeStart, 14),
      "line-width": zoomRamp(4, 10, fadeStart, 16),
      "line-opacity": zoomRamp(0, 0.3, fadeStart, fadeEnd),
    }),
    [palette.stroke, fadeStart, fadeEnd]
  );

  // Thin rounded core line — definition without boxing individual cells.
  const outlinePaint = useMemo(
    () => ({
      "line-color": palette.stroke,
      "line-join": "round",
      "line-cap": "round",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        fadeStart,
        0.5,
        12,
        1.2,
        16,
        2,
      ] as ExpressionSpecification,
      "line-opacity": zoomRamp(0, 0.55, fadeStart, fadeEnd),
    }),
    [palette.stroke, fadeStart, fadeEnd]
  );

  if (!config) return null;

  // Prefer the downloaded archive; otherwise stream just the tiles for the
  // visible area straight from the remote archive via byte-range requests.
  const url =
    status === "ready" && sourceUrl ? sourceUrl : getRemoteSourceUrl(config.id);
  const sourceId = `hazard-source-${config.id}`;

  return (
    // Zoom bounds live on BOTH the source (skips fetching/decoding tiles
    // outside the range) and the layers (guarantees nothing draws outside
    // it even if tiles were already cached at lower zooms).
    <VectorSource id={sourceId} url={url} minzoom={minZoom} maxzoom={maxZoom}>
      {/* v11 API: one Layer component, props follow the MapLibre style spec.
          Nested layers inherit `source` from the enclosing VectorSource. */}
      <Layer
        id={`${sourceId}-fill`}
        type="fill"
        source-layer={config.sourceLayerId}
        minzoom={minZoom}
        maxzoom={maxZoom}
        paint={fillPaint}
      />
      <Layer
        id={`${sourceId}-halo`}
        type="line"
        source-layer={config.sourceLayerId}
        minzoom={minZoom}
        maxzoom={maxZoom}
        paint={haloPaint}
      />
      <Layer
        id={`${sourceId}-outline`}
        type="line"
        source-layer={config.sourceLayerId}
        minzoom={minZoom}
        maxzoom={maxZoom}
        paint={outlinePaint}
      />
    </VectorSource>
  );
}

/**
 * Memoized: parents re-render often (location ticks, pulse animations);
 * none of that should reach MapLibre unless the active layer or styling
 * actually changes.
 */
export const HazardLayerOverlay = React.memo(HazardLayerOverlayInner);
