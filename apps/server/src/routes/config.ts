import { PublicConfigResponseSchema } from "@private-polis/contracts";
import { Hono } from "hono";

export function createConfigRoute(registrationEnabled: boolean, localAuthEnabled: boolean) {
  return new Hono().get("/", (c) =>
    c.json(PublicConfigResponseSchema.parse({ registrationEnabled, localAuthEnabled }), 200));
}
