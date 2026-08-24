import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from "react";
import { Map, Camera, NativeUserLocation } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2];
const PH_CENTER = [121.7740, 12.8797];
const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`;

const LOCATE_ZOOM = 15;
const LOCATE_FLY_DURATION_MS = 1000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Index() {
  // location / permissions state
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState({
    latitude: null,
    longitude: null,
  });
  const [locating, setLocating] = useState(false);

  const cameraRef = useRef(null);

  // ---- permissions -----------------------------------------------------
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === "granted");
      if (status !== "granted") console.log('permission denied');
    })();
  }, []);

  // ---- handlers -----------------------------------------------------------
  const handleLocatePress = async () => {
    if (locating) return;
    setLocating(true);
    try {
      let lat = userLocation.latitude;
      let lng = userLocation.longitude;

      if (lat == null || lng == null) {
        const locationData = await Location.getCurrentPositionAsync();
        lat = locationData.coords.latitude;
        lng = locationData.coords.longitude;
        setUserLocation({ latitude: lat, longitude: lng });
      }

      cameraRef.current?.flyTo({
        center: [lng, lat],
        zoom: LOCATE_ZOOM,
        duration: LOCATE_FLY_DURATION_MS,
      });
    } catch (e) {
      console.log('Failed to locate user', e);
    } finally {
      setLocating(false);
    }
  };

  // ---------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={true}
        compassViewPosition={3}
        rotateEnabled={true}
        pitchEnabled={true}
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

        {locationGranted && (
          <NativeUserLocation androidRenderMode="gps" />
        )}
      </Map>

      <TouchableOpacity
        style={styles.locateButton}
        onPress={handleLocatePress}
        activeOpacity={0.7}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color="#4287f5" />
        ) : (
          <Ionicons name="locate" size={24} color="#4287f5" />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: { flex: 1 },
  locateButton: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
