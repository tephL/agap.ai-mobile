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
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import {
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
} from "@/services/familyService";
import colors from "@/constants/colors";

export default function InvitationsScreen() {
  const router = useRouter();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getMyInvitations();
      setInvites(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.error || "Failed to load invitations"
      );
      setInvites([]);
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
    if (actingId) return;
    setActingId(id);
    try {
      const result = await acceptInvitation(id);
      if (result?.family_id) {
        await SecureStore.setItemAsync("family_id", String(result.family_id));
      }
      await SecureStore.setItemAsync("is_family_creator", "false");

      Alert.alert("Joined family", "You are now part of this family.", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)/family"),
        },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to accept invitation"
      );
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    if (actingId) return;
    setActingId(id);
    try {
      await rejectInvitation(id);
      await load();
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to reject invitation"
      );
    } finally {
      setActingId(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={invites}
        keyExtractor={(item) => String(item.family_member_id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          const busy = actingId === item.family_member_id;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name="home-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.familyName}>{item.family_name}</Text>
                  <Text style={styles.relation}>
                    Invited as {item.relation}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(item.family_member_id)}
                  disabled={!!actingId}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.acceptText}>Accept</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(item.family_member_id)}
                  disabled={!!actingId}
                  activeOpacity={0.85}
                >
                  <Text style={styles.rejectText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="mail-open-outline" size={36} color={colors.muted} />
            <Text style={styles.empty}>No pending invitations</Text>
            <Text style={styles.emptyHint}>
              Pull down to refresh, or ask a family creator to invite your
              phone number.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardCopy: {
    flex: 1,
  },
  familyName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  relation: {
    fontSize: 13,
    color: colors.muted,
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
    backgroundColor: colors.primary,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: {
    color: colors.white,
    fontWeight: "700",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectText: {
    color: colors.text,
    fontWeight: "700",
  },
  emptyWrap: {
    alignItems: "center",
    marginTop: 48,
    paddingHorizontal: 24,
  },
  empty: {
    textAlign: "center",
    color: colors.text,
    fontWeight: "600",
    fontSize: 16,
    marginTop: 12,
  },
  emptyHint: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
