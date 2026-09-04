// Sample weekly rainfall forecast used to exercise the Rain Forecast feature,
// independent of any live source. Modeled on the same 8 AM 17 Nov 2024 stage
// as the Pepito fixtures: Pepito crosses northern and central Luzon, so the
// heaviest rain falls over northern/central Luzon on Nov 17-19, then tapers
// off as the system exits into the West Philippine Sea.
//
// Data is stored per admin region (17 base series), then each province is given
// a distinct series via a small deterministic per-province offset so every one
// of the 83 provinces reads as its own forecast instead of a flat region clone.
import { PROVINCE_TO_REGION, REGION_ORDER } from "./rainRegions.js";

// Daily rainfall (mm) per region for the 7-day window, oldest → newest. Each
// province in a region gets a varied series around this base.
const RAIN_BY_REGION = {
  "NCR": [45, 70, 35, 8, 2, 0, 0],
  "CAR": [120, 150, 80, 20, 5, 0, 0],
  "Region 1 (Ilocos)": [80, 110, 60, 15, 4, 0, 0],
  "Region 2 (Cagayan Valley)": [140, 100, 50, 12, 3, 0, 0],
  "Region 3 (Central Luzon)": [95, 130, 70, 18, 5, 0, 0],
  "Region 4A (CALABARZON)": [110, 90, 40, 10, 3, 0, 0],
  "MIMAROPA": [40, 55, 25, 6, 2, 0, 0],
  "Region 5 (Bicol)": [90, 60, 20, 5, 1, 0, 0],
  "Region 6 (Western Visayas)": [25, 35, 15, 4, 1, 0, 0],
  "Region 7 (Central Visayas)": [20, 30, 12, 3, 1, 0, 0],
  "Region 8 (Eastern Visayas)": [35, 40, 18, 5, 1, 0, 0],
  "Region 9 (Zamboanga Peninsula)": [10, 15, 8, 2, 1, 0, 0],
  "Region 10 (Northern Mindanao)": [15, 20, 10, 3, 1, 0, 0],
  "Region 11 (Davao)": [12, 16, 9, 3, 1, 0, 0],
  "Region 12 (SOCCSKSARGEN)": [10, 14, 8, 2, 1, 0, 0],
  "Region 13 (Caraga)": [18, 24, 12, 4, 1, 0, 0],
  "BARMM": [8, 12, 6, 2, 1, 0, 0],
};

const DAY_LABELS = [
  "Sun Nov 17",
  "Mon Nov 18",
  "Tue Nov 19",
  "Wed Nov 20",
  "Thu Nov 21",
  "Fri Nov 22",
  "Sat Nov 23",
];

// Corresponding ISO dates (year 2024) so the tab can auto-detect "today"
// against the streak when the forecast is current and fall back when it's a
// historical sample like the Pepito run.
const DAY_DATES = [
  "2024-11-17",
  "2024-11-18",
  "2024-11-19",
  "2024-11-20",
  "2024-11-21",
  "2024-11-22",
  "2024-11-23",
];

// Deterministic pseudo-random multiplier in [0.7, 1.3] derived from a string,
// so the same province always yields the same overall rainfall level.
function provinceVariance(key) {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  const unit = (h % 1000) / 1000; // 0..0.999
  return 0.7 + unit * 0.6;
}

// Deterministic per-day factor in [0.6, 1.4] so two provinces with the same
// rounded base each still get their own distinct integers across the week.
function dayVariance(key, index) {
  let h = 7;
  for (let i = 0; i < key.length; i += 1) {
    h = ((h * 31 + key.charCodeAt(i)) >>> 0) + index * 131;
  }
  const unit = ((h % 1000) + 1000) % 1000 / 1000;
  return 0.6 + unit * 0.8;
}

function provinceRain(province, region) {
  const base = RAIN_BY_REGION[region] ?? Array(7).fill(0);
  const v = provinceVariance(province);
  return base.map((mm, i) => Math.round(mm * v * dayVariance(province, i)));
}

export function provinceWeekTotal(series) {
  return (series ?? []).reduce((a, b) => a + b, 0);
}

/** All provinces that belong to a given region, sorted by name. */
export function provincesOfRegion(region) {
  return Object.keys(PROVINCE_TO_REGION)
    .filter((p) => PROVINCE_TO_REGION[p] === region)
    .sort((a, b) => a.localeCompare(b));
}

export function buildSampleRainForecast() {
  const provinces = [];
  for (const province of Object.keys(PROVINCE_TO_REGION)) {
    const region = PROVINCE_TO_REGION[province];
    const series = provinceRain(province, region);
    provinces.push({
      id: province,
      name: province,
      region,
      days: DAY_LABELS.map((label, i) => ({
        index: i,
        label,
        date: DAY_DATES[i],
        mm: series[i] ?? 0,
      })),
      weekTotal: provinceWeekTotal(series),
    });
  }
  provinces.sort((a, b) => a.name.localeCompare(b.name));

  return {
    active: true,
    unavailable: false,
    generatedAt: new Date().toISOString(),
    source: "sample",
    days: DAY_LABELS.map((label, i) => ({ index: i, label })),
    regions: REGION_ORDER,
    provinces,
    rawProvinceCount: provinces.length,
    sample: true,
  };
}
