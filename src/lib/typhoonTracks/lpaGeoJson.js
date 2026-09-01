// Builds the GeoJSON for the LPA map overlay: for every LPA, a solid-outline
// hollow circle plus a center crosshair, following the shared visual language
// used for typhoon markers. Distance is in nautical-mile-ish degrees so the
// circle stays a stable on-screen size.

const CIRCLE_RADIUS_DEG = 1.5; // approx. radius of the hollow circle
const CIRCLE_POINTS = 48;
const CROSS_ARM = 0.9; // half-length of each crosshair arm, in degrees

function circleLineString(cx, cy, radius, points) {
  const coords = [];
  for (let i = 0; i < points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    coords.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  coords.push(coords[0]); // close the ring
  return {
    type: "LineString",
    coordinates: coords,
  };
}

function plusLineString(cx, cy, arm) {
  return {
    type: "LineString",
    coordinates: [
      [cx - arm, cy],
      [cx + arm, cy],
      [cx, cy - arm],
      [cx, cy + arm],
    ],
  };
}

/**
 * Build the GeoJSON FeatureCollection for all LPAs. Each LPA produces two
 * features: `kind: 'lpaCircle'` (solid outline) and `kind: 'lpaPlus'` (the
 * center crosshair). Properties carry `id`, `name` and the center `lon/lat`.
 */
export function buildLpaGeojson(lpas) {
  const features = [];
  for (const lpa of lpas ?? []) {
    const props = {
      id: lpa.id,
      name: lpa.name,
      lon: lpa.lon,
      lat: lpa.lat,
    };
    features.push({
      type: "Feature",
      properties: { ...props, kind: "lpaCircle" },
      geometry: circleLineString(lpa.lon, lpa.lat, CIRCLE_RADIUS_DEG, CIRCLE_POINTS),
    });
    features.push({
      type: "Feature",
      properties: { ...props, kind: "lpaPlus" },
      geometry: plusLineString(lpa.lon, lpa.lat, CROSS_ARM),
    });
  }
  return { type: "FeatureCollection", features };
}

/** Bounding box around a single LPA's circle, for camera autofit. */
export function lpaBounds(lpa) {
  if (!lpa) return null;
  return [
    lpa.lon - CIRCLE_RADIUS_DEG,
    lpa.lat - CIRCLE_RADIUS_DEG,
    lpa.lon + CIRCLE_RADIUS_DEG,
    lpa.lat + CIRCLE_RADIUS_DEG,
  ];
}
