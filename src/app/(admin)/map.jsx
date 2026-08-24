import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from "react";
import { Map, Camera, NativeUserLocation, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';

// adjust this import to wherever fetchClustersWithinLocation actually lives
import { fetchClustersWithinLocation } from '../../services/dispatcher/clusterServ.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2];
const PH_CENTER = [121.7740, 12.8797];
const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`;

const LOCATE_ZOOM = 15;
const LOCATE_FLY_DURATION_MS = 1000;
const CLUSTERS_FETCH_INTERVAL_MS = 1000 * 60; // 1 min

const CLUSTER_PRIORITY_COLOR_EXPR = [
  'match',
  ['get', 'priority'],
  'high', '#ef4444',
  'medium', '#eab308',
  'low', '#22c55e',
  '#a9a9a9', // fallback for unknown priority
];

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

  // cluster markers state
  const [clusters, setClusters] = useState([]);

  // map lifecycle state
  const [mapReady, setMapReady] = useState(false);
  const cameraRef = useRef(null);

  // ---- permissions -----------------------------------------------------
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === "granted");
      if (status !== "granted") console.log('permission denied');
    })();
  }, []);

  // ---- clusters fetch loop -----------------------------------------------
  const refreshClusters = useCallback(async () => {
    try {
      const { data } = await fetchClustersWithinLocation();
      setClusters(data ?? []);
    } catch (e) {
      console.log('failed to fetch clusters', e);
    }
  }, []);

  useEffect(() => {
    refreshClusters();
    const interval = setInterval(refreshClusters, CLUSTERS_FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshClusters]);

  // ---- derived geojson for cluster markers --------------------------------
  const clustersGeojson = {
    type: 'FeatureCollection',
    features: clusters
      .filter(
        (c) =>
          typeof c.latitude === 'number' &&
          typeof c.longitude === 'number' &&
          !Number.isNaN(c.latitude) &&
          !Number.isNaN(c.longitude)
      )
      .map((cluster, index) => ({
        type: 'Feature',
        id: `cluster-${cluster.city}-${index}`,
        geometry: {
          type: 'Point',
          coordinates: [cluster.longitude, cluster.latitude],
        },
        properties: {
          city: cluster.city,
          priority: cluster.priority,
          status: cluster.status,
          report_count: cluster.report_count,
          people_affected: cluster.people_affected,
          ai_summary: cluster.ai_summary,
          action_plan: cluster.action_plan,
        },
      })),
  };

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

        {mapReady && (
          <GeoJSONSource id="clustersSource" data={clustersGeojson}>
            <Layer
              type="circle"
              id="clustersLayer"
              paint={{
                'circle-color': CLUSTER_PRIORITY_COLOR_EXPR,
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  5, 4,
                  10, 8,
                  16, 14,
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.85,
              }}
            />
          </GeoJSONSource>
        )}

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
