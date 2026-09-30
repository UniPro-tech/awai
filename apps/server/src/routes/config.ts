import { PublicConfigResponseSchema, type PublicSsoProvider } from "@private-polis/contracts";
import { Hono } from "hono";

export function createConfigRoute(
  registrationEnabled: boolean,
  localAuthEnabled: boolean,
  categoryCreationAdminOnly: boolean,
  ssoProviders: PublicSsoProvider[],
) {
  return new Hono().get("/", (c) =>
    c.json(PublicConfigResponseSchema.parse({
      registrationEnabled,
      localAuthEnabled,
      categoryCreationAdminOnly,
      ssoProviders,
    }), 200));
}
