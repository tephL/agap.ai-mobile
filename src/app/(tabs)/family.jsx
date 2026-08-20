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
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  getFamilyMembers,
  removeMember,
  getMyInvitations,
} from "@/services/familyService";

export default function FamilyScreen() {
  const router = useRouter();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // File: src/app/(tabs)/family.jsx

    const loadData = useCallback(async () => {
    try {
        const familyId = await SecureStore.getItemAsync("family_id");

        // No family yet → just show the "Create Family" UI
        if (!familyId) {
        setFamily(null);
        setLoading(false);
        return;
        }

        const data = await getFamilyMembers(familyId);
        setFamily(data);

        const creatorFlag = await SecureStore.getItemAsync("is_family_creator");
        setIsCreator(creatorFlag === "true");

        const invites = await getMyInvitations();
        setPendingCount(invites?.length || 0);
    } catch (err) {
        console.error("Family load error:", err?.response?.data || err.message || err);

        // Don't show scary alert if it's just "no family"
        if (err?.response?.status !== 404) {
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
              Alert.alert("Error", err.response?.data?.error || "Failed to remove");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ========== NO FAMILY YET ==========
  if (!family) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You have no family yet</Text>
        <Text style={styles.subtitle}>
          Create a family or wait for an invitation
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/family/create")}
        >
          <Text style={styles.btnText}>Create Family</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/invitations")}
        >
          <Text style={styles.secondaryBtnText}>
            View Invitations {pendingCount > 0 ? `(${pendingCount})` : ""}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ========== HAS FAMILY ==========
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{family.name}</Text>
        <Text style={styles.subtitle}>
          {family.members?.length || 0} members
        </Text>
      </View>

      {isCreator && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            router.push({
              pathname: "/family/invite",
              params: { familyId: family.family_id },
            })
          }
        >
          <Text style={styles.btnText}>Invite Member</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => router.push("/invitations")}
      >
        <Text style={styles.secondaryBtnText}>
          Pending Invitations {pendingCount > 0 ? `(${pendingCount})` : ""}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={family.members || []}
        keyExtractor={(item) => String(item.user_id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View>
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
          <Text style={styles.empty}>No members yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1c1c1c",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: "#1c1c1c",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#1c1c1c",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  secondaryBtnText: {
    color: "#1c1c1c",
    fontWeight: "600",
  },
  memberCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
  },
  memberRelation: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    textTransform: "capitalize",
  },
  removeBtn: {
    backgroundColor: "#ffebee",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeText: {
    color: "#c62828",
    fontWeight: "600",
    fontSize: 13,
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
});
