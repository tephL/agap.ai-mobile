import { useState } from "react";
import {
  ActivityIndicator,
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
import * as Location from "expo-location";
import colors from "../../constants/colors";
import Logo from "../../components/ui/Logo";
import FormInput from "../../components/ui/FormInput";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { MaterialIcons } from "@expo/vector-icons";
import { createPerson } from "../../services/personService";
import { reverseGeocodeFull } from "../../services/geocodingService";

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

const PET_TYPE_OPTIONS = [
  { label: "Dog", value: "dog" },
  { label: "Cat", value: "cat" },
  { label: "Bird", value: "bird" },
  { label: "Fish", value: "fish" },
  { label: "Other", value: "other" },
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
    pets: [],
    pet_other: "",
    gender_other: "",
    disability_other: "",
  });
  const [errors, setErrors] = useState({});
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const router = useRouter();

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleDetectLocation = async () => {
    if (locationLoading) return;
    setLocationLoading(true);
    setLocationError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission is required to auto-detect your address.");
        setLocationLoading(false);
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync()) ||
        (await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise((resolve) => setTimeout(() => resolve(null), 20000)),
        ]));
      if (!pos?.coords) {
        setLocationError("Could not get your location. Try again or enter manually.");
        setLocationLoading(false);
        return;
      }
      const result = await reverseGeocodeFull(pos.coords.latitude, pos.coords.longitude);
      if (!result) {
        setLocationError("Could not determine your address. Please enter it manually.");
        setLocationLoading(false);
        return;
      }
      updateField("city", result.city || "");
      updateField("barangay", result.barangay || "");
      updateField("street", result.street || "");
      updateField("address", result.address || "");
    } catch {
      setLocationError("Failed to detect location. Please enter your address manually.");
    } finally {
      setLocationLoading(false);
    }
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

  const togglePet = (value) => {
    setForm((prev) => ({
      ...prev,
      pets: prev.pets.includes(value)
        ? prev.pets.filter((p) => p !== value)
        : [...prev.pets, value],
    }));
  };

  const handleContinue = () => {
    const nextErrors = {};
    const requiredFields = [
      ["first_name", "First Name"],
      ["last_name", "Last Name"],
      ["gender", "Gender"],
      ["age", "Age"],
      ["city", "City"],
      ["barangay", "Barangay"],
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
        Number(form.house_floors) < 1 ||
        Number(form.house_floors) > 10)
    ) {
      nextErrors.house_floors =
        "Enter a valid number of house floors (1-10)";
    }

    if (form.gender === "other" && !form.gender_other.trim()) {
      nextErrors.gender_other = "Please specify your gender";
    }
    if (
      form.disabilities.includes("other") &&
      !form.disability_other.trim()
    ) {
      nextErrors.disability_other = "Please specify your disability";
    }
    if (form.pets.includes("other") && !form.pet_other.trim()) {
      nextErrors.pet_other = "Please specify the type of pet";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setSubmitError("");
      setConfirmVisible(true);
    }
  };

  const buildPayload = () => {
    const disabilities = form.disabilities.filter((d) => d !== "none");
    const pets = [...form.pets.filter((p) => p !== "other")];
    if (form.pets.includes("other")) {
      pets.push(form.pet_other.trim());
    }
    return {
      first_name: form.first_name.trim(),
      ...(form.middle_name.trim()
        ? { middle_name: form.middle_name.trim() }
        : {}),
      last_name: form.last_name.trim(),
      gender: form.gender,
      ...(disabilities.length ? { disabilities } : {}),
      age: Number(form.age),
      city: form.city.trim(),
      barangay: form.barangay.trim(),
      ...(form.street.trim() ? { street: form.street.trim() } : {}),
      address: form.address.trim(),
      house_floors: Number(form.house_floors),
      ...(pets.length ? { pets } : {}),
    };
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await createPerson(buildPayload());
      router.replace("/");
    } catch (err) {
      if (err?.response?.status === 401) {
        setConfirmVisible(false);
        router.replace("/login");
        return;
      }
      setSubmitError(getSubmitErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getSubmitErrorMessage = (err) => {
    if (err.response) {
      const { status, data } = err.response;
      if (status === 400) {
        if (Array.isArray(data)) {
          const messages = data
            .map((validationError) => validationError.msg)
            .filter(Boolean);
          if (messages.length > 0) {
            return messages.join("\n");
          }
        }
        if (data && typeof data.message === "string") {
          return data.message;
        }
        return "Please check your input and try again.";
      }
      if (status >= 500) {
        return "Something went wrong on the server. Please try again later.";
      }
    }
    return "Unable to reach the server. Check your connection and try again.";
  };

  const disabilitiesLabel = () => {
    const selected = form.disabilities.filter((d) => d !== "none");
    if (selected.length === 0) return "None";
    return selected
      .map(
        (d) => DISABILITY_OPTIONS.find((option) => option.value === d)?.label
      )
      .filter(Boolean)
      .join(", ");
  };

  const petsLabel = () => {
    if (form.pets.length === 0) return "None";
    return form.pets
      .map((p) =>
        p === "other" && form.pet_other.trim()
          ? form.pet_other.trim()
          : PET_TYPE_OPTIONS.find((option) => option.value === p)?.label
      )
      .filter(Boolean)
      .join(", ");
  };

  const summaryRows = () => [
    { label: "First Name", value: form.first_name.trim() },
    { label: "Middle Name", value: form.middle_name.trim() },
    { label: "Last Name", value: form.last_name.trim() },
    {
      label: "Gender",
      value:
        GENDER_OPTIONS.find((option) => option.value === form.gender)?.label,
    },
    { label: "Age", value: form.age },
    { label: "Disabilities", value: disabilitiesLabel() },
    { label: "City", value: form.city.trim() },
    { label: "Barangay", value: form.barangay.trim() },
    { label: "Street", value: form.street.trim() },
    { label: "Address", value: form.address.trim() },
    { label: "House Floors", value: form.house_floors },
    { label: "Pets", value: petsLabel() },
  ];

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
                  error={errors.gender_other}
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
                  error={errors.disability_other}
                />
              ) : null}
            </View>

            <Text style={styles.sectionHeader}>Location / Address</Text>

            <TouchableOpacity
              style={[styles.detectButton, locationLoading && styles.detectButtonLoading]}
              activeOpacity={0.8}
              onPress={handleDetectLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <MaterialIcons name="my-location" color={colors.white} size={18} />
              )}
              <Text style={styles.detectButtonText}>
                {locationLoading ? "Detecting..." : "Detect My Location"}
              </Text>
            </TouchableOpacity>

            {locationError ? (
              <Text style={styles.locationError}>{locationError}</Text>
            ) : null}

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
              <Text style={styles.helper}>What types of pets do you have?</Text>
              <View style={styles.chipWrap}>
                {PET_TYPE_OPTIONS.map((option) =>
                  renderChip(
                    option.label,
                    form.pets.includes(option.value),
                    () => togglePet(option.value)
                  )
                )}
              </View>
              {form.pets.includes("other") ? (
                <FormInput
                  label="Specify Pet"
                  icon={<MaterialIcons name="edit" color={colors.placeholder} size={20} />}
                  placeholder="Enter the type of pet"
                  value={form.pet_other}
                  onChangeText={(text) => updateField("pet_other", text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  error={errors.pet_other}
                />
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

      <ConfirmModal
        visible={confirmVisible}
        title="Confirm your information"
        subtitle="Please review your details before saving."
        rows={summaryRows()}
        confirmLabel="Confirm & Save"
        submitting={submitting}
        error={submitError}
        onCancel={() => {
          if (!submitting) setConfirmVisible(false);
        }}
        onConfirm={handleConfirm}
      />
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
  detectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  detectButtonLoading: {
    opacity: 0.7,
  },
  detectButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  locationError: {
    fontSize: 12,
    color: colors.primary,
    marginTop: -12,
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
