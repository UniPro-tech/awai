import { api, toApiError } from "../../lib/api";

export async function listCategories() {
  const response = await api.api.v1.categories.$get();
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function listTags() {
  const response = await api.api.v1.tags.$get();
  if (!response.ok) throw await toApiError(response);
  return response.json();
}
