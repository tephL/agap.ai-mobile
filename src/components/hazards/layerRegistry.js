// Registry of toggleable map feature layers, shown in the layers panel's
// "Map layers" tab. Adding a future category (volcanoes, fault lines,
// typhoons, weather bulletins) means appending an entry here and rendering
// its map layers behind the matching visibleLayers key — no other plumbing
// required. (Named MAP_LAYERS to avoid clashing with the PMTiles HAZARD_LAYERS
// in lib/pmtiles/downloadLayer.)
export const MAP_LAYERS = [
  {
    key: "dams",
    label: "Dams",
    activeColor: "#4287f5",
    description: "PAGASA-monitored dam statuses and spill alerts",
  },
  {
    key: "faultLines",
    label: "Fault Lines",
    activeColor: "#8B5CF6",
    description: "PHIVOLCS active fault traces",
  },
  {
    key: "volcanoes",
    label: "Volcanoes",
    activeColor: "#E0592A",
    description: "Monitored volcanoes and danger zones",
  },
  {
    key: "typhoons",
    label: "Typhoons",
    activeColor: "#0EA5E9",
    description: "Active typhoon tracks and public warnings",
  },
];
