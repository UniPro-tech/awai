import { zValidator } from "@hono/zod-validator";
import {
  ApiErrorSchema,
  CurrentVoteResponseSchema,
  IdSchema,
  SetVoteRequestSchema,
  VoteStatisticsResponseSchema,
} from "@private-polis/contracts";
import { Hono } from "hono";
import { statementService } from "../services/statement-service.js";
import { voteService } from "../services/vote-service.js";

const DEVELOPMENT_USER_ID = "development-user";

function statementNotFound() {
  return ApiErrorSchema.parse({
    error: { code: "STATEMENT_NOT_FOUND", message: "Statement not found." },
  });
}

export const statementsRoute = new Hono()
  .put("/:statementId/vote", zValidator("json", SetVoteRequestSchema), (c) => {
    const statementId = IdSchema.safeParse(c.req.param("statementId"));
    if (!statementId.success || !statementService.get(statementId.data)) {
      return c.json(statementNotFound(), 404);
    }
    voteService.setVote(statementId.data, DEVELOPMENT_USER_ID, c.req.valid("json").value);
    return c.json(
      CurrentVoteResponseSchema.parse({
        value: voteService.getCurrentUserVote(statementId.data, DEVELOPMENT_USER_ID),
      }),
      200,
    );
  })
  .get("/:statementId/vote", (c) => {
    const statementId = IdSchema.safeParse(c.req.param("statementId"));
    if (!statementId.success || !statementService.get(statementId.data)) {
      return c.json(statementNotFound(), 404);
    }
    return c.json(
      CurrentVoteResponseSchema.parse({
        value: voteService.getCurrentUserVote(statementId.data, DEVELOPMENT_USER_ID),
      }),
      200,
    );
  })
  .get("/:statementId/stats", (c) => {
    const statementId = IdSchema.safeParse(c.req.param("statementId"));
    if (!statementId.success || !statementService.get(statementId.data)) {
      return c.json(statementNotFound(), 404);
    }
    return c.json(
      VoteStatisticsResponseSchema.parse(voteService.getVoteStatistics(statementId.data)),
      200,
    );
  });
