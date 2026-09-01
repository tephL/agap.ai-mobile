import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import {
  getMyFamily,
  removeMember,
  leaveFamily,
  getMyInvitations,
  getFamilyMemberReportStatus,
  relationLabel,
} from "@/services/familyService";
import { timeAgo } from "@/utils/timeAgo";
import colors from "@/constants/colors";

export default function FamilyScreen() {
  const router = useRouter();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [familyReportStatus, setFamilyReportStatus] = useState({});
  const loadRunRef = useRef(0);

  const loadData = useCallback(async () => {
    // Only the most recent invocation may touch state — an older, slower
    // response (focus-load vs pull-to-refresh overlap) must be discarded.
    const runId = ++loadRunRef.current;
    try {
      const invites = await getMyInvitations().catch(() => []);
      if (runId !== loadRunRef.current) return;

      const data = await getMyFamily();
      if (runId !== loadRunRef.current) return;

      const reportStatus = await getFamilyMemberReportStatus();
      if (runId !== loadRunRef.current) return;

      setFamilyReportStatus(reportStatus);
      setPendingCount(Array.isArray(invites) ? invites.length : 0);

      // No family is a valid state, not an error.
      if (!data) {
        setFamily(null);
        setIsCreator(false);
        setIsOffline(false);
        setLastSyncedAt(null);
        setLoadError(false);
        return;
      }

      setIsCreator(Boolean(data.is_creator));
      setFamily(data);
      setLoadError(false);

      // SQLite fallback includes last_synced_at.
      setIsOffline(Boolean(data.last_synced_at));
      setLastSyncedAt(data.last_synced_at ?? null);
    } catch (err) {
      if (runId !== loadRunRef.current) return;

      const status = Number(err?.response?.status);

      console.error(
        "Family load error:",
        err?.response?.data || err.message || err
      );

      // Dead session — go log in again instead of faking an empty state.
      if (status === 401) {
        await SecureStore.deleteItemAsync("token");
        router.replace("/login");
        return;
      }

      // Server/network failure is not the same as "no family yet".
      setLoadError(true);
      setFamily(null);
      setIsCreator(false);
      setIsOffline(false);
      setLastSyncedAt(null);
      return;
    } finally {
      if (runId === loadRunRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openInvitations = () => {
    router.push("/invitations");
  };

  // Show "First Last" when personal info exists, falling back to username,
  // then phone number for members who haven't filled it in yet.
  const memberDisplayName = (member) => {
    if (member.first_name || member.last_name) {
      return [member.first_name, member.last_name].filter(Boolean).join(" ");
    }
    if (member.username) return member.username;
    return member.phone_number;
  };

  const handleRemove = (member) => {
    Alert.alert(
      "Remove Member",
      `Remove ${memberDisplayName(member)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (removingId) return;
            setRemovingId(member.family_member_id);
            try {
              await removeMember(family.family_id, member.family_member_id);
              loadData();
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.error || "Failed to remove"
              );
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave Family",
      `Leave "${family.name}"? You will lose access to this family.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveFamily(family.family_id);
              setFamily(null);
              setIsCreator(false);
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.error || "Failed to leave family"
              );
            }
          },
        },
      ]
    );
  };

  const handleMemberPress = (member) => {
    router.push({
      pathname: "/",
      params: { selectedUserId: String(member.user_id) },
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // A failed refresh is not the same as "no family" — show a dedicated
  // error state so users retry instead of thinking their family is gone.
  if (loadError && !family) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <Text style={styles.pageLabel}>Family</Text>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Can&apos;t reach the server</Text>
            <Text style={styles.emptyCopy}>
              We couldn&apos;t refresh your family just now. Check your
              connection — or make sure the backend is running — and try
              again.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, styles.retryBtn]}
              activeOpacity={0.85}
              onPress={() => {
                setLoading(true);
                loadData();
              }}
            >
              <Ionicons name="refresh" size={18} color={colors.white} />
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!family) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <Text style={styles.pageLabel}>Family</Text>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No family yet</Text>
            <Text style={styles.emptyCopy}>
              Create a family or accept an invitation to stay connected during
              emergencies.
            </Text>
          </View>

          <View style={styles.emptyActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push("/create-family")}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={styles.primaryBtnText}>Create Family</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={openInvitations}
              activeOpacity={0.85}
            >
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>
                Pending Invitations
                {pendingCount > 0 ? ` (${pendingCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.pageLabel}>Family</Text>

        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>Offline</Text>
            <Text style={styles.offlineBannerCopy}>
              Showing last saved family data
              {timeAgo(lastSyncedAt) ? ` · saved ${timeAgo(lastSyncedAt)}` : ""}.
              Pull to refresh when you’re back online.
            </Text>
          </View>
        )}

        <View style={styles.familyCard}>
          <View style={styles.familyIcon}>
            <Ionicons name="people" size={26} color={colors.primary} />
          </View>
          <View style={styles.familyCopy}>
            <Text style={styles.familyName} numberOfLines={2}>
              {family.name}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  {family.members?.length || 0}{" "}
                  {(family.members?.length || 0) === 1 ? "member" : "members"}
                </Text>
              </View>
              {isCreator ? (
                <Text style={styles.metaHint}>You’re the creator</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {isCreator && (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.actionBtn]}
              onPress={() =>
                router.push({
                  pathname: "/invite-member",
                  params: { familyId: String(family.family_id) },
                })
              }
              activeOpacity={0.85}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.white} />
              <Text style={styles.primaryBtnText}>Invite</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              isCreator ? styles.actionBtn : styles.fullWidthBtn,
            ]}
            onPress={openInvitations}
            activeOpacity={0.85}
          >
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={styles.secondaryBtnText}>
              Invites{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {!isCreator && (
          <TouchableOpacity
            style={styles.leaveBtn}
            onPress={handleLeave}
            activeOpacity={0.85}
          >
            <Ionicons name="exit-outline" size={18} color="#D32F2F" />
            <Text style={styles.leaveBtnText}>Leave Family</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Members</Text>

        <FlatList
          data={family.members || []}
          keyExtractor={(item) =>
            String(item.family_member_id || item.user_id)
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          
    renderItem={({ item }) => {
      const isItemCreator = item.user_id === family.created_by;
      const hasActiveReport = Boolean(familyReportStatus[item.user_id]?.hasActiveReport);
      return (
        <TouchableOpacity
          style={[
            styles.memberCard,
            hasActiveReport && styles.memberCardReport,
          ]}
          activeOpacity={0.7}
          onPress={() => handleMemberPress(item)}
        >
          <View style={[
            styles.memberAvatar,
            hasActiveReport && styles.memberAvatarReport,
          ]}>
            <Ionicons name="person" size={18} color={hasActiveReport ? colors.white : colors.primary} />
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {memberDisplayName(item)}
            </Text>
            <Text style={styles.memberRelation}>
              {relationLabel(item.relation)}
            </Text>
            {hasActiveReport && (
              <View style={styles.reportTag}>
                <Ionicons name="warning" size={12} color={colors.primary} />
                <Text style={styles.reportTagText}>Reported</Text>
              </View>
            )}
          </View>
          {isCreator && !isItemCreator && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(item)}
              disabled={removingId === item.family_member_id}
            >
              {removingId === item.family_member_id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.removeText}>Remove</Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    }}

          ListEmptyComponent={
            <Text style={styles.emptyList}>No members yet</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pageLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 12,
  },
  offlineBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  offlineBannerText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  offlineBannerCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    marginTop: 4,
  },
  familyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 14,
  },
  familyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  familyCopy: {
    flex: 1,
  },
  familyName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  metaPill: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  metaHint: {
    fontSize: 12,
    color: colors.muted,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
  },
  emptyActions: {
    gap: 10,
  },
  retryBtn: {
    alignSelf: "stretch",
    marginTop: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  fullWidthBtn: {
    width: "100%",
  },
  leaveBtn: {
    borderWidth: 1.5,
    borderColor: "#D32F2F",
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  leaveBtnText: {
    color: "#D32F2F",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 28,
  },
  memberCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  memberCardReport: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  memberAvatarReport: {
    backgroundColor: colors.primary,
  },
  reportTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  reportTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  memberRelation: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  removeBtn: {
    backgroundColor: "#FDECEC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  emptyList: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 32,
  },
});
