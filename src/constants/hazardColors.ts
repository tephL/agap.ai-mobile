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
 */
const FLOOD_FILL_EXPRESSION: unknown[] = [
  "match",
  ["get", "Var"],
  1, "#93c5fd", // light blue  — low
  2, "#3b82f6", // medium blue — medium
  3, "#1d4ed8", // dark blue   — high
  "#93c5fd",    // fallback
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

export default HAZARD_COLORS;
