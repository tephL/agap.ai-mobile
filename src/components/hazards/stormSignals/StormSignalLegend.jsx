import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  PAGASA_TCWS_COLORS,
  PAGASA_TCWS_LABELS,
} from "@/services/stormSignalService";

const LEVELS = [1, 2, 3, 4, 5];

/**
 * Bottom-right legend explaining the TCWS signal colors. Collapses into a
 * compact chip when hidden — tap the chip (or the header chevron) to flip.
 * Rendered only while the Storm Signals layer is toggled on.
 */
export default function StormSignalLegend({ hidden = false, onToggle }) {
  if (hidden) {
    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={styles.chip}
          onPress={onToggle}
          activeOpacity={0.7}
          accessibilityLabel="Ipakita ang storm signals legend"
          hitSlop={8}
        >
          <Text style={styles.chipText}>Storm Signals</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Storm Signals (TCWS)</Text>
          <TouchableOpacity
            onPress={onToggle}
            hitSlop={8}
            style={styles.collapseButton}
            accessibilityLabel="Itago ang storm signals legend"
          >
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {LEVELS.map((level) => (
          <View key={level} style={styles.row}>
            <View
              style={[styles.swatch, { backgroundColor: PAGASA_TCWS_COLORS[level] }]}
            />
            <Text style={styles.rowText} numberOfLines={2}>
              {level} — {PAGASA_TCWS_LABELS[level]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // NOT absolute: this legend stacks vertically inside LegendStack.
  wrapper: {
    alignItems: "flex-start",
  },
  chip: {
    minWidth: 128,
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