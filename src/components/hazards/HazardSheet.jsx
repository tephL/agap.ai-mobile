import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getDamStatusBySlug, getCachedDamStatus } from "../../services/hazardService";
import { haversineMeters, formatDistance } from "../../utils/haversine";
import {
  parseDamObservationMs,
  damFreshnessColor,
  formatObservationAge,
} from "./damStatus";
import DamsTab from "./DamsTab";
import TabPlaceholder from "./TabPlaceholder";
import HazardDisclaimer from "./HazardDisclaimer";
import ImpactZoneDetail from "./ImpactZoneDetail";
import SeverityDetail from "./SeverityDetail";
import { resolveDamSeverity, describeDamStatus } from "./damSeverity";
import {
  getDamImpact,
  CREST_ELEVATIONS,
  getImpactTier,
} from "../../data/hydrology";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TAB_BAR_HEIGHT = 50;
const COLLAPSED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.40);
const DETAIL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.36);
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.70);
const HIDDEN_Y = EXPANDED_HEIGHT + TAB_BAR_HEIGHT;
const COLLAPSED_Y = HIDDEN_Y - COLLAPSED_HEIGHT;
const DETAIL_Y = HIDDEN_Y - DETAIL_HEIGHT;
const NOW_TICK_INTERVAL_MS = 5000;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function InfoRow({ label, value, valueColor, subtext }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubtext = Boolean(subtext);

  return (
    <View style={styles.infoRowWrap}>
      <TouchableOpacity
        style={styles.infoRow}
        onPress={hasSubtext ? () => setExpanded((p) => !p) : undefined}
        activeOpacity={hasSubtext ? 0.7 : 1}
        disabled={!hasSubtext}
      >
        {hasSubtext ? (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#737B8C"
            style={styles.infoChevron}
          />
        ) : (
          <View style={styles.infoChevronPlaceholder} />
        )}
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>
          {value}
        </Text>
      </TouchableOpacity>
      {expanded && hasSubtext && (
        <Text style={styles.infoSubtext}>{subtext}</Text>
      )}
    </View>
  );
}

