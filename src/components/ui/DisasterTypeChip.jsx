import { Text, View, StyleSheet } from "react-native";

const TYPE_ICONS = {
  flood: "\u{1F30A}",
  fire: "\u{1F525}",
  earthquake: "\u{1F30D}",
  landslide: "\u{26F0}\uFE0F",
  typhoon: "\u{1F300}",
  storm_surge: "\u{1F30A}\u200D\u{1F4A8}",
  collapse: "\u{1F3F7}\uFE0F",
  other: "\u26A0\uFE0F",
};

const TYPE_LABELS = {
  flood: "Flood",
  fire: "Fire",
  earthquake: "Earthquake",
  landslide: "Landslide",
  typhoon: "Typhoon",
  storm_surge: "Storm Surge",
  collapse: "Collapse",
  other: "Other",
};

const TYPE_COLORS = {
  flood: { bg: "#DBEAFE", fg: "#1D4ED8" },
  fire: { bg: "#FEE2E2", fg: "#B91C1C" },
  earthquake: { bg: "#FEF3C7", fg: "#92400E" },
  landslide: { bg: "#E0E7FF", fg: "#4338CA" },
  typhoon: { bg: "#D1FAE5", fg: "#065F46" },
  storm_surge: { bg: "#CFFAFE", fg: "#0E7490" },
  collapse: { bg: "#F3E8FF", fg: "#6B21A8" },
  other: { bg: "#F1F5F9", fg: "#475569" },
};

export default function DisasterTypeChip({ type, showIcon = false }) {
  if (!type) return null;

  const label = TYPE_LABELS[type] ?? type;
  const style = TYPE_COLORS[type] ?? TYPE_COLORS.other;
  const icon = TYPE_ICONS[type] ?? TYPE_ICONS.other;

  return (
    <View style={[styles.chip, { backgroundColor: style.bg }]}>
      {showIcon ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : null}
      <Text style={[styles.label, { color: style.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  icon: {
    fontSize: 10,
    marginRight: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
  },
});
