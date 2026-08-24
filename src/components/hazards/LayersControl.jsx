import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function LayersControl({ layers, visibleLayers, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Show layer options"
      >
        <Ionicons name="layers-outline" size={22} color="#4287f5" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalFill} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setOpen(false)}
            accessibilityLabel="Close layer options"
          />

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Map Layers</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close layer options"
              >
                <Ionicons name="close" size={18} color="#9AA2B1" />
              </TouchableOpacity>
            </View>

            {layers.map((layer) => {
              const active = Boolean(visibleLayers?.[layer.key]);
              return (
                <View key={layer.key} style={styles.row}>
                  <Ionicons
                    name={layer.icon}
                    size={16}
                    color={active ? layer.activeColor : "#9AA2B1"}
                  />
                  <Text
                    style={[styles.rowLabel, !active && styles.rowLabelInactive]}
                  >
                    {layer.label}
                  </Text>
                  <Switch
                    value={active}
                    onValueChange={() => onToggle(layer.key)}
                    trackColor={{
                      true: layer.activeColor,
                      false: "#D7DBE2",
                    }}
                    thumbColor="#ffffff"
                    style={styles.switch}
                    accessibilityLabel={`${active ? "Hide" : "Show"} ${layer.label} layer`}
                  />
                </View>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 16,
    bottom: 88,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.95,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
  },
  modalFill: {
    flex: 1,
    position: "relative",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24, 32, 51, 0.08)",
  },
  panel: {
    position: "absolute",
    right: 16,
    bottom: 146,
    width: 216,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#9AA2B1",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#182033",
  },
  rowLabelInactive: {
    color: "#9AA2B1",
  },
  switch: {
    transform: [{ scale: 0.85 }],
    marginRight: -4,
  },
});
