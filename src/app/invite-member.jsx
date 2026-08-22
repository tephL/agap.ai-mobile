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
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import Logo from "@/components/ui/Logo";
import FormInput from "@/components/ui/FormInput";
import { inviteMember, RELATIONS, relationLabel } from "@/services/familyService";

// Keeps the raw input to at most 10 digits with no leading 0 (matches the
// +63 / login phone convention). "09...", "63...", and "..." prefixes are stripped.
function normalizePhoneInput(value) {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("63")) {
    digits = digits.slice(2);
  }
  digits = digits.replace(/^0+/, "");
  return digits.slice(0, 10);
}

export default function InviteScreen() {
  const router = useRouter();
  const { familyId } = useLocalSearchParams();
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("son");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const updatePhone = (text) => {
    const digits = normalizePhoneInput(text);
    setPhone(digits);
    setErrors((prev) => {
      if (!prev.phone) return prev;
      const next = { ...prev };
      delete next.phone;
      return next;
    });
  };

  const updateRelation = (value) => {
    setRelation(value);
    setErrors((prev) => {
      if (!prev.relation) return prev;
      const next = { ...prev };
      delete next.relation;
      return next;
    });
  };

  const handleInvite = async () => {
    if (loading) return;

    const nextErrors = {};
    if (!phone) {
      nextErrors.phone = "Phone number is required";
    } else if (phone.length !== 10) {
      nextErrors.phone = "Enter a valid 10-digit mobile number";
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
      await inviteMember(familyId, {
        phone_number: phone,
        relation,
      });
      Alert.alert("Success", "Invitation sent!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Failed to send invitation";
      Alert.alert("Error", msg);
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
              <Text style={styles.title}>Invite a family member</Text>
              <Text style={styles.subtitle}>
                Send an invitation to someone so they can join your family
                circle.
              </Text>
            </View>

            <FormInput
              label="Phone Number"
              prefix={{
                icon: (
                  <MaterialIcons
                    name="phone"
                    color={colors.placeholder}
                    size={20}
                  />
                ),
                text: "+63",
              }}
              placeholder="917 123 4567"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={updatePhone}
              autoComplete="tel"
              error={errors.phone}
            />

            <View style={styles.selectorField}>
              <Text style={styles.selectorLabel}>Relation</Text>
              <View style={styles.chipRow}>
                {RELATIONS.map((r) => {
                  const selected = relation === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.chip, selected && styles.chipSelected]}
                      activeOpacity={0.7}
                      onPress={() => updateRelation(r)}
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
              onPress={handleInvite}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Send Invite</Text>
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