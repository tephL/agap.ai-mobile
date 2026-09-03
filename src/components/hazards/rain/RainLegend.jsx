import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Rain intensity color ramp shared by the map overlay and the legend. Kept in
// sync with RainForecastTab.rainColor manually (mm buckets are the same).
const RAIN_STEPS = [
  { label: "None", color: "#E5E7EB" },
  { label: "1–25 mm (Light)", color: "#93C5FD" },
  { label: "26–50 mm (Moderate)", color: "#3B82F6" },
  { label: "51–100 mm (Heavy)", color: "#F59E0B" },
  { label: "100+ mm (Torrential)", color: "#DC2626" },
];

/**
 * Bottom-left legend explaining the Rain overlay's color ramp (daily rainfall
 * in mm). The `wrapper` is intentionally NOT absolute so it can stack inside
 * LegendStack.
 */
export default function RainLegend({ hidden = false, onToggle }) {
  if (hidden) {
    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={styles.chip}
          onPress={onToggle}
          activeOpacity={0.7}
          accessibilityLabel="Ipakita ang rain forecast legend"
          hitSlop={8}
        >
          <Text style={styles.chipText}>Rain</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Rain Forecast (today)</Text>
          <TouchableOpacity
            onPress={onToggle}
            hitSlop={8}
            style={styles.collapseButton}
            accessibilityLabel="Itago ang rain forecast legend"
          >
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {RAIN_STEPS.map((step) => (
          <View key={step.label} style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: step.color }]} />
            <Text style={styles.rowText} numberOfLines={2}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-start",
  },
  chip: {
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    includeFontPadding: false,
  },
  card: {
    width: 224,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginRight: 8,
    includeFontPadding: false,
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    flexShrink: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 10,
    flexShrink: 0,
  },
  rowText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#374151",
    includeFontPadding: false,
  },
});
