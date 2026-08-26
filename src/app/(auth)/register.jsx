import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
import colors from "../../constants/colors";
import Logo from "../../components/ui/Logo";
import FormInput from "../../components/ui/FormInput";
import {
  register as registerAccount,
  normalizePhoneForLogin,
} from "../../services/authService";

export default function RegisterScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const validate = () => {
    const nextErrors = {};
    const normalizedPhone = normalizePhoneForLogin(phone);
    if (!normalizedPhone) {
      nextErrors.phone = "Phone number is required";
    } else if (normalizedPhone.length !== 10) {
      nextErrors.phone = "Enter a valid mobile number (e.g., 917 123 4567)";
    }
    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    return nextErrors;
  };

  const updateField = (key, value) => {
    if (key === "phone") setPhone(value);
    if (key === "password") setPassword(value);
    if (key === "confirmPassword") setConfirmPassword(value);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleRegister = async () => {
    if (loading) return;

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("");
      return;
    }

    setFieldErrors({});
    setError("");
    setLoading(true);
    try {
      await registerAccount({
        phone_number: normalizePhoneForLogin(phone),
        password,
      });
      router.replace("/login");
    } catch (err) {
      setError(getRegisterErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getRegisterErrorMessage = (err) => {
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
            <Logo size={52} />
          </View>

          <View style={styles.card}>
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                Stay connected, prepared, and informed during disasters.
              </Text>
            </View>

            <View style={styles.form}>
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
                maxLength={10}
                value={phone}
                onChangeText={(text) =>
                  updateField("phone", text.replace(/\D/g, "").slice(0, 10))
                }
                autoComplete="tel"
                helper="Used for emergency alerts and SMS fallback."
                error={fieldErrors.phone}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <FormInput
                label="Password"
                icon={
                  <MaterialIcons
                    name="lock"
                    color={colors.placeholder}
                    size={20}
                  />
                }
                placeholder="Create your password"
                value={password}
                onChangeText={(text) => updateField("password", text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                accessory={
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility-off" : "visibility"}
                      color={colors.placeholder}
                      size={20}
                    />
                  </TouchableOpacity>
                }
                error={fieldErrors.password}
                inputRef={passwordRef}
                style={styles.passwordField}
              />

              <FormInput
                label="Confirm Password"
                icon={
                  <MaterialIcons
                    name="lock"
                    color={colors.placeholder}
                    size={20}
                  />
                }
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(text) => updateField("confirmPassword", text)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                accessory={
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hitSlop={8}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={
                        showConfirmPassword ? "visibility-off" : "visibility"
                      }
                      color={colors.placeholder}
                      size={20}
                    />
                  </TouchableOpacity>
                }
                error={fieldErrors.confirmPassword}
                inputRef={confirmPasswordRef}
                style={styles.passwordField}
              />
            </View>

            <View style={styles.legal}>
              <Text style={styles.legalText}>
                By signing up, you agree to our{" "}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL("#")}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL("#")}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.9}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.loginLink}>Log In</Text>
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
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  brandHeader: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 2,
  },
  headerBlock: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 30,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  form: {
    gap: 14,
  },
  passwordField: {
    marginTop: 2,
  },
  legal: {
    marginTop: 12,
    alignItems: "center",
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: "center",
  },
  legalLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    marginTop: 10,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  loginPrompt: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
  },
  loginPromptText: {
    fontSize: 14,
    color: colors.muted,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});