import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getDamStatusBySlug } from "../../services/hazardService";
import { haversineMeters, formatDistance } from "../../utils/haversine";
import {
  parseDamObservationMs,
  damFreshnessColor,
  formatObservationAge,
} from "./damStatus";
import HazardTabs from "./HazardTabs";
import HazardDisclaimer from "./HazardDisclaimer";
import ImpactZoneDetail from "./ImpactZoneDetail";
import { resolveDamSeverity, describeDamStatus } from "./damSeverity";
import {
  getDamImpact,
  CREST_ELEVATIONS,
  getImpactTier,
} from "../../data/hydrology";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TAB_BAR_HEIGHT = 50;
const COLLAPSED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.45);
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.82);
const HIDDEN_Y = EXPANDED_HEIGHT + TAB_BAR_HEIGHT;
const COLLAPSED_Y = HIDDEN_Y - COLLAPSED_HEIGHT;
const NOW_TICK_INTERVAL_MS = 5000;

function InfoRow({ label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

function HazardSheetInner({
  dams = [],
  userLocation,
  nearestSlug,
  influencingSlugs = [],
  userElevation = null,
  dam,
  expanded,
  onExpandedChange,
  onSelectDam,
  onClose,
}) {
  const [translateY] = useState(() => new Animated.Value(HIDDEN_Y));
  const [activeTab, setActiveTab] = useState("dams");
  const [now, setNow] = useState(0);
  const [fetchState, setFetchState] = useState({ slug: null, data: null, error: null });
  const [impactDetailVisible, setImpactDetailVisible] = useState(false);

  const slug = dam?.slug ?? null;

  useEffect(() => {
    const kick = requestAnimationFrame(() => setNow(Date.now()));
    const interval = setInterval(() => setNow(Date.now()), NOW_TICK_INTERVAL_MS);
    return () => {
      cancelAnimationFrame(kick);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;

    getDamStatusBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setFetchState({ slug, data: data && data.dam ? data : null, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) setFetchState({ slug, data: null, error });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: expanded ? 0 : COLLAPSED_Y,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [expanded, translateY]);

  // Derived: a fetch is in flight whenever the requested slug has no settled
  // result yet, and stale results from a previous slug are ignored entirely.
  const detail = slug != null && fetchState.slug === slug ? fetchState : null;
  const detailLoading = slug != null && detail === null;
  const detailData = detail?.data ?? null;
  const detailError = detail?.error ?? null;

  const damRecord = useMemo(
    () => dams.find((d) => d.slug === slug) ?? null,
    [dams, slug]
  );

  const shownDam = detailData?.dam ?? dam ?? null;

  const distanceMeters = useMemo(() => {
    const coords = shownDam?.coordinates ?? damRecord?.coordinates ?? null;
    if (
      !coords ||
      userLocation?.latitude == null ||
      userLocation?.longitude == null
    ) {
      return null;
    }
    return haversineMeters(
      { lat: userLocation.latitude, lng: userLocation.longitude },
      coords
    );
  }, [shownDam, damRecord, userLocation]);

  const observationMs = shownDam
    ? parseDamObservationMs(shownDam.observationDate, shownDam.observationTime, now)
    : null;
  const freshnessColor =
    observationMs != null ? damFreshnessColor(observationMs, now) : "#a9a9a9";

  const severity = shownDam ? resolveDamSeverity(shownDam) : null;

  // Hydrology impact context for the shown dam (tier, corridor note, minor).
  const impactContext = useMemo(
    () => (shownDam ? getDamImpact(shownDam, userLocation) : null),
    [shownDam, userLocation]
  );
  const damCrest = shownDam
    ? CREST_ELEVATIONS[shownDam.slug] ?? shownDam.normalHighWaterLevel ?? null
    : null;
  const elevationAboveCrest =
    userElevation != null && damCrest != null && userElevation >= damCrest + 2;
  const elevationAboveNHWL =
    !elevationAboveCrest &&
    userElevation != null &&
    shownDam?.normalHighWaterLevel != null &&
    userElevation >= shownDam.normalHighWaterLevel;
  const currentTier = impactContext
    ? getImpactTier(impactContext.impact.key) ?? null
    : null;

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: HIDDEN_Y,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onClose?.());
  };

  const rwl = shownDam?.reservoirWaterLevel;
  const devNhwl = shownDam?.deviationFromNHWL;
  const ruleCurve = shownDam?.ruleCurveElevation;
  const devRuleCurve = shownDam?.deviationFromRuleCurve;
  const gates = shownDam?.gateOpening;
  const showStaleBanner = Boolean(detailData?.stale);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      accessibilityLabel="Hazards sheet"
    >
      <View style={styles.handleArea}>
        <TouchableOpacity
          style={styles.handleHit}
          onPress={() => onExpandedChange?.(!expanded)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? "Collapse hazards drawer" : "Expand hazards drawer"
          }
        >
          <View style={styles.handleBar} />
          <View style={styles.handleRow}>
            <Ionicons
              name={expanded ? "chevron-down" : "chevron-up"}
              size={15}
              color="#737B8C"
            />
            <Text style={styles.handleText}>
              {expanded ? "Hide hazards" : "All Hazards"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close hazards sheet"
        >
          <Ionicons name="close" size={22} color="#182033" />
        </TouchableOpacity>
      </View>


      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={expanded}
        nestedScrollEnabled
      >
        {slug != null && !shownDam && !detailLoading && (
          <View style={styles.emptyWrap}>
            {detailError ? (
              <>
                <Text style={styles.errorTitle}>Could not load dam status</Text>
                <Text style={styles.errorHint}>
                  Close the card and tap the marker again to retry.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>No dam selected</Text>
                <Text style={styles.emptySubtitle}>
                  Tap a blue dam marker on the map to see its latest reading.
                </Text>
              </>
            )}
          </View>
        )}

        {detailLoading && (
          <View style={styles.statusWrap}>
            <ActivityIndicator size="small" color="#E32F31" />
          </View>
        )}

        {shownDam && !detailLoading && (
          <View style={styles.summary}>
            {severity && (
              <View
                style={[styles.severityCard, { backgroundColor: `${severity.color}1A`, borderColor: `${severity.color}59` }]}
              >
                <View style={styles.severityHead}>
                  <Ionicons name={severity.icon} size={20} color={severity.color} />
                  <View style={[styles.severityChip, { backgroundColor: severity.color }]}>
                    <Text style={styles.severityChipText}>{severity.label}</Text>
                  </View>
                </View>
                <Text style={[styles.severityTitle, { color: severity.color }]}>
                  {severity.title}
                </Text>
                <Text style={styles.severityBody}>{describeDamStatus(shownDam, severity)}</Text>
                <Text style={styles.severityAdvice}>{severity.advice}</Text>
              </View>
            )}

            {impactContext && (
              <Pressable
                style={({ pressed }) => [
                  styles.impactCard,
                  { borderLeftColor: currentTier?.color ?? "#182033" },
                  pressed && styles.impactCardPressed,
                ]}
                onPress={() => setImpactDetailVisible(true)}
              >
                <View style={styles.impactRow}>
                  <Text style={styles.impactLabel}>Impact zone</Text>
                  <View
                    style={[
                      styles.impactChip,
                      { backgroundColor: currentTier?.color ?? "#182033" },
                    ]}
                  >
                    <Text style={styles.impactChipText}>
                      {currentTier?.label}
                      {impactContext.minor ? " · minor" : ""}
                    </Text>
                  </View>
                </View>
                <Text style={styles.impactPlain}>
                  {currentTier?.plainSummary}
                </Text>
                <View style={styles.impactNotes}>
                  {elevationAboveCrest ? (
                    <Text style={styles.impactNote}>
                      Your ground elevation (~{Math.round(userElevation)} m ASL)
                      is above the reservoir level ({damCrest} m) — floodwater
                      cannot reach this elevation.
                    </Text>
                  ) : (
                    <>
                      {userElevation != null && (
                        <Text style={styles.impactNote}>
                          Your ground elevation ~{Math.round(userElevation)} m
                          ASL
                          {elevationAboveNHWL ? " — above NHWL, reduced reach" : ""}.
                        </Text>
                      )}
                      {impactContext.tierNote && (
                        <Text style={styles.impactNote}>
                          {impactContext.tierNote}
                        </Text>
                      )}
                    </>
                  )}
                  <HazardDisclaimer />
                </View>
              </Pressable>
            )}

            {showStaleBanner && (
              <View style={styles.staleBanner}>
                <Ionicons name="warning-outline" size={14} color="#E32F31" />
                <Text style={styles.staleBannerText}>Showing last known data</Text>
              </View>
            )}

            <View style={styles.nameRow}>
              <View style={[styles.freshDot, { backgroundColor: freshnessColor }]} />
              <Text style={styles.damName}>{shownDam.name}</Text>
              {distanceMeters != null && (
                <Text style={styles.distance}>{formatDistance(distanceMeters)}</Text>
              )}
            </View>

            <View style={styles.rwlRow}>
              <Text style={styles.rwlValue}>{rwl != null ? `${rwl} m` : "—"}</Text>
              <Text style={styles.rwlLabel}>reservoir water level</Text>
            </View>

            <View style={styles.infoGrid}>
              <InfoRow
                label="Deviation vs NHWL"
                value={devNhwl != null ? `${devNhwl > 0 ? "+" : ""}${devNhwl} m` : "—"}
              />
              {ruleCurve != null && (
                <InfoRow label="Rule curve" value={`${ruleCurve} m`} />
              )}
              {devRuleCurve != null && (
                <InfoRow
                  label="Deviation vs rule curve"
                  value={`${devRuleCurve > 0 ? "+" : ""}${devRuleCurve} m`}
                />
              )}
              {gates && (gates.gates != null || gates.meters != null) && (
                <InfoRow
                  label="Gate opening"
                  value={`${gates.gates ?? "—"} gate(s) × ${gates.meters ?? "—"} m`}
                />
              )}
              <InfoRow
                label="Observed"
                value={
                  observationMs != null
                    ? `${shownDam.observationDate ?? ""} ${shownDam.observationTime ?? ""} · ${formatObservationAge(observationMs, now)}`
                    : `${shownDam.observationDate ?? ""} ${shownDam.observationTime ?? ""}`.trim() ||
                      "—"
                }
                valueColor={observationMs != null ? freshnessColor : "#737B8C"}
              />
            </View>
          </View>
        )}

        <View style={styles.tabsWrap}>
          <HazardTabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            dams={dams}
            userLocation={userLocation}
            nearestSlug={nearestSlug}
            influencingSlugs={influencingSlugs}
            onSelectDam={(selected) => onSelectDam?.(selected)}
          />
        </View>
      </ScrollView>

      {impactContext && (
        <ImpactZoneDetail
          visible={impactDetailVisible}
          onClose={() => setImpactDetailVisible(false)}
          damName={shownDam?.name}
          tierKey={impactContext.impact.key}
          minor={impactContext.minor}
          distanceText={
            distanceMeters != null ? formatDistance(distanceMeters) : null
          }
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: HIDDEN_Y,
    paddingBottom: TAB_BAR_HEIGHT + 16,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleArea: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: "center",
    position: "relative",
  },
  handleHit: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E0E2E7",
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  handleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#737B8C",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeButton: {
    position: "absolute",
    right: 10,
    top: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#182033",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#737B8C",
    textAlign: "center",
    lineHeight: 18,
  },
  statusWrap: {
    alignItems: "center",
    paddingVertical: 28,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E32F31",
  },
  errorHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#737B8C",
  },
  summary: {
    paddingHorizontal: 20,
  },
  severityCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  severityHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  severityChip: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  severityChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  severityTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  severityBody: {
    fontSize: 13,
    color: "#182033",
    lineHeight: 18,
  },
  severityAdvice: {
    marginTop: 4,
    fontSize: 12,
    color: "#737B8C",
    lineHeight: 17,
  },
  impactCard: {
    backgroundColor: "#F6F7FA",
    borderColor: "#E0E2E7",
    borderLeftWidth: 4,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  impactCardPressed: {
    backgroundColor: "#EEF1F5",
  },
  impactPlain: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: "#182033",
  },
  impactNotes: {
    gap: 3,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#737B8C",
  },
  impactChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#182033",
  },
  impactChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  impactNote: {
    fontSize: 12,
    lineHeight: 16,
    color: "#5A6273",
  },
  staleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  staleBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E32F31",
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  freshDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  damName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#182033",
    flexShrink: 1,
  },
  distance: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4287f5",
  },
  rwlRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 8,
  },
  rwlValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#182033",
    fontVariant: ["tabular-nums"],
  },
  rwlLabel: {
    fontSize: 13,
    color: "#737B8C",
    fontWeight: "500",
  },
  infoGrid: {
    marginTop: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F7",
  },
  infoLabel: {
    fontSize: 13,
    color: "#737B8C",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#182033",
    fontVariant: ["tabular-nums"],
  },
  tabsWrap: {
    marginTop: 4,
  },
});

// Memoized so the map screen's 10 Hz pulse ticks do not re-render the drawer.
export default React.memo(HazardSheetInner);
