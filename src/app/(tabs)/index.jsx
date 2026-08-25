import { View, StyleSheet, Text, Dimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Camera, NativeUserLocation, UserLocation, GeoJSONSource, OfflineManager, Layer } from '@maplibre/maplibre-react-native';
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

// services
import { uploadUserLocation } from '../../services/usersService.js';
import { fetchFamilyLocation, getFamilyPositions, setFamilyPositions } from "../../services/familyLocation.js";
import { getMyFamily } from '../../services/familyService.js';
import { getDamStatuses } from '../../services/hazardService.js';
import { resolveDamSeverity, SEVERITY_LEVELS } from '@/components/hazards/damSeverity';
import { getInfluencingDams } from '@/components/hazards/damInfluence';
import { useHazardElevation } from '../../hooks/useHazardElevation';

// components
import LiveNotificationDropdown from "@/components/notifications/LiveNotificationDropdown";
import { PersonCard } from '@/components/PersonCard';
import { HazardLayerOverlay } from '@/components/HazardLayerToggle';
import HazardLayersPanel from '@/components/HazardLayersPanel';

// hazard layer selection prefs
import { useActiveHazardLayer } from '../../hooks/useActiveHazardLayer';

import useLiveLocation from '../../hooks/useLiveLocation.js';
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
// Zoomed out just enough that the full 1.5 km halo ring stays on-screen.
const DAM_FLY_ZOOM = 13.5;
const SELECTED_PERSON_FLY_DURATION_MS = 1000;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PERSON_CARD_HEIGHT_ESTIMATE = SCREEN_HEIGHT * 0.4;
const DAM_SHEET_COLLAPSED_ESTIMATE = SCREEN_HEIGHT * 0.45;
const DAM_MARKER_COLOR = '#4287f5';
const DAM_HALO_RADIUS_M = 1500;
const HALO_SEGMENTS = 64;
// Pulse cycle lengths per severity — the closer to spilling, the faster
// the marker ring throbs.
const DAM_PULSE_PERIODS = { normal: 3500, caution: 2000, danger: 1100 };
const ROUTE_FIT_PADDING = { top: 120, right: 80, bottom: 320, left: 80 };
// Stable empty array so prop identity stays consistent across renders.
const EMPTY_SLUGS = [];

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

  // location / permissions
  const { locationGranted, getCachedCoords, resolveCoords } = useLiveLocation();
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

  // guards the one-time auto-zoom so it runs only on the first location fix
  const hasAutoZoomedRef = useRef(false);

  // pulsing "dih" effect state
  const [pulse, setPulse] = useState(0);
  const [damPulse, setDamPulse] = useState({ normal: 0, caution: 0, danger: 0 });

  // hazard overlay selection (persisted, single-select) + layers sheet state
  const { activeId, select: selectHazardLayer } = useActiveHazardLayer();
  const [layersOpen, setLayersOpen] = useState(false);

  // staleness re-check clock
  const [now, setNow] = useState(Date.now());

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
        const coords = await resolveCoords();
        if (!coords) return;

        if (!offlineDownloadStarted) {
          offlineDownloadStarted = true;
          downloadOfflineMapForCurrentArea(coords);
        }

        try {
          await uploadUserLocation(coords);
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
    }, [refreshFamilyLocations, resolveCoords, refreshDams])
  );

  // ---- auto-zoom to the user once their location loads ---------------------
  // mirrors the GPS button: flies to the current position on the first fix
  useEffect(() => {
    if (!locationGranted || !mapReady || hasAutoZoomedRef.current) return;
    let cancelled = false;
    (async () => {
      const coords = await resolveCoords();
      if (cancelled || !coords || hasAutoZoomedRef.current) return;
      hasAutoZoomedRef.current = true;
      cameraRef.current?.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: SELECTED_PERSON_FLY_ZOOM,
        duration: SELECTED_PERSON_FLY_DURATION_MS,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [locationGranted, mapReady, resolveCoords]);

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

  // Ground elevation for the hydrology risk factor (graceful when unknown).
  const { elevation: userElevation } = useHazardElevation(
    userLocation.latitude,
    userLocation.longitude
  );

  // ---- derived geojson for dam markers + influencing-dam highlight -------
  // Dams whose downstream corridors actually reach the user (hydrology-
  // first; see data/hydrology.js), nearest first. All of them get the
  // emphasized ring, a dashed route line, and a tappable route.
  const influencingDams = useMemo(
    () => getInfluencingDams(dams, userLocation, { userElevation }),
    [dams, userLocation, userElevation]
  );

  const nearestDamSlug = influencingDams[0]?.dam.slug ?? null;

  const influencingBySlug = useMemo(() => {
    const bySlug = {};
    for (const entry of influencingDams) bySlug[entry.dam.slug] = entry;
    return bySlug;
  }, [influencingDams]);

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
          severity: resolveDamSeverity(dam).level,
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
          isInfluencing: influencingBySlug[dam.slug] != null,
          severity: resolveDamSeverity(dam).level,
        },
      })),
  }), [dams, influencingBySlug]);

  // Broken lines from the user to each influencing dam.
  const nearestRouteGeojson = useMemo(() => {
    if (
      influencingDams.length === 0 ||
      userLocation.latitude == null ||
      userLocation.longitude == null
    ) {
      return { type: 'FeatureCollection', features: [] };
    }
    return {
      type: 'FeatureCollection',
      features: influencingDams
        .filter(({ dam }) => dam.coordinates)
        .map(({ dam, distanceMeters }, index) => ({
          type: 'Feature',
          id: `dam-route-${dam.slug}`,
          geometry: {
            type: 'LineString',
            coordinates: [
              [userLocation.longitude, userLocation.latitude],
              [dam.coordinates.lng, dam.coordinates.lat],
            ],
          },
          properties: { slug: dam.slug, distanceMeters, index },
        })),
    };
  }, [influencingDams, userLocation.latitude, userLocation.longitude]);

  // ---- pulsing "dih" effect ----------------------------------------------
  useEffect(() => {
    let raf;
    const start = Date.now();

    const tick = () => {
      setPulse((Date.now() - start) % PULSE_DURATION_MS / PULSE_DURATION_MS); // 0 to 1
      // Dam rings pulse at their own per-severity cadence.
      setDamPulse({
        normal: (Date.now() - start) % DAM_PULSE_PERIODS.normal / DAM_PULSE_PERIODS.normal,
        caution: (Date.now() - start) % DAM_PULSE_PERIODS.caution / DAM_PULSE_PERIODS.caution,
        danger: (Date.now() - start) % DAM_PULSE_PERIODS.danger / DAM_PULSE_PERIODS.danger,
      });
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

  // Dam severity color shared by markers, halos, and pulse rings.
  const damSeverityColorExpr = [
    'match', ['get', 'severity'],
    'danger', SEVERITY_LEVELS.danger.color,
    'caution', SEVERITY_LEVELS.caution.color,
    SEVERITY_LEVELS.normal.color,
  ];

  // Stop value for the pulse radius: severity picks the phase, so only ONE
  // zoom-based interpolate exists in the whole expression (style-spec rule).
  const damPulseStop = (base, amp) => [
    'match', ['get', 'severity'],
    'danger', base + damPulse.danger * amp,
    'caution', base + damPulse.caution * amp,
    base + damPulse.normal * amp,
  ];

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
      zoom: DAM_FLY_ZOOM,
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

  // Tapping a dashed route frames that dam's route and brings up the
  // drawer pre-loaded with its card.
  const handleRoutePress = (event) => {
    const slug = event?.nativeEvent?.features?.[0]?.properties?.slug;
    if (slug == null || influencingBySlug[slug] == null) return;
    const target = dams.find((dam) => dam.slug === slug);
    if (!target?.coordinates || userLocation.latitude == null) return;

    const lngs = [userLocation.longitude, target.coordinates.lng];
    const lats = [userLocation.latitude, target.coordinates.lat];
    cameraRef.current?.fitBounds(
      [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      {
        padding: ROUTE_FIT_PADDING,
        duration: SELECTED_PERSON_FLY_DURATION_MS,
      },
    );

    setSelectedDam({
      slug: target.slug,
      name: target.name,
      reservoirWaterLevel: target.reservoirWaterLevel,
      deviationFromNHWL: target.deviationFromNHWL,
    });
    setHazardsOpen(true);
    setSheetExpanded(false);
    refreshDams();
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
    if (!getCachedCoords()) setLocating(true);
    try {
      const coords = await resolveCoords();
      if (!coords) return;

      cameraRef.current?.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: SELECTED_PERSON_FLY_ZOOM,
        duration: SELECTED_PERSON_FLY_DURATION_MS,
      });

      refreshFamilyLocations();
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
          minZoom={activeId ? 8 : 6}
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
                      'fill-color': damSeverityColorExpr,
                      'fill-opacity': [
                        'case', ['get', 'isInfluencing'], 0.12, 0.05,
                      ],
                    }}
                  />
                  <Layer
                    type="line"
                    id="damHaloBorderLayer"
                    paint={{
                      'line-color': damSeverityColorExpr,
                      'line-width': ['case', ['get', 'isInfluencing'], 3.5, 2],
                      'line-opacity': ['case', ['get', 'isInfluencing'], 1, 0.75],
                      'line-dasharray': [2, 1.5],
                    }}
                  />
                </GeoJSONSource>

                <GeoJSONSource id="nearestRouteSource" data={nearestRouteGeojson} onPress={handleRoutePress}>
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

                {/* Expanding ring per dam; cycle speed scales with severity */}
                <GeoJSONSource id="damsPulseSource" data={damsGeojson}>
                  <Layer
                    type="circle"
                    id="damsPulseLayer"
                    paint={{
                      'circle-color': damSeverityColorExpr,
                      'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        5, damPulseStop(2.5, 14),
                        10, damPulseStop(4, 20),
                        16, damPulseStop(5, 24),
                      ],
                      'circle-opacity': [
                        'match', ['get', 'severity'],
                        'danger', Math.max(0.45 - damPulse.danger * 0.45, 0),
                        'caution', Math.max(0.45 - damPulse.caution * 0.45, 0),
                        Math.max(0.45 - damPulse.normal * 0.45, 0),
                      ],
                      'circle-stroke-width': 0,
                    }}
                  />
                </GeoJSONSource>

                <GeoJSONSource id="damsSource" data={damsGeojson} onPress={handleDamPress}>
                  <Layer
                    type="circle"
                    id="damsLayer"
                    paint={{
                      'circle-color': damSeverityColorExpr,
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

        {/* hazard overlay — exactly one at a time (picked in the layers
            sheet). key={activeId} unmounts the previous layer's source and
            tiles the moment the selection changes. Streams for the visible
            area, or uses its local archive once downloaded. */}
        {mapReady && activeId != null && (
          <HazardLayerOverlay key={activeId} layerId={activeId} />
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

      <View style={styles.layersButtonWrap}>
        <TouchableOpacity
          style={styles.layersButton}
          onPress={() => setLayersOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="layers" size={24} color="#4287f5" />
        </TouchableOpacity>
        {activeId && <View style={styles.layersDot} />}
      </View>


      <HazardLayersPanel
        visible={layersOpen}
        onClose={() => setLayersOpen(false)}
        activeId={activeId}
        onSelect={selectHazardLayer}
      />

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
          nearestSlug={nearestDamSlug}
          influencingSlugs={
            Object.keys(influencingBySlug).length > 0
              ? Object.keys(influencingBySlug)
              : EMPTY_SLUGS
          }
          userElevation={userElevation}
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
  // sits directly above the GPS/locate button, right-aligned
  layersButtonWrap: {
    position: 'absolute',
    bottom: 92,
    right: 16,
  },
  layersButton: {
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
  hazardsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E32F31',
  layersDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#208AEF',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  locateButtonIcon: {
    fontSize: 22,
    color: '#4287f5',
  },
});
