import { api, toApiError } from "../../lib/api";

export async function getCurrentUser() {
  const response = await api.api.v1.me.$get();
  if (!response.ok) throw await toApiError(response);
  return response.json();
}
