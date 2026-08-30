import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { HAZARD_LEGENDS } from "@/constants/hazardColors";
import { getHazardLayer } from "@/lib/pmtiles/downloadLayer";

interface HazardLayerLegendProps {
  /** The one layer currently overlaid on the map (null = none). */
  activeId: string | null;
  /** Collapsed into the small chip; tap it to expand. */
  hidden: boolean;
  /** Flip between the chip and the full legend card. */
  onToggle: () => void;
}

/**
 * Bottom-left legend explaining what the active hazard overlay's colors
 * mean (flood low/medium/high blue steps, landslide-prone areas, etc.).
 * Collapses into a compact chip when hidden — the only hide/show control
 * lives on the map itself. Renders nothing when no layer is active.
 */
export default function HazardLayerLegend({
  activeId,
  hidden,
  onToggle,
}: HazardLayerLegendProps) {
  if (!activeId) return null;

  const config = getHazardLayer(activeId);
  const items = HAZARD_LEGENDS[config.hazardType];

  if (hidden) {
    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={styles.chip}
          onPress={onToggle}
          activeOpacity={0.7}
          accessibilityLabel="Ipakita ang legend"
          hitSlop={8}
        >
          <Text style={styles.chipText}>Legend</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Legend</Text>
          <TouchableOpacity
            onPress={onToggle}
            hitSlop={8}
            style={styles.collapseButton}
            accessibilityLabel="Itago ang legend"
          >
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {items.map((item) => (
          <View key={item.color + item.label} style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: item.color }]} />
            <Text style={styles.rowText} numberOfLines={2}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    bottom: 40,
    alignItems: "flex-start",
  },
  chip: {
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingHorizontal: 20,
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
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    includeFontPadding: false,
  },
  card: {
    width: 210,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
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
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    includeFontPadding: false,
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 5,
    marginRight: 12,
    flexShrink: 0,
  },
  rowText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    color: "#374151",
    includeFontPadding: false,
  },
});