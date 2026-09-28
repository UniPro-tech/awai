import type { ChangeTopicOwnerRequest, CreateTopicRequest, UpdateTopicRequest } from "@private-polis/contracts";
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

export async function getTopic(topicId: string) {
  const response = await api.api.v1.topics[":topicId"].$get({ param: { topicId } });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function updateTopic(topicId: string, input: UpdateTopicRequest) {
  const response = await api.api.v1.topics[":topicId"].$patch({
    param: { topicId },
    json: input,
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function changeTopicOwner(topicId: string, input: ChangeTopicOwnerRequest) {
  const response = await api.api.v1.topics[":topicId"].owner.$patch({
    param: { topicId },
    json: input,
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}
