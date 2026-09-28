import { CurrentUserResponseSchema } from "@private-polis/contracts";
import { Hono } from "hono";
import type { AppEnvironment } from "../http/context.js";

export function createUsersRoute() {
  return new Hono<AppEnvironment>().get("/me", (c) =>
    c.json(CurrentUserResponseSchema.parse(c.get("currentUser")), 200));
}
