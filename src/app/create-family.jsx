import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import Logo from "@/components/ui/Logo";
import FormInput from "@/components/ui/FormInput";
import { createFamily, RELATIONS, relationLabel } from "@/services/familyService";

export default function CreateFamilyScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("father");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => {
    if (key === "name") setName(value);
    if (key === "relation") setRelation(value);
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleCreate = async () => {
    if (loading) return;

    const nextErrors = {};
    if (!name.trim()) {
      nextErrors.name = "Family name is required";
    }
    if (!relation) {
      nextErrors.relation = "Select your relation";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await createFamily({ name: name.trim(), relation });
      Alert.alert("Success", "Family created!", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)/family"),
        },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to create family"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandHeader}>
            <Logo size={48} />
          </View>

          <View style={styles.form}>
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Create your family</Text>
              <Text style={styles.subtitle}>
                Start a family circle so everyone stays connected and
                reachable during emergencies.
              </Text>
            </View>

            <FormInput
              label="Family Name"
              icon={
                <MaterialIcons
                  name="people"
                  color={colors.placeholder}
                  size={20}
                />
              }
              placeholder="e.g. The Santos Family"
              value={name}
              onChangeText={(text) => updateField("name", text)}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              error={errors.name}
            />

            <View style={styles.selectorField}>
              <Text style={styles.selectorLabel}>Your Relation</Text>
              <View style={styles.chipRow}>
                {RELATIONS.map((r) => {
                  const selected = relation === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.chip, selected && styles.chipSelected]}
                      activeOpacity={0.7}
                      onPress={() => updateField("relation", r)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {relationLabel(r)}
                      </Text>
                      {selected ? (
                        <MaterialIcons
                          name="check"
                          color={colors.primary}
                          size={14}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.relation ? (
                <Text style={styles.selectorError}>{errors.relation}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.9}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Create Family</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  brandHeader: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 40,
  },
  form: {
    gap: 20,
  },
  headerBlock: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 30,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  selectorField: {
    gap: 6,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(227, 47, 49, 0.06)",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  chipTextSelected: {
    fontWeight: "700",
    color: colors.primary,
  },
  selectorError: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  button: {
    marginTop: 16,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});