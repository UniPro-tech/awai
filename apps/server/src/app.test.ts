import { afterEach, describe, expect, it } from "vitest";
import { app } from "./app.js";
import { topicService } from "./services/topic-service.js";

afterEach(() => topicService.clearForTests());

describe("application", () => {
  it("reports liveness", async () => {
    const response = await app.request("/health/live");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
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
