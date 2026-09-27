import { serveStatic } from "@hono/node-server/serve-static";
import { ApiErrorSchema } from "@private-polis/contracts";
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { createTopicsRoute } from "./routes/topics.js";
import { createStatementsRoute } from "./routes/statements.js";
import { createAnalysisRoute } from "./routes/analysis.js";
import { createCategoriesRoute, createTagsRoute } from "./routes/taxonomy.js";
import { checkDatabaseReadiness } from "./db/health.js";
import { auth } from "./auth/auth.js";
import { authenticateRequest, type AuthenticateRequest } from "./auth/session.js";
import { databaseRuntime } from "./db/runtime.js";
import type { AppEnvironment } from "./http/context.js";
import { createPostgresServices, type ApplicationServices } from "./services/services.js";

export interface AppOptions {
  readinessCheck?: () => Promise<boolean>;
  authenticate?: AuthenticateRequest;
  services?: ApplicationServices;
}

export function createApp(options: AppOptions = {}) {
  const readinessCheck = options.readinessCheck ?? checkDatabaseReadiness;
  const authenticate = options.authenticate ?? authenticateRequest;
  const services = options.services ?? createPostgresServices(databaseRuntime.db);
  return new Hono<AppEnvironment>()
    .use("*", requestId())
    .use("*", secureHeaders())
    .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
    .get("/health/live", (c) => c.json({ status: "ok" as const }))
    .get("/health/ready", async (c) => {
      if (await readinessCheck()) return c.json({ status: "ok" as const }, 200);
      return c.json({ status: "unavailable" as const }, 503);
    })
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
    })
    .route("/api/v1/topics", createAnalysisRoute(services))
    .route("/api/v1/topics", createTopicsRoute(services))
    .route("/api/v1/statements", createStatementsRoute(services))
    .route("/api/v1/categories", createCategoriesRoute(services))
    .route("/api/v1/tags", createTagsRoute(services));
}

export const app = createApp();

const staticRoot = process.env.STATIC_ROOT;
if (staticRoot) {
  app.use("*", serveStatic({ root: staticRoot }));
  app.get("*", serveStatic({ path: `${staticRoot}/index.html` }));
}

export type AppType = ReturnType<typeof createApp>;
