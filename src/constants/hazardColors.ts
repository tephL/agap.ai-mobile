import type { HazardType } from "@/lib/pmtiles/downloadLayer";

/**
 * Default semi-transparent styling per hazard type, applied by
 * HazardLayerOverlay. Overridable via its `colors` prop.
 */
export interface HazardColorSet {
  fill: string;
  stroke: string;
  opacity: number;
  /** Data-driven fill expression for heatmap layers (e.g. flood). */
  fillExpression?: unknown[];
}

/**
 * Flood heatmap gradient based on the `Var` property in the PMTiles data:
 *   1 = Low hazard (0–0.5 m depth)
 *   2 = Medium hazard (>0.5–1.5 m depth)
 *   3 = High hazard (>1.5 m depth)
 *
 * FLOOD_LEGEND_ITEMS double as the source of truth for both the paint
 * expression below and the map legend, so a recolor can never drift the
 * legend away from the rendered fill.
 */
const FLOOD_LEGEND_ITEMS = [
  { value: 1, color: "#93c5fd", label: "Mababa (0–0.5 m)" }, // light blue  — low
  { value: 2, color: "#3b82f6", label: "Katamtaman (0.5–1.5 m)" }, // medium blue — medium
  { value: 3, color: "#1d4ed8", label: "Mataas (>1.5 m)" }, // dark blue   — high
] as const;

const FLOOD_FILL_EXPRESSION: unknown[] = [
  "match",
  ["get", "Var"],
  ...FLOOD_LEGEND_ITEMS.flatMap(({ value, color }) => [value, color]),
  FLOOD_LEGEND_ITEMS[0].color, // fallback
];

const HAZARD_COLORS: Record<HazardType, HazardColorSet> = {
  flood: {
    fill: "#3B82F6",
    stroke: "#1D4ED8",
    opacity: 0.55,
    fillExpression: FLOOD_FILL_EXPRESSION,
  },
  landslide: { fill: "#F97316", stroke: "#C2410C", opacity: 0.45 },
  "debris-flow": { fill: "#A16207", stroke: "#713F12", opacity: 0.45 },
  "storm-surge": { fill: "#EF4444", stroke: "#B91C1C", opacity: 0.45 },
};

export interface HazardLegendItem {
  color: string;
  label: string;
}

/**
 * Map legend rows per hazard type, derived from the same hex values the
 * layers render with (see HAZARD_LEGENDS). Flood keeps its full low/medium/
 * high gradient; the polygon-only types get a single representative swatch.
 */
export const HAZARD_LEGENDS: Record<HazardType, HazardLegendItem[]> = {
  flood: FLOOD_LEGEND_ITEMS.map(({ color, label }) => ({ color, label })),
  landslide: [
    { color: HAZARD_COLORS.landslide.fill, label: "Madaling gumuho ang lupa (landslide)" },
  ],
  "debris-flow": [
    { color: HAZARD_COLORS["debris-flow"].fill, label: "Daloy ng putik at bato" },
  ],
  "storm-surge": [
    { color: HAZARD_COLORS["storm-surge"].fill, label: "Baha dulot ng bagyo" },
  ],
};

export default HAZARD_COLORS;
