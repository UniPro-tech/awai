import { zValidator } from "@hono/zod-validator";
import {
  ApiErrorSchema,
  CreateStatementRequestSchema,
  CreateTopicRequestSchema,
  IdSchema,
  StatementListResponseSchema,
  TopicListResponseSchema,
} from "@private-polis/contracts";
import { Hono } from "hono";
import { presentTopic } from "../presenters/topic.js";
import { presentStatement } from "../presenters/statement.js";
import { statementService } from "../services/statement-service.js";
import { topicService } from "../services/topic-service.js";

export const topicsRoute = new Hono()
  .get("/", (c) =>
    c.json(TopicListResponseSchema.parse({ items: topicService.list().map(presentTopic) }), 200),
  )
  .post("/", zValidator("json", CreateTopicRequestSchema), (c) => {
    const topic = topicService.create(c.req.valid("json"));
    return c.json(presentTopic(topic), 201);
  })
  .get("/:topicId/statements", (c) => {
    const topicId = IdSchema.safeParse(c.req.param("topicId"));
    if (!topicId.success || !topicService.get(topicId.data)) {
      return c.json(
        ApiErrorSchema.parse({ error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." } }),
        404,
      );
    }
    return c.json(
      StatementListResponseSchema.parse({
        items: statementService.listByTopic(topicId.data).map(presentStatement),
      }),
      200,
    );
  })
  .post(
    "/:topicId/statements",
    zValidator("json", CreateStatementRequestSchema),
    (c) => {
      const topicId = IdSchema.safeParse(c.req.param("topicId"));
      if (!topicId.success) {
        return c.json(
          ApiErrorSchema.parse({ error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." } }),
          404,
        );
      }
      const result = statementService.create(topicId.data, c.req.valid("json"));
      if ("error" in result) {
        const message = {
          TOPIC_NOT_FOUND: "Topic not found.",
          TOPIC_CLOSED: "The topic is closed.",
          STATEMENT_IDENTITY_POLICY_VIOLATION:
            "The selected author visibility is not permitted for this topic.",
        }[result.error];
        return c.json(
          ApiErrorSchema.parse({ error: { code: result.error, message } }),
          result.error === "TOPIC_NOT_FOUND" ? 404 : 409,
        );
      }
      return c.json(presentStatement(result.statement), 201);
    },
  )
  .get("/:topicId", (c) => {
    const parsedId = IdSchema.safeParse(c.req.param("topicId"));
    const topic = parsedId.success ? topicService.get(parsedId.data) : undefined;
    if (!topic) {
      return c.json(
        ApiErrorSchema.parse({ error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." } }),
        404,
      );
    }
    return c.json(presentTopic(topic), 200);
  });
