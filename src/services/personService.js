import { api } from "./api";
import { getCurrentUserId } from "./currentUser";
import { saveProfileSnapshot, getProfileFromCache } from "./profileRepo";

export async function getMyProfile() {
  const userId = await getCurrentUserId();

  try {
    const { data } = await api.get("/api/auth/profile");

    if (userId && data) {
      await saveProfileSnapshot(userId, data);
    }

    return data;
  } catch (err) {
    // Network/offline = try SQLite.
    if (userId && !err?.response) {
      const cached = await getProfileFromCache(userId);

      if (cached) {
        return cached;
      }
    }

    throw err;
  }
}

export function hasPersonalInfo(profile) {
  return Boolean(profile && profile.first_name);
}

export async function createPerson(details) {
  const response = await api.post("/api/people", details);
  return response;
}
