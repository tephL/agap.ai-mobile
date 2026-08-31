import * as SecureStore from "expo-secure-store";
import { getCurrentUserId } from "./currentUser";

const STORAGE_KEY = "active_report";

/**
 * Persists the citizen's active (not yet resolved/cancelled) report so the
 * "report received" notif reappears after re-login or an app restart.
 *
 * The report is scoped to the current user (keyed by user_id), so a
 * different citizen logging in won't inherit someone else's active report.
 */
export async function saveActiveReport({ reportId, clusterId }) {
  try {
    const user_id = await getCurrentUserId();
    if (user_id == null) return;
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify({
        user_id,
        reportId,
        clusterId: clusterId ?? null,
      })
    );
  } catch (err) {
    console.log("saveActiveReport error:", err);
  }
}

export async function getActiveReport() {
  try {
    const user_id = await getCurrentUserId();
    if (user_id == null) return null;
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.user_id !== user_id) return null;
    return {
      reportId: data.reportId,
      clusterId: data.clusterId ?? null,
    };
  } catch (err) {
    console.log("getActiveReport error:", err);
    return null;
  }
}

export async function clearActiveReport() {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch (err) {
    console.log("clearActiveReport error:", err);
  }
}
