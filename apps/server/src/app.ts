import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { topicsRoute } from "./routes/topics.js";
import { statementsRoute } from "./routes/statements.js";

export const app = new Hono()
  .use("*", requestId())
  .use("*", secureHeaders())
  .get("/health/live", (c) => c.json({ status: "ok" as const }))
  .get("/health/ready", (c) => c.json({ status: "ok" as const }))
  .route("/api/v1/topics", topicsRoute)
  .route("/api/v1/statements", statementsRoute);

export type AppType = typeof app;
