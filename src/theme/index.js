// Shared design tokens for the hazard-layer UI. Kept minimal and contained so
// the components in src/components/hazards and the hazard overlays in
// src/app/(tabs)/index.jsx can share a consistent visual language without a
// full app-wide redesign.

export const colors = {
  primary: "#E32F31",
  secondary: "#C62A2C",
  background: "#FFFFFF",
  surface: "#F5F5F7",
  text: "#182033",
  muted: "#737B8C",
  placeholder: "#9AA2B1",
  border: "#E0E2E7",
  white: "#FFFFFF",

  // Severity / informing accents (shared across rain + storm surfaces)
  danger: "#DC2626",
  warning: "#F59E0B",
  caution: "#3B82F6",
  info: "#0EA5E9",
  safe: "#22C55E",
  neutral: "#E5E7EB",

  // MapWater colour of the app's hero/emphasis elements (dark navy)
  hero: "#0F2A4A",
  heroText: "#EAF1FB",
  heroMuted: "#A9C0DC",
  heroDim: "#7E97B5",
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const type = {
  micro: { fontSize: 9, fontWeight: "700" },
  caption: { fontSize: 11, fontWeight: "600" },
  body: { fontSize: 13, fontWeight: "500" },
  title: { fontSize: 15, fontWeight: "800" },
  display: { fontSize: 28, fontWeight: "900" },
};

// PAGASA tropical cyclone wind signal ramp (kept in sync with
// src/services/stormSignalService.js).
export const signalColors = {
  1: "#00aaff",
  2: "#fff200",
  3: "#ffaa00",
  4: "#ff0000",
  5: "#cd00cd",
};

export default { colors, radius, spacing, type, signalColors };
