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

export async function createCategory(name: string) {
  const response = await api.api.v1.categories.$post({ json: { name } });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function deleteCategory(categoryId: string) {
  const response = await api.api.v1.categories[":categoryId"].$delete({ param: { categoryId } });
  if (!response.ok) throw await toApiError(response);
}

export async function createTag(name: string) {
  const response = await api.api.v1.tags.$post({ json: { name } });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function deleteTag(tagId: string) {
  const response = await api.api.v1.tags[":tagId"].$delete({ param: { tagId } });
  if (!response.ok) throw await toApiError(response);
}
