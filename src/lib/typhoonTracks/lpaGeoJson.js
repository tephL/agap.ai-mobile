// Builds the GeoJSON for the LPA map overlay: for every LPA, a solid-outline
// hollow circle marking the low's location. Rendered in yellow to match the
// PAGASA LPA convention and the app's amber uncertainty-cone language.
// Distance is in degrees so the circle stays a stable on-screen size.

const CIRCLE_RADIUS_DEG = 1.5; // approx. radius of the hollow circle
const CIRCLE_POINTS = 48;

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

/**
 * Build the GeoJSON FeatureCollection for all LPAs. Each LPA produces one
 * hollow-circle feature (`kind: 'lpaCircle'`). Properties carry `id`, `name`
 * and the center `lon/lat`.
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
