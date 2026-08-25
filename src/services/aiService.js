import { api } from "./api";

export async function sendChatMessage(message) {
  const response = await api.post("/api/ai/", { message });
  return response.data;
}

export async function getChatHistory({ limit = 50, offset = 0 } = {}) {
  const response = await api.get("/api/ai/history", {
    params: { limit, offset },
  });
  return response.data;
}

export async function clearChatHistory() {
  await api.delete("/api/ai/history");
}

export async function getSuggestions() {
  const response = await api.get("/api/ai/suggestions");
  return response.data;
}
