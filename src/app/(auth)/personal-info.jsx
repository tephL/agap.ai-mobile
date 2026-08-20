import { useState } from "react";
import {
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
import colors from "../../constants/colors";
import Logo from "../../components/ui/Logo";
import FormInput from "../../components/ui/FormInput";
import { MaterialIcons } from "@expo/vector-icons";

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const DISABILITY_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Visual", value: "visual" },
  { label: "Hearing", value: "hearing" },
  { label: "Mobility", value: "mobility" },
  { label: "Cognitive", value: "cognitive" },
  { label: "Other", value: "other" },
];

const PET_OPTIONS = [
  { label: "No", value: "no" },
  { label: "Yes", value: "yes" },
];

export default function PersonalInfoScreen() {
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    gender: "",
    disabilities: [],
    age: "",
    city: "",
    barangay: "",
    street: "",
    address: "",
    house_floors: "",
    pets: null,
    pet_count: "1",
    gender_other: "",
    disability_other: "",
  });
  const [errors, setErrors] = useState({});

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleDisability = (value) => {
    setForm((prev) => {
      if (value === "none") {
        return {
          ...prev,
          disabilities: prev.disabilities.includes("none") ? [] : ["none"],
        };
      }
      const withoutNone = prev.disabilities.filter((d) => d !== "none");
      const next = withoutNone.includes(value)
        ? withoutNone.filter((d) => d !== value)
        : [...withoutNone, value];
      return { ...prev, disabilities: next };
    });
  };

  const incrementPets = () =>
    setForm((prev) => ({
      ...prev,
      pet_count: String(Number(prev.pet_count || 0) + 1),
    }));

  const decrementPets = () =>
    setForm((prev) => ({
      ...prev,
      pet_count: String(Math.max(1, Number(prev.pet_count || 1) - 1)),
    }));

  const handleContinue = () => {
    const nextErrors = {};
    const requiredFields = [
      ["first_name", "First Name"],
      ["last_name", "Last Name"],
      ["gender", "Gender"],
      ["age", "Age"],
      ["city", "City"],
      ["barangay", "Barangay"],
      ["street", "Street"],
      ["address", "Address"],
      ["house_floors", "House Floors"],
    ];

    for (const [key, label] of requiredFields) {
      const value = form[key];
      if (typeof value === "string" ? !value.trim() : !value) {
        nextErrors[key] = `${label} is required`;
      }
    }

    if (
      !nextErrors.age &&
      (Number.isNaN(Number(form.age)) || Number(form.age) <= 0)
    ) {
      nextErrors.age = "Enter a valid age";
    }
    if (
      !nextErrors.house_floors &&
      (Number.isNaN(Number(form.house_floors)) ||
        Number(form.house_floors) <= 0)
    ) {
      nextErrors.house_floors = "Enter a valid number of house floors";
    }

    setErrors(nextErrors);
  };

  const renderChip = (label, selected, onPress, style, error) => (
    <TouchableOpacity
      style={[
        styles.chip,
        style,
        selected && styles.chipSelected,
        error && !selected && styles.chipError,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
      {selected ? (
        <MaterialIcons name="check" color={colors.primary} size={14} />
      ) : null}
    </TouchableOpacity>
  );

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
              <Text style={styles.title}>Your personal information</Text>
              <Text style={styles.subtitle}>
                Tell us a little about yourself so AGAP.ai can better assist
                you during emergencies.
              </Text>
            </View>

            <Text style={styles.sectionHeader}>Personal Information</Text>

            <FormInput
              label="First Name"
              icon={<MaterialIcons name="person" color={colors.placeholder} size={20} />}
              placeholder="Enter your first name"
              value={form.first_name}
              onChangeText={(text) => updateField("first_name", text)}
              autoCapitalize="words"
              autoCorrect={false}
              error={errors.first_name}
            />

            <FormInput
              label="Middle Name"
              optional
              icon={<MaterialIcons name="person" color={colors.placeholder} size={20} />}
              placeholder="Enter your middle name"
              value={form.middle_name}
              onChangeText={(text) => updateField("middle_name", text)}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <FormInput
              label="Last Name"
              icon={<MaterialIcons name="person" color={colors.placeholder} size={20} />}
              placeholder="Enter your last name"
              value={form.last_name}
              onChangeText={(text) => updateField("last_name", text)}
              autoCapitalize="words"
              autoCorrect={false}
              error={errors.last_name}
            />

            <View style={styles.selectorField}>
              <View style={styles.labelRow}>
                <MaterialIcons name="wc" color={colors.muted} size={16} />
                <Text style={styles.label}>Gender</Text>
              </View>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((option) =>
                  renderChip(
                    option.label,
                    form.gender === option.value,
                    () =>
                      updateField(
                        "gender",
                        form.gender === option.value ? "" : option.value
                      ),
                    styles.chipWide,
                    Boolean(errors.gender)
                  )
                )}
              </View>
              {errors.gender ? (
                <Text style={styles.fieldError}>{errors.gender}</Text>
              ) : null}
              {form.gender === "other" ? (
                <FormInput
                  label="Specify Gender"
                  icon={<MaterialIcons name="edit" color={colors.placeholder} size={20} />}
                  placeholder="Enter your gender"
                  value={form.gender_other}
                  onChangeText={(text) => updateField("gender_other", text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              ) : null}
            </View>

            <FormInput
              label="Age"
              icon={<MaterialIcons name="cake" color={colors.placeholder} size={20} />}
              placeholder="Enter your age"
              keyboardType="number-pad"
              maxLength={3}
              value={form.age}
              onChangeText={(text) => updateField("age", text.replace(/\D/g, ""))}
              error={errors.age}
            />

            <View style={styles.selectorField}>
              <View style={styles.labelRow}>
                <MaterialIcons
                  name="accessibility-new"
                  color={colors.muted}
                  size={16}
                />
                <Text style={styles.label}>Disabilities</Text>
                <Text style={styles.optionalInline}>(Optional)</Text>
              </View>
              <View style={styles.chipWrap}>
                {DISABILITY_OPTIONS.map((option) =>
                  renderChip(
                    option.label,
                    form.disabilities.includes(option.value),
                    () => toggleDisability(option.value)
                  )
                )}
              </View>
              {form.disabilities.includes("other") ? (
                <FormInput
                  label="Specify Disability"
                  icon={<MaterialIcons name="edit" color={colors.placeholder} size={20} />}
                  placeholder="Enter your disability"
                  value={form.disability_other}
                  onChangeText={(text) => updateField("disability_other", text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              ) : null}
            </View>

            <Text style={styles.sectionHeader}>Location / Address</Text>

            <FormInput
              label="City"
              icon={<MaterialIcons name="location-city" color={colors.placeholder} size={20} />}
              placeholder="Enter your city"
              value={form.city}
              onChangeText={(text) => updateField("city", text)}
              autoCapitalize="words"
              autoCorrect={false}
              error={errors.city}
            />

            <FormInput
              label="Barangay"
              icon={<MaterialIcons name="location-on" color={colors.placeholder} size={20} />}
              placeholder="Enter your barangay"
              value={form.barangay}
              onChangeText={(text) => updateField("barangay", text)}
              autoCapitalize="words"
              autoCorrect={false}
              error={errors.barangay}
            />

            <FormInput
              label="Street"
              icon={<MaterialIcons name="signpost" color={colors.placeholder} size={20} />}
              placeholder="Enter your street"
              value={form.street}
              onChangeText={(text) => updateField("street", text)}
              autoCapitalize="words"
              autoCorrect={false}
              error={errors.street}
            />

            <FormInput
              label="Address"
              icon={<MaterialIcons name="home" color={colors.placeholder} size={20} />}
              placeholder="Enter your complete address"
              multiline
              value={form.address}
              onChangeText={(text) => updateField("address", text)}
              autoCapitalize="words"
              autoCorrect={false}
              error={errors.address}
            />

            <Text style={styles.sectionHeader}>Household</Text>

            <FormInput
              label="House Floors"
              icon={<MaterialIcons name="stairs" color={colors.placeholder} size={20} />}
              placeholder="Enter number of floors"
              keyboardType="number-pad"
              maxLength={2}
              value={form.house_floors}
              onChangeText={(text) =>
                updateField("house_floors", text.replace(/\D/g, ""))
              }
              error={errors.house_floors}
            />

            <View style={styles.selectorField}>
              <View style={styles.labelRow}>
                <MaterialIcons name="pets" color={colors.muted} size={16} />
                <Text style={styles.label}>Pets</Text>
                <Text style={styles.optionalInline}>(Optional)</Text>
              </View>
              <Text style={styles.helper}>Do you have pets?</Text>
              <View style={styles.chipRow}>
                {PET_OPTIONS.map((option) =>
                  renderChip(
                    option.label,
                    form.pets === option.value,
                    () =>
                      updateField(
                        "pets",
                        form.pets === option.value ? null : option.value
                      ),
                    styles.chipWide
                  )
                )}
              </View>
              {form.pets === "yes" ? (
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={decrementPets}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <MaterialIcons name="remove" color={colors.text} size={18} />
                  </TouchableOpacity>
                  <View style={styles.stepperValue}>
                    <Text style={styles.stepperText}>{form.pet_count}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={incrementPets}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <MaterialIcons name="add" color={colors.text} size={18} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.9}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continue</Text>
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
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
    marginTop: 4,
  },
  selectorField: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  optionalInline: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  helper: {
    fontSize: 12,
    color: colors.muted,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chipWrap: {
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
  chipWide: {
    flex: 1,
    height: 44,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(227, 47, 49, 0.06)",
  },
  chipError: {
    borderColor: colors.primary,
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
  stepperRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  stepperButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperValue: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  stepperText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  fieldError: {
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
