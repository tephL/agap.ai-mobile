import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { INTENSITY_COLORS } from "@/lib/typhoonTracks/trackJson";

const INTENSITY_ROWS = [
  { key: "superTyphoon", label: "Super Typhoon", marker: "STY" },
  { key: "severeTyphoon", label: "Severe Typhoon", marker: "TY" },
  { key: "typhoon", label: "Typhoon", marker: "T" },
  { key: "severeStorm", label: "Severe Tropical Storm", marker: "STS" },
  { key: "tropicalStorm", label: "Tropical Storm", marker: "S" },
  { key: "depression", label: "Tropical Depression", marker: "D" },
];

const CONE_COLOR = "#FACC15";
const CONE_COLOR_EDGE = "#CA8A04";

/**
 * Bottom-right legend for the Typhoons track overlay. Collapses into a compact
 * chip when hidden. Rendered only while the Typhoons layer is toggled on.
 */
export default function TyphoonLegend({ hidden = false, onToggle }) {
  if (hidden) {
    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={styles.chip}
          onPress={onToggle}
          activeOpacity={0.7}
          accessibilityLabel="Ipakita ang typhoons legend"
          hitSlop={8}
        >
          <Text style={styles.chipText}>Typhoons</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Typhoon Tracks</Text>
          <TouchableOpacity
            onPress={onToggle}
            hitSlop={8}
            style={styles.collapseButton}
            accessibilityLabel="Itago ang typhoons legend"
          >
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerSmall}>Track</Text>
        <View style={styles.row}>
          <View style={[styles.lineSwatch, styles.pastLine]} />
          <Text style={styles.rowText}>Past track</Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.lineSwatch, styles.forecastLine]} />
          <Text style={styles.rowText}>Forecast path</Text>
        </View>

        <Text style={styles.headerSmall}>Uncertainty</Text>
        <View style={styles.row}>
          <View style={[styles.swatch, styles.coneSwatch]} />
          <Text style={styles.rowText}>Cone of uncertainty</Text>
        </View>

        <Text style={styles.headerSmall}>Current position</Text>
        <View style={styles.row}>
          <View style={styles.eyeStack}>
            <View style={[styles.swatch, styles.impactSwatch]} />
            <View style={styles.eyeRing} />
            <View style={styles.eyeDot} />
          </View>
          <Text style={styles.rowText}>
            <Text style={styles.rowTextStrong}>Eye</Text> = current center,
            inside the impact halo (storm size)
          </Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.badgeText]}><Text style={styles.badgeLabel}>12H</Text></View>
          <Text style={styles.rowText}>Forecast positions (24H, 36H, …)</Text>
        </View>

        <Text style={styles.headerSmall}>Intensity</Text>
        {INTENSITY_ROWS.map(({ key, label, marker }) => (
          <View key={key} style={styles.row}>
            <View
              style={[
                styles.markerBadge,
                { borderColor: INTENSITY_COLORS[key] },
              ]}
            >
              <Text
                style={[
                  styles.markerLetter,
                  { color: INTENSITY_COLORS[key] },
                ]}
              >
                {marker}
              </Text>
            </View>
            <Text style={styles.rowText}>{label}</Text>
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
    width: 250,
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
  headerSmall: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "800",
    color: "#9AA2B1",
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
  coneSwatch: {
    backgroundColor: CONE_COLOR,
    borderWidth: 1,
    borderColor: CONE_COLOR_EDGE,
    opacity: 0.9,
  },
  lineSwatch: {
    width: 22,
    height: 3,
    borderRadius: 2,
    marginRight: 10,
  },
  pastLine: {
    backgroundColor: "#475569",
  },
  forecastLine: {
    backgroundColor: "#0EA5E9",
  },
  impactSwatch: {
    position: "absolute",
    width: 20,
    height: 20,
    left: 1,
    top: 1,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: "#9b1c31",
    backgroundColor: "transparent",
  },
  eyeStack: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  eyeRing: {
    position: "absolute",
    width: 16,
    height: 16,
    left: 3,
    top: 3,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "#ef4444",
    backgroundColor: "transparent",
  },
  eyeDot: {
    position: "absolute",
    width: 6,
    height: 6,
    left: 8,
    top: 8,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  badgeText: {
    minWidth: 30,
    marginRight: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0369A1",
    includeFontPadding: false,
  },
  markerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  markerLetter: {
    fontSize: 9,
    fontWeight: "700",
    includeFontPadding: false,
  },
  rowText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#374151",
    includeFontPadding: false,
  },
  rowTextStrong: {
    fontWeight: "700",
    color: "#111827",
  },
});
