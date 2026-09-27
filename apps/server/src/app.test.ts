import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createMemoryServices } from "./services/services.js";

const testUser = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Test User",
  role: "USER" as const,
};

function authenticatedApp(readinessCheck = async () => true) {
  return createApp({
    readinessCheck,
    services: createMemoryServices(),
    authenticate: async () => ({ status: "authenticated", user: testUser }),
  });
}

describe("application", () => {
  let app = authenticatedApp();

  beforeEach(() => {
    app = authenticatedApp();
  });

  it("reports liveness", async () => {
    const response = await app.request("/health/live");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("uses database connectivity for readiness", async () => {
    const ready = authenticatedApp(async () => true);
    const unavailable = authenticatedApp(async () => false);

    expect((await ready.request("/health/ready")).status).toBe(200);
    expect((await unavailable.request("/health/ready")).status).toBe(503);
  });

  it("requires authentication for versioned API routes", async () => {
    const unauthenticated = createApp({
      services: createMemoryServices(),
      authenticate: async () => ({ status: "unauthenticated" }),
    });
    const response = await unauthenticated.request("/api/v1/topics");
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "AUTHENTICATION_REQUIRED" },
    });
  });

  it("creates an anonymous topic without exposing identity", async () => {
    const response = await app.request("/api/v1/topics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Anonymous topic", authorVisibility: "ANONYMOUS" }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.author).toEqual({ visibility: "ANONYMOUS", displayName: null });
    expect(body).not.toHaveProperty("createdByUserId");
  });

  it("returns the common error contract", async () => {
    const response = await app.request(
      "/api/v1/topics/0198f38e-c18a-7e9f-a005-629e4c37ae40",
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "TOPIC_NOT_FOUND", message: "Topic not found." },
    });
  });
});