function LevelGauge({ rwl, nhwl, severityColor }) {
  if (rwl == null || nhwl == null || nhwl <= 0) return null;
  const pct = Math.min(Math.max((rwl / nhwl) * 100, 0), 100);

  return (
    <View style={styles.gaugeWrap}>
      <View style={styles.gaugeTrack}>
        <View
          style={[
            styles.gaugeFill,
            { width: `${pct}%`, backgroundColor: severityColor },
          ]}
        />
        <View style={[styles.gaugeThreshold, { left: "100%" }]} />
      </View>
      <View style={styles.gaugeLabels}>
        <Text style={styles.gaugeValue}>{rwl} m</Text>
        <Text style={styles.gaugePercent}>{Math.round(pct)}%</Text>
        <Text style={styles.gaugeNhwl}>NHWL {nhwl} m</Text>
      </View>
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
  activeTab = "dams",
  expanded,
  onExpandedChange,
  onSelectDam,
  onClose,
}) {
  const [translateY] = useState(() => new Animated.Value(HIDDEN_Y));
  const [translateYPos, setTranslateYPos] = useState(HIDDEN_Y);
  const [now, setNow] = useState(0);
  const [fetchState, setFetchState] = useState({ slug: null, data: null, error: null });
  const [impactDetailVisible, setImpactDetailVisible] = useState(false);
  const [severityDetailVisible, setSeverityDetailVisible] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

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
    const id = translateY.addListener(({ value }) => setTranslateYPos(value));
    return () => translateY.removeListener(id);
  }, [translateY]);

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
        if (cancelled) return;
        const cached = getCachedDamStatus(slug);
        if (cached) {
          setFetchState({ slug, data: cached && cached.dam ? cached : null, error: null, stale: true });
        } else {
          setFetchState({ slug, data: null, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Three-state animation: list (40%), detail (36%), detail+info (70%)
  useEffect(() => {
    let target;
    if (detailsExpanded && shownDam) {
      target = 0;
    } else if (shownDam) {
      target = DETAIL_Y;
    } else if (expanded) {
      target = COLLAPSED_Y;
    } else {
      target = HIDDEN_Y;
    }
    Animated.timing(translateY, {
      toValue: target,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [expanded, detailsExpanded, shownDam, translateY]);

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

  const handleClose = useCallback(() => {
    setDetailsExpanded(false);
    Animated.timing(translateY, {
      toValue: HIDDEN_Y,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onClose?.());
  }, [translateY, onClose]);

  const handleHandlePress = useCallback(() => {
    onExpandedChange?.(!expanded);
  }, [expanded, onExpandedChange]);

  const toggleDetails = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDetailsExpanded((prev) => !prev);
  }, []);

  const nhwl = shownDam?.normalHighWaterLevel ?? null;
  const rwl = shownDam?.reservoirWaterLevel;
  const slugForFallback = shownDam?.slug ?? null;
  const crestFallback = slugForFallback ? (CREST_ELEVATIONS[slugForFallback] ?? null) : null;

  // When upstream reports NHWL as 0 (e.g. Caliraya), use static crest as fallback
  const effectiveNHWL =
    (nhwl != null && nhwl > 0) ? nhwl : crestFallback;

  const devNhwlRaw = shownDam?.deviationFromNHWL;
  const ruleCurveRaw = shownDam?.ruleCurveElevation;
  const devRuleCurveRaw = shownDam?.deviationFromRuleCurve;

  // Recompute deviation when using fallback NHWL and raw value is 0
  const devNhwl =
    effectiveNHWL != null && rwl != null && (devNhwlRaw === 0 || devNhwlRaw == null)
      ? Math.round((rwl - effectiveNHWL) * 100) / 100
      : devNhwlRaw;

  // Treat ruleCurve of 0 as missing data
  const effectiveRuleCurve = ruleCurveRaw != null && ruleCurveRaw > 0 ? ruleCurveRaw : null;

  // Recompute rule curve deviation when using fallback and raw value is 0
  const devRuleCurve =
    effectiveRuleCurve != null && rwl != null && (devRuleCurveRaw === 0 || devRuleCurveRaw == null)
      ? Math.round((rwl - effectiveRuleCurve) * 100) / 100
      : (devRuleCurveRaw != null && devRuleCurveRaw !== 0 ? devRuleCurveRaw : null);

  const gates = shownDam?.gateOpening;
  const inflow = shownDam?.inflow;
  const outflow = shownDam?.outflow;
  const showStaleBanner = Boolean(detailData?.stale || fetchState.stale);

  const statusSentence = shownDam ? describeDamStatus(shownDam, severity) : null;

  const scrollEnabled = true;

  // Constrain ScrollView height so content stays within the visible on-screen
  // area when the sheet is collapsed. Without this, the ScrollView extends
  // below the screen edge and the last dam cards are unreachable.
  const HANDLE_AREA_H = 28;
  const visibleH = Math.max(0, HIDDEN_Y - translateYPos);
  const scrollViewMaxH = Math.max(0, visibleH - HANDLE_AREA_H);

  return (
    <>
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      accessibilityLabel="Hazards sheet"
    >
      <View style={styles.handleArea}>
        <TouchableOpacity
          style={styles.handleHit}
          onPress={handleHandlePress}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={styles.handleBar} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
          accessibilityRole="button"
          accessibilityLabel="Close hazards sheet"
        >
          <Ionicons name="close" size={22} color="#182033" />
        </TouchableOpacity>
      </View>

      {/* Dam list mode — header stays fixed above ScrollView */}
      {!slug && activeTab === "dams" && (
        <View style={styles.damsHeader}>
          <Text style={styles.damsHeaderTitle}>Monitored Dams</Text>
          <Text style={styles.damsHeaderSubtitle}>Tap a dam for details</Text>
        </View>
      )}

      {/* Dam detail mode — status info stays fixed above ScrollView */}
      {shownDam && !detailLoading && (
        <View style={styles.damStatusHeader}>
          {/* Dam name + freshness dot + distance */}
          <View style={styles.headlineRow}>
            <View style={[styles.freshDot, { backgroundColor: freshnessColor }]} />
            <Text style={styles.headlineName} numberOfLines={1}>
              {shownDam.name}
            </Text>
            {distanceMeters != null && (
              <Text style={styles.headlineDistance}>
                {formatDistance(distanceMeters)}
              </Text>
            )}
          </View>

          {/* Status sentence */}
          {statusSentence && (
            <Text style={styles.headlineStatus}>{statusSentence}</Text>
          )}

          {/* Separator */}
          <View style={styles.separator} />

          {/* Gauge bar */}
          <LevelGauge
            rwl={rwl}
            nhwl={effectiveNHWL}
            severityColor={severity?.color ?? "#737B8C"}
          />

          {/* Two labeled chips */}
          {(severity || currentTier) && (
            <View style={styles.chipsRow}>
              {severity && (
                <Pressable
                  style={({ pressed }) => [
                    styles.statusChip,
                    { backgroundColor: `${severity.color}1A` },
                    pressed && styles.statusChipPressed,
                  ]}
                  onPress={() => setSeverityDetailVisible(true)}
                >
                  <Text style={[styles.statusChipLabel, { color: "#737B8C" }]}>
                    Current risk
                  </Text>
                  <Text style={[styles.statusChipValue, { color: severity.color }]}>
                    {severity.label}
                  </Text>
                </Pressable>
              )}
              {currentTier && (
                <Pressable
                  style={({ pressed }) => [
                    styles.statusChip,
                    { backgroundColor: `${currentTier.color}1A` },
                    pressed && styles.statusChipPressed,
                  ]}
                  onPress={() => setImpactDetailVisible(true)}
                >
                  <Text style={[styles.statusChipLabel, { color: "#737B8C" }]}>
                    Potential impact
                  </Text>
                  <Text style={[styles.statusChipValue, { color: currentTier.color }]}>
                    {currentTier.label}
                    {impactContext?.minor ? " \u00B7 minor" : ""}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Stale banner */}
          {showStaleBanner && (
            <View style={styles.staleBanner}>
              <Ionicons name="warning-outline" size={14} color="#E32F31" />
              <Text style={styles.staleBannerText}>Showing last known data</Text>
            </View>
          )}

          {/* Details toggle pill */}
          <TouchableOpacity
            style={styles.detailsPill}
            onPress={toggleDetails}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsPillText}>
              {detailsExpanded ? "Hide details" : "Details"}
            </Text>
            <Ionicons
              name={detailsExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color="#4287f5"
            />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={scrollEnabled}
        nestedScrollEnabled
        maxHeight={scrollViewMaxH}
      >
        {/* Dam list mode — scrollable card list */}
        {!slug && activeTab === "dams" && (
          <DamsTab
            dams={dams}
            userLocation={userLocation}
            nearestSlug={nearestSlug}
            influencingSlugs={influencingSlugs}
            onSelect={onSelectDam}
            hideHeader
          />
        )}

        {/* Placeholder for non-dams tabs */}
        {!slug && activeTab !== "dams" && (
          <TabPlaceholder
            icon={
              activeTab === "nearYou" ? "location-outline"
              : activeTab === "faultLines" ? "map-outline"
              : activeTab === "volcanoes" ? "flame-outline"
              : activeTab === "typhoons" ? "thunderstorm-outline"
              : "newspaper-outline"
            }
            title={
              activeTab === "nearYou" ? "Near You"
              : activeTab === "faultLines" ? "Fault Lines"
              : activeTab === "volcanoes" ? "Volcanoes"
              : activeTab === "typhoons" ? "Typhoons"
              : "Weather Bulletins"
            }
            subtitle="Coming soon. This feature will be available in a future update."
          />
        )}

        {/* Loading */}
        {slug != null && !shownDam && detailLoading && (
          <View style={styles.statusWrap}>
            <ActivityIndicator size="small" color="#E32F31" />
          </View>
        )}

        {/* Error */}
        {slug != null && !shownDam && !detailLoading && detailError && (
          <View style={styles.emptyWrap}>
            <Text style={styles.errorTitle}>Could not load dam status</Text>
            <Text style={styles.errorHint}>
              Close the card and tap the marker again to retry.
            </Text>
          </View>
        )}

        {/* Progressive disclosure: detail rows — only this scrolls */}
        {shownDam && !detailLoading && detailsExpanded && (
          <View style={styles.detailsBlock}>
            {elevationAboveCrest ? (
              <Text style={styles.elevationNote}>
                Your ground elevation (~{Math.round(userElevation)} m ASL)
                is above the reservoir level ({damCrest} m) \u2014 floodwater
                cannot reach this elevation.
              </Text>
            ) : (
              <>
                {userElevation != null && (
                  <Text style={styles.elevationNote}>
                    Your ground elevation ~{Math.round(userElevation)} m ASL
                    {elevationAboveNHWL
                      ? " \u2014 above NHWL, reduced reach"
                      : ""}
                    .
                  </Text>
                )}
                {impactContext?.tierNote && (
                  <Text style={styles.elevationNote}>
                    {impactContext.tierNote}
                  </Text>
                )}
              </>
            )}
            <InfoRow
              label="Deviation vs NHWL"
              value={devNhwl != null ? `${devNhwl > 0 ? "+" : ""}${devNhwl} m` : "\u2014"}
              subtext="How far the water level is from the maximum safe level. Negative means below, positive means above."
            />
            <InfoRow
              label="Rule curve"
              value={effectiveRuleCurve != null ? `${effectiveRuleCurve} m` : "\u2014"}
              subtext="The target water level set by dam operators for this time of year."
            />
            <InfoRow
              label="Deviation vs rule curve"
              value={devRuleCurve != null ? `${devRuleCurve > 0 ? "+" : ""}${devRuleCurve} m` : "\u2014"}
              subtext="How the current level compares to the monthly target. Positive means above target."
            />
            {gates && (gates.gates != null || gates.meters != null) ? (
              <InfoRow
                label="Gate opening"
                value={`${gates.gates ?? "\u2014"} gate(s) \u00D7 ${gates.meters ?? "\u2014"} m`}
                subtext="How many gates are open and by how much. More open means more water being released."
              />
            ) : (
              <InfoRow
                label="Gate opening"
                value="Closed"
                subtext="All gates are closed. No water is being released through the spillway."
              />
            )}
            <InfoRow
              label="Estimated inflow"
              value={inflow != null ? `${inflow} cms` : "\u2014"}
              subtext="Water flowing into the reservoir from rivers and rainfall."
            />
            <InfoRow
              label="Estimated outflow"
              value={outflow != null ? `${outflow} cms` : "\u2014"}
              subtext="Water leaving the reservoir through gates, spillway, or turbines."
            />
            <InfoRow
              label="Observed"
              value={
                observationMs != null
                  ? `${shownDam.observationDate ?? ""} ${shownDam.observationTime ?? ""} \u00B7 ${formatObservationAge(observationMs, now)}`
                  : `${shownDam.observationDate ?? ""} ${shownDam.observationTime ?? ""}`.trim() ||
                    "\u2014"
              }
              valueColor={observationMs != null ? freshnessColor : "#737B8C"}
            />
            <HazardDisclaimer style={{ marginTop: 8 }} />
          </View>
        )}
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

      <SeverityDetail
        visible={severityDetailVisible}
        onClose={() => setSeverityDetailVisible(false)}
        damName={shownDam?.name}
        severityLevel={severity?.level ?? "unknown"}
      />
    </Animated.View>
    </>
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
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleArea: {
    paddingTop: 10,
    paddingBottom: 6,
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
  closeButton: {
    position: "absolute",
    right: 10,
    top: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  damsHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  damsHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#182033",
    letterSpacing: 0.2,
  },
  damsHeaderSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9AA2B1",
    marginTop: 1,
  },
  damStatusHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
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
  statusWrap: {
    alignItems: "center",
    paddingVertical: 28,
  },
  summary: {
    paddingHorizontal: 20,
  },
  headlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headlineName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#182033",
    flexShrink: 1,
  },
  headlineDistance: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4287f5",
  },
  freshDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headlineStatus: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
    color: "#5A6273",
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F1F5",
    marginTop: 12,
    marginBottom: 12,
  },
  gaugeWrap: {
    marginTop: 0,
  },
  gaugeTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F0F1F5",
    overflow: "hidden",
  },
  gaugeFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 14,
    borderRadius: 7,
  },
  gaugeThreshold: {
    position: "absolute",
    top: -1,
    width: 2,
    height: 16,
    backgroundColor: "#E32F31",
    borderRadius: 1,
  },
  gaugeLabels: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  gaugeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#182033",
    fontVariant: ["tabular-nums"],
  },
  gaugePercent: {
    fontSize: 11,
    fontWeight: "600",
    color: "#737B8C",
    fontVariant: ["tabular-nums"],
  },
  gaugeNhwl: {
    marginLeft: "auto",
    fontSize: 11,
    color: "#9AA2B1",
    fontWeight: "500",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  statusChip: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statusChipPressed: {
    opacity: 0.7,
  },
  statusChipLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statusChipValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "800",
  },
  staleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  staleBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E32F31",
    flex: 1,
  },
  detailsPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
    marginTop: 14,
    alignSelf: "flex-end",
    backgroundColor: "#EEF1F5",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  detailsPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4287f5",
  },
  detailsBlock: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
  elevationNote: {
    fontSize: 12,
    lineHeight: 16,
    color: "#5A6273",
    marginBottom: 8,
  },
  infoRowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F7",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoChevron: {
    marginRight: 6,
    marginTop: 1,
  },
  infoChevronPlaceholder: {
    width: 22,
    marginRight: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: "#737B8C",
    fontWeight: "500",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#182033",
    fontVariant: ["tabular-nums"],
  },
  infoSubtext: {
    fontSize: 11,
    lineHeight: 15,
    color: "#9AA2B1",
    paddingBottom: 8,
    paddingHorizontal: 28,
  },
});

export default React.memo(HazardSheetInner);
