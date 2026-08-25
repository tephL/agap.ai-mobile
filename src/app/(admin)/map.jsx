import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map, Camera, NativeUserLocation, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// adjust this import to wherever fetchClustersWithinLocation actually lives
import { fetchClustersWithinLocation, fetchClusterReports } from '../../services/dispatcher/clusterServ.js';
import { getTeams } from '../../services/teamService';
import { useCluster } from '../../context/ClusterContext';
import ClusterDetailsWindow from '../../components/dispatcher/ClusterDetailsWindow';
import TeamDetailsWindow from '../../components/dispatcher/TeamDetailsWindow';
import AssignTeamModal from '../../components/dispatcher/AssignTeamModal';
import AssignSuccessModal from '../../components/dispatcher/AssignSuccessModal';
import useLiveLocation from '../../hooks/useLiveLocation.js';

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

// where the camera settles when a cluster is expanded
const CLUSTER_FOCUS_ZOOM = 15;
const CLUSTER_FOCUS_DURATION_MS = 800;
// pushes the visual center upward so the cluster sits in the
// upper-middle of the screen instead of behind the details window
const CLUSTER_FOCUS_PADDING = { top: 80, right: 0, bottom: 400, left: 0 };

const CLUSTER_PRIORITY_COLOR_EXPR = [
  'match',
  ['get', 'priority'],
  'high', '#ef4444',
  'medium', '#eab308',
  'low', '#22c55e',
  '#a9a9a9', // fallback for unknown priority
];

// individual reports inside an expanded cluster, colored by status
const REPORT_STATUS_COLOR_EXPR = [
  'match',
  ['get', 'status'],
  'open', '#ef4444',
  'saved', '#eab308',
  'resolved', '#22c55e',
  '#a9a9a9', // fallback for unknown status
];

