import { api } from "./api";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";

export const CITIZEN_ROLE_ID = 100;

export function decodeToken(token) {
  try {
    const payload = jwtDecode(token);
    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      return null; // expired token is as good as no token
    }
    return {
      user_id: payload?.user_id ?? null,
      username: payload?.username ?? null,
      role_id: payload?.role_id ?? null,
    };
  } catch (err) {
    console.log("decodeToken error:", err);
    return null;
  }
}

export async function getStoredSession() {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) return null;

    const session = decodeToken(token);
    if (!session || session.user_id == null) return null;

    return session;
  } catch (err) {
    console.log("getStoredSession error:", err);
    return null;
  }
}

export function normalizePhoneNumber(value) {
  return (value ?? "").replace(/\D/g, "");
}

export function normalizePhoneForLogin(value) {
  let digits = normalizePhoneNumber(value);
  digits = digits.replace(/^0+/, "");
  if (digits.length === 12 && digits.startsWith("63")) {
    digits = digits.slice(2);
  }
  return digits;
}

export function limitPhoneInput(value, maxDigits = 10) {
  return normalizePhoneNumber(value).slice(0, maxDigits);
}

export async function register({ phone_number, password }) {
  const response = await api.post("/api/auth/register", {
    phone_number,
    password,
  });
  return response;
}

export async function login({ phone_number, password }) {
  const response = await api.post("/api/auth/login", {
    phone_number,
    password,
  });
  return response;
}
