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
 * Bottom-sheet "layers" tab: the user checks which hazard layers to overlay
 * on the map (visibility) and can manage their offline copies (download /
 * remove). Visibility state lives in useHazardLayerVisibility so choices
 * persist across sessions.
 */

interface LayerRowProps {
  config: HazardLayerConfig;
  enabled: boolean;
  onToggle: () => void;
}

function LayerRow({ config, enabled, onToggle }: LayerRowProps) {
  const { status, progress, download, remove } =
    useOfflinePMTilesLayer(config.id);
  const palette = HAZARD_COLORS[config.hazardType];

  // Download status stays visible even when unchecked so an in-flight
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
        onPress={onToggle}
        activeOpacity={0.6}
      >
        <Ionicons
          name={enabled ? "checkbox" : "square-outline"}
          size={22}
          color={enabled ? "#208AEF" : "#9CA3AF"}
        />
        <View style={[styles.dot, { backgroundColor: palette.stroke }]} />
        <View style={styles.info}>
          <Text style={[styles.label, !enabled && styles.labelDisabled]}>
            {config.label}
          </Text>
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
  /** Ids currently overlaid on the map. */
  enabledIds: Set<string>;
  /** Called with the layer id when a row's checkbox is toggled. */
  onToggle: (layerId: string) => void;
}

export default function HazardLayersPanel({
  visible,
  onClose,
  enabledIds,
  onToggle,
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
            Overlay hazard maps on the basemap. Layers stream for the area you
            are viewing — download to keep them available offline.
          </Text>

          <ScrollView style={styles.list} nestedScrollEnabled>
            {HAZARD_LAYERS.map((layer) => (
              <LayerRow
                key={layer.id}
                config={layer}
                enabled={enabledIds.has(layer.id)}
                onToggle={() => onToggle(layer.id)}
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
  label: { fontSize: 14, fontWeight: "600", color: "#111827" },
  labelDisabled: { color: "#9CA3AF" },
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
