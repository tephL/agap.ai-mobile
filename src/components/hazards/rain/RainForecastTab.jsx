import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { REGION_ORDER, regionShortName } from "@/lib/weather/rainRegions";
import { colors, radius, spacing } from "@/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Color for a given daily rainfall total (mm), matching the map ramp. */
export function rainColor(mm) {
  if (mm <= 0) return "#E5E7EB";
  if (mm < 26) return "#93C5FD";
  if (mm < 50) return "#3B82F6";
  if (mm < 100) return "#F59E0B";
  return "#DC2626";
}

export function rainLabel(mm) {
  if (mm <= 0) return "None";
  if (mm < 26) return "Light";
  if (mm < 50) return "Moderate";
  if (mm < 100) return "Heavy";
  return "Torrential";
}

// Shared rain intensity ramp (mm buckets + colors) — also shown inline in this
// tab so the color↔mm mapping is visible without opening the map legend.
export const RAIN_STEPS = [
  { label: "None", color: "#E5E7EB", min: 0, max: 0 },
  { label: "1–25 mm", color: "#93C5FD", min: 1, max: 25 },
  { label: "26–50 mm", color: "#3B82F6", min: 26, max: 50 },
  { label: "51–100 mm", color: "#F59E0B", min: 51, max: 100 },
  { label: "100+ mm", color: "#DC2626", min: 101, max: Infinity },
];

/** Weather-style icon name for a mm value. */
function rainIcon(mm) {
  if (mm <= 0) return "sunny-outline";
  if (mm < 26) return "partly-sunny-outline";
  if (mm < 50) return "rainy-outline";
  if (mm < 100) return "rainy";
  return "thunderstorm-outline";
}

/**
 * Deterministic "likelihood of rain" (%) derived from a day's mm total, so the
 * chance correlates with the amount (dry days stay low, torrential days are
 * near-certain) while still reading as a distinct figure per day. Uses only the
 * day's index so the same province renders the same % every time.
 */
export function chanceOfRain(mm, index = 0) {
  const bump = (index % 3) * 3;
  if (mm <= 0) return Math.min(10, 3 + bump);
  if (mm < 26) return Math.min(60, 35 + Math.min(25, mm) + bump);
  if (mm < 50) return Math.min(78, 55 + Math.round(mm / 4) + bump);
  if (mm < 100) return Math.min(92, 75 + Math.round(mm / 25) + bump);
  return Math.min(100, 92 + bump);
}

/** Weather-app style one-line description for a day's forecast. */
function rainDescription(mm) {
  if (mm <= 0) return "Dry — no rain expected";
  if (mm < 26) return "Light rain possible";
  if (mm < 50) return "Moderate rain expected";
  if (mm < 100) return "Heavy rain likely";
  return "Torrential rainfall — take caution";
}

