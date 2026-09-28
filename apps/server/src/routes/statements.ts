import {
  ApiErrorSchema,
  CurrentVoteResponseSchema,
  DeletionRequestSchema,
  IdSchema,
  SetVoteRequestSchema,
  VoteStatisticsResponseSchema,
} from "@private-polis/contracts";
import { Hono } from "hono";
import type { AppEnvironment } from "../http/context.js";
import type { ApplicationServices } from "../services/services.js";
import { jsonValidator } from "../http/validation.js";

function statementNotFound() {
  return ApiErrorSchema.parse({
    error: { code: "STATEMENT_NOT_FOUND", message: "Statement not found." },
  });
}

export function createStatementsRoute(services: ApplicationServices) {
  return new Hono<AppEnvironment>()
  .delete("/:statementId", jsonValidator(DeletionRequestSchema), async (c) => {
    const statementId = IdSchema.safeParse(c.req.param("statementId"));
    if (!statementId.success) return c.json(statementNotFound(), 404);
    const result = await services.statements.delete(
      statementId.data,
      c.get("currentUser"),
      c.req.valid("json").reason,
    );
    if ("error" in result) {
      if (result.error === "PERMISSION_DENIED") {
        return c.json(
          ApiErrorSchema.parse({ error: { code: result.error, message: "Permission denied." } }),
          403,
        );
      }
      return c.json(statementNotFound(), 404);
    }
    return c.body(null, 204);
  })
  .post("/:statementId/restore", async (c) => {
    const statementId = IdSchema.safeParse(c.req.param("statementId"));
    if (!statementId.success) return c.json(statementNotFound(), 404);
    const result = await services.statements.restore(statementId.data, c.get("currentUser"));
    if ("error" in result) {
      if (result.error === "PERMISSION_DENIED") {
        return c.json(
          ApiErrorSchema.parse({ error: { code: result.error, message: "Permission denied." } }),
          403,
        );
      }
      return c.json(statementNotFound(), 404);
    }
    return c.body(null, 204);
  })
  .put("/:statementId/vote", jsonValidator(SetVoteRequestSchema), async (c) => {
    const statementId = IdSchema.safeParse(c.req.param("statementId"));
    const statement = statementId.success
      ? await services.statements.get(statementId.data)
      : undefined;
    if (!statement) {
      return c.json(statementNotFound(), 404);
    }
    const user = c.get("currentUser");
    await services.votes.setVote(statement.id, statement.topicId, user.id, c.req.valid("json").value);
    return c.json(
      CurrentVoteResponseSchema.parse({
        value: await services.votes.getCurrentUserVote(statement.id, user.id),
      }),
      200,
    );
  })
  .get("/:statementId/vote", async (c) => {
    const statementId = IdSchema.safeParse(c.req.param("statementId"));
    const statement = statementId.success
      ? await services.statements.get(statementId.data)
      : undefined;
    if (!statement) {
      return c.json(statementNotFound(), 404);
    }
    const user = c.get("currentUser");
    return c.json(
      CurrentVoteResponseSchema.parse({
        value: await services.votes.getCurrentUserVote(statement.id, user.id),
      }),
      200,
    );
  })
  .get("/:statementId/stats", async (c) => {
    const statementId = IdSchema.safeParse(c.req.param("statementId"));
    if (!statementId.success || !(await services.statements.get(statementId.data))) {
      return c.json(statementNotFound(), 404);
    }
    return c.json(
      VoteStatisticsResponseSchema.parse(await services.votes.getVoteStatistics(statementId.data)),
      200,
    );
  });
}
