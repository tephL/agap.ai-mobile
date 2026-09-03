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
import { colors, radius } from "@/theme";

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
 * "Current situation" summary for the user's own area. Shows a large signal
 * badge for the user's signal, or a safe / location-off state. Tapping the
 * alert variant pans/focuses the map on the user's province.
 */
function YourAreaCard({ userProvinceName, userSignalLevel, active, onLocate }) {
  if (!userProvinceName) {
    return (
      <View style={styles.yourAreaCard}>
        <Ionicons name="location-outline" size={18} color={colors.muted} />
        <Text style={styles.yourAreaText}>
          Enable location to see what storm signal your area is under.
        </Text>
      </View>
    );
  }

  if (userSignalLevel) {
    const color = PAGASA_TCWS_COLORS[userSignalLevel] ?? colors.primary;
    return (
      <TouchableOpacity
        style={[styles.yourAreaCard, styles.yourAreaAlert, { borderColor: color }]}
        activeOpacity={0.85}
        onPress={onLocate}
        accessibilityRole="button"
        accessibilityLabel={`Under Signal No. ${userSignalLevel} in ${userProvinceName}`}
      >
        <View style={[styles.signalBadge, { backgroundColor: color }]}>
          <Text style={styles.signalBadgeNo}>No.</Text>
          <Text style={styles.signalBadgeLevel}>{userSignalLevel}</Text>
        </View>
        <View style={styles.yourAreaBody}>
          <Text style={[styles.yourAreaTitle, { color }]}>
            Under Signal No. {userSignalLevel}
          </Text>
          <Text style={styles.yourAreaSubtitle}>
            {userProvinceName} · {PAGASA_TCWS_LABELS[userSignalLevel]}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.yourAreaCard}>
      <View style={styles.yourAreaSafeIcon}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#0F9D58" />
      </View>
      <View style={styles.yourAreaBody}>
        <Text style={styles.yourAreaSafeTitle}>No signal for your area</Text>
        <Text style={styles.yourAreaSubtitle}>
          {userProvinceName}{" "}
          {active
            ? "is not currently under any storm signal."
            : "is in the clear right now."}
        </Text>
      </View>
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
  userProvinceName = null,
  userSignalLevel = null,
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
        <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
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
        <Ionicons name="cloud-outline" size={28} color={colors.muted} />
        <Text style={styles.statusTitle}>No weather data yet</Text>
        <Text style={styles.statusText}>Loading the latest bulletin…</Text>
      </View>
    );
  }

  if (!signals.active) {
    return (
      <View>
        <YourAreaCard
          userProvinceName={userProvinceName}
          userSignalLevel={userSignalLevel}
          active={false}
        />
        <View style={styles.statusWrap}>
          <Ionicons name="sunny-outline" size={28} color={colors.muted} />
          <Text style={styles.statusTitle}>No active storm signals</Text>
          <Text style={styles.statusText}>
            There are currently no PAGASA tropical cyclone wind signals.
            {signals.bulletin?.title ? ` Last bulletin: ${signals.bulletin.title}.` : ""}
          </Text>
        </View>
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

  const handleLocate = () => {
    if (!userProvinceName) return;
    onSelectRegion?.(userProvinceName, userSignalLevel);
  };

  return (
    <View>
      <YourAreaCard
        userProvinceName={userProvinceName}
        userSignalLevel={userSignalLevel}
        active
        onLocate={handleLocate}
      />
      <HeaderRow signals={signals} />

      <Text style={styles.summaryText}>
        {groups.length} signal level{groups.length === 1 ? "" : "s"} · {total} provinc
        {total === 1 ? "e" : "es"} affected
      </Text>

      {!overlayVisible && (
        <Text style={styles.hintText}>
          Turn on the Storm Signals overlay to tap provinces on the map.
        </Text>
      )}

      {groups.map(({ level, provinces }) => {
        const color = PAGASA_TCWS_COLORS[level];
        const isUserGroup = level === userSignalLevel;
        return (
          <View
            key={level}
            style={[styles.group, isUserGroup && styles.groupUser]}
          >
            <View style={styles.groupHeader}>
              <View style={[styles.signalBadgeSmall, { backgroundColor: color }]}>
                <Text style={styles.signalBadgeSmallNo}>No.</Text>
                <Text style={styles.signalBadgeSmallLevel}>{level}</Text>
              </View>
              <View style={styles.groupTitles}>
                <Text style={styles.groupTitle}>Signal #{level}</Text>
                <Text style={styles.groupWind} numberOfLines={2}>
                  {PAGASA_TCWS_LABELS[level]}
                </Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{provinces.length}</Text>
                <Ionicons name="location" size={11} color={color} />
              </View>
            </View>
            <View style={styles.chipsWrap}>
              {provinces.map((name) =>
                overlayVisible ? (
                  <TouchableOpacity
                    key={name}
                    style={[styles.regionChip, { borderColor: color }]}
                    activeOpacity={0.7}
                    onPress={() => onSelectRegion?.(name, level)}
                    accessibilityRole="button"
                  >
                    <View style={[styles.chipDot, { backgroundColor: color }]} />
                    <Text style={styles.regionChipText}>{name}</Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    key={name}
                    style={[styles.regionChip, styles.regionChipMuted]}
                  >
                    <Text style={[styles.regionChipText, styles.regionChipTextMuted]}>
                      {name}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  yourAreaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: "#F4F6F9",
    borderWidth: 1,
    borderColor: "#E5E9F0",
  },
  yourAreaAlert: {
    backgroundColor: "#FFF8F6",
  },
  signalBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  signalBadgeNo: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signalBadgeLevel: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  signalBadgeSmall: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  signalBadgeSmallNo: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  signalBadgeSmallLevel: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 19,
  },
  yourAreaSafeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F5EC",
  },
  yourAreaBody: {
    flex: 1,
  },
  yourAreaTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  yourAreaSafeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F9D58",
  },
  yourAreaSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  yourAreaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  statusWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  statusTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  statusText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    textAlign: "center",
  },
  headerCard: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
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
    color: colors.text,
  },
  hintText: {
    marginHorizontal: 20,
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    color: colors.placeholder,
  },
  group: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  groupUser: {
    backgroundColor: "#F8FAFF",
    borderColor: "#CBD9F5",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupTitles: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  groupWind: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
    color: colors.muted,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF1F5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
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
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#F5F7FB",
    borderWidth: 1,
    borderColor: "#E2E6EE",
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  regionChipMuted: {
    backgroundColor: "#F7F8FA",
    borderColor: "#EEF0F4",
  },
  regionChipTextMuted: {
    color: colors.placeholder,
  },
});
