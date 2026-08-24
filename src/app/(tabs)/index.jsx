import { View, StyleSheet, Text, Dimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Camera, NativeUserLocation, UserLocation, GeoJSONSource, OfflineManager, Layer } from '@maplibre/maplibre-react-native';
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

// services
import { uploadUserLocation } from '../../services/usersService.js';
import { fetchFamilyLocation, getFamilyPositions, setFamilyPositions } from "../../services/familyLocation.js";
import { getMyFamily } from '../../services/familyService.js';
import { getDamStatuses } from '../../services/hazardService.js';
import { haversineMeters } from '../../utils/haversine.js';

// components
import LiveNotificationDropdown from "@/components/notifications/LiveNotificationDropdown";
import { PersonCard } from '@/components/PersonCard';
import HazardSheet from '@/components/hazards/HazardSheet';
import LayersControl from '@/components/hazards/LayersControl';
import { HAZARD_LAYERS } from '@/components/hazards/layerRegistry';

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
const SELECTED_PERSON_FLY_ZOOM = 15;
const SELECTED_PERSON_FLY_DURATION_MS = 1000;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PERSON_CARD_HEIGHT_ESTIMATE = SCREEN_HEIGHT * 0.4;
const DAM_SHEET_COLLAPSED_ESTIMATE = SCREEN_HEIGHT * 0.45;
const DAM_MARKER_COLOR = '#4287f5';
const DAM_HALO_RADIUS_M = 1500;
const HALO_SEGMENTS = 64;

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

