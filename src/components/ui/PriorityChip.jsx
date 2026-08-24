import { Text, View, StyleSheet } from "react-native";
import colors from "../../constants/colors";

const PRIORITY_STYLES = {
  high: { bg: "#FDECEC", fg: colors.primary },
  medium: { bg: "#FFF3E0", fg: "#B26A00" },
  low: { bg: "#E6F4EA", fg: "#2E7D32" },
};

export default function PriorityChip({ priority, showDot = false }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low;

  return (
    <View style={[styles.chip, { backgroundColor: style.bg }]}>
      {showDot ? (
        <View style={[styles.dot, { backgroundColor: style.fg }]} />
      ) : null}
      <Text style={[styles.label, { color: style.fg }]}>
        {(priority ?? "").toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
  },
});
