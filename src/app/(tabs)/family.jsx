import { useState, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import {
  getFamilyMembers,
  removeMember,
  getMyInvitations,
} from "@/services/familyService";
import colors from "@/constants/colors";

export default function FamilyScreen() {
  const router = useRouter();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [invites, familyId, creatorFlag] = await Promise.all([
        getMyInvitations().catch(() => []),
        SecureStore.getItemAsync("family_id"),
        SecureStore.getItemAsync("is_family_creator"),
      ]);

      setPendingCount(Array.isArray(invites) ? invites.length : 0);
      setIsCreator(creatorFlag === "true");

      if (!familyId) {
        setFamily(null);
        return;
      }

      const data = await getFamilyMembers(familyId);
      setFamily(data);
    } catch (err) {
      console.error(
        "Family load error:",
        err?.response?.data || err.message || err
      );

      if (err?.response?.status === 404) {
        await SecureStore.deleteItemAsync("family_id");
        setFamily(null);
        return;
      }

      if (err?.response?.status !== 401) {
        Alert.alert(
          "Error",
          err?.response?.data?.error || "Failed to load family data"
        );
      }
      setFamily(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const handleRemove = (member) => {
    Alert.alert(
      "Remove Member",
      `Remove ${member.username || member.phone_number}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeMember(family.family_id, member.family_member_id);
              Alert.alert("Success", "Member removed");
              loadData();
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.error || "Failed to remove"
              );
            }
          },
        },
      ]
    );
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
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {item.username || item.phone_number}
                </Text>
                <Text style={styles.memberRelation}>{item.relation}</Text>
              </View>

              {isCreator && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item)}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
