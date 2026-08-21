import { useRef, useState } from "react";
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
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import Logo from "../../components/ui/Logo";
import FormInput from "../../components/ui/FormInput";
import {
  register as registerAccount,
  normalizePhoneNumber,
} from "../../services/authService";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const phoneRef = useRef(null);
  const passwordRef = useRef(null);

  const validate = () => {
    const nextErrors = {};
    if (!username.trim()) {
      nextErrors.username = "Username is required";
    }
    if (!normalizePhoneNumber(phone)) {
      nextErrors.phone = "Phone number is required";
    }
    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }
    return nextErrors;
  };

  const updateField = (key, value) => {
    if (key === "username") setUsername(value);
    if (key === "phone") setPhone(value);
    if (key === "password") setPassword(value);
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
        username: username.trim(),
        phone_number: normalizePhoneNumber(phone),
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
            <Logo size={48} />
          </View>

          <View style={styles.form}>
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                Create an account to stay connected, prepared, and informed
                during emergencies.
              </Text>
            </View>

            <FormInput
              label="Username"
              icon={
                <MaterialIcons
                  name="person"
                  color={colors.placeholder}
                  size={20}
                />
              }
              placeholder="Enter your username"
              value={username}
              onChangeText={(text) => updateField("username", text)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              error={fieldErrors.username}
            />

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
              onChangeText={(text) => updateField("phone", text)}
              autoComplete="tel"
              helper="Used for emergency alerts and SMS fallback."
              error={fieldErrors.phone}
              inputRef={phoneRef}
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
              returnKeyType="done"
              onSubmitEditing={handleRegister}
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
                <Text style={styles.buttonText}>Create Account</Text>
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
  passwordField: {
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: colors.primary,
    textAlign: "center",
    marginTop: 12,
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
  loginPrompt: {
    marginTop: 32,
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