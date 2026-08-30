import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  PAGASA_TCWS_COLORS,
  PAGASA_TCWS_LABELS,
} from "@/services/stormSignalService";

const LEVELS = [1, 2, 3, 4, 5];

export default function StormSignalLegend() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Text style={styles.title}>Storm Signals (TCWS)</Text>
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
  wrapper: {
    position: "absolute",
    right: 16,
    bottom: 40,
    alignItems: "flex-end",
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
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    includeFontPadding: false,
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