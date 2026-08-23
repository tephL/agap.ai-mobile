import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";

export const DISPATCHER_ROLE_ID = 911;
const DISPATCHER_TOKEN_KEY = "dispatcher_token";

export async function saveDispatcherSession(token) {
  await SecureStore.setItemAsync(DISPATCHER_TOKEN_KEY, token);
}

export function decodeDispatcherToken(token) {
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
    console.log("decodeDispatcherToken error:", err);
    return null;
  }
}

export function isDispatcherSession(session) {
  return session?.role_id === DISPATCHER_ROLE_ID;
}

export async function getDispatcherSession() {
  try {
    const token = await SecureStore.getItemAsync(DISPATCHER_TOKEN_KEY);
    if (!token) return null;

    const session = decodeDispatcherToken(token);
    if (!isDispatcherSession(session)) return null;

    return session;
  } catch (err) {
    console.log("getDispatcherSession error:", err);
    return null;
  }
}

export async function clearDispatcherSession() {
  try {
    await SecureStore.deleteItemAsync(DISPATCHER_TOKEN_KEY);
  } catch (err) {
    console.log("clearDispatcherSession error:", err);
  }
}
