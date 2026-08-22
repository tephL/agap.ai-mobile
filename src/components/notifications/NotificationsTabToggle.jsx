import { Pressable, StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";

export default function NotificationsTabToggle({ activeTab, onChange }) {
  return (
    <View style={styles.track}>
      <Pressable
        style={[styles.tab, activeTab === "notifications" && styles.tabActive]}
        onPress={() => onChange("notifications")}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "notifications" }}
      >
        <Text
          style={[
            styles.label,
            activeTab === "notifications" && styles.labelActive,
          ]}
        >
          Notifications
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === "tips" && styles.tabActive]}
        onPress={() => onChange("tips")}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "tips" }}
      >
        <Text
          style={[styles.label, activeTab === "tips" && styles.labelActive]}
        >
          AI Tips
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 22,
    overflow: "hidden",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  tab: {
    minWidth: 128,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  labelActive: {
    color: colors.white,
  },
});
