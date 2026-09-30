import type { CreateStatementRequest, DeletionRequest } from "@private-polis/contracts";
import { api, toApiError } from "../../lib/api";

export async function listStatements(topicId: string) {
  const response = await api.api.v1.topics[":topicId"].statements.$get({ param: { topicId } });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function createStatement(topicId: string, input: CreateStatementRequest) {
  const response = await api.api.v1.topics[":topicId"].statements.$post({
    param: { topicId },
    json: input,
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function deleteStatement(statementId: string, input: DeletionRequest) {
  const response = await api.api.v1.statements[":statementId"].$delete({
    param: { statementId },
    json: input,
  });
  if (!response.ok) throw await toApiError(response);
}
