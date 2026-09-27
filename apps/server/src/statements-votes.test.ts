import { afterEach, describe, expect, it } from "vitest";
import { app } from "./app.js";
import { statementService } from "./services/statement-service.js";
import { topicService } from "./services/topic-service.js";
import { voteService } from "./services/vote-service.js";

afterEach(() => {
  voteService.clearForTests();
  statementService.clearForTests();
  topicService.clearForTests();
});

async function createTopic(statementIdentityPolicy = "OPTIONAL") {
  const response = await app.request("/api/v1/topics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Topic", statementIdentityPolicy }),
  });
  return (await response.json()) as { id: string };
}

async function createStatement(topicId: string, authorVisibility = "ANONYMOUS") {
  return app.request(`/api/v1/topics/${topicId}/statements`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body: "A useful proposal", authorVisibility }),
  });
}

describe("statements and votes", () => {
  it("never exposes an anonymous statement author's internal identity", async () => {
    const topic = await createTopic();
    const response = await createStatement(topic.id);
    expect(response.status).toBe(201);
    const statement = await response.json();
    expect(statement.author).toEqual({ visibility: "ANONYMOUS", displayName: null });
    expect(statement).not.toHaveProperty("authorUserId");
  });

  it("enforces the topic identity policy for new statements", async () => {
    const topic = await createTopic("ANONYMOUS_REQUIRED");
    const response = await createStatement(topic.id, "IDENTIFIED");
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "STATEMENT_IDENTITY_POLICY_VIOLATION" },
    });
  });

  it("sets and replaces only the current user's vote", async () => {
    const topic = await createTopic();
    const created = await createStatement(topic.id);
    const statement = (await created.json()) as { id: string };

    for (const value of ["AGREE", "DISAGREE"] as const) {
      const response = await app.request(`/api/v1/statements/${statement.id}/vote`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ value });
    }

    const statistics = await app.request(`/api/v1/statements/${statement.id}/stats`);
    expect(await statistics.json()).toEqual({ agree: 0, disagree: 1, pass: 0, total: 1 });
  });

  it("returns aggregates without raw voter data", async () => {
    const topic = await createTopic();
    const created = await createStatement(topic.id);
    const statement = (await created.json()) as { id: string };
    const response = await app.request(`/api/v1/statements/${statement.id}/stats`);
    const body = await response.json();
    expect(body).toEqual({ agree: 0, disagree: 0, pass: 0, total: 0 });
    expect(JSON.stringify(body)).not.toContain("user");
  });
});
