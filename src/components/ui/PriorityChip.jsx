import { Text, View, StyleSheet } from "react-native";
import colors from "../../constants/colors";

const PRIORITY_STYLES = {
  high: { bg: "#FDECEC", fg: colors.primary },
  medium: { bg: "#FFF3E0", fg: "#B26A00" },
  low: { bg: "#E6F4EA", fg: "#2E7D32" },
};

export default function PriorityChip({ priority }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low;

  return (
    <View style={[styles.chip, { backgroundColor: style.bg }]}>
      <Text style={[styles.label, { color: style.fg }]}>
        {(priority ?? "").toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
  },
});
