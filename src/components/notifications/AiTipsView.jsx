import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { PLACEHOLDER_AI_TIPS } from "@/data/notificationsPlaceholders";

export default function AiTipsView() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {PLACEHOLDER_AI_TIPS.map((tip) => (
        <TouchableOpacity
          key={tip.id}
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => Alert.alert(tip.title, "No behavior yet")}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="bulb" size={18} color={colors.primary} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{tip.title}</Text>
            <Text style={styles.body}>{tip.body}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  copy: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  body: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
