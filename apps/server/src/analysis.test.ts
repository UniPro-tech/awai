import type { AnalysisRunResponse } from "@private-polis/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createMemoryServices } from "./services/services.js";

const testUser = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Test User",
  role: "USER" as const,
};

describe("analysis results", () => {
  it("returns the latest privacy-safe result and run history", async () => {
    const services = createMemoryServices();
    const topic = await services.topics.create(
      {
        title: "Analysis topic",
        description: "",
        authorVisibility: "IDENTIFIED",
        statementIdentityPolicy: "OPTIONAL",
        categoryId: null,
        tags: [],
      },
      testUser,
    );
    const run: AnalysisRunResponse = {
      id: "00000000-0000-4000-8000-000000000010",
      status: "COMPLETED",
      algorithmVersion: "red-dwarf-0.4.0",
      participantCount: 2,
      statementCount: 2,
      completedAt: "2026-09-28T00:00:01.000Z",
      createdAt: "2026-09-28T00:00:00.000Z",
      groups: [{ ordinal: 0, participantCount: 2, centroid: { x: 0, y: 0 } }],
      points: [
        { x: -1, y: 0, groupOrdinal: 0 },
        { x: 1, y: 0, groupOrdinal: 0 },
      ],
      viewerPoint: { x: -1, y: 0, groupOrdinal: 0 },
      statementResults: [],
    };
    services.analysis = {
      latest: async () => run,
      listRuns: async () => [run],
      getRun: async (_topicId, runId) => (runId === run.id ? run : undefined),
    };
    const app = createApp({
      services,
      authenticate: async () => ({ status: "authenticated", user: testUser }),
    });

    const latest = await app.request(`/api/v1/topics/${topic.id}/analysis/latest`);
    expect(latest.status).toBe(200);
    expect(await latest.json()).toMatchObject({
      id: run.id,
      participantCount: 2,
      points: [{ groupOrdinal: 0 }, { groupOrdinal: 0 }],
      viewerPoint: { groupOrdinal: 0 },
    });

    const history = await app.request(`/api/v1/topics/${topic.id}/analysis/runs`);
    expect(history.status).toBe(200);
    expect(await history.json()).toMatchObject({ items: [{ id: run.id }] });
  });

  it("returns the common not-found error before analysis is available", async () => {
    const services = createMemoryServices();
    const topic = await services.topics.create(
      {
        title: "Pending topic",
        description: "",
        authorVisibility: "IDENTIFIED",
        statementIdentityPolicy: "OPTIONAL",
        categoryId: null,
        tags: [],
      },
      testUser,
    );
    const app = createApp({
      services,
      authenticate: async () => ({ status: "authenticated", user: testUser }),
    });

    const response = await app.request(`/api/v1/topics/${topic.id}/analysis/latest`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "ANALYSIS_NOT_FOUND", message: "Analysis run not found." },
    });
  });
});
