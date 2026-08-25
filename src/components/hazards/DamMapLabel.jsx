import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Floating pill above the map showing the tapped dam's name at a glance —
 * severity dot + name + live distance — so users don't have to open the
 * drawer just to confirm which dam they selected. Rendered while a dam is
 * selected; X dismisses it (and the selection).
 */
export default function DamMapLabel({ name, severityColor, distanceText, onClose }) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pill}>
        <View style={[styles.dot, { backgroundColor: severityColor ?? "#9CA3AF" }]} />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {distanceText ? (
          <>
            <View style={styles.separator} />
            <Text style={styles.distance}>{distanceText}</Text>
          </>
        ) : null}
        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
    elevation: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "82%",
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },
  separator: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  distance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  close: {
    marginLeft: 2,
    padding: 4,
  },
});
