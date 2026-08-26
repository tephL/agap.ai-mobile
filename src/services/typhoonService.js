import { api } from "./api";

export async function getActiveTyphoon() {
  const response = await api.get("/api/typhoons/active");
  return response.data;
}

export async function getAllTyphoons() {
  const response = await api.get("/api/typhoons");
  return response.data;
}

export async function createTyphoon({ name, signal_number, is_active }) {
  const response = await api.post("/api/typhoons", {
    name,
    signal_number,
    is_active,
  });
  return response.data;
}

export async function updateTyphoon(id, { name, signal_number, is_active }) {
  const response = await api.patch(`/api/typhoons/${id}`, {
    name,
    signal_number,
    is_active,
  });
  return response.data;
}

export async function deleteTyphoon(id) {
  await api.delete(`/api/typhoons/${id}`);
}
