// Registry of toggleable map hazard layers. Adding a future category
// (volcanoes, fault lines, typhoons, weather bulletins) means appending an
// entry here and rendering its map layers behind the matching visibleLayers
// key — no other plumbing required.
export const HAZARD_LAYERS = [
  {
    key: "dams",
    label: "Dams",
    icon: "water-outline",
    activeColor: "#4287f5",
  },
  {
    key: "faultLines",
    label: "Fault Lines",
    icon: "map-outline",
    activeColor: "#8B5CF6",
  },
  {
    key: "volcanoes",
    label: "Volcanoes",
    icon: "flame-outline",
    activeColor: "#E0592A",
  },
  {
    key: "typhoons",
    label: "Typhoons",
    icon: "thunderstorm-outline",
    activeColor: "#0EA5E9",
  },
];
