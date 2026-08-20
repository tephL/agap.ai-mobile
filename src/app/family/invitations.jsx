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
import { useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
} from "@/services/familyService";

export default function InvitationsScreen() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyInvitations();
      setInvites(data);
    } catch (err) {
      Alert.alert("Error", "Failed to load invitations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleAccept = async (id) => {
    try {
      const result = await acceptInvitation(id);
      // Save family_id so Family tab can load it
      await SecureStore.setItemAsync("family_id", String(result.family_id));
      await SecureStore.setItemAsync("is_family_creator", "false");

      Alert.alert("Success", "You joined the family!");
      load();
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to accept"
      );
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectInvitation(id);
      Alert.alert("Rejected", "Invitation rejected");
      load();
    } catch (err) {
      Alert.alert("Error", "Failed to reject");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Invitations</Text>

      <FlatList
        data={invites}
        keyExtractor={(item) => String(item.family_member_id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.familyName}>{item.family_name}</Text>
              <Text style={styles.relation}>
                Invited as: {item.relation}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(item.family_member_id)}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleReject(item.family_member_id)}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No pending invitations</Text>
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 1,
  },
  familyName: {
    fontSize: 17,
    fontWeight: "600",
  },
  relation: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptText: {
    color: "#fff",
    fontWeight: "600",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#ffebee",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  rejectText: {
    color: "#c62828",
    fontWeight: "600",
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 60,
  },
});