import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import StatusBadge from "../../components/ui/StatusBadge";
import { getTeams, getOpenClusters } from "../../services/teamService";
import { clearDispatcherSession } from "../../services/dispatcherService";
import { formatDistance, haversineMeters } from "../../utils/haversine";
import { useCluster } from "../../context/ClusterContext";

export default function TeamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeClusterId } = useCluster();

  // Set when the dispatcher taps "Assign a Team" on a cluster —
  // teams are then sorted by distance to that cluster. An explicit
  // URL param (deep link) wins; otherwise fall back to the cluster
  // selected elsewhere in the dispatcher tabs via ClusterContext.
  const assignClusterId =
    params.assignClusterId != null && params.assignClusterId !== ""
      ? Number(params.assignClusterId)
      : activeClusterId != null
        ? Number(activeClusterId)
        : null;
  const [exitedAssignMode, setExitedAssignMode] = useState(false);
  const assigning = Boolean(assignClusterId) && !exitedAssignMode;

  const [teams, setTeams] = useState([]);
  const [activeCluster, setActiveCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadData = useCallback(
    async ({ refreshing = false } = {}) => {
      if (refreshing) setRefreshing(true);
      try {
        const [teamList, clusterList] = await Promise.all([
          getTeams(),
          assignClusterId ? getOpenClusters() : Promise.resolve([]),
        ]);
        setTeams(teamList);
        setActiveCluster(
          clusterList.find((c) => c.cluster_id === assignClusterId) ?? null
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [assignClusterId]
  );

  useFocusEffect(
    useCallback(() => {
      // A new incoming cluster re-enters assign mode; a manual exit
      // only sticks until the next focus pass.
      setExitedAssignMode(false);
      loadData();
    }, [loadData])
  );

  // Nearest teams first when there's an active cluster to compare against.
  const orderedTeams = useMemo(() => {
    if (!activeCluster) return teams;
    return [...teams].sort(
      (a, b) =>
        (haversineMeters(a, activeCluster) ?? Infinity) -
        (haversineMeters(b, activeCluster) ?? Infinity)
    );
  }, [teams, activeCluster]);

  const openDetail = (team) => {
    router.push({
      pathname: "/team-detail",
      params: {
        teamId: String(team.team_id),
        ...(assigning && assignClusterId
          ? { assignClusterId: String(assignClusterId) }
          : {}),
      },
    });
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await clearDispatcherSession();
    router.replace("/login");
  };

  const renderDistance = (team) => {
    if (!activeCluster) return null;
    const label = formatDistance(haversineMeters(team, activeCluster));
    if (!label) return null;
    return (
      <View style={styles.distanceRow}>
        <MaterialIcons name="near-me" size={12} color={colors.primary} />
        <Text style={styles.distanceText}>{label}</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => openDetail(item)}
    >
      <View style={styles.avatar}>
        <Ionicons name="people" size={20} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.teamName}>{item.name}</Text>
        <Text style={styles.teamLocation} numberOfLines={1}>
          {item.location_text}
        </Text>
        {renderDistance(item)}
      </View>
      <StatusBadge status={item.status} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageLabel}>Team</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              disabled={loggingOut}
              onPress={handleLogout}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <MaterialIcons name="logout" size={16} color={colors.primary} />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, loggingOut && styles.buttonDisabled]}
              activeOpacity={0.8}
              disabled={loggingOut}
              onPress={() => router.push("/create-team")}
            >
              <MaterialIcons name="add" size={18} color={colors.white} />
              <Text style={styles.createButtonText}>Create Team</Text>
            </TouchableOpacity>
          </View>
        </View>

        {assigning ? (
          <View style={styles.assignBanner}>
            <View style={styles.assignBannerTextWrap}>
              <Text style={styles.assignBannerTitle}>
                Assigning: {activeCluster?.name ?? "cluster"}
              </Text>
              <Text style={styles.assignBannerCaption}>
                Teams are sorted by distance. Pick the closest one.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setExitedAssignMode(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        ) : null}

        <FlatList
          data={orderedTeams}
          keyExtractor={(item) => String(item.team_id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData({ refreshing: true })}
              tintColor={colors.primary}
            />
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons
                name="people-outline"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.emptyTitle}>No teams yet</Text>
              <Text style={styles.emptyCopy}>
                Create your first team so you can dispatch responders to
                emergency clusters.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pageLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 34,
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  assignBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FDECEC",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  assignBannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  assignBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  assignBannerCaption: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
    marginRight: 8,
    gap: 2,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  teamLocation: {
    fontSize: 13,
    color: colors.muted,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
  },
});
