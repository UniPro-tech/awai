import { describe, expect, it } from "vitest";
import { CreateTopicRequestSchema, TopicResponseSchema } from "./index.js";

describe("topic contracts", () => {
  it("normalizes defaults", () => {
    const topic = CreateTopicRequestSchema.parse({ title: "  A shared goal  " });
    expect(topic).toEqual({
      title: "A shared goal",
      description: "",
      authorVisibility: "IDENTIFIED",
      statementIdentityPolicy: "OPTIONAL",
      categoryId: null,
      tags: [],
    });
  });

  it("rejects invalid titles and excessive tags", () => {
    expect(() => CreateTopicRequestSchema.parse({ title: "" })).toThrow();
    expect(() =>
      CreateTopicRequestSchema.parse({
        title: "Topic",
        tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`),
      }),
    ).toThrow();
  });

  it("strips internal identity fields at the response boundary", () => {
    const response = TopicResponseSchema.parse({
      id: "0198f38e-c18a-7e9f-a005-629e4c37ae40",
      title: "Topic",
      description: "",
      author: { visibility: "ANONYMOUS", displayName: null },
      statementIdentityPolicy: "OPTIONAL",
      status: "OPEN",
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
      createdByUserId: "internal-user-id",
    });

    expect(response).not.toHaveProperty("createdByUserId");
    expect(response.author.displayName).toBeNull();
  });
});
