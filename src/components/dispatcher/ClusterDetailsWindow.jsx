import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import PriorityChip from "../ui/PriorityChip";

const TABS = [
  { key: "plan", label: "Action Plan" },
  { key: "people", label: "Affected People" },
];

// Unique reporters within the cluster become the "affected people" cards.
function collectAffectedPeople(reports) {
  const byUserId = new Map();
  for (const report of reports ?? []) {
    const reporter = report.reporter;
    if (!reporter || reporter.user_id == null) continue;
    if (!byUserId.has(reporter.user_id)) {
      byUserId.set(reporter.user_id, {
        user_id: reporter.user_id,
        name: reporter.name,
        username: reporter.username,
        reports: [],
      });
    }
    byUserId.get(reporter.user_id).reports.push(report);
  }
  return [...byUserId.values()];
}

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
  onClose,
  onAssignTeam,
}) {
  const [activeTab, setActiveTab] = useState("plan");

  // Rebuild only when a different set of reports arrives.
  const affectedPeople = useMemo(
    () => collectAffectedPeople(reports),
    [reports]
  );

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
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
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
              <View style={[styles.infoStat, styles.infoStatGap]}>
                <Ionicons name="documents-outline" size={16} color={colors.muted} />
                <Text style={styles.infoStatLabel}>Reports</Text>
                <Text style={styles.infoStatValue}>{cluster.report_count ?? 0}</Text>
              </View>
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

          {/* Pinned below the scroll area so it stays visible while scrolling. */}
          <TouchableOpacity
            style={styles.assignButton}
            activeOpacity={0.8}
            onPress={onAssignTeam}
          >
            <Ionicons name="people-circle-outline" size={18} color={colors.white} />
            <Text style={styles.assignButtonText}>Assign a Team</Text>
          </TouchableOpacity>
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
          ) : affectedPeople.length > 0 ? (
            affectedPeople.map((person) => (
              <TouchableOpacity
                key={person.user_id}
                style={styles.personCard}
                activeOpacity={0.7}
                onPress={() => {
                  // Cards will be wired to a person detail view later.
                }}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(person.name ?? person.username ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.personInfo}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {person.name ?? "Unknown"}
                  </Text>
                  <Text style={styles.personSummary} numberOfLines={2}>
                    {cluster.ai_summary ?? "No summary yet."}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.placeholder}
                />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No affected people reported.</Text>
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
  infoStatGap: {
    marginRight: 8,
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
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.white,
  },
  personInfo: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  personSummary: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: 16,
  },
});