// Approximates a ground-radius circle as a closed polygon ring in [lng, lat]
// pairs — MapLibre can't dash circle strokes, so halos are real geometry.
function circleRingCoordinates(centerLat, centerLng, radiusMeters, segments = HALO_SEGMENTS) {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));
  const ring = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    ring.push([
      centerLng + lngDelta * Math.cos(angle),
      centerLat + latDelta * Math.sin(angle),
    ]);
  }
  ring.push(ring[0]);
  return ring;
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
  const { selectedUserId } = useLocalSearchParams();

  // location / permissions state
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLocation, setUserLocation] = useState({
    latitude: null,
    longitude: null,
  });
  const [locating, setLocating] = useState(false);

  // family markers state
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);

  // hazards state
  const [dams, setDams] = useState([]);
  const [selectedDam, setSelectedDam] = useState(null);
  const [hazardsOpen, setHazardsOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState({ dams: true });

  // map lifecycle state
  const [mapReady, setMapReady] = useState(false);
  const hasRunOnce = useRef(false);
  const cameraRef = useRef(null);

  // tracks which selectedUserId param value we've already acted on, so a
  // background family refetch doesn't keep re-flying/re-opening the card
  const handledSelectedUserIdRef = useRef(null);

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
  const refreshFamilyLocations = useCallback(async () => {
    try {
      const { data } = await fetchFamilyLocation();
      for (const member of data) {
        const { last_seen, longitude, latitude, user_id } = member;
        const timestampMs = new Date(last_seen).getTime();
        await setFamilyPositions({ latitude, longitude, millisec: timestampMs, user_id });
      }
    } catch (e) {
      console.log('fetch failed, falling back to local db', e);
    }

    try {
      const locations = await getFamilyPositions();
      setFamilyMembers(locations);
    } catch (e) {
      console.log('failed to read local db', e);
    }
  }, []);

  // ---- dam statuses (fetched on focus; PAGASA updates ~twice daily) -------
  const refreshDams = useCallback(async () => {
    try {
      const data = await getDamStatuses();
      setDams(Array.isArray(data?.dams) ? data.dams : []);
    } catch (e) {
      console.log('failed to load dams', e);
    }
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

      refreshFamilyLocations();
      sendLocation();
      refreshDams();
      const familyFetchInterval = setInterval(refreshFamilyLocations, FAMILY_FETCH_INTERVAL_MS);
      const sendInterval = setInterval(sendLocation, SEND_LOCATION_INTERVAL_MS);
      console.log(familyMembers);

      return () => {
        console.log('went out');
        cancelled = true;
        clearInterval(sendInterval);
        clearInterval(familyFetchInterval);
      }
    }, [refreshFamilyLocations, refreshDams])
  );

  // ---- honor a selectedUserId passed in from FamilyScreen -----------------
  useEffect(() => {
  if (!selectedUserId) return;
  if (handledSelectedUserIdRef.current === selectedUserId) return;
  if (familyMembers.length === 0) return;

  const match = familyMembers.find(
    (m) => String(m.user_id) === String(selectedUserId)
  );
  if (!match) return;

  const hasValidCoords =
    typeof match.latitude === 'number' &&
    typeof match.longitude === 'number' &&
    !Number.isNaN(match.latitude) &&
    !Number.isNaN(match.longitude);

  handledSelectedUserIdRef.current = selectedUserId;

  setSelectedPerson({
      user_id: match.user_id,
      first_name: match.first_name,
      last_name: match.last_name,
      relation: match.relation,
      phone_number: match.phone_number,
      age: match.age,
      last_seen: match.last_seen,
    });

    if (hasValidCoords) {
      cameraRef.current?.flyTo({
        center: [match.longitude, match.latitude],
        zoom: SELECTED_PERSON_FLY_ZOOM,
        duration: SELECTED_PERSON_FLY_DURATION_MS,
        padding: {
          top: 0,
          bottom: PERSON_CARD_HEIGHT_ESTIMATE,
          left: 0,
          right: 0,
        },
      });
    } else {
      console.log(`No location yet for user ${match.user_id}, skipping flyTo`);
    }
  }, [selectedUserId, familyMembers]);

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

  // ---- derived geojson for dam markers + nearest-dam highlight -----------
  const nearestDamSlug = useMemo(() => {
    if (userLocation.latitude == null || userLocation.longitude == null) return null;
    const origin = { lat: userLocation.latitude, lng: userLocation.longitude };
    let best = null;
    let bestDistance = null;
    for (const dam of dams) {
      if (!dam.coordinates) continue;
      const distance = haversineMeters(origin, dam.coordinates);
      if (distance == null) continue;
      if (bestDistance == null || distance < bestDistance) {
        bestDistance = distance;
        best = dam.slug;
      }
    }
    return best;
  }, [dams, userLocation.latitude, userLocation.longitude]);

  const damsGeojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: dams
      .filter((dam) => dam.coordinates)
      .map((dam) => ({
        type: 'Feature',
        id: `dam-${dam.slug}`,
        geometry: {
          type: 'Point',
          coordinates: [dam.coordinates.lng, dam.coordinates.lat],
        },
        properties: {
          slug: dam.slug,
          name: dam.name,
          reservoirWaterLevel: dam.reservoirWaterLevel,
          deviationFromNHWL: dam.deviationFromNHWL,
        },
      })),
  }), [dams]);

  // Dashed warning-zone halos around each dam; the nearest dam's ring is
  // emphasized via the isNearest property in the layer paint expressions.
  const damHalosGeojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: dams
      .filter((dam) => dam.coordinates)
      .map((dam) => ({
        type: 'Feature',
        id: `dam-halo-${dam.slug}`,
        geometry: {
          type: 'Polygon',
          coordinates: [
            circleRingCoordinates(dam.coordinates.lat, dam.coordinates.lng, DAM_HALO_RADIUS_M),
          ],
        },
        properties: {
          slug: dam.slug,
          isNearest: nearestDamSlug === dam.slug,
        },
      })),
  }), [dams, nearestDamSlug]);

  // Broken line from the user to the closest dam.
  const nearestRouteGeojson = useMemo(() => {
    if (
      nearestDamSlug == null ||
      userLocation.latitude == null ||
      userLocation.longitude == null
    ) {
      return { type: 'FeatureCollection', features: [] };
    }
    const target = dams.find((dam) => dam.slug === nearestDamSlug);
    if (!target?.coordinates) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        id: 'nearest-dam-route',
        geometry: {
          type: 'LineString',
          coordinates: [
            [userLocation.longitude, userLocation.latitude],
            [target.coordinates.lng, target.coordinates.lat],
          ],
        },
        properties: {},
      }],
    };
  }, [dams, nearestDamSlug, userLocation.latitude, userLocation.longitude]);

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
    const feature = event?.nativeEvent?.features?.[0];
    if (!feature) return;

    setSelectedPerson(feature.properties);

    const [lng, lat] = feature.geometry?.coordinates ?? [];
    const hasValidCoords = typeof lng === 'number' && typeof lat === 'number';

    if (hasValidCoords) {
      cameraRef.current?.flyTo({
        center: [lng, lat],
        zoom: SELECTED_PERSON_FLY_ZOOM,
        duration: SELECTED_PERSON_FLY_DURATION_MS,
        padding: {
          top: 0,
          bottom: PERSON_CARD_HEIGHT_ESTIMATE,
          left: 0,
          right: 0,
        },
      });
    }
  };

  const handleClosePersonCard = () => {
    setSelectedPerson(null);
  };

  // ---- hazards handlers ----------------------------------------------------
  const flyToDam = (lng, lat) => {
    cameraRef.current?.flyTo({
      center: [lng, lat],
      zoom: SELECTED_PERSON_FLY_ZOOM,
      duration: SELECTED_PERSON_FLY_DURATION_MS,
      padding: {
        top: 0,
        bottom: DAM_SHEET_COLLAPSED_ESTIMATE,
        left: 0,
        right: 0,
      },
    });
  };

  const handleDamPress = (event) => {
    const feature = event?.nativeEvent?.features?.[0];
    if (!feature?.properties?.slug) return;

    // Keep the drawer's list in sync with the latest backend data so it can
    // never render a stale subset after re-opening from a marker tap.
    refreshDams();

    setSelectedDam(feature.properties);
    setSheetExpanded(false);

    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (typeof lng === 'number' && typeof lat === 'number') {
      flyToDam(lng, lat);
    }
  };

  const handleSelectDamFromList = (dam) => {
    if (!dam?.slug) return;
    setSelectedDam({
      slug: dam.slug,
      name: dam.name,
      reservoirWaterLevel: dam.reservoirWaterLevel,
      deviationFromNHWL: dam.deviationFromNHWL,
    });
    setSheetExpanded(false);

    if (dam.coordinates) {
      flyToDam(dam.coordinates.lng, dam.coordinates.lat);
    }
  };

  const handleHazardsPress = () => {
    refreshDams();
    setSelectedDam(null);
    setHazardsOpen(true);
    setSheetExpanded(true);
  };

  const handleToggleLayer = useCallback((key) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleCloseHazards = () => {
    setSelectedDam(null);
    setHazardsOpen(false);
  };

  const handleCallPerson = (phone_number, user_id) => {
    // TODO: implement (e.g. Linking.openURL(`tel:${phone_number}`))
  };

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
        zoom: SELECTED_PERSON_FLY_ZOOM,
        duration: SELECTED_PERSON_FLY_DURATION_MS,
      });

      await refreshFamilyLocations();
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
          <>
            <GeoJSONSource
              id="userLocationSource"
              data={familyGeojson}
              onPress={handleUserLocationPress}
            >
              <Layer
                type="circle"
                id="userLocationLayer"
                paint={{
                  'circle-color': staleColorExpr,
                  'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    5, 2,
                    10, 5,
                    16, 8,
                  ],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                  'circle-opacity': 0.9,
                }}
              />
            </GeoJSONSource>

            <GeoJSONSource id="pulseSource" data={familyGeojson}>
              <Layer
                type="circle"
                id="pulseLayer"
                paint={{
                  'circle-color': staleColorExpr,
                  'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    5, 2 + pulse * 20,
                    10, 5 + pulse * 20,
                    16, 8 + pulse * 20,
                  ],
                  'circle-opacity': Math.max(0.5 - pulse, 0),
                  'circle-stroke-width': 0,
                }}
              />
            </GeoJSONSource>

            {visibleLayers.dams && (
              <>
                <GeoJSONSource id="damHalosSource" data={damHalosGeojson}>
                  <Layer
                    type="fill"
                    id="damHaloFillLayer"
                    paint={{
                      'fill-color': DAM_MARKER_COLOR,
                      'fill-opacity': [
                        'case', ['get', 'isNearest'], 0.12, 0.05,
                      ],
                    }}
                  />
                  <Layer
                    type="line"
                    id="damHaloBorderLayer"
                    paint={{
                      'line-color': DAM_MARKER_COLOR,
                      'line-width': ['case', ['get', 'isNearest'], 3.5, 2],
                      'line-opacity': ['case', ['get', 'isNearest'], 1, 0.75],
                      'line-dasharray': [2, 1.5],
                    }}
                  />
                </GeoJSONSource>

                <GeoJSONSource id="nearestRouteSource" data={nearestRouteGeojson}>
                  <Layer
                    type="line"
                    id="nearestRouteLayer"
                    paint={{
                      'line-color': DAM_MARKER_COLOR,
                      'line-width': 1.5,
                      'line-opacity': 0.6,
                      'line-dasharray': [2, 1.5],
                    }}
                  />
                </GeoJSONSource>

                <GeoJSONSource id="damsSource" data={damsGeojson} onPress={handleDamPress}>
                  <Layer
                    type="circle"
                    id="damsLayer"
                    paint={{
                      'circle-color': DAM_MARKER_COLOR,
                      'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        5, 2.5,
                        10, 4,
                        16, 5,
                      ],
                      'circle-stroke-width': 2,
                      'circle-stroke-color': '#ffffff',
                      'circle-opacity': 0.95,
                    }}
                  />
                </GeoJSONSource>
              </>
            )}
          </>
        )}

        {locationGranted && (
          <NativeUserLocation
            androidRenderMode="gps"
          />
        )}
      </Map>

      <LayersControl
        layers={HAZARD_LAYERS}
        visibleLayers={visibleLayers}
        onToggle={handleToggleLayer}
      />

      <TouchableOpacity
        style={[
          styles.hazardsButton,
          { left: 16, bottom: 34 },
        ]}
        onPress={handleHazardsPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Open hazards drawer"
      >
        <Ionicons name="warning-outline" size={18} color="#E32F31" />
        <Text style={styles.hazardsButtonText}>Hazards</Text>
      </TouchableOpacity>

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

      {selectedPerson && (
        <PersonCard
          age={selectedPerson.age}
          first_name={selectedPerson.first_name}
          last_name={selectedPerson.last_name}
          phone_number={selectedPerson.phone_number}
          relation={selectedPerson.relation}
          user_id={selectedPerson.user_id}
          last_seen={selectedPerson.last_seen}
          staleYellowThresholdMs={STALE_YELLOW_THRESHOLD_MS}
          staleGrayThresholdMs={STALE_GRAY_THRESHOLD_MS}
          onClose={handleClosePersonCard}
          onCall={handleCallPerson}
        />
      )}

      {(selectedDam || hazardsOpen) && (
        <HazardSheet
          key={selectedDam?.slug ?? 'drawer'}
          dams={dams}
          userLocation={userLocation}
          dam={selectedDam}
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          onSelectDam={handleSelectDamFromList}
          onClose={handleCloseHazards}
        />
      )}
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
  }, 
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
  hazardsButton: {
    position: 'absolute',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  hazardsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E32F31',
  },
  locateButtonIcon: {
    fontSize: 22,
    color: '#4287f5',
  },
});
