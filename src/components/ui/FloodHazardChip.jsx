import { StyleSheet, Text, View } from "react-native";
import colors from "../../constants/colors";
import { FLOOD_LEGEND_ITEMS } from "../../constants/hazardColors";

/**
 * Small pill showing a flood hazard level (1 = Mababa, 2 = Katamtaman,
 * 3 = Mataas), fed by the same FLOOD_LEGEND_ITEMS source of truth the map
 * paints with so labels/colors can never drift from the rendered layer.
 * Renders nothing when `level` is absent (null = not reported / no zone).
 */
export default function FloodHazardChip({ level }) {
  const item = FLOOD_LEGEND_ITEMS.find((l) => l.value === level);
  if (!item) return null;

  return (
    <View style={[styles.chip, { backgroundColor: `${item.color}33` }]}>
      <View style={[styles.dot, { backgroundColor: item.color }]} />
      <Text style={styles.text} numberOfLines={1}>
        {item.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
});