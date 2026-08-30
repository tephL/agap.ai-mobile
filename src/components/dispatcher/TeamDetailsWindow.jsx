import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import StatusBadge from "../ui/StatusBadge";

function formatContact(value) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+63${digits}`;
  }
  return value;
}

export default function TeamDetailsWindow({
  team,
  assignedCluster = null,
  onClose,
  onSeeDetails,
  onOpenCluster,
}) {
  if (!team) return null;

  const coordinateLabel =
    typeof team.lat === "number" && typeof team.lng === "number"
      ? `${team.lat.toFixed(5)}, ${team.lng.toFixed(5)}`
      : null;

  const assignedClusterLabel = assignedCluster
    ? `Cluster #${assignedCluster.cluster_id}${
        assignedCluster.city ? ` · ${assignedCluster.city}` : ""
      }`
    : null;

  return (
    <View style={styles.window}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{team.name}</Text>
          <View style={styles.headerChips}>
            <StatusBadge status={team.status} />
            {team.location_text ? (
              <Text style={styles.locationText} numberOfLines={1}>
                {team.location_text}
              </Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoRowWrap}>
        <View style={[styles.infoStat, styles.infoStatGap]}>
          <Ionicons name="call-outline" size={16} color={colors.muted} />
          <Text style={styles.infoStatLabel}>Contact</Text>
          <Text style={styles.infoStatValue} numberOfLines={1}>
            {formatContact(team.contact_number) ?? "—"}
          </Text>
        </View>
        <View style={styles.infoStat}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={styles.infoStatLabel}>Base</Text>
          <Text style={styles.infoStatValue} numberOfLines={1}>
            {coordinateLabel ?? "—"}
          </Text>
        </View>
      </View>

      {/* Cluster this team is currently dispatched to — tapping it pans
          the map to that cluster (mirrors the assigned-team banner) */}
      {assignedCluster ? (
        <TouchableOpacity
          style={styles.assignedBanner}
          activeOpacity={0.7}
          onPress={onOpenCluster}
        >
          <View style={styles.assignedIconWrap}>
            <Ionicons name="location-outline" size={18} color={colors.white} />
          </View>
          <View style={styles.assignedBody}>
            <Text style={styles.assignedLabel}>Assigned Cluster</Text>
            <Text style={styles.assignedName} numberOfLines={1}>
              {assignedClusterLabel}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.detailsButton}
        activeOpacity={0.8}
        onPress={onSeeDetails}
      >
        <Ionicons name="information-circle-outline" size={18} color={colors.white} />
        <Text style={styles.detailsButtonText}>See Details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
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
    marginRight: 8,
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
  locationText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  infoRowWrap: {
    flexDirection: "row",
    marginBottom: 12,
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
  infoStatGap: {
    marginRight: 8,
  },
  infoStatLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  infoStatValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
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
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
