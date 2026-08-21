import * as SecureStore from "expo-secure-store";

/** Decode the JWT payload from SecureStore to get the logged-in user's id.
 *  Never used for auth — only to scope the offline cache to the right account. */
export async function getCurrentUserId() {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) return null;

    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf-8")
    );
    return payload?.user_id ?? null;
  } catch {
    return null;
  }
}