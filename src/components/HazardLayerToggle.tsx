import React, { useMemo } from "react";
import { Layer, VectorSource } from "@maplibre/maplibre-react-native";
import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";

import HAZARD_COLORS, {
  type HazardColorSet,
} from "@/constants/hazardColors";
import { HAZARD_LAYERS, getRemoteSourceUrl } from "@/lib/pmtiles/downloadLayer";
import { useOfflinePMTilesLayer } from "@/hooks/useOfflinePMTilesLayer";

/**
 * Building-footprint lid source, layered ABOVE a flood overlay so extruded
 * buildings physically occlude the flood cells underneath — the flood then
 * reads as flowing AROUND buildings rather than straight through them.
 *
 * MapLibre has no cross-source punch-out, so this 3D "lid" is the standard,
 * cheap way to get that look. Only mounted while a flood layer is active.
 */
const BUILDING_TILES_URL =
  "https://api.maptiler.com/tiles/v3/tiles.json?key=" +
  process.env.EXPO_PUBLIC_MAPTILER_KEY;
const BUILDING_SOURCE_LAYER = "building";

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

  // Widen the fade-in window so flood cells ease in gently over four
  // zoom levels instead of snapping to full opacity. This avoids the
  // "mosaic boxes appear all at once" effect.
  const fadeStart = minZoom;
  const fadeEnd = minZoom + 4;

  const fillPaint = useMemo(
    () => ({
      "fill-color": (palette.fillExpression ?? palette.fill) as any,
      "fill-antialias": true,
      "fill-opacity": zoomRamp(0, palette.opacity, fadeStart, fadeEnd),
      "fill-outline-color": "rgba(0,0,0,0)",
      "fill-translate": [0, 1] as [number, number],
    }),
    [palette.fillExpression, palette.fill, palette.opacity, fadeStart, fadeEnd]
  );

  // Wide, blurred, low-opacity halo — the soft glow that hides cell edges.
  const haloPaint = useMemo(
    () => ({
      "line-color": palette.stroke,
      "line-join": "round",
      "line-cap": "round",
      "line-blur": zoomRamp(4, 9, fadeStart, 14),
      "line-width": zoomRamp(6, 14, fadeStart, 16),
      "line-opacity": zoomRamp(0, 0.18, fadeStart, fadeEnd),
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
        1,
        16,
        1.6,
      ] as ExpressionSpecification,
      "line-opacity": zoomRamp(0, 0.3, fadeStart, fadeEnd),
    }),
    [palette.stroke, fadeStart, fadeEnd]
  );

  const showBuildings = config?.hazardType === "flood";

  if (!config) return null;

  // Prefer the downloaded archive; otherwise stream just the tiles for the
  // visible area straight from the remote archive via byte-range requests.
  const url =
    status === "ready" && sourceUrl ? sourceUrl : getRemoteSourceUrl(config.id);
  const sourceId = `hazard-source-${config.id}`;

  return (
    <>
      {/* ── Hazard source ── */}
      <VectorSource id={sourceId} url={url} minzoom={minZoom} maxzoom={maxZoom}>
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

      {/* ── Building extrusion lid (flood only) ── */}
      {showBuildings && (
        <VectorSource
          id="floodBuildingLidSource"
          url={BUILDING_TILES_URL}
          minzoom={12}
          maxzoom={18}
        >
          <Layer
            id="floodBuildingLid"
            type="fill-extrusion"
            source-layer={BUILDING_SOURCE_LAYER}
            minzoom={12}
            maxzoom={18}
            layout={{
              "fill-extrusion-height": [
                "coalesce",
                ["get", "render_height"],
                ["get", "height"],
                12,
              ],
              "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            } as any}
            paint={{
              "fill-extrusion-color": "#d1d5db",
              "fill-extrusion-opacity": 0.92,
            } as any}
          />
        </VectorSource>
      )}
    </>
  );
}

/**
 * Memoized: parents re-render often (location ticks, pulse animations);
 * none of that should reach MapLibre unless the active layer or styling
 * actually changes.
 */
export const HazardLayerOverlay = React.memo(HazardLayerOverlayInner);
