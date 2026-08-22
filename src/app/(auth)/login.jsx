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
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import Logo from "../../components/ui/Logo";
import FormInput from "../../components/ui/FormInput";
import {
  login as loginAccount,
  normalizePhoneForLogin,
  limitPhoneInput,
  decodeToken,
  CITIZEN_ROLE_ID,
} from "../../services/authService";
import {
  DISPATCHER_ROLE_ID,
  saveDispatcherSession,
} from "../../services/dispatcherService";
import {
  getMyProfile,
  hasPersonalInfo,
} from "../../services/personService";
import { API_BASE_URL } from "../../services/api";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordRef = useRef(null);

  const validate = () => {
    const nextErrors = {};
    const normalizedPhone = normalizePhoneForLogin(phone);
    if (!normalizedPhone) {
      nextErrors.phone = "Phone number is required";
    } else if (normalizedPhone.length !== 10) {
      nextErrors.phone = "Enter a valid 10-digit mobile number";
    }
    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }
    return nextErrors;
  };

  const updateField = (key, value) => {
    if (key === "phone") setPhone(limitPhoneInput(value));
    if (key === "password") setPassword(value);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleLogin = async () => {
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
      const response = await loginAccount({
        phone_number: normalizePhoneForLogin(phone),
        password,
      });
      const data = response.data;
      const session = decodeToken(data?.token);
      const isCitizen = session?.role_id === CITIZEN_ROLE_ID;
      const isDispatcher = session?.role_id === DISPATCHER_ROLE_ID;
      if (!isCitizen && !isDispatcher) {
        setError(
          "This account type is not recognized. Please contact support."
        );
        return;
      }
      if (isDispatcher) {
        await saveDispatcherSession(data.token);
        router.replace("/home");
        return;
      }
      await SecureStore.setItemAsync("token", data.token);
      try {
        const profile = await getMyProfile();
        if (hasPersonalInfo(profile.data)) {
          router.replace("/");
        } else {
          router.replace("/personal-info");
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          await SecureStore.deleteItemAsync("token");
          setError("Session expired. Please log in again.");
          return;
        }
        router.replace("/");
      }
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
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={fieldErrors.phone}
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
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => updateField("password", text)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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
  passwordField: {
    marginTop: 4,
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
