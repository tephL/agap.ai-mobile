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
    // Dispatcher sessions take priority — a device is either a citizen
    // or a dispatcher, never both at once.
    const dispatcherToken = await SecureStore.getItemAsync("dispatcher_token");
    const token =
      dispatcherToken ?? (await SecureStore.getItemAsync("token"));
    if (token) {
      config.headers.Cookie = `token=${token}`;
    }
  } catch {
    // Ignore SecureStore errors
  }
  return config;
});
