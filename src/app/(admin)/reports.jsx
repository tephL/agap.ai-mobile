import { StyleSheet, Text, View, Clickable, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import * as SecureStore from 'expo-secure-store';
import { useRouter } from "expo-router";

export default function ReportsScreen() {
  const router = useRouter();
  async function handleLogout() {
    // Wipe this user's offline snapshots before the token is gone, so a
    // different account can never see stale cached family/profile data.
    try {
      await Promise.all([clearForUser(), clearProfileForUser()]);
    } catch {}

    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user_id");
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.pageLabel}>Reports</Text>
        <View style={styles.placeholderCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>This is the Reports page</Text>
          <Text style={styles.copy}>
            Incoming emergency reports will appear here.
          </Text>
          <Pressable onPress={() => handleLogout()}>
            <Text>Logout</Text>
          </Pressable>
        </View>
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
  pageLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 12,
  },
  placeholderCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  copy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
  },
});
