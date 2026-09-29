import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createMemoryServices } from "./services/services.js";

const testUser = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Test User",
  role: "USER" as const,
};

function authenticatedApp(services = createMemoryServices()) {
  return createApp({
    services,
    authenticate: async () => ({ status: "authenticated", user: testUser }),
  });
}

describe("statements and votes", () => {
  let services = createMemoryServices();
  let app = authenticatedApp();

  beforeEach(() => {
    services = createMemoryServices();
    app = authenticatedApp(services);
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

  it("isolates each authenticated user's current vote", async () => {
    const topic = await createTopic();
    const created = await createStatement(topic.id);
    const statement = (await created.json()) as { id: string };
    await app.request(`/api/v1/statements/${statement.id}/vote`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "AGREE" }),
    });

    const secondUserApp = createApp({
      services,
      authenticate: async () => ({
        status: "authenticated",
        user: { ...testUser, id: "00000000-0000-4000-8000-000000000002" },
      }),
    });
    const response = await secondUserApp.request(`/api/v1/statements/${statement.id}/vote`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ value: null });
  });

  it("lists only the current user's votes for a topic", async () => {
    const topic = await createTopic();
    const first = (await (await createStatement(topic.id)).json()) as { id: string };
    await createStatement(topic.id);
    await app.request(`/api/v1/statements/${first.id}/vote`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "AGREE" }),
    });

    const response = await app.request(`/api/v1/topics/${topic.id}/votes`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [{ statementId: first.id, value: "AGREE" }],
    });

    const secondUserApp = createApp({
      services,
      authenticate: async () => ({
        status: "authenticated",
        user: { ...testUser, id: "00000000-0000-4000-8000-000000000002" },
      }),
    });
    expect(
      await (await secondUserApp.request(`/api/v1/topics/${topic.id}/votes`)).json(),
    ).toEqual({ items: [] });
  });

  it("returns aggregates without raw voter data", async () => {
    const topic = await createTopic();
    const created = await createStatement(topic.id);
    const statement = (await created.json()) as { id: string };
    const hidden = await app.request(`/api/v1/statements/${statement.id}/stats`);
    expect(hidden.status).toBe(403);
    expect(await hidden.json()).toMatchObject({ error: { code: "VOTE_REQUIRED" } });

    await app.request(`/api/v1/statements/${statement.id}/vote`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "PASS" }),
    });
    const response = await app.request(`/api/v1/statements/${statement.id}/stats`);
    const body = await response.json();
    expect(body).toEqual({ agree: 0, disagree: 0, pass: 1, total: 1 });
    expect(JSON.stringify(body)).not.toContain("user");
  });

  it("soft-deletes and restores a statement with owner authorization", async () => {
    const topic = await createTopic();
    const created = await createStatement(topic.id, "IDENTIFIED");
    const statement = (await created.json()) as { id: string };
    const otherUserApp = createApp({
      services,
      authenticate: async () => ({
        status: "authenticated",
        user: { ...testUser, id: "00000000-0000-4000-8000-000000000002" },
      }),
    });

    const denied = await otherUserApp.request(`/api/v1/statements/${statement.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Not mine" }),
    });
    expect(denied.status).toBe(403);

    const deleted = await app.request(`/api/v1/statements/${statement.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Author requested removal" }),
    });
    expect(deleted.status).toBe(204);
    const afterDelete = await app.request(`/api/v1/topics/${topic.id}/statements`);
    expect(await afterDelete.json()).toEqual({ items: [] });

    const restored = await app.request(`/api/v1/statements/${statement.id}/restore`, {
      method: "POST",
    });
    expect(restored.status).toBe(204);
    const afterRestore = await app.request(`/api/v1/topics/${topic.id}/statements`);
    expect((await afterRestore.json()).items).toHaveLength(1);
  });

  it("soft-deletes and restores a topic without exposing it in between", async () => {
    const topic = await createTopic();
    const deleted = await app.request(`/api/v1/topics/${topic.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Duplicate topic" }),
    });
    expect(deleted.status).toBe(204);
    expect((await app.request(`/api/v1/topics/${topic.id}`)).status).toBe(404);

    const restored = await app.request(`/api/v1/topics/${topic.id}/restore`, { method: "POST" });
    expect(restored.status).toBe(204);
    expect((await app.request(`/api/v1/topics/${topic.id}`)).status).toBe(200);
  });
});
