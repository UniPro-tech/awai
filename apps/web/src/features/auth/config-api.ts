import { PublicConfigResponseSchema } from "@private-polis/contracts";
import { toApiError } from "../../lib/api";

export async function getPublicConfig() {
  const response = await fetch("/api/config", { headers: { accept: "application/json" } });
  if (!response.ok) throw await toApiError(response);
  return PublicConfigResponseSchema.parse(await response.json());
}
