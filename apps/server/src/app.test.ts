import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("rejects cookie-authenticated mutations from untrusted origins", async () => {
    const protectedApp = createApp({
      services: createMemoryServices(),
      authenticate: async () => ({ status: "authenticated", user: testUser }),
      csrfTrustedOrigins: ["https://community.example"],
    });
    const request = (origin?: string) => protectedApp.request("/api/v1/topics", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "better-auth.session_token=test",
        ...(origin ? { origin } : {}),
      },
      body: JSON.stringify({ title: "Protected topic" }),
    });

    expect((await request("https://attacker.example")).status).toBe(403);
    expect((await request()).status).toBe(403);
    expect((await request("https://community.example")).status).toBe(201);
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

  it("returns the common error contract for invalid JSON input", async () => {
    const response = await app.request("/api/v1/topics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request body is invalid.",
        requestId: expect.any(String),
      },
    });
  });

  it("returns the common error contract for malformed JSON", async () => {
    const response = await app.request("/api/v1/topics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", requestId: expect.any(String) },
    });
  });

  it("does not leak unexpected server errors", async () => {
    const services = createMemoryServices();
    services.topics.list = async () => {
      throw new Error("sensitive database detail");
    };
    const failing = createApp({
      services,
      authenticate: async () => ({ status: "authenticated", user: testUser }),
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await failing.request("/api/v1/topics");

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId: expect.any(String),
      },
    });
    errorLog.mockRestore();
  });

  it("returns the common error contract for unknown API routes", async () => {
    const response = await app.request("/api/v1/not-a-route");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "ROUTE_NOT_FOUND", requestId: expect.any(String) },
    });
  });
});
