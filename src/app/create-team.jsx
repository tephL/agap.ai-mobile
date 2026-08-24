import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  Map as MapLibreMap,
  Camera,
  GeoJSONSource,
  Layer,
} from "@maplibre/maplibre-react-native";
import colors from "@/constants/colors";
import FormInput from "@/components/ui/FormInput";
import { createTeam } from "@/services/teamService";
import {
  limitPhoneInput,
  normalizePhoneForLogin,
} from "@/services/authService";
import useLiveLocation from "@/hooks/useLiveLocation";

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2];
const PH_CENTER = [121.774, 12.8797];
const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`;

const USER_ZOOM = 15;
const USER_FLY_DURATION_MS = 1000;

export default function CreateTeamScreen() {
  const router = useRouter();
  const { getCachedCoords, resolveCoords } = useLiveLocation();

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const coords = getCachedCoords() ?? (await resolveCoords());
      if (cancelled || !coords || !mapReady) return;
      cameraRef.current?.flyTo({
        centerCoordinate: [coords.longitude, coords.latitude],
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
        centerCoordinate: [coords.longitude, coords.latitude],
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
                id: "team-base",
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

  const updateField = (key, value) => {
    if (key === "name") setName(value);
    if (key === "contact") setContact(limitPhoneInput(value));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

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
    setErrors((prev) => {
      if (!prev.location) return prev;
      const next = { ...prev };
      delete next.location;
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Team name is required.";
    const normalizedContact = normalizePhoneForLogin(contact);
    if (!normalizedContact) {
      next.contact = "Contact number is required.";
    } else if (normalizedContact.length !== 10) {
      next.contact = "Enter a valid mobile number (e.g., 917 123 4567)";
    }
    if (!location) next.location = "Tap the map to set the team location.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      await createTeam({
        name: name.trim(),
        contact_number: normalizePhoneForLogin(contact),
        latitude: location.latitude,
        longitude: location.longitude,
      });
      Alert.alert("Success", "Team created!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to create team"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.pageLabel}>Create Team</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        <View style={styles.fieldsBlock}>
          <FormInput
            label="Name"
            value={name}
            onChangeText={(v) => updateField("name", v)}
            error={errors.name}
            placeholder="e.g. Rescue Alpha"
            returnKeyType="next"
          />
          <FormInput
            label="Contact Number"
            prefix={{
              icon: (
                <MaterialIcons
                  name="phone"
                  color={colors.placeholder}
                  size={20}
                />
              ),
              text: "+63",
            }}
            placeholder="917 123 4567"
            keyboardType="phone-pad"
            maxLength={10}
            value={contact}
            onChangeText={(v) => updateField("contact", v)}
            autoComplete="tel"
            error={errors.contact}
          />
        </View>

        <View style={styles.mapField}>
          <Text style={styles.fieldHint}>
            Tap the map to drop the team&rsquo;s base pin.
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
              />
              {mapReady ? (
                <GeoJSONSource id="teamLocationSource" data={pinGeojson}>
                  <Layer
                    type="circle"
                    id="teamLocationHalo"
                    paint={{
                      "circle-color": colors.primary,
                      "circle-opacity": 0.15,
                      "circle-radius": 18,
                    }}
                  />
                  <Layer
                    type="circle"
                    id="teamLocationPin"
                    paint={{
                      "circle-color": colors.primary,
                      "circle-radius": 8,
                      "circle-stroke-width": 2.5,
                      "circle-stroke-color": colors.white,
                    }}
                  />
                </GeoJSONSource>
              ) : null}
            </MapLibreMap>

            <TouchableOpacity
              style={styles.locateButton}
              activeOpacity={0.7}
              onPress={handleRecenterPress}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="locate" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.mapFooter}>
            <View style={styles.mapFooterInfo}>
              {location ? (
                <>
                  <MaterialIcons name="place" size={14} color={colors.primary} />
                  <Text style={styles.coordsText} numberOfLines={1}>
                    {`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
                  </Text>
                </>
              ) : null}
              {errors.location ? (
                <Text style={styles.fieldError}>{errors.location}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonBusy]}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialIcons name="check" size={18} color={colors.white} />
                  <Text style={styles.submitText}>Create Team</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  fieldsBlock: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  mapField: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
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
  fieldError: {
    fontSize: 12,
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
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
  submitText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
