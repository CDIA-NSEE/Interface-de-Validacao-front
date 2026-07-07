import api from "./api.js";

export async function getSupportContact() {
  const { data } = await api.get("/support/contact");
  return data;
}
