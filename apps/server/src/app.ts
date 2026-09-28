import { serveStatic } from "@hono/node-server/serve-static";
import { ApiErrorSchema } from "@private-polis/contracts";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { createTopicsRoute } from "./routes/topics.js";
import { createStatementsRoute } from "./routes/statements.js";
import { createAnalysisRoute } from "./routes/analysis.js";
import { createCategoriesRoute, createTagsRoute } from "./routes/taxonomy.js";
import { createAdminRoute } from "./routes/admin.js";
import { checkDatabaseReadiness } from "./db/health.js";
import { auth } from "./auth/auth.js";
import { authenticateRequest, type AuthenticateRequest } from "./auth/session.js";
import { databaseRuntime } from "./db/runtime.js";
import type { AppEnvironment } from "./http/context.js";
import { createPostgresServices, type ApplicationServices } from "./services/services.js";
import {
  createFixedWindowRateLimiter,
  rateLimit,
  requestAddress,
  type RateLimiter,
} from "./http/rate-limit.js";
import { configuredTrustedOrigins } from "./auth/origins.js";
import { requireSameOrigin } from "./http/same-origin.js";

export interface AppOptions {
  readinessCheck?: () => Promise<boolean>;
  authenticate?: AuthenticateRequest;
  services?: ApplicationServices;
  authRateLimiter?: RateLimiter | false;
  apiRateLimiter?: RateLimiter | false;
  csrfTrustedOrigins?: string[];
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createApp(options: AppOptions = {}) {
  const readinessCheck = options.readinessCheck ?? checkDatabaseReadiness;
  const authenticate = options.authenticate ?? authenticateRequest;
  const services = options.services ?? createPostgresServices(databaseRuntime.db);
  const csrfTrustedOrigins = options.csrfTrustedOrigins ?? configuredTrustedOrigins();
  const windowMs = positiveInteger(process.env.RATE_LIMIT_WINDOW_SECONDS, 60) * 1_000;
  const authRateLimiter = options.authRateLimiter === false
    ? undefined
    : options.authRateLimiter
      ?? createFixedWindowRateLimiter(positiveInteger(process.env.RATE_LIMIT_AUTH_MAX, 20), windowMs);
  const apiRateLimiter = options.apiRateLimiter === false
    ? undefined
    : options.apiRateLimiter
      ?? createFixedWindowRateLimiter(positiveInteger(process.env.RATE_LIMIT_API_MAX, 300), windowMs);
  const app = new Hono<AppEnvironment>()
    .use("*", requestId())
    .use("*", secureHeaders());
  if (authRateLimiter) {
    app.use("/api/auth/*", rateLimit(authRateLimiter, (c) => requestAddress(c.req.raw.headers)));
  }
  app.all("/api/auth/*", (c) => auth.handler(c.req.raw))
    .get("/health/live", (c) => c.json({ status: "ok" as const }))
    .get("/health/ready", async (c) => {
      if (await readinessCheck()) return c.json({ status: "ok" as const }, 200);
      return c.json({ status: "unavailable" as const }, 503);
    })
    .use("/api/v1/*", requireSameOrigin(csrfTrustedOrigins))
    .use("/api/v1/*", async (c, next) => {
      const authentication = await authenticate(c.req.raw.headers);
      if (authentication.status === "unauthenticated") {
        return c.json(
          ApiErrorSchema.parse({
            error: {
              code: "AUTHENTICATION_REQUIRED",
              message: "Authentication is required.",
              requestId: c.get("requestId"),
            },
          }),
          401,
        );
      }
      if (authentication.status === "suspended") {
        return c.json(
          ApiErrorSchema.parse({
            error: {
              code: "PERMISSION_DENIED",
              message: "This account is suspended.",
              requestId: c.get("requestId"),
            },
          }),
          403,
        );
      }
      c.set("currentUser", authentication.user);
      await next();
    });
  if (apiRateLimiter) {
    app.use("/api/v1/*", rateLimit(apiRateLimiter, (c) => c.get("currentUser").id));
  }
  app.onError((error, c) => {
    if (!c.req.path.startsWith("/api/v1")) {
      return error instanceof HTTPException ? error.getResponse() : c.text("Internal Server Error", 500);
    }
    const requestIdValue = c.get("requestId");
    if (error instanceof HTTPException && error.status === 400) {
      return c.json(
        ApiErrorSchema.parse({
          error: {
            code: "VALIDATION_ERROR",
            message: "The request body is invalid.",
            requestId: requestIdValue,
          },
        }),
        400,
      );
    }
    console.error("Unhandled API error", { requestId: requestIdValue, error });
    return c.json(
      ApiErrorSchema.parse({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
          requestId: requestIdValue,
        },
      }),
      500,
    );
  });
  app.notFound((c) => {
    if (!c.req.path.startsWith("/api/v1")) return c.text("Not Found", 404);
    return c.json(
      ApiErrorSchema.parse({
        error: {
          code: "ROUTE_NOT_FOUND",
          message: "API route not found.",
          requestId: c.get("requestId"),
        },
      }),
      404,
    );
  });
  return app
    .route("/api/v1/topics", createAnalysisRoute(services))
    .route("/api/v1/topics", createTopicsRoute(services))
    .route("/api/v1/statements", createStatementsRoute(services))
    .route("/api/v1/categories", createCategoriesRoute(services))
    .route("/api/v1/tags", createTagsRoute(services))
    .route("/api/v1/admin", createAdminRoute(services));
}

export const app = createApp();

const staticRoot = process.env.STATIC_ROOT;
if (staticRoot) {
  app.use("*", serveStatic({ root: staticRoot }));
  app.get("*", serveStatic({ path: `${staticRoot}/index.html` }));
}

export type AppType = ReturnType<typeof createApp>;
