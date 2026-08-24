import type { HazardType } from "@/lib/pmtiles/downloadLayer";

/**
 * Default semi-transparent styling per hazard type, applied by
 * HazardLayerOverlay. Overridable via its `colors` prop.
 */
export interface HazardColorSet {
  fill: string;
  stroke: string;
  opacity: number;
}

const HAZARD_COLORS: Record<HazardType, HazardColorSet> = {
  flood: { fill: "#3B82F6", stroke: "#1D4ED8", opacity: 0.45 },
  landslide: { fill: "#F97316", stroke: "#C2410C", opacity: 0.45 },
  "debris-flow": { fill: "#A16207", stroke: "#713F12", opacity: 0.45 },
  "storm-surge": { fill: "#EF4444", stroke: "#B91C1C", opacity: 0.45 },
};

export default HAZARD_COLORS;
