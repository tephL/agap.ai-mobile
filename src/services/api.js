import { create as createAxios } from "axios";
import * as SecureStore from "expo-secure-store";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_LOCAL_IP ??
  "http://localhost:3000";

export const api = createAxios({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (token) {
<<<<<<< HEAD
      config.headers.Authorization = `Bearer ${token}`;
=======
      config.headers.Cookie = `token=${token}`;
>>>>>>> b19bab5 (added personal info with backend)
    }
  } catch {
  }
  return config;
});