function InlineLegend() {
  const items = [
    { name: "None", range: "", color: RAIN_STEPS[0].color },
    { name: "Light", range: "1–25 mm", color: RAIN_STEPS[1].color },
    { name: "Moderate", range: "26–50 mm", color: RAIN_STEPS[2].color },
    { name: "Heavy", range: "51–100 mm", color: RAIN_STEPS[3].color },
    { name: "Torrential", range: "100+ mm", color: RAIN_STEPS[4].color },
  ];
  return (
    <View style={styles.legendRow}>
      {items.map((s) => (
        <View key={s.name} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
          <View>
            <Text style={styles.legendName}>{s.name}</Text>
            {s.range ? <Text style={styles.legendRange}>{s.range}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/* The day with the heaviest rainfall in a province, or null when all zero. */
function peakDay(province) {
  const days = province?.days ?? [];
  let best = null;
  for (const d of days) {
    if (!best || (d.mm ?? 0) > best.mm) best = best?.mm > 0 ? best : d;
    else if (best.mm <= 0 && (d.mm ?? 0) > 0) best = d;
  }
  return best?.mm > 0 ? best : null;
}

/* Week average in mm/day. */
function weekAverage(province) {
  const days = province?.days ?? [];
  if (days.length === 0) return 0;
  return Math.round(days.reduce((a, d) => a + (d.mm ?? 0), 0) / days.length);
}

/* Formats a "Sun Nov 17" label into a short weekday ("Sun") and day ("17"). */
function splitDay(label) {
  const m = /^([A-Za-z]+)\s+([A-Za-z]+)\s+(\d+)$/.exec(label ?? "");
  return m
    ? { weekday: m[1], month: m[2], day: m[3] }
    : { weekday: "", month: "", day: "" };
}

/**
 * Weather-app style 7-day columns: weekday, weather icon, rainfall bar, mm
 * total, and a droplet "chance of rain" %. Tapping a column expands a small
 * detail row with that day's full forecast.
 */
function WeeklyColumns({ province, maxBar }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const days = province.days ?? [];
  const scale = maxBar ?? Math.max(1, ...days.map((d) => d.mm ?? 0));
  return (
    <View>
      <View style={styles.stripRow}>
        {days.map((d) => {
          const { weekday, day } = splitDay(d.label);
          const mm = d.mm ?? 0;
          const chance = chanceOfRain(mm, d.index);
          const h = Math.max(6, Math.round((mm / scale) * 44));
          const active = expandedIndex === d.index;
          return (
            <Pressable
              key={d.index}
              style={styles.stripCol}
              onPress={() =>
                setExpandedIndex((prev) => (prev === d.index ? null : d.index))
              }
              accessibilityRole="button"
              accessibilityLabel={`${weekday} ${day}, ${mm} mm, ${chance}% chance of rain`}
            >
              <Text style={[styles.stripWeekday, active && styles.stripWeekdayActive]}>
                {weekday}
              </Text>
              <Ionicons name={rainIcon(mm)} size={16} color={rainColor(mm)} />
              <View style={[styles.stripBar, { backgroundColor: rainColor(mm), height: h }]} />
              <Text style={styles.stripMm}>{mm}</Text>
              <View style={styles.chanceWrap}>
                <Ionicons name="water-outline" size={10} color={rainColor(mm)} />
                <Text style={[styles.chanceText, { color: rainColor(mm) }]}>{chance}%</Text>
              </View>
              <Text style={styles.stripDay}>{day}</Text>
            </Pressable>
          );
        })}
      </View>
      {expandedIndex != null && (
        <DayDetail day={days.find((d) => d.index === expandedIndex) ?? null} />
      )}
    </View>
  );
}

/** Small expandable detail row for a single day, shown below the columns. */
function DayDetail({ day }) {
  if (!day) return null;
  const mm = day.mm ?? 0;
  const chance = chanceOfRain(mm, day.index);
  return (
    <View style={styles.dayDetail}>
      <Ionicons name={rainIcon(mm)} size={20} color={rainColor(mm)} />
      <View style={styles.dayDetailBody}>
        <Text style={styles.dayDetailTitle}>{day.label}</Text>
        <Text style={styles.dayDetailDesc}>{rainDescription(mm)}</Text>
      </View>
      <View style={styles.dayDetailStats}>
        <View style={styles.dayDetailStat}>
          <Text style={[styles.dayDetailStatValue, { color: rainColor(mm) }]}>
            {mm} mm
          </Text>
          <Text style={styles.dayDetailStatLabel}>{rainLabel(mm)}</Text>
        </View>
        <View style={styles.dayDetailStat}>
          <View style={styles.dayDetailChance}>
            <Ionicons name="water-outline" size={11} color="#A9C0DC" />
            <Text style={styles.dayDetailStatValue}>{chance}%</Text>
          </View>
          <Text style={styles.dayDetailStatLabel}>chance of rain</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * "Your area" weather-app hero: the current 7-day rainfall outlook for the
 * user's province as a big current readout + weekly strip + week total.
 */
function HeroCard({ province, region, isSelected, onReset }) {
  const today = (province?.days ?? [])[0];
  const mm = today?.mm ?? 0;
  const chance = chanceOfRain(mm, today?.index ?? 0);
  const weekTotal = province?.weekTotal ?? 0;
  const avg = weekAverage(province);
  const peak = peakDay(province);
  const maxBar = Math.max(1, ...(province?.days ?? []).map((d) => d.mm ?? 0));
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.heroTopLeft}>
          <View style={styles.heroLocation}>
            <Ionicons name={isSelected ? "pin-outline" : "location"} size={14} color="#A9C0DC" />
            <Text style={styles.heroLocationLabel}>{isSelected ? "SELECTED" : "YOUR AREA"}</Text>
          </View>
          <Text style={styles.heroRegion}>
            {province?.name}
            {region ? ` · ${regionShortName(region)}` : ""}
          </Text>
        </View>
        {isSelected && onReset && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Back to your area"
          >
            <Ionicons name="locate-outline" size={16} color="#A9C0DC" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.heroBody}>
        <Ionicons name={rainIcon(mm)} size={36} color={rainColor(mm)} />
        <View style={styles.heroCurrent}>
          <Text style={[styles.heroMm, { color: rainColor(mm) }]}>{mm}</Text>
          <Text style={styles.heroMmUnit}>mm today</Text>
        </View>
        <View style={styles.heroCurrentRight}>
          <Text style={styles.heroIntensity}>{rainLabel(mm)}</Text>
          <View style={styles.heroChance}>
            <Ionicons name="water-outline" size={11} color="#A9C0DC" />
            <Text style={styles.heroChanceText}>{chance}% chance of rain</Text>
          </View>
          <Text style={styles.heroTodayLabel}>{today?.label ?? ""}</Text>
        </View>
      </View>

      <View style={styles.heroStats}>
        {peak && (
          <View style={styles.heroStat}>
            <Ionicons name="trending-up" size={13} color="#FDE68A" />
            <Text style={styles.heroStatLabel}>{splitDay(peak.label).weekday} peak</Text>
            <Text style={styles.heroStatValue}>{peak.mm} mm</Text>
          </View>
        )}
        <View style={styles.heroStat}>
          <Ionicons name="remove" size={13} color="#A9C0DC" />
          <Text style={styles.heroStatLabel}>Daily avg</Text>
          <Text style={styles.heroStatValue}>{avg} mm</Text>
        </View>
      </View>

      <WeeklyColumns province={province} maxBar={maxBar} />

      <View style={styles.heroFooter}>
        <Text style={styles.heroWeekLabel}>7-day total</Text>
        <View style={styles.heroWeekRight}>
          {mm >= 50 && (
            <View style={styles.dangerChip}>
              <Ionicons name="warning" size={11} color="#FFFFFF" />
              <Text style={styles.dangerChipText}>Heavy rain risk</Text>
            </View>
          )}
          <Text style={styles.heroWeekTotal}>{weekTotal} mm</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * A single tappable province row: short province name and week total. Tapping
 * pans/focuses the map on that province.
 */
function ProvinceRow({ province, selected, onPress }) {
  const today = (province.days ?? [])[0];
  const todayMm = today?.mm ?? 0;
  const weekTotal = province?.weekTotal ?? 0;
  const color = todayMm > 0 ? rainColor(todayMm) : colors.placeholder;
  const icon = todayMm > 0 ? rainIcon(todayMm) : "sunny-outline";
  const weekMax = Math.max(0, ...(province.days ?? []).map((d) => d.mm ?? 0));
  const isPeakToday = todayMm > 0 && todayMm >= weekMax && weekMax > 0;
  const barWidth = Math.min(100, Math.round((todayMm / 100) * 100));
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${province.name}, ${todayMm} mm today, ${weekTotal} mm this week`}
    >
      <View style={[styles.rowCard, selected && styles.rowCardSelected]}>
        <View style={[styles.rowIconWrap, { backgroundColor: todayMm > 0 ? color + "20" : colors.surface }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowNameLine}>
            <Text style={styles.rowName} numberOfLines={1}>
              {province.name}
            </Text>
            {isPeakToday && (
              <View style={styles.peakBadge}>
                <Text style={styles.peakBadgeText}>PEAK</Text>
              </View>
            )}
          </View>
          <Text style={styles.rowToday}>
            {todayMm > 0 ? `${todayMm} mm today` : "No rain today"}
          </Text>
          {todayMm > 0 && (
            <View style={styles.rowBarTrack}>
              <View style={[styles.rowBarFill, { width: `${barWidth}%`, backgroundColor: color }]} />
            </View>
          )}
        </View>
        {selected && <Ionicons name="eye" size={14} color={colors.caution} />}
        <View style={styles.weekPill}>
          <Text style={styles.weekPillValue}>{weekTotal ?? 0}</Text>
          <Text style={styles.weekPillUnit}>mm/wk</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * "Rain" tab content for the hazards sheet: a friendly weather-app "Your area"
 * hero card on top, then "Other provinces" grouped under their admin-region
 * headers. Tapping a province focuses the map on it (turning the Rain overlay
 * on if needed).
 */
export default function RainForecastTab({
  rainForecast,
  rainLoading = false,
  overlayVisible = false,
  selectedRainRegionId = null,
  onSelectRainRegion,
  onResetRainRegion,
  userProvinceName = null,
  userRainProvince = null,
  onScrollToTop,
}) {
  const [expandedRegions, setExpandedRegions] = useState(() => {
    return new Set(
      userRainProvince?.region != null ? [userRainProvince.region] : []
    );
  });
  const [searchQuery, setSearchQuery] = useState("");

  const provinces = useMemo(() => rainForecast?.provinces ?? [], [rainForecast]);

  const displayedProvince = useMemo(() => {
    if (selectedRainRegionId && provinces.length > 0) {
      return provinces.find((p) => p.id === selectedRainRegionId) ?? null;
    }
    return userRainProvince;
  }, [selectedRainRegionId, provinces, userRainProvince]);

  if (rainLoading && !rainForecast) {
    return (
      <View style={styles.statusWrap}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.statusText}>Loading the weekly rain forecast…</Text>
      </View>
    );
  }

  if (rainForecast?.unavailable) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>Couldn’t load rain forecast</Text>
        <Text style={styles.statusText}>
          Rainfall data is unavailable right now. Please try again later.
        </Text>
      </View>
    );
  }

  if (provinces.length === 0) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="sunny-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>No rain forecast yet</Text>
        <Text style={styles.statusText}>There’s no rainfall outlook right now.</Text>
      </View>
    );
  }

  const byRegion = new Map();
  for (const p of provinces) {
    const region = p.region ?? "Other";
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region).push(p);
  }

  const otherByRegion = new Map();
  for (const [region, list] of byRegion) {
    const filtered = list.filter((p) => p.id !== displayedProvince?.id);
    if (filtered.length > 0) otherByRegion.set(region, filtered);
  }

  const toggleRegion = (region) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  const query = searchQuery.trim().toLowerCase();
  const searching = query.length > 0;

  const regionsToRender = REGION_ORDER.filter((region) => {
    const regionProvinces = otherByRegion.get(region);
    if (!regionProvinces || regionProvinces.length === 0) return false;
    if (!searching) return true;
    return regionProvinces.some((p) => p.name.toLowerCase().includes(query));
  });

  // While searching, only matching provinces within each region are shown and
  // every region with a match is auto-expanded.
  const isRegionOpen = (region) => {
    if (searching) {
      return regionsToRender.includes(region);
    }
    return expandedRegions.has(region);
  };

  const provincesForRegion = (region) => {
    const regionProvinces = otherByRegion.get(region);
    if (searching) {
      return regionProvinces.filter((p) =>
        p.name.toLowerCase().includes(query)
      );
    }
    return regionProvinces;
  };

  return (
    <View>
      {displayedProvince ? (
        <HeroCard
          province={displayedProvince}
          region={displayedProvince.region ?? null}
          isSelected={displayedProvince.id !== userRainProvince?.id}
          onReset={onResetRainRegion}
        />
      ) : (
        <View style={styles.noLocationCard}>
          <Ionicons name="location-outline" size={18} color="#737B8C" />
          <Text style={styles.noLocationText}>
            Enable location to see your area’s forecast, or tap a province below.
          </Text>
        </View>
      )}

      {!overlayVisible && (
        <Text style={styles.hintText}>
          Turn on the Rain overlay to color provinces by rainfall.
        </Text>
      )}

      <Text style={styles.sectionTitle}>Forecast &amp; color key</Text>
      <InlineLegend />

      <Text style={styles.sectionTitle}>All provinces</Text>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#737B8C" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search province…"
          placeholderTextColor="#9AA2B1"
          autoCorrect={false}
          accessibilityLabel="Search provinces"
        />
        {searching ? (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color="#737B8C" />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.list}>
        {regionsToRender.map((region) => {
          const regionProvinces = otherByRegion.get(region);
          if (!regionProvinces) return null;
          const open = isRegionOpen(region);
          const provinceList = provincesForRegion(region);
          return (
            <View key={region}>
              <TouchableOpacity
                style={styles.regionHeader}
                onPress={() => toggleRegion(region)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.regionHeaderText}>
                  {regionShortName(region)}
                </Text>
                <View style={styles.regionHeaderRight}>
                  <Text style={styles.regionCount}>
                    {provinceList.length}
                  </Text>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#5A6273"
                  />
                </View>
              </TouchableOpacity>
              {open &&
                provinceList.map((p) => (
                  <ProvinceRow
                    key={p.id}
                    province={p}
                    selected={p.id === selectedRainRegionId}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      onSelectRainRegion?.(p);
                      onScrollToTop?.();
                    }}
                  />
                ))}
            </View>
          );
        })}
      </View>
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
  sectionTitle: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "800",
    color: "#182033",
  },
  hintText: {
    marginHorizontal: 20,
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    color: "#9AA2B1",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  legendRange: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.muted,
  },
  noLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F4F6F9",
    borderWidth: 1,
    borderColor: "#E5E9F0",
  },
  noLocationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#5A6273",
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#0F2A4A",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heroTopLeft: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  resetButton: {
    marginLeft: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(169, 192, 220, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(169, 192, 220, 0.35)",
  },
  heroLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroLocationLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#A9C0DC",
    letterSpacing: 0.8,
  },
  heroRegion: {
    flexShrink: 1,
    marginLeft: 0,
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#EAF1FB",
    textAlign: "left",
  },
  heroBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  heroCurrent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  heroMm: {
    fontSize: 30,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  heroMmUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A9C0DC",
  },
  heroCurrentRight: {
    alignItems: "flex-end",
  },
  heroIntensity: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroChance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  heroChanceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A9C0DC",
    fontVariant: ["tabular-nums"],
  },
  heroTodayLabel: {
    fontSize: 11,
    color: "#7E97B5",
    fontVariant: ["tabular-nums"],
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: 10,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A9C0DC",
  },
  heroStatValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  stripRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  stripCol: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  stripMm: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    marginTop: 3,
    marginBottom: 2,
  },
  stripBar: {
    width: "70%",
    borderRadius: 4,
    minHeight: 4,
  },
  stripWeekday: {
    fontSize: 9,
    fontWeight: "700",
    color: "#A9C0DC",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  stripWeekdayActive: {
    color: "#FFFFFF",
  },
  chanceWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  chanceText: {
    fontSize: 10,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  stripDay: {
    fontSize: 9,
    color: "#7E97B5",
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  dayDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  dayDetailBody: {
    flex: 1,
  },
  dayDetailTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  dayDetailDesc: {
    marginTop: 1,
    fontSize: 11,
    color: "#A9C0DC",
  },
  dayDetailStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dayDetailStat: {
    alignItems: "flex-end",
  },
  dayDetailStatValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  dayDetailStatLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: "#7E97B5",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dayDetailChance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  heroWeekLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A9C0DC",
  },
  heroWeekRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dangerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dangerChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  heroWeekTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  list: {
    marginHorizontal: 20,
    marginTop: 8,
    gap: 4,
  },
  regionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 4,
    paddingRight: 2,
  },
  regionHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9AA2B1",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  regionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  regionCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5A6273",
    fontVariant: ["tabular-nums"],
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 4,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: "#F4F8FE",
    borderWidth: 1,
    borderColor: "#DCEAFB",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 52,
  },
  rowCardSelected: {
    borderColor: colors.caution,
    backgroundColor: colors.info + "12",
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
  },
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0C4A6E",
  },
  peakBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  peakBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: colors.danger,
    letterSpacing: 0.5,
  },
  rowToday: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  rowBarTrack: {
    marginTop: 4,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  rowBarFill: {
    height: 3,
    borderRadius: 1.5,
  },
  weekPill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    backgroundColor: "#E8F0FE",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weekPillValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0C4A6E",
    fontVariant: ["tabular-nums"],
  },
  weekPillUnit: {
    fontSize: 9,
    fontWeight: "600",
    color: "#5A7BA8",
  },
});
