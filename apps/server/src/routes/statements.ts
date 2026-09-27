import { zValidator } from "@hono/zod-validator";
import {
  ApiErrorSchema,
  CurrentVoteResponseSchema,
  IdSchema,
  SetVoteRequestSchema,
  VoteStatisticsResponseSchema,
} from "@private-polis/contracts";
import { Hono } from "hono";
import type { AppEnvironment } from "../http/context.js";
import type { ApplicationServices } from "../services/services.js";

function statementNotFound() {
  return ApiErrorSchema.parse({
    error: { code: "STATEMENT_NOT_FOUND", message: "Statement not found." },
  });
}

export function createStatementsRoute(services: ApplicationServices) {
  return new Hono<AppEnvironment>()
  .put("/:statementId/vote", zValidator("json", SetVoteRequestSchema), async (c) => {
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
