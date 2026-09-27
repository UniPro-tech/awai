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
import type { AppEnvironment } from "../http/context.js";
import { presentTopic } from "../presenters/topic.js";
import { presentStatement } from "../presenters/statement.js";
import type { ApplicationServices } from "../services/services.js";

export function createTopicsRoute(services: ApplicationServices) {
  return new Hono<AppEnvironment>()
  .get("/", async (c) =>
    c.json(TopicListResponseSchema.parse({ items: (await services.topics.list()).map(presentTopic) }), 200),
  )
  .post("/", zValidator("json", CreateTopicRequestSchema), async (c) => {
    const topic = await services.topics.create(c.req.valid("json"), c.get("currentUser"));
    return c.json(presentTopic(topic), 201);
  })
  .get("/:topicId/statements", async (c) => {
    const topicId = IdSchema.safeParse(c.req.param("topicId"));
    if (!topicId.success || !(await services.topics.get(topicId.data))) {
      return c.json(
        ApiErrorSchema.parse({ error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." } }),
        404,
      );
    }
    return c.json(
      StatementListResponseSchema.parse({
        items: (await services.statements.listByTopic(topicId.data)).map(presentStatement),
      }),
      200,
    );
  })
  .post(
    "/:topicId/statements",
    zValidator("json", CreateStatementRequestSchema),
    async (c) => {
      const topicId = IdSchema.safeParse(c.req.param("topicId"));
      if (!topicId.success) {
        return c.json(
          ApiErrorSchema.parse({ error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." } }),
          404,
        );
      }
      const result = await services.statements.create(
        topicId.data,
        c.req.valid("json"),
        c.get("currentUser"),
      );
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
  .get("/:topicId", async (c) => {
    const parsedId = IdSchema.safeParse(c.req.param("topicId"));
    const topic = parsedId.success ? await services.topics.get(parsedId.data) : undefined;
    if (!topic) {
      return c.json(
        ApiErrorSchema.parse({ error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." } }),
        404,
      );
    }
    return c.json(presentTopic(topic), 200);
  });
}
