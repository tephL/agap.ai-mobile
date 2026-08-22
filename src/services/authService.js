import { api } from "./api";

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

export function limitPhoneInput(value, maxDigits = 11) {
  return normalizePhoneNumber(value).slice(0, maxDigits);
}

export async function register({ username, phone_number, password }) {
  const response = await api.post("/api/auth/register", {
    username,
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