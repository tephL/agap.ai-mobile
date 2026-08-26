import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";

export default function TypingIndicator() {
  return (
    <View style={styles.row}>
      <View style={styles.avatarWrap}>
        <Ionicons name="sparkles" size={12} color={colors.white} />
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
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingRight: 48,
  },
  avatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#C4C8D4",
  },
  dot1: { opacity: 0.35 },
  dot2: { opacity: 0.55 },
  dot3: { opacity: 0.8 },
});
