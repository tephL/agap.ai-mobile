import { View, StyleSheet, Text, Dimensions, TouchableOpacity, ActivityIndicator, Linking, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Camera, NativeUserLocation, UserLocation, GeoJSONSource, OfflineManager, Layer, Images } from '@maplibre/maplibre-react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

// services
import { uploadUserLocation } from '../../services/usersService.js';
import { fetchFamilyLocation, getFamilyPositions, setFamilyPositions } from "../../services/familyLocation.js";
import { getMyFamily } from '../../services/familyService.js';
import { getStoredSession, CITIZEN_ROLE_ID } from '../../services/authService.js';
import { getActiveTyphoon } from '../../services/typhoonService.js';
import { getRouteCoordinates } from '../../services/routeService';
import { getPublicTeams } from '../../services/teamService';

// components
import LiveNotificationDropdown from "@/components/notifications/LiveNotificationDropdown";
import DispatchNotificationBar from "@/components/notifications/DispatchNotificationBar";
import TyphoonAlertBanner from "@/components/notifications/TyphoonAlertBanner";
import { PersonCard } from '@/components/PersonCard';
import { HazardLayerOverlay } from '@/components/HazardLayerToggle';
import HazardLayersPanel from '@/components/HazardLayersPanel';
import HazardLayerLegend from '@/components/HazardLayerLegend';

// hooks
import useActiveDispatches from '../../hooks/useActiveDispatches';

// hazard layer selection prefs
import { useActiveHazardLayer } from '../../hooks/useActiveHazardLayer';
import { downloadLayer, isDownloaded } from '../../lib/pmtiles/downloadLayer';
import { getLegendHidden, setLegendHidden } from '../../services/hazardPrefsDb';

import useLiveLocation from '../../hooks/useLiveLocation.js';
import SosReceivedOverlay from '@/components/SosReceivedOverlay';

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

// marching-ants steps for planned-route lines: cycling through these dash
// patterns makes the dashes flow along each line's direction, i.e. from
// the team base toward its assigned cluster
const ROUTE_DASH_TICK_MS = 55;
const ROUTE_DASH_STEP = 0.06;
const ROUTE_DASH_SEQUENCE = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
];

// teams dispatched to the citizen's cluster appear orange (same as dispatcher busy status)
const TEAM_DISPATCH_COLOR = '#f97316';

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
// RouteDashLayer — animated marching-ants dashes for dispatched team routes
// ---------------------------------------------------------------------------

