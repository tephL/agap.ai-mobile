import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { haversineMeters, formatDistance } from "../../utils/haversine";
<<<<<<< HEAD
<<<<<<< HEAD
import { resolveDamSeverity } from "./damSeverity";
import { getDamImpact, getImpactTier } from "../../data/hydrology";
import HazardDisclaimer from "./HazardDisclaimer";
=======
import { parseDamObservationMs, damFreshnessColor } from "./damStatus";
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
import { resolveDamSeverity } from "./damSeverity";
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)

const EXPECTED_DAM_COUNT = 9;
const NEAREST_TINT = "rgba(66, 135, 245, ";

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
export default function DamsTab({
  dams,
  userLocation,
  nearestSlug,
  influencingSlugs = [],
  onSelect,
}) {
<<<<<<< HEAD
=======
export default function DamsTab({ dams, userLocation, nearestSlug, onSelect }) {
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
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

<<<<<<< HEAD
<<<<<<< HEAD
  // Fallback for the Closest chip before the map computes its own nearest.
  const nearest = nearestSlug ?? rows[0]?.dam.slug ?? null;
  const incomplete = rows.length > 0 && rows.length < EXPECTED_DAM_COUNT;
=======
  // The nearest slug comes from the map (nearestDamSlug); fall back to the
  // closest row so the highlight still works before the first map render.
  const nearest = nearestSlug ?? rows[0]?.dam.slug ?? null;
  const incomplete =
    rows.length > 0 && rows.length < EXPECTED_DAM_COUNT;
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
  // Fallback for the Closest chip before the map computes its own nearest.
  const nearest = nearestSlug ?? rows[0]?.dam.slug ?? null;
  const incomplete = rows.length > 0 && rows.length < EXPECTED_DAM_COUNT;
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)

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
<<<<<<< HEAD
<<<<<<< HEAD
          const severity = resolveDamSeverity(dam);
          const dev = dam.deviationFromNHWL;
          const impact = getDamImpact(dam, userLocation);
          const impactTier = impact ? getImpactTier(impact.impact.key) : null;
          const isNearest = dam.slug === nearest;
          const isInfluencing = influencingSlugs.includes(dam.slug);
=======
          const observationMs = parseDamObservationMs(
            dam.observationDate,
            dam.observationTime
          );
          const dotColor =
            observationMs != null ? damFreshnessColor(observationMs) : "#a9a9a9";
          const dev = dam.deviationFromNHWL;
          const isNearest = dam.slug === nearest;
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
          const severity = resolveDamSeverity(dam);
          const dev = dam.deviationFromNHWL;
          const isNearest = dam.slug === nearest;
          const isInfluencing = influencingSlugs.includes(dam.slug);
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)

          return (
            <TouchableOpacity
              key={dam.slug}
              style={[styles.card, isNearest && styles.cardNearest]}
              onPress={() => onSelect(dam)}
              activeOpacity={0.7}
            >
<<<<<<< HEAD
<<<<<<< HEAD
              <View style={[styles.dot, { backgroundColor: severity.color }]} />
=======
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
              <View style={[styles.dot, { backgroundColor: severity.color }]} />
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
              <View style={styles.main}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{dam.name}</Text>
                  {isNearest && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>Closest</Text>
                    </View>
                  )}
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
                  {!isNearest && isInfluencing && (
                    <View style={[styles.chip, styles.chipRange]}>
                      <Text style={[styles.chipText, styles.chipTextRange]}>
                        In range
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.severityChip,
                      { backgroundColor: `${severity.color}1A` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityChipText,
                        { color: severity.color },
                      ]}
                    >
                      {severity.label}
                    </Text>
                  </View>
<<<<<<< HEAD
                  {impact && isInfluencing && impactTier && (
                    <View
                      style={[
                        styles.impactMiniChip,
                        { backgroundColor: `${impactTier.color}1A` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.impactMiniChipText,
                          { color: impactTier.color },
                        ]}
                      >
                        {impactTier.label}
                        {impact.minor ? " · minor" : ""}
                      </Text>
                    </View>
                  )}
=======
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
                  {distanceMeters != null && (
                    <Text style={styles.distance}>
                      {formatDistance(distanceMeters)}
                    </Text>
                  )}
                </View>
                <Text style={styles.caption}>
                  {dev != null
                    ? `${dev > 0 ? "+" : ""}${dev} m vs NHWL`
<<<<<<< HEAD
<<<<<<< HEAD
                    : severity.title}
=======
                    : "No NHWL reference"}
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
                    : severity.title}
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
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
<<<<<<< HEAD

      <HazardDisclaimer style={styles.disclaimer} />
=======
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
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
<<<<<<< HEAD
<<<<<<< HEAD
    gap: 6,
=======
    gap: 8,
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
    gap: 6,
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
  chipRange: {
    backgroundColor: "rgba(115, 123, 140, 0.12)",
  },
  chipTextRange: {
    color: "#737B8C",
  },
  severityChip: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  severityChipText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
<<<<<<< HEAD
  impactMiniChip: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  impactMiniChipText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
=======
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
=======
>>>>>>> 28cac84 (feature(monitoring) added elevation hook not yet integrated |  working build)
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
<<<<<<< HEAD
  disclaimer: {
    marginTop: 4,
    textAlign: "center",
  },
=======
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
});
