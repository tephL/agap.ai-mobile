import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";

export default function ReportScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="megaphone-outline" size={48} color={colors.primary} />
      <Text style={styles.title}>Report an Incident</Text>
      <Text style={styles.subtitle}>
        Snap a photo to report an incident or hazard in your area.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/camera")}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={18} color={colors.white} />
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});