import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import {
  getDispatcherSession,
  clearDispatcherSession,
} from "../../services/dispatcherService";

const PLACEHOLDER_CARDS = [
  {
    icon: "emergency",
    title: "Active Emergencies",
    value: "0",
    caption: "Reports awaiting dispatch will appear here.",
  },
  {
    icon: "groups",
    title: "Responders On Duty",
    value: "—",
    caption: "Responder availability will appear here.",
  },
];

export default function DispatcherHomeScreen() {
  const [session, setSession] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDispatcherSession().then((value) => {
        if (active) setSession(value);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await clearDispatcherSession();
    router.replace("/login");
  };

  const displayName =
    session?.username ??
    session?.user_id?.toString() ??
    "Dispatcher";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.username}>{displayName}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <MaterialIcons
                  name="logout"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.logoutText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.placeholderBanner}>
          <MaterialIcons name="construction" size={20} color={colors.muted} />
          <View style={styles.placeholderBannerTextWrap}>
            <Text style={styles.placeholderBannerTitle}>
              Dispatch dashboard under construction
            </Text>
            <Text style={styles.placeholderBannerCaption}>
              This is a protected placeholder screen. Route guarding is active —
              only authenticated dispatcher accounts can view this page.
            </Text>
          </View>
        </View>

        {PLACEHOLDER_CARDS.map((card) => (
          <View key={card.title} style={styles.card}>
            <View style={styles.cardIconWrap}>
              <MaterialIcons
                name={card.icon}
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardCaption}>{card.caption}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: colors.muted,
  },
  username: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  placeholderBanner: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  placeholderBannerTextWrap: {
    flex: 1,
    gap: 4,
  },
  placeholderBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  placeholderBannerCaption: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  card: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  cardCaption: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
});
