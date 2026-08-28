import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityChip from "@/components/ui/PriorityChip";
import {
  ASSIGNMENT_STATUSES,
  getAssignmentForTeam,
  getOpenClusters,
  getTeams,
  assignTeamToCluster,
  assignmentError,
  updateAssignmentStatus,
  updateTeamVisibility,
  deleteTeam,
} from "@/services/teamService";
import { useCluster } from "@/context/ClusterContext";

function Stepper({ status }) {
  const current = ASSIGNMENT_STATUSES.indexOf(status);

  return (
    <View style={styles.stepper}>
      {ASSIGNMENT_STATUSES.map((step, index) => {
        const reached = index <= current;
        return (
          <View key={step} style={styles.stepWrap}>
            <View
              style={[
                styles.stepDot,
                reached && styles.stepDotReached,
                index < current && styles.stepDotDone,
              ]}
            >
              {index < current ? (
                <MaterialIcons name="check" size={12} color={colors.white} />
              ) : null}
            </View>
            <Text
              style={[
                styles.stepLabel,
                reached ? styles.stepLabelReached : null,
              ]}
            >
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function TeamDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const teamId = Number(params.teamId);
  const { invalidateClusters, focusTeam } = useCluster();
  // Preselected when arriving via "Assign a Team" on a cluster.
  const preselectClusterId = params.assignClusterId
    ? Number(params.assignClusterId)
    : null;

  const [team, setTeam] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [selectedClusterId, setSelectedClusterId] =
    useState(preselectClusterId);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [togglingPublic, setTogglingPublic] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const [teamList, assignment, clusterList] = await Promise.all([
            getTeams(),
            getAssignmentForTeam(teamId),
            getOpenClusters(),
          ]);
          if (!active) return;
          setTeam(teamList.find((t) => t.team_id === teamId) ?? null);
          setAssignment(assignment);
          setClusters(clusterList);
          // Drop a preselected cluster that is no longer open (resolved by
          // someone else, cleaned up, ...) so Assign can't hit a 404.
          setSelectedClusterId((prev) =>
            prev != null && clusterList.some((c) => c.cluster_id === prev)
              ? prev
              : null
          );
        } catch (err) {
          console.log("team-detail load error:", err?.message || err);
          if (active) setError("Something went wrong loading this team.");
        } finally {
          if (active) setLoading(false);
        }
      }

      load();
      return () => {
        active = false;
      };
    }, [teamId])
  );

  // Server-derived truth: team status comes from the teams endpoint
  // (busy while an active assignment exists), never guessed locally.
  const refresh = useCallback(async () => {
    const [teamList, assignment, clusterList] = await Promise.all([
      getTeams(),
      getAssignmentForTeam(teamId),
      getOpenClusters(),
    ]);
    setTeam((prev) =>
      prev ? (teamList.find((t) => t.team_id === prev.team_id) ?? prev) : null
    );
    setAssignment(assignment);
    setClusters(clusterList);
  }, [teamId]);

  const handleAssign = async () => {
    if (busy || !selectedClusterId) return;
    setBusy(true);
    setError(null);
    try {
      const created = await assignTeamToCluster(teamId, selectedClusterId);
      setAssignment(created);
      setTeam((prev) => (prev ? { ...prev, status: "busy" } : prev));
      setClusters((prev) =>
        prev.filter((c) => c.cluster_id !== selectedClusterId)
      );
      invalidateClusters();
    } catch (err) {
      setError(assignmentError(err, "Failed to assign team."));
      // A rejection usually means state moved elsewhere (team got assigned
      // or the cluster closed) — resync with the server.
      refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceStatus = () => {
    if (busy || !assignment) return;
    const next =
      assignment.status === "pending"
        ? "dispatched"
        : assignment.status === "dispatched"
          ? "resolved"
          : null;
    if (!next) return;

    if (next === "resolved") {
      Alert.alert(
        "Mark as Resolved",
        "Are you sure you want to mark this assignment as resolved?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Resolve",
            style: "destructive",
            onPress: () => advanceStatus(next),
          },
        ]
      );
    } else {
      advanceStatus(next);
    }
  };

  const advanceStatus = async (next) => {
    setBusy(true);
    setError(null);
    try {
      await updateAssignmentStatus(assignment.assignment_id, next);
      invalidateClusters();
      await refresh();
    } catch (err) {
      setError(assignmentError(err, "Failed to update status."));
      refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const handleCall = () => {
    if (!team?.contact_number) return;
    Linking.openURL(`tel:${team.contact_number.replace(/\s+/g, "")}`);
  };

  const hasCoords =
    Boolean(team) &&
    typeof team.lat === "number" &&
    typeof team.lng === "number";

  // Hand off to the Map tab: it selects the team's pin and flies the
  // camera to its position (see the focusTeam effect in map.jsx).
  const handleGoToMap = () => {
    if (!hasCoords) return;
    focusTeam(team.team_id);
    router.navigate("/(admin)/map");
  };

  const handleTogglePublic = async () => {
    if (togglingPublic || !team) return;
    setTogglingPublic(true);
    setError(null);
    try {
      const updated = await updateTeamVisibility(team.team_id, !team.is_public);
      setTeam((prev) => (prev ? { ...prev, is_public: updated.is_public } : prev));
    } catch (err) {
      setError(assignmentError(err, "Failed to update visibility."));
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleRelocate = () => {
    if (!team) return;
    router.push({
      pathname: "/relocate-team",
      params: { teamId: team.team_id, teamName: team.name },
    });
  };

  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (deleting || !team) return;
    Alert.alert(
      "Delete Team",
      `Are you sure you want to delete ${team.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            setError(null);
            try {
              await deleteTeam(team.team_id);
              invalidateClusters();
              router.back();
            } catch (err) {
              setError(assignmentError(err, "Failed to delete team."));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar style="dark" />
        <Text style={styles.emptyTitle}>Team not found</Text>
        <Text style={styles.emptyCopy}>
          It may have been removed. Go back and pick another team.
        </Text>
      </View>
    );
  }

  const activeAssignment = assignment && assignment.status !== "resolved" ? assignment : null;
  const resolvedAssignment = assignment?.status === "resolved" ? assignment : null;
  const canAssign = !activeAssignment && Boolean(selectedClusterId);
  const nextStatusLabel =
    assignment?.status === "pending"
      ? "Mark Dispatched"
      : assignment?.status === "dispatched"
        ? "Mark Resolved"
        : null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Team info */}
        <View style={styles.infoCard}>
          <View style={styles.infoTopRow}>
            <View style={styles.avatar}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamLocation}>{team.location_text}</Text>
            </View>
            <StatusBadge status={team.status} />
          </View>
          <View style={styles.contactRow}>
            <MaterialIcons name="call" size={15} color={colors.muted} />
            <Text style={styles.contactText}>{team.contact_number}</Text>
          </View>
          {hasCoords ? (
            <TouchableOpacity
              style={styles.mapButton}
              activeOpacity={0.8}
              onPress={handleGoToMap}
            >
              <MaterialIcons name="near-me" size={15} color={colors.primary} />
              <Text style={styles.mapButtonText}>Go to location on map</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Visibility toggle */}
        <View style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons name="eye" size={18} color={colors.text} />
              <View>
                <Text style={styles.toggleLabel}>Visible to Citizens</Text>
                <Text style={styles.toggleHint}>
                  Show this team&rsquo;s base on the citizen map
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.toggleSwitch, team.is_public && styles.toggleSwitchOn]}
              activeOpacity={0.7}
              onPress={handleTogglePublic}
              disabled={togglingPublic}
            >
              {togglingPublic ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <View
                  style={[styles.toggleKnob, team.is_public && styles.toggleKnobOn]}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Relocate / Delete */}
        <View style={styles.updateRow}>
          <TouchableOpacity
            style={styles.relocateButton}
            activeOpacity={0.8}
            onPress={handleRelocate}
          >
            <MaterialIcons name="place" size={18} color={colors.white} />
            <Text style={styles.relocateButtonText}>Relocate Team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            activeOpacity={0.8}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialIcons name="delete" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Assignment */}
        {activeAssignment?.cluster ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Assigned to</Text>
            <Text style={styles.clusterName}>
              {activeAssignment.cluster.name}
            </Text>
            <View style={styles.clusterMetaRow}>
              <PriorityChip priority={activeAssignment.cluster.priority} />
              <Text style={styles.clusterMeta}>
                {activeAssignment.cluster.report_count} reports ·{" "}
                {activeAssignment.cluster.people_affected} people affected
              </Text>
            </View>

            <Stepper status={activeAssignment.status} />
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>
              {resolvedAssignment ? "Previous assignment resolved" : "Not assigned"}
            </Text>
            <Text style={styles.notAssignedCopy}>
              {resolvedAssignment
                ? `Wrapped up at ${resolvedAssignment.cluster?.name ?? "cluster"}. Pick a new cluster below to dispatch again.`
                : "This team isn't dispatched to any cluster yet. Pick one below."}
            </Text>

            <Text style={styles.pickerTitle}>Select a cluster</Text>
            {clusters.map((cluster) => {
              const selected = cluster.cluster_id === selectedClusterId;
              return (
                <TouchableOpacity
                  key={cluster.cluster_id}
                  style={[styles.clusterOption, selected && styles.clusterOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedClusterId(cluster.cluster_id)}
                >
                  <View style={styles.clusterOptionTextWrap}>
                    <Text style={styles.clusterOptionName}>{cluster.name}</Text>
                    <Text style={styles.clusterMeta}>
                      {cluster.report_count} reports ·{" "}
                      {cluster.people_affected} people affected
                    </Text>
                  </View>
                  <PriorityChip priority={cluster.priority} />
                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected ? (
                      <View style={styles.radioInner} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {clusters.length === 0 ? (
              <Text style={styles.noClustersCopy}>
                No open clusters right now.
              </Text>
            ) : null}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Actions */}
        <View style={styles.actions}>
          {nextStatusLabel ? (
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={handleAdvanceStatus}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialIcons
                    name={
                      assignment.status === "pending"
                        ? "local-shipping"
                        : "check-circle"
                    }
                    size={18}
                    color={colors.white}
                  />
                  <Text style={styles.primaryButtonText}>
                    {nextStatusLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !canAssign && styles.disabledButton,
              ]}
              activeOpacity={0.85}
              onPress={handleAssign}
              disabled={!canAssign || busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialIcons
                    name="assignment-turned-in"
                    size={18}
                    color={colors.white}
                  />
                  <Text style={styles.primaryButtonText}>Assign</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={handleCall}
          >
            <MaterialIcons name="call" size={18} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 14,
  },
  infoTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBody: {
    flex: 1,
    gap: 2,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  teamLocation: {
    fontSize: 13,
    color: colors.muted,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
  },
  mapButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  toggleHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  toggleSwitchOn: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignSelf: "flex-start",
  },
  toggleKnobOn: {
    alignSelf: "flex-end",
  },
  updateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  relocateButton: {
    flex: 1,
    backgroundColor: "#f97316",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  relocateButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  deleteButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  clusterName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  clusterMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  clusterMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  notAssignedCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 6,
  },
  clusterOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  clusterOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: "#FDECEC",
  },
  clusterOptionTextWrap: {
    flex: 1,
    gap: 2,
  },
  clusterOptionName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  noClustersCopy: {
    fontSize: 13,
    color: colors.muted,
  },
  stepper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  stepWrap: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotReached: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  stepLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  stepLabelReached: {
    fontWeight: "700",
    color: colors.text,
  },
  errorText: {
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
  },
});
