import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import colors from "@/constants/colors";
import { PLACEHOLDER_LIVE_NOTIFICATION } from "@/data/notificationsPlaceholders";

export default function LiveNotificationDropdown() {
  const router = useRouter();
  const live = PLACEHOLDER_LIVE_NOTIFICATION;

  const openNotificationsTab = () => {
    router.push({ pathname: "/notifications", params: { tab: "notifications" } });
  };

  const openAiTipsTab = () => {
    router.push({ pathname: "/notifications", params: { tab: "tips" } });
  };

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="robot" size={28} color={colors.white} />
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.headerCopy}
            onPress={openNotificationsTab}
            accessibilityRole="button"
            accessibilityLabel="Open live notifications"
          >
            <Text style={styles.eyebrow}>LIVE NOTIFICATIONS</Text>
            <Text style={styles.brand}>AGAP.ai</Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() =>
              Alert.alert("Live notifications chevron", "No behavior yet")
            }
            accessibilityRole="button"
            accessibilityLabel="Live notifications menu"
          >
            <Ionicons name="chevron-down" size={18} color={colors.text} />
          </Pressable>
        </View>

        <Pressable onPress={openNotificationsTab}>
          <Text style={styles.title}>{live.title}</Text>
          <Text style={styles.description}>{live.description}</Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable
            style={styles.tipsAction}
            onPress={openAiTipsTab}
            accessibilityRole="button"
            accessibilityLabel="View Tips"
          >
            <Ionicons name="bulb" size={14} color={colors.primary} />
            <Text style={styles.tipsLabel}>View Tips</Text>
          </Pressable>
          <Pressable onPress={openNotificationsTab}>
            <Text style={styles.timestamp}>{live.sentLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 8,
    marginLeft: 22,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -30,
    marginRight: 10,
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 8,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  brand: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  description: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  tipsAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tipsLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  timestamp: {
    color: colors.muted,
    fontSize: 11,
  },
});
