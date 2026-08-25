import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import StatusBadge from "../ui/StatusBadge";
import PriorityChip from "../ui/PriorityChip";
import {
  assignTeamToCluster,
  assignmentError,
  getOpenClusters,
  getTeams,
} from "../../services/teamService";
import { formatDistance, haversineMeters } from "../../utils/haversine";
import { useCluster } from "../../context/ClusterContext";

/**
 * Self-contained "Assign a Team" popup.
 *
 * Drop it into any dispatcher screen that knows which cluster the
 * dispatcher is working with (e.g. the Map tab's Action Plan):
 *
 *   <AssignTeamModal
 *     visible={assignOpen}
 *     clusterId={activeClusterId}
 *     clusterName={activeClusterName}
 *     onClose={() => setAssignOpen(false)}
 *     onAssigned={(assignment, team) => ...}
 *   />
 *
 * The modal loads teams itself (nearest first when coordinates exist),
 * lets the dispatcher call a team directly, and POSTs the assignment.
 */
export default function AssignTeamModal({
  visible,
  clusterId,
  clusterName,
  onClose,
  onAssigned,
}) {
  const [teams, setTeams] = useState([]);
  const [targetCluster, setTargetCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState(null);
  const { invalidateClusters } = useCluster();

  // Pure fetch + sort — no state writes, so both the open-effect and the
  // retry button can share it.
  const fetchTeamsForCluster = useCallback(async () => {
    const [teamList, clusterList] = await Promise.all([
      getTeams(),
      getOpenClusters(),
    ]);
    const target =
      clusterList.find((c) => c.cluster_id === Number(clusterId)) ?? null;

    // Nearest teams first when the cluster has coordinates to compare against.
    const sorted = target
      ? [...teamList].sort(
          (a, b) =>
            (haversineMeters(a, target) ?? Infinity) -
            (haversineMeters(b, target) ?? Infinity)
        )
      : teamList;
    return { teams: sorted, target };
  }, [clusterId]);

  const applyResult = useCallback(({ teams: sorted, target }) => {
    setTeams(sorted);
    setTargetCluster(target);
    setError(null);
    setLoading(false);
  }, []);

  const applyError = useCallback((err) => {
    console.log("AssignTeamModal load error:", err?.message || err);
    setError("Couldn't load teams.");
    setLoading(false);
  }, []);

  // Fresh data every time the popup opens.
  useEffect(() => {
    if (!visible || !clusterId) return;
    let active = true;
    fetchTeamsForCluster().then(
      (result) => {
        if (active) applyResult(result);
      },
      (err) => {
        if (active) applyError(err);
      }
    );
    return () => {
      active = false;
    };
  }, [visible, clusterId, fetchTeamsForCluster, applyResult, applyError]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchTeamsForCluster().then(applyResult).catch(applyError);
  };

  const handleAssign = async (team) => {
    if (assigningId != null) return;
    setAssigningId(team.team_id);
    setError(null);
    try {
      const assignment = await assignTeamToCluster(
        team.team_id,
        Number(clusterId)
      );
      // keep other dispatcher screens (Map, Reports) in sync immediately
      invalidateClusters();
      onAssigned?.(assignment, team);
      onClose?.();
    } catch (err) {
      setError(
        assignmentError(err, "Failed to assign this team.")
      );
    } finally {
      setAssigningId(null);
    }
  };

  const handleCall = (team) => {
    if (!team.contact_number) return;
    Linking.openURL(`tel:${team.contact_number.replace(/\s+/g, "")}`);
  };

  const renderDistance = (team) => {
    if (!targetCluster) return null;
    const label = formatDistance(haversineMeters(team, targetCluster));
    if (!label) return null;
    return (
      <View style={styles.distanceRow}>
        <MaterialIcons name="near-me" size={12} color={colors.primary} />
        <Text style={styles.distanceText}>{label}</Text>
      </View>
    );
  };

  const renderTeam = ({ item }) => (
    <View style={styles.teamCard}>
      <View style={styles.teamTopRow}>
        <View style={styles.avatar}>
          <Ionicons name="people" size={18} color={colors.primary} />
        </View>
        <View style={styles.teamBody}>
          <Text style={styles.teamName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.teamLocation} numberOfLines={1}>
            {item.location_text}
          </Text>
          {renderDistance(item)}
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.assignButton,
            (item.status !== "available" || assigningId != null) &&
              styles.buttonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={item.status !== "available" || assigningId != null}
          onPress={() => handleAssign(item)}
        >
          {assigningId === item.team_id ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <MaterialIcons
                name="assignment-turned-in"
                size={16}
                color={colors.white}
              />
              <Text style={styles.assignButtonText}>Assign</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.callButton,
            !item.contact_number && styles.buttonDisabled,
          ]}
          activeOpacity={0.8}
          disabled={!item.contact_number}
          onPress={() => handleCall(item)}
        >
          <MaterialIcons name="call" size={16} color={colors.primary} />
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const title = clusterName ?? targetCluster?.name ?? `Cluster #${clusterId}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Assign a Team</Text>
              <View style={styles.subtitleRow}>
                <PriorityChip priority={targetCluster?.priority} />
                <Text style={styles.subtitle} numberOfLines={1}>
                  {title}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : teams.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={28} color={colors.primary} />
              <Text style={styles.emptyTitle}>No teams yet</Text>
              <Text style={styles.emptyCopy}>
                Create teams from the Team tab first.
              </Text>
            </View>
          ) : (
            <FlatList
              data={teams}
              keyExtractor={(item) => String(item.team_id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={renderTeam}
            />
          )}

          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
              {!loading ? (
                <TouchableOpacity
                  onPress={handleRetry}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(24, 32, 51, 0.5)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: "78%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 10,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    flexShrink: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  emptyCopy: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 8,
  },
  teamCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  teamTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  teamBody: {
    flex: 1,
    marginRight: 6,
    gap: 2,
  },
  teamName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  teamLocation: {
    fontSize: 12,
    color: colors.muted,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  assignButton: {
    flex: 1,
    backgroundColor: colors.primary,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  assignButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
  callButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  callButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  errorWrap: {
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
