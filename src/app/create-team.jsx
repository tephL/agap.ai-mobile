import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Map as MapLibreMap,
  Camera,
  GeoJSONSource,
  Layer,
} from "@maplibre/maplibre-react-native";
import colors from "@/constants/colors";
import FormInput from "@/components/ui/FormInput";
import { createTeam } from "@/services/teamService";

const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2];
const PH_CENTER = [121.774, 12.8797];
const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`;

const PHONE_RE = /^[0-9+\-\s()]{7,}$/;

export default function CreateTeamScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef(null);

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
    if (key === "contact") setContact(value);
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
    if (!contact.trim()) {
      next.contact = "Contact number is required.";
    } else if (!PHONE_RE.test(contact.trim())) {
      next.contact = "Enter a valid contact number.";
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
        contact_number: contact.trim(),
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

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <FormInput
              label="Name"
              value={name}
              onChangeText={(v) => updateField("name", v)}
              error={errors.name}
              placeholder="e.g. Rescue Alpha"
            />
            <FormInput
              label="Contact Number"
              value={contact}
              onChangeText={(v) => updateField("contact", v)}
              keyboardType="phone-pad"
              error={errors.contact}
              placeholder="09XXXXXXXXX"
            />

            <View style={styles.mapField}>
              <Text style={styles.fieldLabel}>Team Location</Text>
              <Text style={styles.fieldHint}>
                Tap the map to drop the team&rsquo;s base pin.
              </Text>
              <View style={styles.mapWrap}>
                <MapLibreMap
                  style={styles.map}
                  mapStyle={MAP_STYLE_URL}
                  logoEnabled={false}
                  attributionEnabled={false}
                  compassEnabled={false}
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
              </View>
              {location ? (
                <View style={styles.coordsRow}>
                  <MaterialIcons
                    name="place"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.coordsText}>
                    {`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
                  </Text>
                </View>
              ) : null}
              {errors.location ? (
                <Text style={styles.fieldError}>{errors.location}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
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
        </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  form: {
    gap: 18,
    marginTop: 8,
  },
  mapField: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  mapWrap: {
    height: 240,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  map: {
    flex: 1,
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  coordsText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  fieldError: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
