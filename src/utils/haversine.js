const EARTH_RADIUS_M = 6371000;

const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance between two { lat, lng } points, in meters.
// Returns null when either point is missing coordinates.
export function haversineMeters(a, b) {
  if (
    !a ||
    !b ||
    a.lat == null ||
    a.lng == null ||
    b.lat == null ||
    b.lng == null
  ) {
    return null;
  }

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// "3m away" under a kilometer, "1.4km away" above it.
export function formatDistance(meters) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}
