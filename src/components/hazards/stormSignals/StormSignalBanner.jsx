import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../../constants/colors";
import {
  PAGASA_TCWS_COLORS,
  PAGASA_TCWS_LABELS,
} from "@/services/stormSignalService";

/**
 * Compact top banner shown while PAGASA storm signals are active. Shows a
 * personalized first line for the user's own province/signal, then the cyclone
 * name, top signal + affected area count, and (when expanded) the per-level
 * breakdown and bulletin issue time. Dismissing hides it until the Storm
 * Signals layer is toggled off and on again.
 */
export default function StormSignalBanner({
  signals,
  userProvinceName = null,
  userSignalLevel = null,
  onDismiss,
}) {
  const [expanded, setExpanded] = useState(false);
  if (!signals) return null;

  const cyclone = signals.cyclone ?? {};
  const byLevel = {};
  for (const signal of signals.signals ?? []) {
    for (const area of signal.areas ?? []) {
      (byLevel[signal.level] ??= []).push(area.name ?? area);
    }
  }
  const levels = Object.keys(byLevel)
    .map(Number)
    .sort((a, b) => b - a);
  const highest = levels.length > 0 ? levels[0] : null;
  const affectedCount = levels.reduce((sum, lvl) => sum + (byLevel[lvl]?.length ?? 0), 0);
  const userColor = PAGASA_TCWS_COLORS[userSignalLevel] ?? colors.primary;
  const userTextOn = userSignalLevel === 2 ? "#1F2937" : "#FFFFFF";

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Ionicons name="thunderstorm" size={18} color={colors.white} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Storm Signals</Text>
              {userSignalLevel ? (
                <View style={styles.userWrap}>
                  <View
                    style={[
                      styles.userPill,
                      { backgroundColor: userColor },
                    ]}
                  >
                    <Text style={[styles.userPillNo, { color: userTextOn }]}>No.</Text>
                    <Text style={[styles.userPillLevel, { color: userTextOn }]}>{userSignalLevel}</Text>
                  </View>
                  <View style={styles.userBody}>
                    <Text style={styles.userTitle}>
                      Your area: Signal No. {userSignalLevel}
                      {userProvinceName ? ` · ${userProvinceName}` : ""}
                    </Text>
                    <Text style={styles.userWind} numberOfLines={2}>
                      {PAGASA_TCWS_LABELS[userSignalLevel]}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.subtitle}>
                  {highest != null
                    ? `Signal No. ${highest} - ${affectedCount} area${affectedCount === 1 ? "" : "s"} affected`
                    : "No active signals"}
                </Text>
              )}
            </View>
          </View>
          <Pressable
            hitSlop={8}
            onPress={onDismiss}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="Dismiss storm signals banner"
          >
            <Ionicons name="close" size={16} color="#B91C1C" />
          </Pressable>
        </View>

        {expanded && (
          <View style={styles.cardBody}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>BAGYO</Text>
              <Text style={styles.detailValue}>
                {cyclone.name ? `${cyclone.name} (${cyclone.internationalName ?? "?"})` : "N/A"}
              </Text>
            </View>
            {levels.map((lvl) => (
              <View key={lvl} style={styles.detailRow}>
                <Text style={styles.detailLabel}>SIGNAL #{lvl}</Text>
                <Text style={styles.detailValue}>
                  {byLevel[lvl].join(", ")}
                </Text>
              </View>
            ))}
            {signals.bulletin?.issuedAt ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ISSUED</Text>
                <Text style={styles.detailValue}>
                  {new Date(signals.bulletin.issuedAt).toLocaleString()}
                </Text>
              </View>
            ) : null}
            {signals.sample ? (
              <Text style={styles.sampleNote}>Sample (demo) data</Text>
            ) : null}
          </View>
        )}

        <Pressable
          style={styles.expandButton}
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.expandText}>{expanded ? "Collapse" : "View details"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 30,
    left: 12,
    right: 12,
    zIndex: 25,
  },
  card: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
    marginTop: 1,
  },
  userWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 6,
  },
  userPill: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  userPillNo: {
    fontSize: 7,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  userPillLevel: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 17,
  },
  userBody: {
    flex: 1,
  },
  userTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#991B1B",
  },
  userWind: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
    color: "#7F1D1D",
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  detailLabel: {
    width: 92,
    fontSize: 11,
    fontWeight: "800",
    color: "#B91C1C",
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  sampleNote: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9A3412",
    marginTop: 6,
    textAlign: "right",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#FECACA",
  },
  expandText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
});