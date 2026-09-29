import {
  AnalysisRunListResponseSchema,
  AnalysisRunResponseSchema,
  ApiErrorSchema,
  IdSchema,
} from "@private-polis/contracts";
import { Hono } from "hono";
import type { AppEnvironment } from "../http/context.js";
import type { ApplicationServices } from "../services/services.js";

function notFound() {
  return ApiErrorSchema.parse({
    error: { code: "ANALYSIS_NOT_FOUND", message: "Analysis run not found." },
  });
}

export function createAnalysisRoute(services: ApplicationServices) {
  return new Hono<AppEnvironment>()
    .get("/:topicId/analysis/latest", async (c) => {
      const topicId = IdSchema.safeParse(c.req.param("topicId"));
      if (!topicId.success || !(await services.topics.get(topicId.data))) {
        return c.json(
          ApiErrorSchema.parse({
            error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." },
          }),
          404,
        );
      }
      const run = await services.analysis.latest(topicId.data, c.get("currentUser").id);
      if (!run) return c.json(notFound(), 404);
      return c.json(AnalysisRunResponseSchema.parse(run), 200);
    })
    .get("/:topicId/analysis/runs", async (c) => {
      const topicId = IdSchema.safeParse(c.req.param("topicId"));
      if (!topicId.success || !(await services.topics.get(topicId.data))) {
        return c.json(
          ApiErrorSchema.parse({
            error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." },
          }),
          404,
        );
      }
      return c.json(
        AnalysisRunListResponseSchema.parse({
          items: await services.analysis.listRuns(topicId.data),
        }),
        200,
      );
    })
    .get("/:topicId/analysis/runs/:runId", async (c) => {
      const topicId = IdSchema.safeParse(c.req.param("topicId"));
      const runId = IdSchema.safeParse(c.req.param("runId"));
      if (!topicId.success || !runId.success) return c.json(notFound(), 404);
      const run = await services.analysis.getRun(
        topicId.data,
        runId.data,
        c.get("currentUser").id,
      );
      if (!run) return c.json(notFound(), 404);
      return c.json(AnalysisRunResponseSchema.parse(run), 200);
    });
}
