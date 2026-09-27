import { zValidator } from "@hono/zod-validator";
import {
  ApiErrorSchema,
  CreateTopicRequestSchema,
  IdSchema,
  TopicListResponseSchema,
} from "@private-polis/contracts";
import { Hono } from "hono";
import { presentTopic } from "../presenters/topic.js";
import { topicService } from "../services/topic-service.js";

export const topicsRoute = new Hono()
  .get("/", (c) =>
    c.json(TopicListResponseSchema.parse({ items: topicService.list().map(presentTopic) }), 200),
  )
  .post("/", zValidator("json", CreateTopicRequestSchema), (c) => {
    const topic = topicService.create(c.req.valid("json"));
    return c.json(presentTopic(topic), 201);
  })
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
