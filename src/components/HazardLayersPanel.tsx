import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import HAZARD_COLORS from "@/constants/hazardColors";
import { HAZARD_LAYERS, type HazardLayerConfig } from "@/lib/pmtiles/downloadLayer";
import { useOfflinePMTilesLayer } from "@/hooks/useOfflinePMTilesLayer";

/**
 * Bottom-sheet "layers" tab: the user picks which single hazard layer is
 * overlaid on the map and can manage offline copies (download / remove).
 * Only one layer renders at a time — picking a new one unmounts the previous
 * overlay. Per-layer download state is independent of selection, so every
 * row keeps working (download/resume/remove) whether selected or not.
 */

interface LayerRowProps {
  config: HazardLayerConfig;
  active: boolean;
  onSelect: () => void;
}

function LayerRow({ config, active, onSelect }: LayerRowProps) {
  const { status, progress, download, remove } =
    useOfflinePMTilesLayer(config.id);
  const palette = HAZARD_COLORS[config.hazardType];

  // Download status stays visible even when unselected so an in-flight
  // offline copy isn't orphaned silently in the background.
  const metaText =
    status === "downloading"
      ? `~${config.approxSizeMB} MB · downloading ${progress}%`
      : status === "ready"
        ? `~${config.approxSizeMB} MB · saved offline`
        : status === "error"
          ? `~${config.approxSizeMB} MB · download failed`
          : `~${config.approxSizeMB} MB · streaming`;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={onSelect}
        activeOpacity={0.6}
      >
        <Ionicons
          name={active ? "radio-button-on" : "radio-button-off"}
          size={22}
          color={active ? "#208AEF" : "#9CA3AF"}
        />
        <View style={[styles.dot, { backgroundColor: palette.stroke }]} />
        <View style={styles.info}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, !active && styles.labelDisabled]}>
              {config.label}
            </Text>
            {config.recommended ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text
                  style={[
                    styles.badgeText,
                    active && styles.badgeTextActive,
                  ]}
                >
                  Recommended
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>{metaText}</Text>
          {status === "downloading" ? (
            <View style={styles.track}>
              <View
                style={[
                  styles.trackFill,
                  { width: `${Math.max(progress, 4)}%` },
                ]}
              />
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {status === "ready" ? (
        <TouchableOpacity style={styles.actionButton} onPress={remove}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      ) : status === "not-downloaded" || status === "error" ? (
        <TouchableOpacity style={styles.actionButton} onPress={download}>
          <Ionicons
            name="cloud-download-outline"
            size={16}
            color={status === "error" ? "#DC2626" : "#208AEF"}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface HazardLayersPanelProps {
  visible: boolean;
  onClose: () => void;
  /** The one layer currently overlaid on the map (null = none). */
  activeId: string | null;
  /**
   * Called with a layer id when a row is picked; passing that same id back
   * deselects it. Download state of every layer is unaffected.
   */
  onSelect: (layerId: string | null) => void;
}

export default function HazardLayersPanel({
  visible,
  onClose,
  activeId,
  onSelect,
}: HazardLayersPanelProps) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      {/* backdrop tap closes the sheet; inner Pressable swallows sheet taps */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Map layers</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Show one hazard map on the basemap at a time. Layers stream for
            the area you are viewing — download to keep them offline.
          </Text>

          <ScrollView style={styles.list} nestedScrollEnabled>
            {HAZARD_LAYERS.map((layer) => (
              <LayerRow
                key={layer.id}
                config={layer}
                active={activeId === layer.id}
                onSelect={() =>
                  onSelect(activeId === layer.id ? null : layer.id)
                }
              />
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "65%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#111827" },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 8,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#111827" },
  labelDisabled: { color: "#9CA3AF" },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
  },
  badgeActive: { backgroundColor: "#208AEF" },
  badgeText: { fontSize: 9, fontWeight: "700", color: "#208AEF" },
  badgeTextActive: { color: "#FFFFFF" },
  meta: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  track: {
    height: 4,
    marginTop: 6,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  trackFill: { height: "100%", backgroundColor: "#208AEF" },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
});
