import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * "Low Pressure Area" tab content for the hazards sheet: lists the active
 * PAGASA-tracked LPAs. Tapping a row focuses the map on that LPA's hollow
 * circle (turning the overlay on if needed); the selected LPA is highlighted.
 */
export default function LpasTab({
  lpas,
  lpasLoading = false,
  overlayVisible = false,
  selectedLpaId = null,
  onSelectLpa,
}) {
  if (lpasLoading && !lpas) {
    return (
      <View style={styles.statusWrap}>
        <ActivityIndicator size="small" color="#0EA5E9" />
        <Text style={styles.statusText}>Checking low pressure areas…</Text>
      </View>
    );
  }

  if (lpas?.unavailable) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>Couldn’t reach PAGASA</Text>
        <Text style={styles.statusText}>
          LPA data is unavailable right now. Please try again later.
        </Text>
      </View>
    );
  }

  const list = lpas?.lpas ?? [];

  if (list.length === 0) {
    return (
      <View style={styles.statusWrap}>
        <Ionicons name="sunny-outline" size={28} color="#737B8C" />
        <Text style={styles.statusTitle}>No low pressure areas</Text>
        <Text style={styles.statusText}>
          There are currently no low pressure areas being monitored.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.summaryText}>
        {list.length} low pressure area{list.length === 1 ? "" : "s"} · PAGASA
      </Text>

      {!overlayVisible && (
        <Text style={styles.hintText}>
          Turn on the Low Pressure Area overlay to see the circles on the map.
        </Text>
      )}

      <View style={styles.list}>
        {list.map((lpa) => {
          const selected = lpa.id === selectedLpaId;
          return (
            <TouchableOpacity
              key={lpa.id}
              activeOpacity={0.7}
              onPress={() => onSelectLpa?.(lpa)}
              accessibilityRole="button"
            >
              <View
                style={[styles.rowCard, selected && styles.rowCardSelected]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="cloud-outline" size={20} color="#0EA5E9" />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {lpa.name}
                    </Text>
                    {selected && <Ionicons name="eye" size={14} color="#0EA5E9" />}
                  </View>
                  <Text style={styles.rowStatus} numberOfLines={2}>
                    {lpa.note}
                  </Text>
                  <View style={styles.rowMeta}>
                    {lpa.pressure != null && (
                      <Text style={styles.rowCenter}>
                        {lpa.pressure} hPa
                      </Text>
                    )}
                    {lpa.lat != null && lpa.lon != null && (
                      <Text style={styles.rowCenter}>
                        Center {lpa.lat.toFixed(1)}°, {lpa.lon.toFixed(1)}°
                      </Text>
                    )}
                  </View>
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
  },
  rowCardSelected: {
    borderColor: "#0EA5E9",
    borderWidth: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 15,
    fontWeight: "800",
    color: "#0C4A6E",
  },
  rowStatus: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: "#334155",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  rowCenter: {
    fontSize: 11,
    color: "#5A6273",
    fontVariant: ["tabular-nums"],
  },
});
