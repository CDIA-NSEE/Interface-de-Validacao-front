import api from "./api.js";

export async function login(identifier, password) {
  const cleanIdentifier = identifier.trim();
  const { data } = await api.post("/auth/login", {
    email: cleanIdentifier,
    username: cleanIdentifier,
    password,
  });
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}
