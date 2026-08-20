import { api } from "./api";

export async function getMyProfile() {
  const response = await api.get("/api/auth/profile");
  return response;
}

export function hasPersonalInfo(profile) {
  return Boolean(profile && profile.first_name);
}

export async function createPerson(details) {
  const response = await api.post("/api/people", details);
  return response;
}