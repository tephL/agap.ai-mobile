import { Text, View, StyleSheet } from "react-native";
import colors from "../../constants/colors";

const STATUS_STYLES = {
  available: { bg: "#E6F4EA", fg: "#2E7D32" },
  busy: { bg: "#FFF3E0", fg: "#B26A00" },
  offline: { bg: colors.surface, fg: colors.muted },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.offline;

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.label, { color: style.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
});
