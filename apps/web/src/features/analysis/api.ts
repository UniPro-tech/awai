import { api, toApiError } from "../../lib/api";

export async function getLatestAnalysis(topicId: string) {
  const response = await api.api.v1.topics[":topicId"].analysis.latest.$get({
    param: { topicId },
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

export async function listAnalysisRuns(topicId: string) {
  const response = await api.api.v1.topics[":topicId"].analysis.runs.$get({
    param: { topicId },
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}
