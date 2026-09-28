import { zValidator } from "@hono/zod-validator";
import { ApiErrorSchema } from "@private-polis/contracts";
import type { ZodType } from "zod";

export function jsonValidator<T extends ZodType>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (result.success) return;
    return c.json(
      ApiErrorSchema.parse({
        error: {
          code: "VALIDATION_ERROR",
          message: "The request body is invalid.",
          details: {
            issues: result.error.issues.map(({ code, message, path }) => ({ code, message, path })),
          },
          requestId: c.get("requestId"),
        },
      }),
      400,
    );
  });
}
