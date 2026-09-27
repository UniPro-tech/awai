import { zValidator } from "@hono/zod-validator";
import {
  AdminUserListResponseSchema,
  AdminUserResponseSchema,
  ApiErrorSchema,
  IdSchema,
  UpdateAdminUserRequestSchema,
} from "@private-polis/contracts";
import { Hono } from "hono";
import type { AppEnvironment } from "../http/context.js";
import type { ApplicationServices } from "../services/services.js";

function forbidden() {
  return ApiErrorSchema.parse({
    error: { code: "PERMISSION_DENIED", message: "Administrator access is required." },
  });
}

export function createAdminRoute(services: ApplicationServices) {
  return new Hono<AppEnvironment>()
    .get("/users", async (c) => {
      const result = await services.admin.listUsers(c.get("currentUser"));
      if (!Array.isArray(result)) return c.json(forbidden(), 403);
      return c.json(AdminUserListResponseSchema.parse({ items: result }), 200);
    })
    .patch(
      "/users/:userId",
      zValidator("json", UpdateAdminUserRequestSchema),
      async (c) => {
        const id = IdSchema.safeParse(c.req.param("userId"));
        if (!id.success) {
          return c.json(
            ApiErrorSchema.parse({ error: { code: "USER_NOT_FOUND", message: "User not found." } }),
            404,
          );
        }
        const result = await services.admin.updateUser(
          id.data,
          c.req.valid("json"),
          c.get("currentUser"),
        );
        if ("error" in result) {
          if (result.error === "PERMISSION_DENIED") return c.json(forbidden(), 403);
          if (result.error === "ADMIN_SELF_LOCKOUT") {
            return c.json(
              ApiErrorSchema.parse({
                error: {
                  code: result.error,
                  message: "Administrators cannot demote or suspend their own account.",
                },
              }),
              409,
            );
          }
          return c.json(
            ApiErrorSchema.parse({ error: { code: result.error, message: "User not found." } }),
            404,
          );
        }
        return c.json(AdminUserResponseSchema.parse(result.user), 200);
      },
    );
}
