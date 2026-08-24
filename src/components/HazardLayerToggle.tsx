import React from "react";
import { Layer, VectorSource } from "@maplibre/maplibre-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import HAZARD_COLORS, {
  type HazardColorSet,
} from "@/constants/hazardColors";
import { HAZARD_LAYERS, type HazardLayerConfig } from "@/lib/pmtiles/downloadLayer";
import { useOfflinePMTilesLayer } from "@/hooks/useOfflinePMTilesLayer";

/**
 * Hazard layers: download manager + map overlays.
 *
 * Usage inside an existing MapView (this component does NOT own a MapView):
 *
 *   <MapLibreRN.MapView ...>
 *     <HazardLayerOverlay layerId="flood_100yr" />
 *   </MapLibreRN.MapView>
 *
 * and render <HazardLayerToggle /> anywhere outside the map to let users
 * download/remove layers. A layer only draws once its archive is downloaded.
 */

interface HazardLayerOverlayProps {
  layerId: string;
  /** Override default semi-transparent hazard coloring. */
  colors?: Partial<HazardColorSet>;
}

export function HazardLayerOverlay({ layerId, colors }: HazardLayerOverlayProps) {
  const { status, sourceUrl } = useOfflinePMTilesLayer(layerId);
  const config = HAZARD_LAYERS.find((layer) => layer.id === layerId);

  if (!config || status !== "ready" || !sourceUrl) return null;

  const palette = { ...HAZARD_COLORS[config.hazardType], ...colors };
  const sourceId = `hazard-source-${config.id}`;

  return (
    <VectorSource id={sourceId} url={sourceUrl}>
      {/* v11 API: one Layer component, props follow the MapLibre style spec.
          Nested layers inherit `source` from the enclosing VectorSource. */}
      <Layer
        id={`${sourceId}-fill`}
        type="fill"
        source-layer={config.sourceLayerId}
        paint={{ "fill-color": palette.fill, "fill-opacity": palette.opacity }}
      />
      <Layer
        id={`${sourceId}-outline`}
        type="line"
        source-layer={config.sourceLayerId}
        paint={{ "line-color": palette.stroke, "line-width": 1 }}
      />
    </VectorSource>
  );;
}

/** Convenience: every downloaded layer, ready to spread inside a MapView. */
export function AllHazardOverlays() {
  return (
    <>
      {HAZARD_LAYERS.map((layer) => (
        <HazardLayerOverlay key={layer.id} layerId={layer.id} />
      ))}
    </>
  );
}

function ToggleRow({ config }: { config: HazardLayerConfig }) {
  const { status, progress, download, remove } = useOfflinePMTilesLayer(config.id);

  return (
    <View style={styles.row}>
      <Ionicons
        name="alert-circle"
        size={20}
        color={HAZARD_COLORS[config.hazardType].stroke}
      />
      <View style={styles.info}>
        <Text style={styles.label}>{config.label}</Text>
        <Text style={styles.meta}>
          ~{config.approxSizeMB} MB ·{" "}
          {status === "downloading" ? `${progress}%` : status.replace("-", " ")}
        </Text>
        {status === "downloading" ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(progress, 4)}%` }]} />
          </View>
        ) : null}
        {status === "error" ? (
          <Text style={styles.error}>Download failed — check connection and retry.</Text>
        ) : null}
      </View>
      {status === "ready" ? (
        <TouchableOpacity style={[styles.button, styles.removeButton]} onPress={remove}>
          <Text style={styles.buttonText}>Remove</Text>
        </TouchableOpacity>
      ) : status !== "downloading" ? (
        <TouchableOpacity style={styles.button} onPress={download}>
          <Text style={styles.buttonText}>{status === "error" ? "Retry" : "Download"}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function HazardLayerToggle() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Hazard maps</Text>
      {HAZARD_LAYERS.map((layer) => (
        <ToggleRow key={layer.id} config={layer} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  heading: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  info: { flex: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  error: { fontSize: 11, color: "#DC2626", marginTop: 2 },
  track: {
    height: 4,
    marginTop: 6,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: "#208AEF" },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#208AEF",
  },
  removeButton: { backgroundColor: "#EF4444" },
  buttonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
});
