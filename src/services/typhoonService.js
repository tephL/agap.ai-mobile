import { api } from "./api";

export async function getActiveTyphoon() {
  const response = await api.get("/api/typhoons/active");
  return response.data;
}
