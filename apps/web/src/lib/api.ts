import { createApiClient } from "@private-polis/api-client";

export const api = createApiClient(window.location.origin);

export async function toApiError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as
    | { error?: { message?: string; code?: string } }
    | null;
  const error = new Error(body?.error?.message ?? `Request failed with ${response.status}`);
  error.name = body?.error?.code ?? "API_ERROR";
  return error;
}
