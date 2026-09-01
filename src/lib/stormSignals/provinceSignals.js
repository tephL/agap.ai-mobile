export const PROVINCE_ALIASES = {
  "Metro Manila": ["Metro Manila"],
  "National Capital Region": ["Metro Manila"],
  NCR: ["Metro Manila"],
  Manila: ["Metro Manila"],
  "Manila (Capital)": ["Metro Manila"],
  "North Cotabato": ["Cotabato"],
  "Compostela Valley": ["Davao de Oro"],
  Maguindanao: ["Maguindanao del Norte", "Maguindanao del Sur"],
};

export function normalizeProvince(name) {
  if (name == null) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const withoutParens = trimmed.replace(/\(.*\)/g, "").trim();
  if (PROVINCE_ALIASES[withoutParens]) return PROVINCE_ALIASES[withoutParens];
  if (PROVINCE_ALIASES[trimmed]) return PROVINCE_ALIASES[trimmed];
  return [withoutParens];
}

export function resolveSignalsToProvinces(signals) {
  const byProvince = {};
  const unmapped = [];
  for (const entry of signals ?? []) {
    const level = entry.level;
    for (const area of entry.areas ?? []) {
      if (!area?.name) continue;
      const matches = normalizeProvince(area.name);
      if (!matches) {
        unmapped.push(area.name);
        continue;
      }
      for (const featureName of matches) {
        byProvince[featureName] = Math.max(byProvince[featureName] ?? 0, level);
      }
    }
  }
  return { byProvince, unmapped: [...new Set(unmapped)] };
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonContains(polygon, lng, lat) {
  if (polygon.length === 0) return false;
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(lng, lat, polygon[i])) return false;
  }
  return true;
}

function contains(coords, lng, lat) {
  if (coords.type === "Polygon") {
    return polygonContains(coords.coordinates, lng, lat);
  }
  if (coords.type === "MultiPolygon") {
    for (const polygon of coords.coordinates) {
      if (polygonContains(polygon, lng, lat)) return true;
    }
    return false;
  }
  return false;
}

export function provinceAtPoint(latitude, longitude, features) {
  if (latitude == null || longitude == null) return null;
  let best = null;
  let bestArea = -1;
  for (const feature of features ?? []) {
    if (!feature?.geometry) continue;
    if (!contains(feature.geometry, longitude, latitude)) continue;
    const name = feature.properties?.name;
    if (!name) continue;
    const area = feature.properties?.area ?? -1;
    if (area >= bestArea) {
      best = name;
      bestArea = area;
    }
  }
  return best;
}

export function buildSignalGeojson(provincesGeoJson, byProvince) {
  // MapLibre rejects rings with fewer than 4 points; drop them defensively
  // so degenerate source data can never crash the source set.
  function cleanGeometry(geometry) {
    if (!geometry || !geometry.coordinates) return geometry;
    if (geometry.type === "Polygon") {
      const rings = (geometry.coordinates ?? []).filter((r) => r.length >= 4);
      return rings.length > 0 ? { ...geometry, coordinates: rings } : null;
    }
    if (geometry.type === "MultiPolygon") {
      const polys = (geometry.coordinates ?? [])
        .map((poly) => poly.filter((r) => r.length >= 4))
        .filter((poly) => poly.length > 0);
      return polys.length > 0 ? { ...geometry, coordinates: polys } : null;
    }
    return geometry;
  }

  const features = (provincesGeoJson?.features ?? [])
    .map((feature) => {
      const geometry = cleanGeometry(feature.geometry);
      if (!geometry) return null;
      let area = null;
      try {
        const ring = geometry.coordinates?.[0]?.[0];
        if (ring && ring.length >= 3) {
          area =
            Math.abs(
              ring.reduce((acc, [x1, y1], i, arr) => {
                const [x2, y2] = arr[(i + 1) % arr.length];
                return acc + x1 * y2 - x2 * y1;
              }, 0) / 2
            ) || null;
        }
      } catch {}
      const name = feature.properties?.name;
      return {
        type: "Feature",
        properties: {
          name,
          signal: byProvince?.[name] ?? 0,
          province: name,
          ...(area != null ? { area } : {}),
        },
        geometry,
      };
    })
    .filter(Boolean);
  return { type: "FeatureCollection", features };
}