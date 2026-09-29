import type { SetVoteRequest } from "@private-polis/contracts";
import { api, toApiError } from "../../lib/api";

export async function setVote(statementId: string, input: SetVoteRequest) {
  const response = await api.api.v1.statements[":statementId"].vote.$put({
    param: { statementId },
    json: input,
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function getVoteStatistics(statementId: string) {
  const response = await api.api.v1.statements[":statementId"].stats.$get({
    param: { statementId },
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function getCurrentVote(statementId: string) {
  const response = await api.api.v1.statements[":statementId"].vote.$get({
    param: { statementId },
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function listCurrentTopicVotes(topicId: string) {
  const response = await api.api.v1.topics[":topicId"].votes.$get({
    param: { topicId },
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}
