import type { CreateTopicRequest } from "@private-polis/contracts";
import { api, toApiError } from "../../lib/api";

export async function listTopics() {
  const response = await api.api.v1.topics.$get();
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function createTopic(input: CreateTopicRequest) {
  const response = await api.api.v1.topics.$post({ json: input });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}
