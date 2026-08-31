import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import PriorityChip from "../ui/PriorityChip";
import DisasterTypeChip from "../ui/DisasterTypeChip";
import StatusBadge from "../ui/StatusBadge";
import { reverseGeocode } from "../../services/geocodingService";
import { updateClusterStatus } from "../../services/teamService";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ClusterDetailsWindow({
  cluster,
  assignedTeam = null,
  assignedExtraCount = 0,
  onClose,
  onAssignTeam,
  onResolved,
  onOpenTeam,
  onCancelDispatch,
}) {
  const router = useRouter();
  const [barangay, setBarangay] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!cluster?.latitude || !cluster?.longitude) return;
    let cancelled = false;
    reverseGeocode(cluster.latitude, cluster.longitude).then((result) => {
      if (!cancelled) setBarangay(result?.barangay ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [cluster?.cluster_id, cluster?.latitude, cluster?.longitude]);

  if (!cluster) return null;

  const locationLabel = barangay
    ? `Cluster #${cluster.cluster_id} – ${barangay}, ${cluster.city}`
    : `Cluster #${cluster.cluster_id} – ${cluster.city}`;

  const handleSeeDetails = () => {
    router.push({
      pathname: "/cluster-detail",
      params: {
        clusterId: String(cluster.cluster_id),
        city: cluster.city ?? "",
        priority: cluster.priority_level ?? "low",
        status: cluster.status ?? "open",
        reportCount: String(cluster.report_count ?? 0),
        peopleAffected: String(cluster.people_affected ?? 0),
      },
    });
  };

  const handleOpenTeam = () => {
    onOpenTeam?.();
  };

  const handleResolve = () => {
    Alert.alert(
      "Resolve Cluster",
      "Are you sure you want to mark this cluster as resolved? This will release all assigned teams.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve",
          style: "destructive",
          onPress: async () => {
            if (resolving) return;
            setResolving(true);
            try {
              await updateClusterStatus(cluster.cluster_id, "resolved");
              onResolved?.();
              onClose?.();
            } catch (e) {
              console.log("resolve cluster error:", e);
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelDispatch = () => {
    Alert.alert(
      "Cancel Dispatch?",
      "This will recall the team and remove their assignment. The cluster will remain open for reassignment.",
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Cancel Dispatch",
          style: "destructive",
          onPress: async () => {
            if (cancelling) return;
            setCancelling(true);
            try {
              await onCancelDispatch?.();
              onClose?.();
            } catch (e) {
              console.log("cancel dispatch error:", e);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.window}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{locationLabel}</Text>
          <View style={styles.headerChips}>
            <PriorityChip priority={cluster.priority_level} />
            <DisasterTypeChip type={cluster.ai_disaster_type} />
            <Text style={styles.statusText}>{cluster.status}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Team currently dispatched to this cluster */}
      {assignedTeam ? (
        <TouchableOpacity
          style={styles.assignedBanner}
          activeOpacity={0.7}
          onPress={handleOpenTeam}
        >
          <View style={styles.assignedIconWrap}>
            <Ionicons name="people-circle-outline" size={18} color={colors.white} />
          </View>
          <View style={styles.assignedBody}>
            <Text style={styles.assignedLabel}>Assigned Team</Text>
            <Text style={styles.assignedName} numberOfLines={1}>
              {assignedTeam.name}
              {assignedExtraCount > 0 ? ` +${assignedExtraCount}` : ""}
            </Text>
          </View>
          <StatusBadge status={assignedTeam.status} />
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.infoRowWrap}>
          <View style={styles.infoStat}>
            <Ionicons name="people-outline" size={16} color={colors.muted} />
            <Text style={styles.infoStatLabel}>Affected</Text>
            <Text style={styles.infoStatValue}>{cluster.people_affected ?? 0}</Text>
          </View>
          {cluster.ai_severity ? (
            <View style={styles.infoStat}>
              <Ionicons name="pulse-outline" size={16} color={colors.muted} />
              <Text style={styles.infoStatLabel}>Severity</Text>
              <Text style={[styles.infoStatValue, { textTransform: "capitalize" }]}>
                {cluster.ai_severity}
              </Text>
            </View>
          ) : null}
        </View>

        {cluster.ai_summary ? (
          <View style={styles.summaryCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={styles.sectionTitle}>AI Summary</Text>
            </View>
            <Text style={styles.summaryText} numberOfLines={3} ellipsizeMode="tail">
              {cluster.ai_summary}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.seeDetailsButton}
          activeOpacity={0.8}
          onPress={handleSeeDetails}
        >
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
          <Text style={styles.seeDetailsText}>Details</Text>
        </TouchableOpacity>

        {!assignedTeam ? (
          <TouchableOpacity
            style={styles.assignButton}
            activeOpacity={0.8}
            onPress={onAssignTeam}
          >
            <Ionicons name="people-circle-outline" size={16} color={colors.white} />
            <Text style={styles.assignButtonText}>Assign</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.cancelDispatchButton}
            activeOpacity={0.8}
            onPress={handleCancelDispatch}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="close-circle-outline" size={16} color={colors.white} />
            )}
            <Text style={styles.cancelDispatchButtonText}>Cancel Dispatch</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.resolveButton}
          activeOpacity={0.8}
          onPress={handleResolve}
          disabled={resolving}
        >
          {resolving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
          )}
          <Text style={styles.resolveButtonText}>Resolve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    maxHeight: 340,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  headerChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "capitalize",
  },
  assignedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FDECEC",
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  assignedIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  assignedBody: {
    flex: 1,
    gap: 1,
  },
  assignedLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  assignedName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  seeDetailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: colors.background,
  },
  seeDetailsText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  body: {
    gap: 8,
    flexShrink: 1,
  },
  infoRowWrap: {
    flexDirection: "row",
  },
  infoStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  infoStatLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  infoStatValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.muted,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  assignButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
  },
  assignButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  resolveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#15803D",
    borderRadius: 12,
    paddingVertical: 11,
  },
  resolveButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  cancelDispatchButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#B91C1C",
    borderRadius: 12,
    paddingVertical: 11,
  },
  cancelDispatchButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});