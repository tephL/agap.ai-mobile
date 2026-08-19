import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import colors from "../../constants/colors";
import Logo from "../../components/ui/Logo";
import { PhoneIcon, LockIcon, EyeIcon } from "../../components/ui/icons";
import {
  login as loginAccount,
  normalizePhoneForLogin,
} from "../../services/authService";
import { API_BASE_URL } from "../../services/api";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (loading) return;

    const phoneNumber = normalizePhoneForLogin(phone);

    if (!phoneNumber) {
      setError("Phone number is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await loginAccount({
        phone_number: phoneNumber,
        password,
      });
      const data = response.data;
      if (data && data.token) {
        await SecureStore.setItemAsync("token", data.token);
      }
      router.replace("/");
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getLoginErrorMessage = (err) => {
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
      if (status === 401) {
        return "Invalid phone number or password";
      }
      if (status === 422 && data && typeof data.error === "string") {
        return data.error;
      }
      if (status >= 500) {
        return "Something went wrong on the server. Please try again later.";
      }
    }
    return `Unable to reach the server (${API_BASE_URL}). Check your connection and try again.`;
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
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>
                Log in to stay connected, prepared, and informed during
                emergencies.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrap}>
                <View style={styles.phonePrefix}>
                  <View style={styles.prefixIcon}>
                    <PhoneIcon color={colors.placeholder} size={20} />
                  </View>
                  <Text style={styles.phoneCode}>+63</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="917 123 4567"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            <View style={[styles.field, styles.passwordField]}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <LockIcon color={colors.placeholder} size={20} />
                </View>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor={colors.primary}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <EyeIcon
                    color={colors.placeholder}
                    size={20}
                    off={!showPassword}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotButton} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.9}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.signupPrompt}>
            <Text style={styles.signupPromptText}>
              Don&apos;t have an account?{" "}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/register")}
            >
              <Text style={styles.signupLink}>Sign Up</Text>
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
  field: {
    gap: 6,
  },
  passwordField: {
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 10,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: colors.text,
  },
  inputWithIcon: {
    paddingLeft: 40,
    paddingRight: 16,
  },
  inputIcon: {
    position: "absolute",
    left: 12,
  },
  phonePrefix: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    paddingLeft: 12,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  prefixIcon: {
    marginRight: 6,
  },
  phoneCode: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  phoneInput: {
    paddingLeft: 12,
    paddingRight: 16,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
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
  signupPrompt: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "center",
  },
  signupPromptText: {
    fontSize: 14,
    color: colors.muted,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});