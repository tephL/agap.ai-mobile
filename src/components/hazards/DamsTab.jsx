import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { haversineMeters, formatDistance } from "../../utils/haversine";
import { parseDamObservationMs, damFreshnessColor } from "./damStatus";

const EXPECTED_DAM_COUNT = 9;
const NEAREST_TINT = "rgba(66, 135, 245, ";

export default function DamsTab({ dams, userLocation, nearestSlug, onSelect }) {
  const rows = useMemo(() => {
    const hasOrigin =
      userLocation?.latitude != null && userLocation?.longitude != null;
    const origin = hasOrigin
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : null;

    return dams
      .filter((dam) => dam.coordinates)
      .map((dam) => ({
        dam,
        distanceMeters: origin ? haversineMeters(origin, dam.coordinates) : null,
      }))
      .sort((a, b) => {
        if (a.distanceMeters == null && b.distanceMeters == null) return 0;
        if (a.distanceMeters == null) return 1;
        if (b.distanceMeters == null) return -1;
        return a.distanceMeters - b.distanceMeters;
      });
  }, [dams, userLocation]);

  // The nearest slug comes from the map (nearestDamSlug); fall back to the
  // closest row so the highlight still works before the first map render.
  const nearest = nearestSlug ?? rows[0]?.dam.slug ?? null;
  const incomplete =
    rows.length > 0 && rows.length < EXPECTED_DAM_COUNT;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dams</Text>
        <View style={[styles.countBadge, incomplete && styles.countBadgeWarn]}>
          <Text style={[styles.countText, incomplete && styles.countTextWarn]}>
            {incomplete ? `${rows.length} of ${EXPECTED_DAM_COUNT}` : rows.length}
          </Text>
        </View>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No dam data available right now.</Text>
        </View>
      ) : (
        rows.map(({ dam, distanceMeters }) => {
          const observationMs = parseDamObservationMs(
            dam.observationDate,
            dam.observationTime
          );
          const dotColor =
            observationMs != null ? damFreshnessColor(observationMs) : "#a9a9a9";
          const dev = dam.deviationFromNHWL;
          const isNearest = dam.slug === nearest;

          return (
            <TouchableOpacity
              key={dam.slug}
              style={[styles.card, isNearest && styles.cardNearest]}
              onPress={() => onSelect(dam)}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <View style={styles.main}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{dam.name}</Text>
                  {isNearest && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>Closest</Text>
                    </View>
                  )}
                  {distanceMeters != null && (
                    <Text style={styles.distance}>
                      {formatDistance(distanceMeters)}
                    </Text>
                  )}
                </View>
                <Text style={styles.caption}>
                  {dev != null
                    ? `${dev > 0 ? "+" : ""}${dev} m vs NHWL`
                    : "No NHWL reference"}
                </Text>
              </View>
              <Text style={styles.rwl}>
                {dam.reservoirWaterLevel != null
                  ? `${dam.reservoirWaterLevel} m`
                  : "—"}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#737B8C",
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#EEF1F5",
  },
  countBadgeWarn: {
    backgroundColor: "#FEF3C7",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#737B8C",
  },
  countTextWarn: {
    color: "#B45309",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    color: "#737B8C",
    fontSize: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E2E7",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  cardNearest: {
    backgroundColor: `${NEAREST_TINT}0.08)`,
    borderColor: `${NEAREST_TINT}0.35)`,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  main: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#182033",
  },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: `${NEAREST_TINT}0.15)`,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4287f5",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  distance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4287f5",
  },
  caption: {
    fontSize: 12,
    color: "#737B8C",
    marginTop: 2,
  },
  rwl: {
    fontSize: 15,
    fontWeight: "700",
    color: "#182033",
    fontVariant: ["tabular-nums"],
  },
});
