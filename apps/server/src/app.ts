import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { topicsRoute } from "./routes/topics.js";
import { statementsRoute } from "./routes/statements.js";
import { checkDatabaseReadiness } from "./db/health.js";
import { auth } from "./auth/auth.js";

export interface AppOptions {
  readinessCheck?: () => Promise<boolean>;
}

export function createApp(options: AppOptions = {}) {
  const readinessCheck = options.readinessCheck ?? checkDatabaseReadiness;
  return new Hono()
    .use("*", requestId())
    .use("*", secureHeaders())
    .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
    .get("/health/live", (c) => c.json({ status: "ok" as const }))
    .get("/health/ready", async (c) => {
      if (await readinessCheck()) return c.json({ status: "ok" as const }, 200);
      return c.json({ status: "unavailable" as const }, 503);
    })
    .route("/api/v1/topics", topicsRoute)
    .route("/api/v1/statements", statementsRoute);
}

export const app = createApp();

const staticRoot = process.env.STATIC_ROOT;
if (staticRoot) {
  app.use("*", serveStatic({ root: staticRoot }));
  app.get("*", serveStatic({ path: `${staticRoot}/index.html` }));
}

export type AppType = ReturnType<typeof createApp>;
