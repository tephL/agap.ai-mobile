import { create as createAxios } from "axios";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_LOCAL_IP ??
  "http://localhost:3000"; 

export const api = createAxios({
  baseURL: API_BASE_URL,
  timeout: 10000,
});