const RouteDashLayer = React.memo(function RouteDashLayer() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + ROUTE_DASH_STEP) % 1), ROUTE_DASH_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const dashArray =
    ROUTE_DASH_SEQUENCE[Math.floor(phase * ROUTE_DASH_SEQUENCE.length) % ROUTE_DASH_SEQUENCE.length];

  return (
    <>
      <Layer
        type="line"
        id="citizenRoutesCasingLayer"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': '#ffffff',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 7],
          'line-opacity': 0.6,
        }}
      />
      <Layer
        type="line"
        id="citizenRoutesLayer"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': TEAM_DISPATCH_COLOR,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 14, 4],
          'line-dasharray': dashArray,
          'line-opacity': 0.9,
        }}
      />
    </>
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Index() {
  const { selectedUserId, sosStatus } = useLocalSearchParams();
  const router = useRouter();

  // typhoon alert state (session-only dismissal)
  const [activeTyphoon, setActiveTyphoon] = useState(null);
  const [typhoonDismissed, setTyphoonDismissed] = useState(false);

  // "Report received" overlay shown after returning from the report form.
  // Reset the ref guard each time this screen gains focus so the overlay
  // can re-appear on the next submission.
  const [sosReceivedVariant, setSosReceivedVariant] = useState(null);
  const handledSosStatusRef = useRef(null);
  useFocusEffect(
    useCallback(() => {
      handledSosStatusRef.current = null;
      if (
        typeof sosStatus === "string" &&
        ["received", "prepared", "active"].includes(sosStatus)
      ) {
        handledSosStatusRef.current = sosStatus;
        setSosReceivedVariant(sosStatus);
      }
    }, [sosStatus])
  );

  const handleAskAI = useCallback(
    (layerLabel) => {
      router.push({
        pathname: "/assistant",
        params: { question: `Ano ang ibig sabihin ng "${layerLabel}" na hazard layer? Ipaliwanag ito nang detalyado.` },
      });
    },
    [router]
  );

  const handleTyphoonAskPreparedness = useCallback(() => {
    router.push({
      pathname: "/assistant",
      params: {
        question: "May aktibong bagyo (Signal No. 3 sa aking lugar) — ano ang mga tips sa disaster preparedness na dapat kong sundin?",
      },
    });
  }, [router]);

  const handleTyphoonDismiss = useCallback(() => {
    setTyphoonDismissed(true);
  }, []);

  const handleTyphoonViewDetails = useCallback(() => {
    // details expanded inline by the banner component
  }, []);

  // location / permissions
  const { locationGranted, getCachedCoords, resolveCoords } = useLiveLocation();
  const [locating, setLocating] = useState(false);

  // active dispatch notifications
  const { dispatches, dismiss, resetDismissed } = useActiveDispatches();

  // public teams (is_public = true) shown on citizen map
  const [publicTeams, setPublicTeams] = useState([]);

  // family markers state
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);

  // map lifecycle state
  const [mapReady, setMapReady] = useState(false);
  const hasRunOnce = useRef(false);
  const cameraRef = useRef(null);

  // tracks which selectedUserId param value we've already acted on, so a
  // background family refetch doesn't keep re-flying/re-opening the card
  const handledSelectedUserIdRef = useRef(null);

  // guards the one-time auto-zoom so it runs only on the first location fix
  const hasAutoZoomedRef = useRef(false);

  // auto-download the 5-year flood layer on first mount
  useEffect(() => {
    (async () => {
      try {
        if (!(await isDownloaded("flood_25yr"))) {
          await downloadLayer("flood_25yr");
        }
      } catch (e) {
        console.log("auto-download flood_25yr failed", e);
      }
    })();
  }, []);

  // fetch active typhoon for alert banner (citizens only)
  useEffect(() => {
    (async () => {
      try {
        const session = await getStoredSession();
        if (!session || session.role_id !== CITIZEN_ROLE_ID) return;
        const data = await getActiveTyphoon();
        setActiveTyphoon(data?.typhoon ?? null);
      } catch (e) {
        console.log("Failed to fetch active typhoon", e);
      }
    })();
  }, []);

  // pulsing "dih" effect state
  const [pulse, setPulse] = useState(0);
  const [teamPulse, setTeamPulse] = useState(0);

  // hazard overlay selection (persisted, single-select) + layers sheet state
  const { activeId, select: selectHazardLayer } = useActiveHazardLayer();
  const [layersOpen, setLayersOpen] = useState(false);

  // legend visibility (persisted): expands whenever the active layer
  // changes, otherwise restores what the user last chose
  const [legendHidden, setLegendHiddenState] = useState(false);
  const prevActiveLayerRef = useRef(activeId);
  useEffect(() => {
    const prev = prevActiveLayerRef.current;
    prevActiveLayerRef.current = activeId;
    if (prev !== null && activeId !== prev) {
      // a different layer was picked — always re-show its legend
      setLegendHiddenState(false);
      setLegendHidden(false).catch(() => undefined);
      return;
    }
    // same layer (or first mount) — restore the persisted choice
    getLegendHidden()
      .then(setLegendHiddenState)
      .catch(() => undefined);
  }, [activeId]);

  const handleToggleLegend = useCallback(() => {
    setLegendHiddenState((hidden) => {
      setLegendHidden(!hidden).catch(() => undefined);
      return !hidden;
    });
  }, []);

  // staleness re-check clock
  const [now, setNow] = useState(Date.now());

  // ---- reset dismissed dispatch notifications on tab focus -----------
  useFocusEffect(
    useCallback(() => {
      resetDismissed();
    }, [resetDismissed])
  );

  // ---- fetch public teams on focus -------------------------------------
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const teams = await getPublicTeams();
          if (!cancelled) setPublicTeams(teams);
        } catch (e) {
          console.log("Failed to load public teams", e);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

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
      const familyFetchInterval = setInterval(refreshFamilyLocations, FAMILY_FETCH_INTERVAL_MS);
      const sendInterval = setInterval(sendLocation, SEND_LOCATION_INTERVAL_MS);
      console.log(familyMembers);

      return () => {
        console.log('went out');
        cancelled = true;
        clearInterval(sendInterval);
        clearInterval(familyFetchInterval);
      }
    }, [refreshFamilyLocations, resolveCoords])
  );

  // ---- auto-zoom to the user once their location loads ---------------------
  // Retries up to 5 times with 2s delays in case GPS fix isn't immediate.
  useEffect(() => {
    if (!locationGranted || !mapReady || hasAutoZoomedRef.current) return;
    let cancelled = false;
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 2000;

    (async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (cancelled || hasAutoZoomedRef.current) return;
        const coords = await resolveCoords();
        if (coords && !cancelled && !hasAutoZoomedRef.current) {
          hasAutoZoomedRef.current = true;
          cameraRef.current?.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: SELECTED_PERSON_FLY_ZOOM,
            duration: SELECTED_PERSON_FLY_DURATION_MS,
          });
          return;
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
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

  // ---- geojson for dispatched team markers ------------------------------
  const teamGeojson = {
    type: 'FeatureCollection',
    features: dispatches
      .filter(
        (d) =>
          d.team?.lat != null &&
          d.team?.lng != null &&
          !Number.isNaN(d.team.lat) &&
          !Number.isNaN(d.team.lng)
      )
      .map((d) => ({
        type: 'Feature',
        id: `dispatch-team-${d.team_id}`,
        geometry: {
          type: 'Point',
          coordinates: [d.team.lng, d.team.lat],
        },
        properties: {
          team_id: d.team_id,
          name: d.team?.name ?? 'Response Team',
          assignment_id: d.assignment_id,
        },
      })),
  };

  // ---- planned routes for dispatched teams: team base -> cluster ----------
  const [teamRoutes, setTeamRoutes] = useState({});

  const activeDispatches = useMemo(() => {
    return dispatches
      .filter(
        (d) =>
          d.team?.lat != null &&
          d.team?.lng != null &&
          !Number.isNaN(d.team.lat) &&
          !Number.isNaN(d.team.lng) &&
          d.cluster?.lat != null &&
          d.cluster?.lng != null &&
          !Number.isNaN(d.cluster.lat) &&
          !Number.isNaN(d.cluster.lng)
      )
      .map((d) => ({
        teamId: d.team_id,
        from: [d.team.lng, d.team.lat],
        to: [d.cluster.lng, d.cluster.lat],
      }));
  }, [dispatches]);

  const dispatchSignature = useMemo(
    () =>
      activeDispatches
        .map((d) => `${d.teamId}:${d.from.join(',')}=>${d.to.join(',')}`)
        .sort()
        .join('|'),
    [activeDispatches]
  );
  const fetchedDispatchSigRef = useRef(null);

  useEffect(() => {
    if (dispatchSignature === fetchedDispatchSigRef.current) return;
    fetchedDispatchSigRef.current = dispatchSignature;

    let cancelled = false;
    (async () => {
      if (activeDispatches.length === 0) {
        setTeamRoutes({});
        return;
      }
      const entries = await Promise.all(
        activeDispatches.map(async (d) => [
          d.teamId,
          await getRouteCoordinates(d.from, d.to),
        ])
      );
      if (cancelled) return;

      const next = {};
      for (const [teamId, coords] of entries) {
        if (coords) next[teamId] = coords;
      }
      setTeamRoutes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatchSignature, activeDispatches]);

  // ---- routes GeoJSON for marching-ants lines ----------------------------
  const routesGeojson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: Object.entries(teamRoutes).map(([teamId, coordinates]) => ({
        type: 'Feature',
        id: `citizen-route-${teamId}`,
        geometry: { type: 'LineString', coordinates },
        properties: { team_id: Number(teamId) },
      })),
    }),
    [teamRoutes]
  );

  // ---- team starting point markers (base location, dispatcher icon style) -
  const teamStartingPointGeojson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: dispatches
        .filter(
          (d) =>
            d.team?.lat != null &&
            d.team?.lng != null &&
            !Number.isNaN(d.team.lat) &&
            !Number.isNaN(d.team.lng)
        )
        .map((d) => ({
          type: 'Feature',
          id: `team-start-${d.team_id}`,
          geometry: {
            type: 'Point',
            coordinates: [d.team.lng, d.team.lat],
          },
          properties: {
            team_id: d.team_id,
            name: d.team?.name ?? 'Response Team',
          },
        })),
    }),
    [dispatches]
  );

  // ---- public teams (is_public) base markers ---------------------------
  const PUBLIC_TEAM_COLOR = '#3b82f6';
  const publicTeamGeojson = useMemo(() => {
    const dispatchedIds = new Set(
      dispatches
        .filter(
          (d) =>
            d.team?.lat != null &&
            d.team?.lng != null &&
            !Number.isNaN(d.team.lat) &&
            !Number.isNaN(d.team.lng)
        )
        .map((d) => d.team_id)
    );
    return {
      type: 'FeatureCollection',
      features: publicTeams
        .filter(
          (t) =>
            !dispatchedIds.has(t.team_id) &&
            typeof t.lat === 'number' &&
            typeof t.lng === 'number' &&
            !Number.isNaN(t.lat) &&
            !Number.isNaN(t.lng)
        )
        .map((t) => ({
          type: 'Feature',
          id: `public-team-${t.team_id}`,
          geometry: {
            type: 'Point',
            coordinates: [t.lng, t.lat],
          },
          properties: {
            team_id: t.team_id,
            name: t.name,
          },
        })),
    };
  }, [publicTeams, dispatches]);

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

  // ---- faster pulse for dispatched team markers -------------------------
  const TEAM_PULSE_DURATION_MS = 1200;
  useEffect(() => {
    let raf;
    const start = Date.now();

    const tick = () => {
      const elapsed = (Date.now() - start) % TEAM_PULSE_DURATION_MS;
      setTeamPulse(elapsed / TEAM_PULSE_DURATION_MS);
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

  const handleCallPerson = (phone_number) => {
    if (!phone_number) return;
    Linking.openURL(`tel:${phone_number.replace(/\s+/g, "")}`);
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
          minZoom={activeId ? 15 : 6}
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

            {/* dispatched response team markers — blue with white outline */}
            {teamGeojson.features.length > 0 && (
              <GeoJSONSource id="dispatchTeamSource" data={teamGeojson}>
                <Layer
                  type="circle"
                  id="dispatchTeamPulse"
                  paint={{
                    'circle-color': '#3b82f6',
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      8, 6 + teamPulse * 30,
                      12, 9 + teamPulse * 30,
                      16, 12 + teamPulse * 30,
                    ],
                    'circle-opacity': Math.max(0.6 - teamPulse * 0.6, 0),
                    'circle-stroke-width': 0,
                  }}
                />
                <Layer
                  type="circle"
                  id="dispatchTeamLayer"
                  paint={{
                    'circle-color': '#3b82f6',
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      8, 4,
                      12, 6,
                      16, 8,
                    ],
                    'circle-stroke-width': 2.5,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 0.95,
                  }}
                />
                <Layer
                  type="symbol"
                  id="dispatchTeamLabel"
                  layout={{
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 11,
                    'text-offset': [0, 1.8],
                    'text-anchor': 'top',
                    'text-allow-overlap': false,
                  }}
                  paint={{
                    'text-color': '#1e40af',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.5,
                  }}
                />
              </GeoJSONSource>
            )}

            {/* marching-ants route lines from team base to cluster */}
            {routesGeojson.features.length > 0 && (
              <GeoJSONSource id="citizenRoutesSource" data={routesGeojson}>
                <RouteDashLayer />
              </GeoJSONSource>
            )}

            {/* team starting point markers — shelter icon, orange (busy), with name label */}
            {teamStartingPointGeojson.features.length > 0 && (
              <GeoJSONSource id="teamStartingPointSource" data={teamStartingPointGeojson}>
                <Layer
                  type="circle"
                  id="teamStartCircle"
                  paint={{
                    'circle-color': '#ffffff',
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      8, 8,
                      12, 12,
                      16, 16,
                      20, 20,
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': TEAM_DISPATCH_COLOR,
                    'circle-opacity': 0.9,
                  }}
                />
                <Layer
                  type="symbol"
                  id="teamStartIcon"
                  layout={{
                    'icon-image': 'shelter',
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 1, 16, 1.2, 20, 1.4],
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                  }}
                  paint={{
                    'icon-color': TEAM_DISPATCH_COLOR,
                  }}
                />
                <Layer
                  type="symbol"
                  id="teamStartLabel"
                  layout={{
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 11,
                    'text-offset': [0, 1.8],
                    'text-anchor': 'top',
                    'text-allow-overlap': false,
                  }}
                  paint={{
                    'text-color': TEAM_DISPATCH_COLOR,
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.5,
                    'text-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 14, 1],
                  }}
                />
              </GeoJSONSource>
            )}

            {/* public team markers — blue circle with shelter icon */}
            {publicTeamGeojson.features.length > 0 && (
              <GeoJSONSource id="publicTeamSource" data={publicTeamGeojson}>
                <Layer
                  type="circle"
                  id="publicTeamCircle"
                  paint={{
                    'circle-color': '#ffffff',
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      8, 8,
                      12, 12,
                      16, 16,
                      20, 20,
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': PUBLIC_TEAM_COLOR,
                    'circle-opacity': 0.9,
                  }}
                />
                <Layer
                  type="symbol"
                  id="publicTeamIcon"
                  layout={{
                    'icon-image': 'shelter',
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 1, 16, 1.2, 20, 1.4],
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                  }}
                  paint={{
                    'icon-color': PUBLIC_TEAM_COLOR,
                  }}
                />
                <Layer
                  type="symbol"
                  id="publicTeamLabel"
                  layout={{
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                    'text-size': 11,
                    'text-offset': [0, 1.8],
                    'text-anchor': 'top',
                    'text-allow-overlap': false,
                  }}
                  paint={{
                    'text-color': PUBLIC_TEAM_COLOR,
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.5,
                    'text-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 14, 1],
                  }}
                />
              </GeoJSONSource>
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

      {/* legend explaining the active overlay's colors — bottom-left, only
          while a layer is active; collapses to a chip when hidden */}
      <HazardLayerLegend
        activeId={activeId}
        hidden={legendHidden}
        onToggle={handleToggleLegend}
      />


      <HazardLayersPanel
        visible={layersOpen}
        onClose={() => setLayersOpen(false)}
        activeId={activeId}
        onSelect={selectHazardLayer}
        onAskAI={handleAskAI}
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

      {!typhoonDismissed && activeTyphoon && (
        <TyphoonAlertBanner
          typhoon={activeTyphoon}
          onDismiss={handleTyphoonDismiss}
          onViewDetails={handleTyphoonViewDetails}
          onAskPreparedness={handleTyphoonAskPreparedness}
        />
      )}

      <DispatchNotificationBar
        dispatches={dispatches}
        onDismiss={dismiss}
        style={activeTyphoon && !typhoonDismissed ? { top: 160 } : undefined}
      />

      {sosReceivedVariant && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSosReceivedVariant(null)}
        >
          <SosReceivedOverlay
            variant={sosReceivedVariant}
            onDone={() => setSosReceivedVariant(null)}
          />
        </Modal>
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
