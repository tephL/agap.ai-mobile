import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  Map as MapLibreMap,
  Camera,
  NativeUserLocation,
  GeoJSONSource,
  Layer,
} from "@maplibre/maplibre-react-native";
import colors from "@/constants/colors";
import { relocateTeam } from "@/services/teamService";
import useLiveLocation from "@/hooks/useLiveLocation";

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2];
const PH_CENTER = [121.774, 12.8797];
const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`;

const USER_ZOOM = 15;
const USER_FLY_DURATION_MS = 1000;

export default function RelocateTeamScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const teamId = Number(params.teamId);
  const teamName = params.teamName ?? "Team";

  const { locationGranted, getCachedCoords, resolveCoords } = useLiveLocation();

  const [location, setLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const coords = getCachedCoords() ?? (await resolveCoords());
      if (cancelled || !coords || !mapReady) return;
      cameraRef.current?.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: USER_ZOOM,
        duration: USER_FLY_DURATION_MS,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [getCachedCoords, resolveCoords, mapReady]);

  const handleRecenterPress = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const coords = await resolveCoords();
      if (!coords) return;
      cameraRef.current?.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: USER_ZOOM,
        duration: USER_FLY_DURATION_MS,
      });
    } finally {
      setLocating(false);
    }
  };

  const pinGeojson = useMemo(
    () => ({
      type: "FeatureCollection",
      features:
        location != null
          ? [
              {
                type: "Feature",
                id: "relocate-pin",
                geometry: {
                  type: "Point",
                  coordinates: [location.longitude, location.latitude],
                },
              },
            ]
          : [],
    }),
    [location]
  );

  const handleMapPress = (event) => {
    const [longitude, latitude] = event.nativeEvent.lngLat ?? [];
    if (
      typeof longitude !== "number" ||
      typeof latitude !== "number" ||
      Number.isNaN(longitude) ||
      Number.isNaN(latitude)
    ) {
      return;
    }
    setLocation({ latitude, longitude });
  };

  const handleConfirm = async () => {
    if (submitting || !location) return;
    setSubmitting(true);
    try {
      await relocateTeam(teamId, location.latitude, location.longitude);
      Alert.alert("Success", `${teamName} has been relocated.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to relocate team"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.pageLabel}>Relocate Team</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        <View style={styles.mapSection}>
          <Text style={styles.fieldHint}>
            Tap the map to set the new location for {teamName}.
          </Text>
          <View style={styles.mapWrap}>
            <MapLibreMap
              style={StyleSheet.absoluteFill}
              mapStyle={MAP_STYLE_URL}
              logoEnabled={false}
              attributionEnabled={false}
              compassEnabled={true}
              compassViewPosition={3}
              onPress={handleMapPress}
              onDidFinishLoadingMap={() => setMapReady(true)}
            >
              <Camera
                ref={cameraRef}
                defaultSettings={{
                  centerCoordinate: PH_CENTER,
                  zoomLevel: 6,
                }}
                maxBounds={PH_BOUNDS}
                minZoom={6}
                maxZoom={20}
                trackUserLocation={locationGranted ? "default" : undefined}
              />
              {mapReady ? (
                <GeoJSONSource id="relocateLocationSource" data={pinGeojson}>
                  <Layer
                    type="circle"
                    id="relocateLocationHalo"
                    paint={{
                      "circle-color": "#f97316",
                      "circle-opacity": 0.15,
                      "circle-radius": 18,
                    }}
                  />
                  <Layer
                    type="circle"
                    id="relocateLocationPin"
                    paint={{
                      "circle-color": "#f97316",
                      "circle-radius": 8,
                      "circle-stroke-width": 2.5,
                      "circle-stroke-color": colors.white,
                    }}
                  />
                </GeoJSONSource>
              ) : null}
              {locationGranted ? (
                <NativeUserLocation androidRenderMode="gps" />
              ) : null}
            </MapLibreMap>

            <TouchableOpacity
              style={styles.locateButton}
              activeOpacity={0.7}
              onPress={handleRecenterPress}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#f97316" />
              ) : (
                <Ionicons name="locate" size={22} color="#f97316" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.mapFooter}>
            <View style={styles.mapFooterInfo}>
              {location ? (
                <>
                  <MaterialIcons name="place" size={14} color="#f97316" />
                  <Text style={styles.coordsText} numberOfLines={1}>
                    {`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
                  </Text>
                </>
              ) : (
                <Text style={styles.noLocationText}>
                  Tap the map to pick a new location
                </Text>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.85}
                onPress={() => router.back()}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!location || submitting) && styles.buttonBusy,
                ]}
                activeOpacity={0.85}
                onPress={handleConfirm}
                disabled={!location || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <MaterialIcons name="check" size={18} color={colors.white} />
                    <Text style={styles.confirmButtonText}>Confirm Relocation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  backButtonSpacer: {
    width: 36,
  },
  pageLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  mapSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 6,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  mapWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  locateButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  mapFooter: {
    gap: 10,
  },
  mapFooterInfo: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 18,
  },
  coordsText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 4,
    flexShrink: 1,
  },
  noLocationText: {
    fontSize: 12,
    color: colors.muted,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: "#f97316",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonBusy: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
