import { api } from "./api";

export async function getActiveTyphoon() {
  const response = await api.get("/api/typhoons/active");
  return response.data;
}

export async function getAllTyphoons() {
  const response = await api.get("/api/typhoons");
  return response.data;
}

export async function createTyphoon({ name, category, status, source }) {
  const response = await api.post("/api/typhoons", {
    name,
    category,
    status,
    source,
  });
  return response.data;
}

export async function updateTyphoon(id, { name, category, status, source }) {
  const response = await api.patch(`/api/typhoons/${id}`, {
    name,
    category,
    status,
    source,
  });
  return response.data;
}

export async function deleteTyphoon(id) {
  await api.delete(`/api/typhoons/${id}`);
}
