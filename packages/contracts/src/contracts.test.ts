import { describe, expect, it } from "vitest";
import {
  AnalysisRunResponseSchema,
  CreateTopicRequestSchema,
  CurrentTopicVoteListResponseSchema,
  CurrentUserResponseSchema,
  DeletionRequestSchema,
  TopicResponseSchema,
} from "./index.js";

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

describe("current user contract", () => {
  it("strips authentication-provider fields", () => {
    const user = CurrentUserResponseSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      displayName: "Member",
      role: "USER",
      email: "private@example.com",
      authUserId: "auth-provider-id",
    });

    expect(user).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      displayName: "Member",
      role: "USER",
    });
  });
});

describe("vote contracts", () => {
  it("contains only the current user's statement choices", () => {
    expect(
      CurrentTopicVoteListResponseSchema.parse({
        items: [
          {
            statementId: "0198f38e-c18a-7e9f-a005-629e4c37ae40",
            value: "PASS",
            userId: "private-user",
          },
        ],
      }),
    ).toEqual({
      items: [
        {
          statementId: "0198f38e-c18a-7e9f-a005-629e4c37ae40",
          value: "PASS",
        },
      ],
    });
  });
});

describe("analysis contracts", () => {
  it("strips participant and statement author identities", () => {
    const response = AnalysisRunResponseSchema.parse({
      id: "0198f38e-c18a-7e9f-a005-629e4c37ae40",
      status: "COMPLETED",
      algorithmVersion: "red-dwarf-0.4.0",
      participantCount: 2,
      statementCount: 2,
      completedAt: "2026-09-27T00:00:01.000Z",
      createdAt: "2026-09-27T00:00:00.000Z",
      groups: [],
      points: [{ x: 0.5, y: -0.25, groupOrdinal: null, userId: "private-user" }],
      viewerPoint: {
        x: 0.5,
        y: -0.25,
        groupOrdinal: null,
        userId: "current-user",
      },
      statementResults: [
        {
          statement: {
            id: "0198f38e-c18a-7e9f-a005-629e4c37ae41",
            topicId: "0198f38e-c18a-7e9f-a005-629e4c37ae42",
            body: "Shared ground",
            author: { visibility: "ANONYMOUS", displayName: null },
            createdAt: "2026-09-27T00:00:00.000Z",
            updatedAt: "2026-09-27T00:00:00.000Z",
            authorUserId: "private-user",
          },
          groupOrdinal: null,
          kind: "CONSENSUS_AGREE",
          score: 0.9,
          rank: 1,
        },
      ],
    });

    expect(response.points[0]).not.toHaveProperty("userId");
    expect(response.viewerPoint).not.toHaveProperty("userId");
    expect(response.statementResults[0]?.statement).not.toHaveProperty("authorUserId");
  });
});

describe("moderation contracts", () => {
  it("requires a non-empty deletion reason", () => {
    expect(DeletionRequestSchema.parse({ reason: "  duplicate  " })).toEqual({
      reason: "duplicate",
    });
    expect(() => DeletionRequestSchema.parse({ reason: "   " })).toThrow();
  });
});
