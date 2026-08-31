import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { INTENSITY_COLORS, statusKeyFromWindspeed } from "@/lib/typhoonTracks/trackJson";

/**
 * "Typhoons" tab content for the hazards sheet: lists the active PAGASA
 * tropical cyclones relevant to the Philippines, strongest first. Tapping a row
 * shows that storm's forecast track + impact zone on the map (turning the
 * overlay on if needed); the selected storm is highlighted.
 */
function intensityFor(t) {
  const key = statusKeyFromWindspeed(t.current?.windspeed ?? t.overallWindspeed);
  return key && INTENSITY_COLORS[key] ? key : "unknown";
}

function StatusCell({ typhoon }) {
  const windspeed = typhoon.current?.windspeed;
  const label = windspeed != null ? `${Math.round(windspeed)} km/h` : "—";
  return (
    <View style={styles.speedChip}>
      <Ionicons name="speedometer-outline" size={13} color="#737B8C" />
      <Text style={styles.speedText}>{label}</Text>
    </View>
  );
}

export default function TyphoonsTab({
  typhoons,
  typhoonsLoading = false,
  overlayVisible = false,
  selectedTyphoonEventId = null,
  onSelectTyphoon,
}) {
  if (typhoonsLoading && !typhoons) {
    return (
      <View style={styles.statusWrap}>
        <ActivityIndicator size="small" color="#0EA5E9" />
        <Text style={styles.statusText}>Checking tropical cyclones…</Text>
      </View>
    );
  }

  if (typhoons?.unavailable) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>Couldn’t reach GDACS</Text>
        <Text style={styles.statusText}>
          Typhoon track data is unavailable right now. Please try again later.
        </Text>
      </View>
    );
  }

  if (!typhoons || !Array.isArray(typhoons.typhoons)) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="cloud-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>No typhoon data yet</Text>
        <Text style={styles.statusText}>Loading the latest tropical cyclones…</Text>
      </View>
    );
  }

  const list = [...typhoons.typhoons].sort(
    (a, b) =>
      (b.current?.windspeed ?? b.overallWindspeed ?? 0) -
      (a.current?.windspeed ?? a.overallWindspeed ?? 0)
  );

  if (list.length === 0) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="sunny-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>No active typhoons</Text>
        <Text style={styles.statusText}>
          There are currently no tropical cyclones threatening the Philippines.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.summaryText}>
        {list.length} active tropical cyclone{list.length === 1 ? "" : "s"} ·
        PAGASA ·{" "}
        {typhoons.generatedAt
          ? new Date(typhoons.generatedAt).toLocaleString()
          : ""}
      </Text>

      {!overlayVisible && (
        <Text style={styles.hintText}>
          Turn on the Typhoons overlay to see the tracks on the map.
        </Text>
      )}

      <View style={styles.list}>
        {list.map((t) => {
          const key = intensityFor(t);
          const color = INTENSITY_COLORS[key] ?? INTENSITY_COLORS.unknown;
          const statusText =
            t.current?.status?.trim() || t.overallStormstatus?.trim() || "Tropical cyclone";
          const selected = t.eventId != null && t.eventId === selectedTyphoonEventId;
          const row = (
            <View
              style={[
                styles.rowCard,
                selected && { borderColor: color, borderWidth: 2 },
              ]}
            >
              <View style={[styles.levelBar, { backgroundColor: color }]} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {t.name ?? `Tropical cyclone (${t.bulletinFile || t.eventId})`}
                  </Text>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  {selected && (
                    <Ionicons name="eye" size={14} color={color} />
                  )}
                </View>
                <Text style={styles.rowStatus} numberOfLines={1}>
                  {statusText}
                  {t.overallWindspeed != null
                    ? ` · ${Math.round(t.overallWindspeed)} km/h`
                    : ""}
                </Text>
                <View style={styles.rowMeta}>
                  <StatusCell typhoon={t} />
                  {t.current?.lon != null && t.current?.lat != null && (
                    <Text style={styles.rowCenter}>
                      Center {t.current.lat.toFixed(1)}°, {t.current.lon.toFixed(1)}°
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
          return (
            <TouchableOpacity
              key={t.eventId}
              activeOpacity={0.7}
              onPress={() => onSelectTyphoon?.(t)}
              accessibilityRole="button"
            >
              {row}
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
  },
  levelBar: {
    width: 5,
  },
  rowBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0C4A6E",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  rowStatus: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    textTransform: "capitalize",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  speedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  speedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#182033",
    fontVariant: ["tabular-nums"],
  },
  rowCenter: {
    fontSize: 11,
    color: "#5A6273",
    fontVariant: ["tabular-nums"],
  },
});
