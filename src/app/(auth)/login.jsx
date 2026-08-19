import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

import Logo from "../../assets/images/logo.png";
import PhoneIcon from "../../assets/icons/phone.png";
import LockIcon from "../../assets/icons/lock.png";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:3000/api/auth/login", {
        phone_number: phone,
        password,
      });

      const data = response.data;

      await SecureStore.setItemAsync("token", data.token);
      console.log("Login successful:", data.token);
      setError("");
      // TODO: Navigate to your next screen here
    } catch (err) {
      if (err.response) {
        setError(err.response.data.error || "Login failed");
      } else {
        setError("Network error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo inside circular border */}
      <View style={styles.logoContainer}>
        <Image source={Logo} style={styles.logoImage} />
      </View>
      <Text style={styles.logoText}>AGAP.ai</Text>
      <Text style={styles.tagline}>MAAGAP NA KA-AGAPAY</Text>

      {/* Phone Number Field */}
      <Text style={styles.label}>Phone Number</Text>
      <View style={styles.inputRow}>
        <Image source={PhoneIcon} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Enter Phone Number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      {/* Password Field */}
      <Text style={styles.label}>Password</Text>
      <View style={styles.inputRow}>
        <Image source={LockIcon} style={styles.icon} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.eye}>{showPassword ? "🙈" : "👁️"}</Text>
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Forgot Password */}
      <TouchableOpacity>
        <Text style={styles.forgot}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        <Text style={styles.loginText}>{loading ? "Logging in..." : "Log In"}</Text>
      </TouchableOpacity>

      {/* Sign Up Link */}
      <View style={styles.signupContainer}>
        <Text>Don’t have an account?</Text>
        <TouchableOpacity>
          <Text style={styles.signup}> Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },

  logoContainer: {
    alignSelf: "center",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "red",
    overflow: "hidden",
    marginBottom: 10,
  },
  logoImage: { width: "100%", height: "100%", resizeMode: "contain" },
  logoText: { fontSize: 28, fontWeight: "bold", color: "red", textAlign: "center" },
  tagline: { fontSize: 14, color: "gray", textAlign: "center", marginBottom: 30 },

  label: { fontSize: 14, fontWeight: "600", marginBottom: 5, color: "#333" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  icon: { width: 20, height: 20, resizeMode: "contain", marginRight: 10 },
  input: { flex: 1, paddingVertical: 10 },

  eye: { marginLeft: 10, fontSize: 18 },
  forgot: { color: "red", textAlign: "right", marginBottom: 20 },
  loginButton: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  loginText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  signupContainer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  signup: { color: "blue", fontWeight: "bold" },
  error: { color: "red", marginBottom: 10, textAlign: "center" },
});
