import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import PriorityChip from "@/components/ui/PriorityChip";
import { fetchClusterReports } from "@/services/dispatcher/clusterServ";
import { reverseGeocode } from "@/services/geocodingService";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "reports", label: "Reports" },
];

const REPORT_STATUS_STYLES = {
  open: { bg: "#FEE2E2", fg: "#B91C1C" },
  saved: { bg: "#FEF3C7", fg: "#A16207" },
  resolved: { bg: "#DCFCE7", fg: "#15803D" },
  unknown: { bg: colors.surface, fg: colors.muted },
};

const DESCRIPTION_MAX_LENGTH = 200;

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

export default function ClusterDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const clusterId = Number(params.clusterId);
  const cityFromParams = params.city ?? "";
  const priorityFromParams = params.priority ?? "low";
  const statusFromParams = params.status ?? "open";
  const reportCountFromParams = Number(params.reportCount) || 0;
  const peopleAffectedFromParams = Number(params.peopleAffected) || 0;

  const [activeTab, setActiveTab] = useState("summary");
  const [cluster, setCluster] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barangay, setBarangay] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await fetchClusterReports(clusterId);
        if (cancelled) return;
        setCluster(data?.cluster ?? null);
        setReports(data?.reports ?? []);
      } catch (e) {
        console.log("cluster-detail load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [clusterId]);

  useEffect(() => {
    const lat = cluster?.latitude;
    const lng = cluster?.longitude;
    if (!lat || !lng) return;
    let cancelled = false;
    reverseGeocode(lat, lng).then((result) => {
      if (!cancelled) setBarangay(result?.barangay ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [cluster?.latitude, cluster?.longitude]);

  const displayCluster = cluster ?? {
    city: cityFromParams,
    priority_level: priorityFromParams,
    status: statusFromParams,
    report_count: reportCountFromParams,
    people_affected: peopleAffectedFromParams,
  };

  const locationLabel = barangay
    ? `Cluster #${clusterId} – ${barangay}, ${displayCluster.city}`
    : `Cluster #${clusterId} – ${displayCluster.city}`;

  const actionPlan = Array.isArray(displayCluster.action_plan)
    ? displayCluster.action_plan
    : [];

  const reportList = useMemo(() => reports ?? [], [reports]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {locationLabel}
        </Text>
        <View style={styles.headerRight}>
          <PriorityChip priority={displayCluster.priority_level} />
        </View>
      </View>

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
                    {displayCluster.report_count ?? reportList.length}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : activeTab === "summary" ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* People affected */}
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={18} color={colors.muted} />
              <Text style={styles.statLabel}>Affected</Text>
              <Text style={styles.statValue}>
                {displayCluster.people_affected ?? 0}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="document-text-outline" size={18} color={colors.muted} />
              <Text style={styles.statLabel}>Reports</Text>
              <Text style={styles.statValue}>
                {displayCluster.report_count ?? reportList.length}
              </Text>
            </View>
          </View>

          {/* AI Summary */}
          {displayCluster.ai_summary ? (
            <View style={styles.card}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                <Text style={styles.sectionTitle}>AI Summary</Text>
              </View>
              <Text style={styles.summaryText}>
                {displayCluster.ai_summary}
              </Text>
            </View>
          ) : null}

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
            Updated {formatDate(displayCluster.updated_at)}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {reportList.length > 0 ? (
            reportList.map((report) => {
              const statusStyle =
                REPORT_STATUS_STYLES[report.status] ??
                REPORT_STATUS_STYLES.unknown;
              const reporterLabel = report.reporter
                ? report.reporter.name || report.reporter.username
                : null;
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
                        size={20}
                        color={colors.placeholder}
                      />
                    </View>
                  )}
                  <View style={styles.reportBody}>
                    <Text
                      style={styles.reportName}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {report.reporter?.name ||
                        report.reporter?.username ||
                        "Anonymous"}
                    </Text>
                    <Text
                      style={styles.reportSummary}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {trimDescription(
                        report.ai_summary || report.description
                      ) || "No description provided."}
                    </Text>
                    <View style={styles.reportFooter}>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  headerRight: {
    marginLeft: "auto",
  },
  tabTrack: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
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
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  statLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 8,
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
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  planStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  stepNumberWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  updatedText: {
    fontSize: 11,
    color: colors.placeholder,
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reportCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  reportImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
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
  reportName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  reportSummary: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.muted,
  },
  reportFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
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
    fontSize: 11,
    color: colors.placeholder,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: 24,
  },
});
