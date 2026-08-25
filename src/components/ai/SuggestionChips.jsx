import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";

export default function SuggestionChips({ suggestions, onSelect, visible }) {
  if (!visible || !suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flash" size={14} color={colors.muted} />
        <Text style={styles.headerText}>Suggested questions</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.chip}
            activeOpacity={0.7}
            onPress={() => onSelect(item.text)}
          >
            <Ionicons name={item.icon || "chatbubble-ellipses"} size={13} color={colors.primary} />
            <Text style={styles.chipText} numberOfLines={2}>
              {item.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  scrollContent: {
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 220,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
    flexShrink: 1,
  },
});
