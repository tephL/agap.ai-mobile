import { api } from "./api";

export function normalizePhoneNumber(value) {
  return (value ?? "").replace(/\D/g, "");
}

export async function register({ username, phone_number, password }) {
  const response = await api.post("/api/auth/register", {
    username,
    phone_number,
    password,
  });
  return response;
}