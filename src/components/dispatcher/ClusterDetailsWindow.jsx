import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import PriorityChip from "../ui/PriorityChip";
import StatusBadge from "../ui/StatusBadge";
import { reverseGeocode } from "../../services/geocodingService";

export default function ClusterDetailsWindow({
  cluster,
  assignedTeam = null,
  assignedExtraCount = 0,
  onClose,
  onAssignTeam,
}) {
  const router = useRouter();
  const [barangay, setBarangay] = useState(null);

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

  return (
    <View style={styles.window}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{locationLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Info row: priority, status, reports count */}
      <View style={styles.infoRow}>
        <View style={styles.infoPill}>
          <PriorityChip priority={cluster.priority_level} />
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillLabel}>Status</Text>
          <Text style={styles.infoPillValue}>
            {cluster.status ?? "open"}
          </Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillLabel}>Reports</Text>
          <Text style={styles.infoPillValue}>
            {cluster.report_count ?? 0}
          </Text>
        </View>
      </View>

      {/* AI Summary */}
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

      {/* Affected people */}
      <View style={styles.affectedRow}>
        <Ionicons name="people-outline" size={16} color={colors.muted} />
        <Text style={styles.affectedLabel}>Affected</Text>
        <Text style={styles.affectedValue}>
          {cluster.people_affected ?? 0}
        </Text>
      </View>

      {/* Assigned team banner */}
      {assignedTeam ? (
        <View style={styles.assignedBanner}>
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
        </View>
      ) : null}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.seeDetailsButton}
          activeOpacity={0.8}
          onPress={handleSeeDetails}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={styles.seeDetailsText}>See Details</Text>
        </TouchableOpacity>

        {!assignedTeam ? (
          <TouchableOpacity
            style={styles.assignButton}
            activeOpacity={0.8}
            onPress={onAssignTeam}
          >
            <Ionicons name="people-circle-outline" size={18} color={colors.white} />
            <Text style={styles.assignButtonText}>Assign a Team</Text>
          </TouchableOpacity>
        ) : null}
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
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  infoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  infoPillLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  infoPillValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    textTransform: "capitalize",
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  affectedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 10,
  },
  affectedLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  affectedValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
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
    marginBottom: 10,
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
  },
  seeDetailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
  },
  seeDetailsText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  assignButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
