// Philippine Area of Responsibility (PAR) geometry.
//
// PAGASA defines the PAR as the Western North Pacific area bounded by imaginary
// lines connecting these official vertices (in clockwise order):
//   A: 5°N 115°E   → [115, 5]
//   B: 15°N 115°E  → [115, 15]
//   C: 21°N 120°E  → [120, 21]
//   D: 25°N 120°E  → [120, 25]
//   E: 25°N 135°E  → [135, 25]
//   F: 5°N 135°E   → [135, 5]
// The western boundary is slanted (B→C) rather than a straight meridian, so the
// PAR is NOT a rectangle. This file provides:
//   1. `PAR_BOUNDS` — the enclosing camera bound (must be a rectangle, so it
//      wraps the whole polygon) so weather overlays can zoom out to see it.
//   2. `buildParLineFeature()` — a GeoJSON LineString tracing the exact
//      polygon, drawn over the Typhoon and LPA overlays.

export const PAR_BOUNDS = [115.0, 5.0, 135.0, 25.0];

// Camera framing target for the weather/Typhoon tabs. Frames Luzon and its
// surrounding provinces rather than the whole (much larger) PAR box, so
// pressing Weather zips to the region most people care about.
export const LUZON_BOUNDS = [117.0, 12.0, 124.6, 19.8];

export const PAR_CENTER = [125.0, 14.0];

// Closed ring (first point repeated) tracing the official 6-vertex PAR polygon.
const PAR_RING = [
  [115.0, 5.0], // A
  [115.0, 15.0], // B
  [120.0, 21.0], // C
  [120.0, 25.0], // D
  [135.0, 25.0], // E
  [135.0, 5.0], // F
  [115.0, 5.0], // close back to A
];

export function buildParLineFeature() {
  return {
    type: "Feature",
    properties: { kind: "par" },
    geometry: {
      type: "LineString",
      coordinates: PAR_RING,
    },
  };
}
