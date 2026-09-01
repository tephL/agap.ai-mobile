// Sample weekly rainfall forecast used to exercise the Rain Forecast feature,
// independent of any live source. Modeled on the same 8 AM 17 Nov 2024 stage
// as the Pepito fixtures: Pepito crosses northern and central Luzon, so the
// heaviest rain falls over those regions on Nov 17-19, then tapers off as the
// system exits into the West Philippine Sea.
import { REGION_ORDER } from "./rainRegions.js";

// Daily rainfall (mm) per region for the 7-day window, oldest → newest.
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

export function regionRainForDay(region, dayIndex) {
  const arr = RAIN_BY_REGION[region] ?? Array(7).fill(0);
  return arr[dayIndex] ?? 0;
}

export function regionWeekTotal(region) {
  const arr = RAIN_BY_REGION[region] ?? [];
  return arr.reduce((a, b) => a + b, 0);
}

export function buildSampleRainForecast() {
  const regions = REGION_ORDER.filter((r) => RAIN_BY_REGION[r]).map((region) => ({
    id: region,
    name: region,
    days: DAY_LABELS.map((label, i) => ({
      index: i,
      label,
      mm: regionRainForDay(region, i),
    })),
    weekTotal: regionWeekTotal(region),
  }));

  return {
    active: true,
    unavailable: false,
    generatedAt: new Date().toISOString(),
    source: "sample",
    days: DAY_LABELS.map((label, i) => ({ index: i, label })),
    regions,
    rawRegionCount: regions.length,
    sample: true,
  };
}
