import { useState } from "react";
import {
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
import colors from "../../constants/colors";
import Logo from "../../components/ui/Logo";
import {
  PersonIcon,
  PhoneIcon,
  LockIcon,
  EyeIcon,
} from "../../components/ui/icons";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <PersonIcon color={colors.placeholder} size={20} />
                </View>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.placeholder}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor={colors.primary}
                />
              </View>
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
              <Text style={styles.helper}>
                Used for emergency alerts and SMS fallback.
              </Text>
            </View>

            <View style={[styles.field, styles.passwordField]}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <LockIcon color={colors.placeholder} size={20} />
                </View>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Create your password"
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

            <TouchableOpacity style={styles.button} activeOpacity={0.9}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>Already have an account? </Text>
            <Text style={styles.loginLink}>Log In</Text>
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
  helper: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
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
