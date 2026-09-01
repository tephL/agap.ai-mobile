import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  PAGASA_TCWS_COLORS,
  PAGASA_TCWS_LABELS,
} from "@/services/stormSignalService";

const LEVELS = [5, 4, 3, 2, 1];

function HeaderRow({ signals }) {
  const cyclone = signals.cyclone ?? {};
  const bulletin = signals.bulletin ?? {};
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerTop}>
        <View style={styles.iconWrap}>
          <Ionicons name="thunderstorm" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>Bagyong {cyclone.name ?? "N/A"}</Text>
          {cyclone.internationalName ? (
            <Text style={styles.subtitle}>
              {cyclone.internationalName} · {cyclone.category ?? "Tropical Cyclone"}
            </Text>
          ) : null}
        </View>
        {signals.sample ? (
          <View style={styles.sampleBadge}>
            <Text style={styles.sampleBadgeText}>SAMPLE</Text>
          </View>
        ) : null}
      </View>
      {cyclone.movement ? (
        <Text style={styles.movement}>Movement: {cyclone.movement}</Text>
      ) : null}
      <Text style={styles.movement}>
        {bulletin.count ? `Bulletin No. ${bulletin.count}` : ""}
        {bulletin.issuedAt
          ? ` · Issued ${new Date(bulletin.issuedAt).toLocaleString()}`
          : ""}
      </Text>
    </View>
  );
}

/**
 * "Weather" tab content for the hazards sheet: lists the mapped provinces
 * under each active PAGASA storm signal, strongest first. Region chips only
 * respond to taps while the Storm Signals map overlay is on.
 */
export default function StormSignalsTab({
  signals,
  signalByProvince = {},
  loading = false,
  overlayVisible = false,
  onSelectRegion,
}) {
  if (loading && !signals) {
    return (
      <View style={styles.statusWrap}>
        <ActivityIndicator size="small" color="#E32F31" />
        <Text style={styles.statusText}>Checking weather bulletins…</Text>
      </View>
    );
  }

  if (signals?.unavailable) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>Couldn’t reach PAGASA</Text>
        <Text style={styles.statusText}>
          Weather bulletins are unavailable right now. Please try again later.
        </Text>
      </View>
    );
  }

  if (!signals) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="cloud-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>No weather data yet</Text>
        <Text style={styles.statusText}>Loading the latest bulletin…</Text>
      </View>
    );
  }

  if (!signals.active) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="sunny-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>No active storm signals</Text>
        <Text style={styles.statusText}>
          There are currently no PAGASA tropical cyclone wind signals.
          {signals.bulletin?.title ? ` Last bulletin: ${signals.bulletin.title}.` : ""}
        </Text>
      </View>
    );
  }

  const groups = LEVELS.filter((level) =>
    Object.values(signalByProvince).some((lvl) => lvl === level)
  ).map((level) => ({
    level,
    provinces: Object.keys(signalByProvince)
      .filter((name) => signalByProvince[name] === level)
      .sort((a, b) => a.localeCompare(b)),
  }));
  const total = groups.reduce((sum, g) => sum + g.provinces.length, 0);

  return (
    <View>
      <HeaderRow signals={signals} />

      <Text style={styles.summaryText}>
        {groups.length} signal level{groups.length === 1 ? "" : "s"} · {total} provinc
        {total === 1 ? "e" : "es"} affected
      </Text>

      {!overlayVisible && (
        <Text style={styles.hintText}>
          Tap a region to focus the map (turn on the Storm Signals overlay to
          use this).
        </Text>
      )}

      {groups.map(({ level, provinces }) => (
        <View key={level} style={styles.group}>
          <View style={styles.groupHeader}>
            <View
              style={[styles.swatch, { backgroundColor: PAGASA_TCWS_COLORS[level] }]}
            />
            <Text style={styles.groupTitle}>Signal #{level}</Text>
            <Text style={styles.groupWind} numberOfLines={2}>
              {PAGASA_TCWS_LABELS[level]}
            </Text>
          </View>
          <View style={styles.chipsWrap}>
            {provinces.map((name) =>
              overlayVisible ? (
                <TouchableOpacity
                  key={name}
                  style={styles.regionChip}
                  activeOpacity={0.7}
                  onPress={() => onSelectRegion?.(name, level)}
                  accessibilityRole="button"
                >
                  <Ionicons name="location" size={11} color="#4287f5" />
                  <Text style={styles.regionChipText}>{name}</Text>
                </TouchableOpacity>
              ) : (
                <View key={name} style={[styles.regionChip, styles.regionChipMuted]}>
                  <Text style={[styles.regionChipText, styles.regionChipTextMuted]}>
                    {name}
                  </Text>
                </View>
              )
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statusWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  statusTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#182033",
    textAlign: "center",
  },
  statusText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#737B8C",
    textAlign: "center",
  },
  headerCard: {
    marginHorizontal: 20,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#E32F31",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
  },
  subtitle: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },
  sampleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  sampleBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B91C1C",
    letterSpacing: 0.5,
  },
  movement: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: "#7F1D1D",
  },
  summaryText: {
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#182033",
  },
  hintText: {
    marginHorizontal: 20,
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    color: "#9AA2B1",
  },
  group: {
    marginHorizontal: 20,
    marginTop: 14,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 5,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#182033",
  },
  groupWind: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    color: "#737B8C",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  regionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#EEF1F5",
    borderWidth: 1,
    borderColor: "#E2E6EE",
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#182033",
  },
  regionChipMuted: {
    backgroundColor: "#F7F8FA",
    borderColor: "#EEF0F4",
  },
  regionChipTextMuted: {
    color: "#9AA2B1",
  },
});