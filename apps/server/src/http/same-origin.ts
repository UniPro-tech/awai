import { ApiErrorSchema } from "@private-polis/contracts";
import type { MiddlewareHandler } from "hono";
import type { AppEnvironment } from "./context.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireSameOrigin(trustedOrigins: string[]): MiddlewareHandler<AppEnvironment> {
  const trusted = new Set(trustedOrigins);
  return async (c, next) => {
    if (safeMethods.has(c.req.method) || !c.req.header("cookie")) {
      await next();
      return;
    }
    const origin = c.req.header("origin");
    if (origin && trusted.has(origin)) {
      await next();
      return;
    }
    return c.json(
      ApiErrorSchema.parse({
        error: {
          code: "PERMISSION_DENIED",
          message: "Cross-origin request rejected.",
          requestId: c.get("requestId"),
        },
      }),
      403,
    );
  };
}
