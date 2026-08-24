import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  ASSIGNMENT_STATUSES,
  getAssignmentForTeam,
  getOpenClusters,
  getTeams,
  assignTeamToCluster,
  updateAssignmentStatus,
} from "@/services/teamService";

const PRIORITY_STYLES = {
  high: { bg: "#FDECEC", fg: colors.primary },
  medium: { bg: "#FFF3E0", fg: "#B26A00" },
  low: { bg: "#E6F4EA", fg: "#2E7D32" },
};

function PriorityChip({ priority }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low;
  return (
    <View style={[styles.chip, { backgroundColor: style.bg }]}>
      <Text style={[styles.chipText, { color: style.fg }]}>
        {(priority ?? "").toUpperCase()}
      </Text>
    </View>
  );
}

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
  const teamId = Number(params.teamId);
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

  const refresh = useCallback(async () => {
    const [assignment, clusterList] = await Promise.all([
      getAssignmentForTeam(teamId),
      getOpenClusters(),
    ]);
    setAssignment(assignment);
    setClusters(clusterList);
    setTeam((prev) =>
      prev ? { ...prev, status: assignment?.status === "resolved" ? "available" : prev.status } : prev
    );
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
    } catch (err) {
      setError(err?.message ?? "Failed to assign team.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (busy || !assignment) return;
    const next =
      assignment.status === "pending"
        ? "dispatched"
        : assignment.status === "dispatched"
          ? "resolved"
          : null;
    if (!next) return;

    setBusy(true);
    setError(null);
    try {
      await updateAssignmentStatus(assignment.assignment_id, next);
      await refresh();
    } catch (err) {
      setError(err?.message ?? "Failed to update status.");
    } finally {
      setBusy(false);
    }
  };

  const handleCall = () => {
    if (!team?.contact_number) return;
    Linking.openURL(`tel:${team.contact_number.replace(/\s+/g, "")}`);
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
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
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
