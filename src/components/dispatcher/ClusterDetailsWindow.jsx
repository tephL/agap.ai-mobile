import { useMemo, useState } from "react";
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

const TABS = [
  { key: "plan", label: "Action Plan" },
  { key: "reports", label: "Reports" },
];

// Soft badge variants matching the map's status dot colors.
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

export default function ClusterDetailsWindow({
  cluster,
  reports,
  loading,
  assignedTeam = null,
  assignedExtraCount = 0,
  onClose,
  onAssignTeam,
}) {
  const [activeTab, setActiveTab] = useState("plan");

  // Rebuild only when a different set of reports arrives.
  const reportList = useMemo(() => reports ?? [], [reports]);

  if (!cluster) return null;

  const actionPlan = Array.isArray(cluster.action_plan)
    ? cluster.action_plan
    : [];

  return (
    <View style={styles.window}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Cluster #{cluster.cluster_id} · {cluster.city}
          </Text>
          <View style={styles.headerChips}>
            <PriorityChip priority={cluster.priority_level} />
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
        <View style={styles.assignedBanner}>
          <Ionicons name="people-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.assignedText} numberOfLines={1}>
            {assignedTeam.name}
            {assignedExtraCount > 0 ? ` +${assignedExtraCount}` : ""}
          </Text>
          <StatusBadge status={assignedTeam.status} />
        </View>
      ) : null}

      {/* Tab toggle */}
      <View style={styles.tabTrack}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <View style={styles.tabInner}>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.key === "reports" ? (
                <View
                  style={[
                    styles.tabCount,
                    activeTab === tab.key && styles.tabCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCountText,
                      activeTab === tab.key && styles.tabCountTextActive,
                    ]}
                  >
                    {cluster.report_count ?? 0}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body */}
      {activeTab === "plan" ? (
        <View style={styles.planBody}>
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoRowWrap}>
              <View style={styles.infoStat}>
                <Ionicons name="people-outline" size={16} color={colors.muted} />
                <Text style={styles.infoStatLabel}>Affected</Text>
                <Text style={styles.infoStatValue}>{cluster.people_affected ?? 0}</Text>
              </View>
            </View>

            {cluster.ai_summary ? (
              <View style={styles.summaryCard}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                  <Text style={styles.sectionTitle}>AI Summary</Text>
                </View>
                <Text style={styles.summaryText}>{cluster.ai_summary}</Text>
              </View>
            ) : null}

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
          </ScrollView>

          {/* Pinned below the scroll area so it stays visible while scrolling.
              Hidden while a team is dispatched to this cluster. */}
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
      ) : (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
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
                ? (report.reporter.name || report.reporter.username)
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
                    <View style={[styles.reportImage, styles.reportImagePlaceholder]}>
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
                    <Text style={styles.reportDescription} numberOfLines={3}>
                      {report.description ??
                        report.ai_summary ??
                        "No description provided."}
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
      )}
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
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  assignedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  tabTrack: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: colors.white,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: "#FDECEC",
    alignItems: "center",
  },
  tabCountActive: {
    backgroundColor: colors.white,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
  },
  tabCountTextActive: {
    color: colors.primary,
  },
  bodyScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  planBody: {
    flexShrink: 1,
    gap: 10,
  },
  bodyContent: {
    paddingBottom: 4,
    gap: 8,
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
  assignButton: {
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
