import { useCallback, useState } from "react";
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
import DisasterTypeChip from "../../components/ui/DisasterTypeChip";
import { getCityClusters } from "../../services/clusterService";
import { useCluster } from "../../context/ClusterContext";

export default function ReportsScreen() {
  const router = useRouter();
  const { focusCluster } = useCluster();

  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errored, setErrored] = useState(false);

  const loadData = useCallback(async ({ refreshing = false } = {}) => {
    if (refreshing) setRefreshing(true);
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openOnMap = (cluster) => {
    focusCluster(cluster.id);
    router.navigate("/(admin)/map");
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => openOnMap(item)}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardChips}>
          {item.aiDisasterType ? (
            <DisasterTypeChip type={item.aiDisasterType} />
          ) : null}
          <PriorityChip priority={item.priority} showDot />
        </View>
      </View>
      <View style={styles.cardBottomRow}>
        <Text style={styles.cardMeta}>
          {item.reportCount} {item.reportCount === 1 ? "report" : "reports"} ·{" "}
          {item.peopleAffected} people affected
          {item.aiSeverity ? ` · ${item.aiSeverity} severity` : ""}
        </Text>
        <View style={styles.goToWrap}>
          <MaterialIcons name="near-me" size={12} color={colors.primary} />
          <Text style={styles.goToText}>Go to location</Text>
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
  cardChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
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
