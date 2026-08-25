import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import PriorityChip from "../ui/PriorityChip";
import StatusBadge from "../ui/StatusBadge";
import { reverseGeocode } from "../../services/geocodingService";

const DESCRIPTION_MAX_LENGTH = 200;

const REPORT_STATUS_STYLES = {
  open: { bg: "#FEE2E2", fg: "#B91C1C" },
  saved: { bg: "#FEF3C7", fg: "#A16207" },
  resolved: { bg: "#DCFCE7", fg: "#15803D" },
  unknown: { bg: colors.surface, fg: colors.muted },
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function trimDescription(text) {
  if (!text) return "";
  const clean = String(text);
  if (clean.length <= DESCRIPTION_MAX_LENGTH) return clean;
  return `${clean.slice(0, DESCRIPTION_MAX_LENGTH).trimEnd()}…`;
}

export default function ClusterDetailsWindow({
  cluster,
  reports,
  loading,
  assignedTeam = null,
  assignedExtraCount = 0,
  onClose,
  onAssignTeam,
}) {
  const [barangay, setBarangay] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const reportList = useMemo(() => reports ?? [], [reports]);

  useEffect(() => {
    if (!cluster?.latitude || !cluster?.longitude) return;
    let cancelled = false;
    setGeoLoading(true);
    reverseGeocode(cluster.latitude, cluster.longitude)
      .then((result) => {
        if (!cancelled) setBarangay(result?.barangay ?? null);
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cluster?.cluster_id, cluster?.latitude, cluster?.longitude]);

  if (!cluster) return null;

  const actionPlan = Array.isArray(cluster.action_plan)
    ? cluster.action_plan
    : [];

  const locationLabel = barangay
    ? `Cluster #${cluster.cluster_id} – ${barangay}, ${cluster.city}`
    : `Cluster #${cluster.cluster_id} – ${cluster.city}`;

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
          <Text style={styles.summaryText}>{cluster.ai_summary}</Text>
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
          onPress={() => setExpanded((prev) => !prev)}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "document-text-outline"}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.seeDetailsText}>
            {expanded ? "Hide Details" : "See Details"}
          </Text>
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

      {/* Expanded details: Action Plan + Reports */}
      {expanded ? (
        <View style={styles.expandedSection}>
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Action Plan */}
            <View style={styles.sectionTitleRow}>
              <Ionicons name="list-outline" size={16} color={colors.muted} />
              <Text style={styles.sectionTitle}>Action Plan</Text>
            </View>

            {actionPlan.length > 0 ? (
              actionPlan.map((step, index) => (
                <View key={`${index}-${step}`} style={styles.planStep}>
                  <View style={styles.stepNumberWrap}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No action plan yet.</Text>
            )}

            <Text style={styles.updatedText}>
              Updated {formatDate(cluster.updated_at)}
            </Text>

            {/* Reports */}
            <View style={[styles.sectionTitleRow, { marginTop: 12 }]}>
              <Ionicons name="document-outline" size={16} color={colors.muted} />
              <Text style={styles.sectionTitle}>Reports</Text>
            </View>

            {loading ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.loader}
              />
            ) : reportList.length > 0 ? (
              reportList.map((report) => {
                const statusStyle =
                  REPORT_STATUS_STYLES[report.status] ??
                  REPORT_STATUS_STYLES.unknown;
                const reporterLabel = report.reporter
                  ? report.reporter.name || report.reporter.username
                  : null;
                const metaText = [
                  reporterLabel,
                  (report.people_affected ?? 0) > 0
                    ? `${report.people_affected} affected`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const thumbnail = report.images?.[0];

                return (
                  <View key={report.report_id} style={styles.reportCard}>
                    {thumbnail ? (
                      <Image
                        source={{ uri: thumbnail }}
                        style={styles.reportImage}
                      />
                    ) : (
                      <View
                        style={[styles.reportImage, styles.reportImagePlaceholder]}
                      >
                        <Ionicons
                          name="image-outline"
                          size={16}
                          color={colors.placeholder}
                        />
                      </View>
                    )}
                    <View style={styles.reportBody}>
                      <View style={styles.reportTopRow}>
                        <View
                          style={[
                            styles.statusChip,
                            { backgroundColor: statusStyle.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              { color: statusStyle.fg },
                            ]}
                          >
                            {report.status}
                          </Text>
                        </View>
                        <Text style={styles.reportDate} numberOfLines={1}>
                          {formatDate(report.created_at)}
                        </Text>
                      </View>
                      <Text
                        style={styles.reportDescription}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                      >
                        {trimDescription(
                          report.description ?? report.ai_summary
                        ) || "No description provided."}
                      </Text>
                      {metaText ? (
                        <Text style={styles.reportMeta} numberOfLines={1}>
                          {metaText}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No reports yet.</Text>
            )}
          </ScrollView>
        </View>
      ) : null}
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
  expandedSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  bodyScroll: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 200,
  },
  bodyContent: {
    paddingBottom: 4,
    gap: 8,
  },
  planStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  stepNumberWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  updatedText: {
    fontSize: 11,
    color: colors.placeholder,
    marginTop: 4,
  },
  loader: {
    marginVertical: 16,
  },
  reportCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  reportImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  reportImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  reportBody: {
    flex: 1,
    gap: 4,
  },
  reportTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  reportDate: {
    flex: 1,
    fontSize: 11,
    color: colors.placeholder,
    textAlign: "right",
  },
  reportDescription: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.text,
  },
  reportMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: 16,
  },
});
