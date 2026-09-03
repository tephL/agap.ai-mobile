// Maps every province polygon name in phProvinces.json to one of the 17
// Philippine administrative regions. Used to aggregate the province polygons
// into regional features for the weekly rain-forecast overlay.
export const PROVINCE_TO_REGION = {
  "Metro Manila": "NCR",

  Abra: "CAR",
  Benguet: "CAR",
  Ifugao: "CAR",
  Kalinga: "CAR",
  "Mountain Province": "CAR",
  Apayao: "CAR",

  "Ilocos Norte": "Region 1 (Ilocos)",
  "Ilocos Sur": "Region 1 (Ilocos)",
  "La Union": "Region 1 (Ilocos)",
  Pangasinan: "Region 1 (Ilocos)",

  Batanes: "Region 2 (Cagayan Valley)",
  Cagayan: "Region 2 (Cagayan Valley)",
  Isabela: "Region 2 (Cagayan Valley)",
  "Nueva Vizcaya": "Region 2 (Cagayan Valley)",
  Quirino: "Region 2 (Cagayan Valley)",

  Aurora: "Region 3 (Central Luzon)",
  Bataan: "Region 3 (Central Luzon)",
  Bulacan: "Region 3 (Central Luzon)",
  "Nueva Ecija": "Region 3 (Central Luzon)",
  Pampanga: "Region 3 (Central Luzon)",
  Tarlac: "Region 3 (Central Luzon)",
  Zambales: "Region 3 (Central Luzon)",

  Batangas: "Region 4A (CALABARZON)",
  Cavite: "Region 4A (CALABARZON)",
  Laguna: "Region 4A (CALABARZON)",
  Quezon: "Region 4A (CALABARZON)",
  Rizal: "Region 4A (CALABARZON)",

  Marinduque: "MIMAROPA",
  "Occidental Mindoro": "MIMAROPA",
  "Oriental Mindoro": "MIMAROPA",
  Palawan: "MIMAROPA",
  Romblon: "MIMAROPA",

  Albay: "Region 5 (Bicol)",
  "Camarines Norte": "Region 5 (Bicol)",
  "Camarines Sur": "Region 5 (Bicol)",
  Catanduanes: "Region 5 (Bicol)",
  Masbate: "Region 5 (Bicol)",
  Sorsogon: "Region 5 (Bicol)",

  Aklan: "Region 6 (Western Visayas)",
  Antique: "Region 6 (Western Visayas)",
  Capiz: "Region 6 (Western Visayas)",
  Iloilo: "Region 6 (Western Visayas)",
  "Negros Occidental": "Region 6 (Western Visayas)",
  Guimaras: "Region 6 (Western Visayas)",

  Bohol: "Region 7 (Central Visayas)",
  Cebu: "Region 7 (Central Visayas)",
  "Negros Oriental": "Region 7 (Central Visayas)",
  Siquijor: "Region 7 (Central Visayas)",

  "Eastern Samar": "Region 8 (Eastern Visayas)",
  Leyte: "Region 8 (Eastern Visayas)",
  "Northern Samar": "Region 8 (Eastern Visayas)",
  Samar: "Region 8 (Eastern Visayas)",
  "Southern Leyte": "Region 8 (Eastern Visayas)",
  Biliran: "Region 8 (Eastern Visayas)",

  "Zamboanga del Norte": "Region 9 (Zamboanga Peninsula)",
  "Zamboanga del Sur": "Region 9 (Zamboanga Peninsula)",
  "Zamboanga Sibugay": "Region 9 (Zamboanga Peninsula)",

  Bukidnon: "Region 10 (Northern Mindanao)",
  Camiguin: "Region 10 (Northern Mindanao)",
  "Lanao del Norte": "Region 10 (Northern Mindanao)",
  "Misamis Occidental": "Region 10 (Northern Mindanao)",
  "Misamis Oriental": "Region 10 (Northern Mindanao)",

  "Davao del Norte": "Region 11 (Davao)",
  "Davao del Sur": "Region 11 (Davao)",
  "Davao Oriental": "Region 11 (Davao)",
  "Davao de Oro": "Region 11 (Davao)",
  "Davao Occidental": "Region 11 (Davao)",

  Cotabato: "Region 12 (SOCCSKSARGEN)",
  "South Cotabato": "Region 12 (SOCCSKSARGEN)",
  "Sultan Kudarat": "Region 12 (SOCCSKSARGEN)",
  Sarangani: "Region 12 (SOCCSKSARGEN)",

  "Agusan del Norte": "Region 13 (Caraga)",
  "Agusan del Sur": "Region 13 (Caraga)",
  "Surigao del Norte": "Region 13 (Caraga)",
  "Surigao del Sur": "Region 13 (Caraga)",
  "Dinagat Islands": "Region 13 (Caraga)",

  Basilan: "BARMM",
  "Lanao del Sur": "BARMM",
  Sulu: "BARMM",
  "Tawi-Tawi": "BARMM",
  "Maguindanao del Norte": "BARMM",
  "Maguindanao del Sur": "BARMM",
};

// Ordered list of region labels, used for consistent display ordering.
export const REGION_ORDER = [
  "NCR",
  "CAR",
  "Region 1 (Ilocos)",
  "Region 2 (Cagayan Valley)",
  "Region 3 (Central Luzon)",
  "Region 4A (CALABARZON)",
  "MIMAROPA",
  "Region 5 (Bicol)",
  "Region 6 (Western Visayas)",
  "Region 7 (Central Visayas)",
  "Region 8 (Eastern Visayas)",
  "Region 9 (Zamboanga Peninsula)",
  "Region 10 (Northern Mindanao)",
  "Region 11 (Davao)",
  "Region 12 (SOCCSKSARGEN)",
  "Region 13 (Caraga)",
  "BARMM",
];

/** Short display label for a region (e.g. "Region 3 (Central Luzon)" → "Central Luzon"). */
export function regionShortName(region) {
  const m = /\(([^)]+)\)/.exec(region ?? "");
  return m ? m[1] : region;
}

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

/**
 * Attach rainfall (mm) to each province polygon for the selected forecast day.
 * `rainByProvince` maps province name → the full 7-day mm series. Returns a new
 * FeatureCollection where each province feature carries `rainMm` (the selected
 * day) and `rainMmAll` (the whole series). Provinces outside the forecast
 * simply carry 0.
 */
export function attachRainToProvinces(phProvinces, dayIndex, rainByProvince) {
  const features = [];
  for (const feature of phProvinces?.features ?? []) {
    const geometry = cleanGeometry(feature.geometry);
    if (!geometry) continue;
    const name = feature.properties?.name;
    if (!name) continue;
    const series = rainByProvince?.[name] ?? Array(7).fill(0);
    features.push({
      type: "Feature",
      properties: {
        ...feature.properties,
        name,
        region: PROVINCE_TO_REGION[name] ?? null,
        dayIndex,
        rainMm: series[dayIndex] ?? 0,
        rainMmAll: series,
      },
      geometry,
    });
  }
  return { type: "FeatureCollection", features };
}
