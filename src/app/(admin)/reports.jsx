import { useCallback, useEffect, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import PriorityChip from "../../components/ui/PriorityChip";
import { getCityClusters } from "../../services/clusterService";
import { fetchClusterReports } from "../../services/dispatcher/clusterServ";
import { useCluster } from "../../context/ClusterContext";
import ClusterDetailsWindow from "../../components/dispatcher/ClusterDetailsWindow";
import AssignTeamModal from "../../components/dispatcher/AssignTeamModal";
import AssignSuccessModal from "../../components/dispatcher/AssignSuccessModal";

export default function ReportsScreen() {
  const router = useRouter();
  const { focusCluster, invalidateClusters } = useCluster();

  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errored, setErrored] = useState(false);

  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(null);

  const loadData = useCallback(
    async ({ refreshing: isRefresh = false } = {}) => {
      if (isRefresh) setRefreshing(true);
      try {
        const rows = await getCityClusters();
        setClusters(rows);
        setErrored(false);
      } catch {
        setErrored(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Fetch full cluster data when a card is selected so the popup has
  // latitude, ai_summary, action_plan, etc.
  useEffect(() => {
    if (selectedClusterId == null) {
      setSelectedCluster(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fetchClusterReports(selectedClusterId);
        if (!cancelled) setSelectedCluster(data?.cluster ?? null);
      } catch {
        // If the fetch fails, fall back to the normalised row from the list
        const fallback = clusters.find((c) => c.id === selectedClusterId);
        if (!cancelled && fallback) {
          setSelectedCluster({
            cluster_id: fallback.id,
            city: fallback.city,
            latitude: fallback.lat,
            longitude: fallback.lng,
            priority_level: fallback.priority,
            status: fallback.status,
            report_count: fallback.reportCount,
            people_affected: fallback.peopleAffected,
            ai_summary: null,
            action_plan: [],
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClusterId, clusters]);

  // Clear popup when navigating away
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedClusterId(null);
        setSelectedCluster(null);
      };
    }, [])
  );

  const handleCardPress = (item) => {
    setSelectedClusterId(item.id);
  };

  const handleCloseWindow = () => {
    setSelectedClusterId(null);
    setSelectedCluster(null);
  };

  const handleAssignTeam = () => setAssignOpen(true);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => handleCardPress(item)}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <PriorityChip priority={item.priority} showDot />
      </View>
      <View style={styles.cardBottomRow}>
        <Text style={styles.cardMeta}>
          {item.reportCount} {item.reportCount === 1 ? "report" : "reports"} ·{" "}
          {item.peopleAffected} people affected
        </Text>
        <View style={styles.goToWrap}>
          <MaterialIcons name="chevron-forward" size={14} color={colors.primary} />
          <Text style={styles.goToText}>View</Text>
        </View>
      </View>
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
          <Text style={styles.pageLabel}>Report Clusters</Text>
        </View>

        <FlatList
          data={clusters}
          keyExtractor={(item) => String(item.id)}
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
            errored ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.emptyTitle}>Unable to load clusters</Text>
                <Text style={styles.emptyCopy}>
                  Something went wrong reaching the server. Pull to refresh to
                  try again.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  activeOpacity={0.8}
                  onPress={() => loadData()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="layers-outline"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.emptyTitle}>No clusters yet</Text>
                <Text style={styles.emptyCopy}>
                  Citizen reports that pile up in your area will be grouped
                  into clusters here for dispatch.
                </Text>
              </View>
            )
          }
        />
      </View>

      {/* Same popup window as the map tab */}
      {selectedCluster && (
        <ClusterDetailsWindow
          cluster={selectedCluster}
          onClose={handleCloseWindow}
          onAssignTeam={handleAssignTeam}
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
          setAssignOpen(false);
          invalidateClusters();
          loadData();
        }}
      />

      <AssignSuccessModal
        visible={assignSuccess != null}
        teamName={assignSuccess?.teamName}
        clusterLabel={assignSuccess?.clusterLabel}
        onClose={() => setAssignSuccess(null)}
      />
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
    marginBottom: 14,
  },
  pageLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardMeta: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.muted,
  },
  goToWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  goToText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
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
  retryButton: {
    marginTop: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});
