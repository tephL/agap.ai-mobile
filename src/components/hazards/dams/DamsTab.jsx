import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haversineMeters, formatDistance } from "../../../utils/haversine";
import { resolveDamSeverity } from "./damSeverity";
import { getDamImpact, getImpactTier } from "../../../data/hydrology";
import HazardDisclaimer from "../common/HazardDisclaimer";

function DamsTabInner({
  dams,
  userLocation,
  nearestSlug,
  influencingSlugs = [],
  onSelect,
  hideHeader = false,
}) {
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

  const nearest = nearestSlug ?? rows[0]?.dam.slug ?? null;

  return (
    <View style={styles.wrap}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Monitored Dams</Text>
          <Text style={styles.headerSubtitle}>Tap a dam for details</Text>
        </View>
      )}

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="water-outline" size={28} color="#C5CBD6" />
          <Text style={styles.emptyText}>No dam data available right now.</Text>
        </View>
      ) : (
        rows.map(({ dam, distanceMeters }) => {
          const severity = resolveDamSeverity(dam);
          const impactCtx = getDamImpact(dam, userLocation);
          const impactTier = impactCtx ? getImpactTier(impactCtx.impact.key) : null;
          const isNearest = dam.slug === nearest;
          const isInfluencing = influencingSlugs.includes(dam.slug);

          return (
            <TouchableOpacity
              key={dam.slug}
              style={[styles.card, isNearest && styles.cardNearest]}
              onPress={() => onSelect(dam)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardBar, { backgroundColor: severity.color }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={styles.nameRow}>
                    <View style={[styles.dot, { backgroundColor: severity.color }]} />
                    <Text style={styles.name} numberOfLines={1}>
                      {dam.name}
                    </Text>
                  </View>
                  {distanceMeters != null && (
                    <Text style={styles.distance}>
                      {formatDistance(distanceMeters)}
                    </Text>
                  )}
                </View>
                <View style={styles.cardBottom}>
                  <View style={[styles.severityPill, { backgroundColor: `${severity.color}1A` }]}>
                    <Text style={[styles.severityPillText, { color: severity.color }]}>
                      {severity.label}
                    </Text>
                  </View>
                  {impactTier && isInfluencing && (
                    <View style={[styles.impactPill, { backgroundColor: `${impactTier.color}1A` }]}>
                      <Text style={[styles.impactPillText, { color: impactTier.color }]}>
                        {impactCtx?.minor ? "Minor \u00B7 " : ""}{impactTier.label}
                      </Text>
                    </View>
                  )}
                  <View style={styles.rwlBadge}>
                    <Text style={styles.rwlText}>
                      {dam.reservoirWaterLevel != null
                        ? `${dam.reservoirWaterLevel} m`
                        : "\u2014"}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <HazardDisclaimer style={styles.disclaimer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 12,
  },
  header: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#182033",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9AA2B1",
    marginTop: 1,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    color: "#9AA2B1",
    fontSize: 13,
  },
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E2E7",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    overflow: "hidden",
  },
  cardNearest: {
    borderColor: "#4287f5",
  },
  cardBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 10,
    paddingRight: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#182033",
  },
  distance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4287f5",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  severityPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  severityPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  impactPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  impactPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  rwlBadge: {
    marginLeft: "auto",
    backgroundColor: "#F5F5F7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rwlText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5A6273",
    fontVariant: ["tabular-nums"],
  },
  disclaimer: {
    marginTop: 4,
    textAlign: "center",
  },
});

export default React.memo(DamsTabInner);