// teams, light blue while available and orange once dispatched (busy)
const TEAM_STATUS_COLOR_EXPR = [
  'match',
  ['get', 'status'],
  'available', '#60a5fa',
  'busy', '#f97316',
  '#a9a9a9', // fallback for offline/unknown
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Index() {
  const router = useRouter();

  // location / permissions
  const { locationGranted, getCachedCoords, resolveCoords } = useLiveLocation();
  const [locating, setLocating] = useState(false);

  // cluster markers state
  const [clusters, setClusters] = useState([]);

  // team markers state
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  // expanded cluster state (reports shown on map + details window)
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [clusterReports, setClusterReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  // populated right after a successful assign, drives the done popup
  const [assignSuccess, setAssignSuccess] = useState(null);

  // map lifecycle state
  const [mapReady, setMapReady] = useState(false);
  const cameraRef = useRef(null);
  const handledFocusRef = useRef(0);

  // team.jsx reads the selected cluster across tabs; focusNonce marks
  // explicit focus requests coming from the Reports tab, clustersNonce
  // marks cluster mutations (resolve/assign) done in other tabs
  const { activeClusterId, setActiveClusterId, focusNonce, clustersNonce } = useCluster();

  // ---- clusters + teams fetch loop ---------------------------------------
  const refreshClusters = useCallback(async () => {
    try {
      const [{ data }, teamList] = await Promise.all([
        fetchClustersWithinLocation(),
        getTeams(),
      ]);
      setClusters(data ?? []);
      setTeams(teamList ?? []);
    } catch (e) {
      console.log('failed to fetch clusters', e);
    }
  }, []);

  useEffect(() => {
    refreshClusters();
    const interval = setInterval(refreshClusters, CLUSTERS_FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshClusters]);

  // another tab just resolved a cluster / dispatched a team — refetch
  // right away so the pin disappears the moment it's resolved instead
  // of waiting for the next poll tick
  useEffect(() => {
    if (clustersNonce === 0) return;
    refreshClusters();
  }, [clustersNonce, refreshClusters]);

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
      // empty clusters are cleaned up server-side; hide any stale ones
      // still cached between refreshes so they never render a pin
      .filter((c) => (c.report_count ?? 0) > 0)
      .map((cluster, index) => ({
        type: 'Feature',
        id: `cluster-${cluster.city}-${index}`,
        geometry: {
          type: 'Point',
          coordinates: [cluster.longitude, cluster.latitude],
        },
        properties: {
          cluster_id: cluster.cluster_id,
          city: cluster.city,
          priority: cluster.priority_level,
          status: cluster.status,
          report_count: cluster.report_count,
          people_affected: cluster.people_affected,
          ai_summary: cluster.ai_summary,
          action_plan: cluster.action_plan,
        },
      })),
  };

  const teamsGeojson = {
    type: 'FeatureCollection',
    features: teams
      .filter(
        (t) =>
          typeof t.lat === 'number' &&
          typeof t.lng === 'number' &&
          !Number.isNaN(t.lat) &&
          !Number.isNaN(t.lng)
      )
      .map((team, index) => ({
        type: 'Feature',
        id: `team-${team.team_id ?? index}`,
        geometry: {
          type: 'Point',
          coordinates: [team.lng, team.lat],
        },
        properties: {
          team_id: team.team_id,
          name: team.name,
          status: team.status,
        },
      })),
  };

  // reports inside the expanded cluster, as map markers
  const reportsGeojson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: (selectedClusterId != null ? clusterReports : [])
        .filter(
          (r) =>
            typeof r.latitude === 'number' &&
            typeof r.longitude === 'number' &&
            !Number.isNaN(r.latitude) &&
            !Number.isNaN(r.longitude)
        )
        .map((report) => ({
          type: 'Feature',
          id: `report-${report.report_id}`,
          geometry: {
            type: 'Point',
            coordinates: [report.longitude, report.latitude],
          },
          properties: {
            report_id: report.report_id,
            status: report.status,
          },
        })),
    };
  }, [clusterReports, selectedClusterId]);

  // the selected cluster re-emitted on its own source, so the halo can
  // inherit its priority color without a filter expression
  const selectedClusterGeojson = useMemo(() => {
    const feature =
      selectedClusterId != null
        ? clustersGeojson.features.find(
            (f) => f.properties.cluster_id === selectedClusterId
          )
        : null;
    return {
      type: 'FeatureCollection',
      features: feature ? [feature] : [],
    };
  }, [clustersGeojson, selectedClusterId]);

  // the expanded cluster already has a team on it (its assignment is still
  // active), so the details window must not offer "Assign a Team" again
  const selectedClusterAssigned = useMemo(() => {
    if (selectedCluster == null) return false;
    const clusterId = Number(selectedCluster.cluster_id);
    return teams.some((t) => Number(t.assigned_to) === clusterId);
  }, [teams, selectedCluster]);

  // ---- handlers -----------------------------------------------------------
  const handleLocatePress = async () => {
    if (locating) return;
    if (!getCachedCoords()) setLocating(true);
    try {
      const coords = await resolveCoords();
      if (!coords) return;

      cameraRef.current?.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: LOCATE_ZOOM,
        duration: LOCATE_FLY_DURATION_MS,
      });
    } catch (e) {
      console.log('Failed to locate user', e);
    } finally {
      setLocating(false);
    }
  };

  // ---- cluster expand / collapse -----------------------------------------
  const collapseCluster = useCallback(() => {
    setSelectedClusterId(null);
    setSelectedCluster(null);
    setClusterReports([]);
    setReportsLoading(false);
    setActiveClusterId(null);
  }, [setActiveClusterId]);

  // if the expanded cluster got resolved elsewhere it stops coming back
  // from the server — collapse immediately so its pin, halo, reports and
  // details window all vanish with the refetched data
  useEffect(() => {
    if (
      selectedClusterId != null &&
      !clusters.some((c) => c.cluster_id === selectedClusterId)
    ) {
      collapseCluster();
    }
  }, [clusters, selectedClusterId, collapseCluster]);

  const expandCluster = useCallback(
    async (clusterId) => {
      setSelectedTeamId(null);
      setSelectedClusterId(clusterId);
      setSelectedCluster(
        clusters.find((c) => c.cluster_id === clusterId) ?? null
      );
      setClusterReports([]);
      setReportsLoading(true);
      setActiveClusterId(clusterId);

      const target = clusters.find((c) => c.cluster_id === clusterId);
      if (
        target &&
        typeof target.latitude === 'number' &&
        typeof target.longitude === 'number'
      ) {
        cameraRef.current?.flyTo({
          center: [target.longitude, target.latitude],
          zoom: CLUSTER_FOCUS_ZOOM,
          duration: CLUSTER_FOCUS_DURATION_MS,
          padding: CLUSTER_FOCUS_PADDING,
        });
      }

      try {
        const { data } = await fetchClusterReports(clusterId);
        setSelectedCluster(data?.cluster ?? null);
        setClusterReports(data?.reports ?? []);
      } catch (e) {
        console.log('failed to fetch cluster reports', e);
      } finally {
        setReportsLoading(false);
      }
    },
    [clusters, setActiveClusterId]
  );

  const handleClusterPress = useCallback(
    async (event) => {
      // keep Map's onPress from also firing on empty map
      event.stopPropagation();

      const feature = event.nativeEvent?.features?.find(
        (f) => f.properties?.cluster_id != null
      );
      if (!feature) return;

      // tapping a team pin while a cluster is open swaps to the team
      setSelectedTeamId(null);

      const clusterId = feature.properties.cluster_id;

      // tapping the expanded cluster collapses it again
      if (clusterId === selectedClusterId) {
        collapseCluster();
        return;
      }

      await expandCluster(clusterId);
    },
    [selectedClusterId, collapseCluster, expandCluster]
  );

  const selectedTeam = useMemo(
    () =>
      selectedTeamId != null
        ? teams.find((t) => t.team_id === selectedTeamId) ?? null
        : null,
    [teams, selectedTeamId]
  );

  const collapseTeam = useCallback(() => setSelectedTeamId(null), []);

  const handleTeamPress = useCallback(
    (event) => {
      event.stopPropagation();

      const feature = event.nativeEvent?.features?.find(
        (f) => f.properties?.team_id != null
      );
      if (!feature) return;

      const teamId = feature.properties.team_id;
      if (teamId === selectedTeamId) {
        collapseTeam();
        return;
      }

      setSelectedTeamId(teamId);
      collapseCluster();

      const team = teams.find((t) => t.team_id === teamId);
      if (
        team &&
        typeof team.lat === 'number' &&
        typeof team.lng === 'number'
      ) {
        cameraRef.current?.flyTo({
          center: [team.lng, team.lat],
          zoom: CLUSTER_FOCUS_ZOOM,
          duration: CLUSTER_FOCUS_DURATION_MS,
        });
      }
    },
    [selectedTeamId, teams, collapseTeam, collapseCluster]
  );

  const openTeamDetail = useCallback(() => {
    if (selectedTeam == null) return;
    router.push({
      pathname: '/team-detail',
      params: { teamId: String(selectedTeam.team_id) },
    });
  }, [router, selectedTeam]);

  // opens a cluster picked from another tab with the same expand and
  // center behavior as tapping its marker here; waits for the map to
  // load and for clusters data before flying the camera
  useEffect(() => {
    if (
      focusNonce === handledFocusRef.current ||
      activeClusterId == null ||
      !mapReady ||
      clusters.length === 0
    ) {
      return;
    }
    handledFocusRef.current = focusNonce;
    expandCluster(activeClusterId);
  }, [focusNonce, activeClusterId, mapReady, clusters, expandCluster]);

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
          <GeoJSONSource
            id="clustersSource"
            data={clustersGeojson}
            hitbox={{ top: 16, right: 16, bottom: 16, left: 16 }}
            onPress={handleClusterPress}
          >
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

        {/* selection glow around the expanded cluster — empty data hides it */}
        {mapReady && (
          <GeoJSONSource id="selectedClusterSource" data={selectedClusterGeojson}>
            <Layer
              type="circle"
              id="selectedClusterHalo"
              paint={{
                'circle-color': CLUSTER_PRIORITY_COLOR_EXPR,
                'circle-opacity': 0.15,
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  5, 10,
                  10, 18,
                  16, 30,
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': CLUSTER_PRIORITY_COLOR_EXPR,
                'circle-stroke-opacity': 0.9,
              }}
            />
          </GeoJSONSource>
        )}

        {/* individual reports inside the expanded cluster — empty data hides them */}
        {mapReady && (
          <GeoJSONSource id="clusterReportsSource" data={reportsGeojson}>
            <Layer
              type="circle"
              id="clusterReportsLayer"
              paint={{
                'circle-color': REPORT_STATUS_COLOR_EXPR,
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  8, 2.5,
                  12, 3.5,
                  16, 4.5,
                  20, 6,
                ],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.95,
              }}
            />
          </GeoJSONSource>
        )}

        {/* teams — light blue when available, orange once dispatched (busy) */}
        {mapReady && (
          <GeoJSONSource
            id="teamsSource"
            data={teamsGeojson}
            hitbox={{ top: 16, right: 16, bottom: 16, left: 16 }}
            onPress={handleTeamPress}
          >
            <Layer
              type="circle"
              id="teamsLayer"
              paint={{
                'circle-color': TEAM_STATUS_COLOR_EXPR,
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  8, 3.5,
                  12, 5,
                  16, 7,
                  20, 9,
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.95,
              }}
            />
          </GeoJSONSource>
        )}

        {locationGranted && (
          <NativeUserLocation androidRenderMode="gps" />
        )}
      </Map>

      <TouchableOpacity
        style={[
          styles.locateButton,
          (selectedCluster != null || selectedTeam != null) &&
            styles.locateButtonRaised,
        ]}
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

      {selectedCluster && (
        <ClusterDetailsWindow
          cluster={selectedCluster}
          reports={clusterReports}
          loading={reportsLoading}
          teamAssigned={selectedClusterAssigned}
          onClose={collapseCluster}
          onAssignTeam={() => setAssignOpen(true)}
        />
      )}

      {selectedTeam && (
        <TeamDetailsWindow
          team={selectedTeam}
          onClose={collapseTeam}
          onSeeDetails={openTeamDetail}
        />
      )}

      <AssignTeamModal
        visible={assignOpen}
        clusterId={selectedCluster?.cluster_id}
        clusterName={selectedCluster?.city}
        onClose={() => setAssignOpen(false)}
        onAssigned={(assignment, team) => {
          setAssignSuccess({
            teamName: team?.name,
            clusterLabel:
              selectedCluster?.city && selectedCluster?.cluster_id != null
                ? `Cluster #${selectedCluster.cluster_id} · ${selectedCluster.city}`
                : `Cluster #${selectedCluster?.cluster_id ?? ""}`,
          });
          refreshClusters();
        }}
      />

      <AssignSuccessModal
        visible={assignSuccess != null}
        teamName={assignSuccess?.teamName}
        clusterLabel={assignSuccess?.clusterLabel}
        onClose={() => setAssignSuccess(null)}
      />
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
  // keeps the button above the expanded cluster window
  locateButtonRaised: {
    bottom: 372,
  },
});
