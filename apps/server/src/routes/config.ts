import { PublicConfigResponseSchema } from "@private-polis/contracts";
import { Hono } from "hono";

export function createConfigRoute(registrationEnabled: boolean) {
  return new Hono().get("/", (c) =>
    c.json(PublicConfigResponseSchema.parse({ registrationEnabled }), 200));
}
