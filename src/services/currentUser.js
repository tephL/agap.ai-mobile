import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";

export async function getCurrentUserId() {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) return null;

    const payload = jwtDecode(token);

    return payload?.user_id ?? null;
  } catch (err) {
    console.log("getCurrentUserId error:", err);
    return null;
  }
}