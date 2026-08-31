import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { regionShortName } from "@/lib/weather/rainRegions";

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

const MAX_BAR_MM = 150;

function DaySelector({ days, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dayRow}
    >
      {days.map((d) => {
        const active = d.index === selected;
        return (
          <TouchableOpacity
            key={d.index}
            style={[styles.dayChip, active && styles.dayChipActive]}
            onPress={() => onSelect(d.index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/**
 * "Rain" tab content for the hazards sheet: a day selector plus a per-region
 * list of forecast rainfall for that day. Tapping a region focuses the map on
 * it (turning the Rain overlay on if needed).
 */
export default function RainForecastTab({
  rainForecast,
  rainLoading = false,
  overlayVisible = false,
  selectedRainRegionId = null,
  onSelectRainRegion,
}) {
  const [dayIndex, setDayIndex] = useState(0);

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

  const days = rainForecast?.days ?? [];
  const regions = rainForecast?.regions ?? [];

  if (regions.length === 0) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="sunny-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>No rain forecast yet</Text>
        <Text style={styles.statusText}>There’s no rainfall outlook right now.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.summaryText}>7-day rainfall forecast</Text>
      <DaySelector days={days} selected={dayIndex} onSelect={setDayIndex} />

      {!overlayVisible && (
        <Text style={styles.hintText}>
          Turn on the Rain overlay to color regions by today’s rainfall.
        </Text>
      )}

      <View style={styles.list}>
        {regions.map((region) => {
          const day = region.days.find((d) => d.index === dayIndex) ?? {
            mm: region.days[dayIndex]?.mm ?? 0,
          };
          const mm = day.mm ?? 0;
          const color = rainColor(mm);
          const selected = region.id === selectedRainRegionId;
          const weekTotal = region.weekTotal ?? 0;
          return (
            <TouchableOpacity
              key={region.id}
              activeOpacity={0.7}
              onPress={() => onSelectRainRegion?.(region)}
              accessibilityRole="button"
            >
              <View
                style={[styles.rowCard, selected && { borderColor: "#3B82F6", borderWidth: 2 }]}
              >
                <View style={styles.swatch} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {regionShortName(region.name)}
                    </Text>
                    {selected && <Ionicons name="eye" size={14} color="#3B82F6" />}
                  </View>
                  <View style={styles.barWrap}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: color,
                          width: `${Math.max(4, Math.min(100, (mm / MAX_BAR_MM) * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowMm}>
                      {mm} mm · {rainLabel(mm)}
                    </Text>
                    <Text style={styles.rowWeek}>Week: {weekTotal} mm</Text>
                  </View>
                </View>
                <View style={[styles.mmBadge, { backgroundColor: color }]}>
                  <Text style={styles.mmBadgeText}>{mm}</Text>
                </View>
              </View>
            </TouchableOpacity>
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
  dayRow: {
    paddingHorizontal: 20,
    gap: 6,
    marginTop: 8,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  dayChipActive: {
    backgroundColor: "#3B82F6",
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
  dayChipTextActive: {
    color: "#FFFFFF",
  },
  list: {
    marginHorizontal: 20,
    marginTop: 12,
    gap: 10,
  },
  rowCard: {
    flexDirection: "row",
    borderRadius: 12,
    backgroundColor: "#F4F8FE",
    borderWidth: 1,
    borderColor: "#DCEAFB",
    overflow: "hidden",
    padding: 10,
    alignItems: "center",
  },
  swatch: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
    marginRight: 10,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#0C4A6E",
  },
  barWrap: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginTop: 6,
    overflow: "hidden",
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  rowMm: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    fontVariant: ["tabular-nums"],
  },
  rowWeek: {
    fontSize: 11,
    color: "#5A6273",
    fontVariant: ["tabular-nums"],
  },
  mmBadge: {
    minWidth: 40,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    marginLeft: 8,
  },
  mmBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
});
