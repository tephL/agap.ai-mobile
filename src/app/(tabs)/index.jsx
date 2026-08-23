import { View, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from "react";
import { Map, Camera, UserLocation, GeoJSONSource, OfflineManager, Layer, Images } from '@maplibre/maplibre-react-native';
import { useFocusEffect } from "expo-router";

// services
import { uploadUserLocation } from '../../services/usersService.js';
import { fetchFamilyLocation, getFamilyPositions, setFamilyPositions } from "../../services/familyLocation.js";
import { getMyFamily } from '../../services/familyService.js';

// components
import LiveNotificationDropdown from "@/components/notifications/LiveNotificationDropdown";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
const PH_BOUNDS = [116.9, 4.5, 126.6, 21.2];
const PH_CENTER = [121.7740, 12.8797];
const MAP_STYLE_URL = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_API_KEY}`;

const FAMILY_FETCH_INTERVAL_MS = 1000 * 60;      // 1 min
const SEND_LOCATION_INTERVAL_MS = 1000 * 30;     // 30 sec
const PULSE_DURATION_MS = 3500;                  // ms per pulse cycle
const NOW_TICK_INTERVAL_MS = 5000;               // staleness re-check
const STALE_YELLOW_THRESHOLD_MS = 5 * 60 * 1000;  // 5 min
const STALE_GRAY_THRESHOLD_MS = 30 * 60 * 1000;   // 30 min
const OFFLINE_PACK_NAME = 'current-area-offline';
const OFFLINE_PACK_RADIUS_KM = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Builds a [west, south, east, north] box around a center point.
// radiusKm controls how far out from the user's location to cache tiles.
function boundsAroundPoint(latitude, longitude, radiusKm = 5) {
  const latDelta = radiusKm / 111; // ~111km per degree latitude
  const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));
  return [
    longitude - lngDelta, // west
    latitude - latDelta,  // south
    longitude + lngDelta, // east
    latitude + latDelta,  // north
  ];
}

async function downloadOfflineMapForCurrentArea(userLocation) {
  if (userLocation.latitude == null || userLocation.longitude == null) {
    console.log('User location not available yet');
    return;
  }

  // Skip if we already have a pack for this area from a previous session.
  const existingPacks = await OfflineManager.getPacks();
  const alreadyDownloaded = existingPacks.some(
    (p) => p.metadata?.name === OFFLINE_PACK_NAME
  );
  if (alreadyDownloaded) {
    console.log('Offline pack already exists, skipping download');
    return;
  }

  const bounds = boundsAroundPoint(userLocation.latitude, userLocation.longitude, OFFLINE_PACK_RADIUS_KM);

  const progressListener = (pack, status) => {
    console.log(`${status.percentage}% complete`);
  };
  const errorListener = (pack, err) => {
    console.error('Offline pack error', err);
  };

  const pack = await OfflineManager.createPack(
    {
      mapStyle: MAP_STYLE_URL,
      minZoom: 10,
      maxZoom: 16,
      bounds,
      metadata: { name: OFFLINE_PACK_NAME },
    },
    progressListener,
    errorListener,
  );

  return pack;
}

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

  // family markers state
  const [familyMembers, setFamilyMembers] = useState([]);

  // map lifecycle state
  const [mapReady, setMapReady] = useState(false);
  const hasRunOnce = useRef(false);

  // pulsing "dih" effect state
  const [pulse, setPulse] = useState(0);

  // staleness re-check clock
  const [now, setNow] = useState(Date.now());

  // ---- permissions -----------------------------------------------------
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === "granted");
      if (status !== "granted") console.log('permission denied');
    })();
  }, []);

  // ---- location sending + family fetch loop (runs while screen focused) ---
  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!hasRunOnce.current) {
          hasRunOnce.current = true;
          await getMyFamily();
        }
      })();

      let cancelled = false;

      const sendLocation = async () => {
        if (cancelled) return;
        let offlineDownloadStarted = false;
        const locationData = await Location.getCurrentPositionAsync();
        const { coords: { latitude, longitude } } = locationData;

        setUserLocation({
          latitude: latitude,
          longitude: longitude,
        });

        if (!offlineDownloadStarted) {
          offlineDownloadStarted = true;
          downloadOfflineMapForCurrentArea({ latitude, longitude });
        }

        try {
          const logLocation = await uploadUserLocation({ latitude, longitude });
          console.log('sent location');
        } catch (e) {
          console.error(e.response?.data);
          console.error(e.response?.status);
          console.error(e.config?.data);
        }
      };

      async function fetchingFamilyLocations() {
        if (cancelled) return;
        try {
          const { data } = await fetchFamilyLocation();
          for (const member of data) {
            const { last_seen, longitude, latitude, user_id } = member;
            const timestampMs = new Date(last_seen).getTime();
            console.log(user_id, last_seen);
            await setFamilyPositions({ latitude, longitude, millisec: timestampMs, user_id });
          }
        } catch (e) {
          console.log('fetch failed, falling back to local db', e);
        }

        // Always read from local sqlite, whether the fetch above succeeded or not.
        try {
          const locations = await getFamilyPositions();
          setFamilyMembers(() => locations);
        } catch (e) {
          console.log('failed to read local db', e);
        }
      }

      sendLocation();
      fetchingFamilyLocations();
      const familyFetchInterval = setInterval(fetchingFamilyLocations, FAMILY_FETCH_INTERVAL_MS);
      const sendInterval = setInterval(sendLocation, SEND_LOCATION_INTERVAL_MS);
      console.log(familyMembers);

      return () => {
        console.log('went out');
        cancelled = true;
        clearInterval(sendInterval);
        clearInterval(familyFetchInterval);
      }
    }, [])
  );

  // ---- derived geojson for family markers -------------------------------
  const familyGeojson = {
    type: 'FeatureCollection',
    features: familyMembers.map((member) => ({
      type: 'Feature',
      id: `family-${member.user_id}`,
      geometry: {
        type: 'Point',
        coordinates: [member.longitude, member.latitude], // [lng, lat] order
      },
      properties: {
        user_id: member.user_id,
        first_name: member.first_name,
        last_name: member.last_name,
        relation: member.relation,
        phone_number: member.phone_number,
        age: member.age,
        last_seen: member.last_seen,
      },
    })),
  };

  // ---- pulsing "dih" effect ----------------------------------------------
  useEffect(() => {
    let raf;
    const start = Date.now();

    const tick = () => {
      const elapsed = (Date.now() - start) % PULSE_DURATION_MS;
      setPulse(elapsed / PULSE_DURATION_MS); // 0 to 1
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- color staleness ----------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), NOW_TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const ageMs = ['-', now, ['get', 'last_seen']];

  const staleColorExpr = [
    'case',
    ['<', ageMs, STALE_YELLOW_THRESHOLD_MS], '#22c55e',  // green: seen < 5 min ago
    ['<', ageMs, STALE_GRAY_THRESHOLD_MS], '#eab308',    // yellow: < 30 min ago
    '#a9a9a9',                                            // gray: older / stale
  ];

  // ---- handlers -----------------------------------------------------------
  const handleUserLocationPress = (event) => {
    console.log('clicker');
  };

  // ---------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.dropdownWrap} pointerEvents="box-none">
        <LiveNotificationDropdown />
      </SafeAreaView>

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
          defaultSettings={{
            centerCoordinate: PH_CENTER,
            zoomLevel: 6,
          }}
          bounds={PH_BOUNDS}
          maxBounds={PH_BOUNDS}
          minZoom={6}
          maxZoom={20}
          animationMode="flyTo"
          animationDuration={1200}
          trackUserLocation={locationGranted ? "default" : undefined}
        />

        {mapReady && (
          <>
            <GeoJSONSource
              id="userLocationSource"
              data={familyGeojson}
              onPress={handleUserLocationPress}
            >
              <Layer
                type="circle"
                id="userLocationLayer"
                layout={{
                  circleColor: staleColorExpr,
                  circleRadius: [
                    'interpolate', ['linear'], ['zoom'],
                    5, 2,
                    10, 5,
                    16, 8,
                  ],
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#ffffff',
                  circleOpacity: 0.9,
                  'icon-image': 'pin',
                  'icon-allow-overlap': true,
                  'icon-size': [
                    'interpolate', ['linear'], ['zoom'],
                    5, 0.3,
                    10, 0.6,
                    16, 1.0,
                  ],
                }}
              />
            </GeoJSONSource>

            <GeoJSONSource id="pulseSource" data={familyGeojson}>
              <Layer
                type="circle"
                id="pulseLayer"
                layout={{
                  circleColor: staleColorExpr,
                  circleRadius: [
                    'interpolate', ['linear'], ['zoom'],
                    5, 2 + pulse * 20,
                    10, 5 + pulse * 20,
                    16, 8 + pulse * 20,
                  ],
                  circleOpacity: 0.5 - pulse,
                  circleStrokeWidth: 0,
                }}
              />
            </GeoJSONSource>
          </>
        )}

        {locationGranted && (
          <UserLocation
            visible={true}
            animated={true}
            showsUserHeadingIndicator={true}
            renderMode="native"
          />
        )}
      </Map>
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
  dropdownWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  text: {
    color: "#f3eee3ff",
  },
  button: {
    textDecorationLine: 'underline',
    fontSize: 20,
    color: 'blue'
  },
  map: { flex: 1 },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4287f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3, // Android shadow
  }
});
