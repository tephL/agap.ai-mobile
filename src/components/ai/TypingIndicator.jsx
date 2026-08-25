import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";

export default function TypingIndicator() {
  return (
    <View style={styles.row}>
      <View style={styles.avatarWrap}>
        <Ionicons name="sparkles" size={14} color={colors.white} />
      </View>
      <View style={styles.bubble}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.muted,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
});
