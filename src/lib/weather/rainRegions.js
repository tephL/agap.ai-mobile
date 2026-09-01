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

/**
 * Aggregate the admin-region polygons from the province GeoJSON. Returns a
 * FeatureCollection where each feature is one of the 17 regions, carrying
 * `properties.regionName` and a `provinceCount`.
 */
export function buildRegionGeojson(phProvinces) {
  const byName = new Map();
  for (const feature of phProvinces?.features ?? []) {
    const provName = feature.properties?.name;
    if (!provName) continue;
    const region = PROVINCE_TO_REGION[provName];
    if (!region) continue;
    if (!byName.has(region)) {
      byName.set(region, { name: region, polygons: [] });
    }
    byName.get(region).polygons.push(feature.geometry);
  }

  const features = [];
  for (const region of REGION_ORDER) {
    const entry = byName.get(region);
    if (!entry) continue;
    const geoms = entry.polygons;
    let geometry;
    if (geoms.length === 1) geometry = geoms[0];
    else {
      const coords = [];
      for (const g of geoms) {
        if (g.type === "Polygon") coords.push(g.coordinates);
        else if (g.type === "MultiPolygon") coords.push(...g.coordinates);
      }
      geometry = { type: "MultiPolygon", coordinates: coords };
    }
    features.push({
      type: "Feature",
      properties: { name: region, regionName: region, provinceCount: geoms.length },
      geometry,
    });
  }

  return { type: "FeatureCollection", features };
}

/** Short display label for a region (e.g. "Region 3 (Central Luzon)" → "Central Luzon"). */
export function regionShortName(region) {
  const m = /\(([^)]+)\)/.exec(region ?? "");
  return m ? m[1] : region;
}

/**
 * Attach rainfall (mm) for the selected forecast day to each region feature.
 * Returns a new FeatureCollection where each region feature carries
 * `properties.rainMm` = the day's precipitation for that region.
 */
export function attachRainToRegions(regionGeojson, dayIndex, rainByRegion) {
  const features = (regionGeojson?.features ?? []).map((feature) => {
    const regionName = feature.properties?.regionName;
    const rainMm = rainByRegion?.[regionName]?.[dayIndex] ?? 0;
    return {
      ...feature,
      properties: {
        ...feature.properties,
        dayIndex,
        rainMm,
      },
    };
  });
  return { type: "FeatureCollection", features };
}
