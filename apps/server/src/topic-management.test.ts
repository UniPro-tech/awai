import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { createMemoryServices, type ApplicationServices } from "./services/services.js";

const owner = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Owner",
  role: "USER" as const,
};
const otherUser = {
  id: "00000000-0000-4000-8000-000000000002",
  displayName: "Other user",
  role: "USER" as const,
};
const administrator = {
  id: "00000000-0000-4000-8000-000000000003",
  displayName: "Administrator",
  role: "ADMIN" as const,
};

function appFor(services: ApplicationServices, user: typeof owner | typeof administrator) {
  return createApp({
    services,
    authenticate: async () => ({ status: "authenticated", user }),
  });
}

async function createTopic(services: ApplicationServices) {
  return services.topics.create(
    {
      title: "Managed topic",
      description: "",
      authorVisibility: "IDENTIFIED",
      statementIdentityPolicy: "OPTIONAL",
      categoryId: null,
      tags: [],
    },
    owner,
  );
}

describe("topic management", () => {
  let services: ApplicationServices;

  beforeEach(() => {
    services = createMemoryServices();
  });

  it("filters the topic list by category and tag", async () => {
    const categoryId = "00000000-0000-4000-8000-000000000010";
    const tagId = "00000000-0000-4000-8000-000000000011";
    const list = vi.fn().mockResolvedValue([]);
    services.topics.list = list;

    const response = await appFor(services, owner).request(
      `/api/v1/topics?categoryId=${categoryId}&tagId=${tagId}`,
    );

    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith({ categoryId, tagId });
  });

  it("rejects an invalid category filter", async () => {
    const list = vi.fn().mockResolvedValue([]);
    services.topics.list = list;

    const response = await appFor(services, owner).request(
      "/api/v1/topics?categoryId=not-a-uuid",
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(list).not.toHaveBeenCalled();
  });

  it("rejects an invalid tag filter", async () => {
    const list = vi.fn().mockResolvedValue([]);
    services.topics.list = list;

    const response = await appFor(services, owner).request(
      "/api/v1/topics?tagId=not-a-uuid",
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(list).not.toHaveBeenCalled();
  });

  it("lets the topic owner update status and identity policy", async () => {
    const topic = await createTopic(services);
    const response = await appFor(services, owner).request(`/api/v1/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "CLOSED", statementIdentityPolicy: "ANONYMOUS_REQUIRED" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "CLOSED",
      statementIdentityPolicy: "ANONYMOUS_REQUIRED",
    });
  });

  it("rejects topic settings changes from another user", async () => {
    const topic = await createTopic(services);
    const response = await appFor(services, otherUser).request(`/api/v1/topics/${topic.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "PERMISSION_DENIED" } });
  });

  it("lets an administrator transfer topic ownership", async () => {
    const topic = await createTopic(services);
    const response = await appFor(services, administrator).request(
      `/api/v1/topics/${topic.id}/owner`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerUserId: otherUser.id }),
      },
    );

    expect(response.status).toBe(200);
    expect((await services.topics.get(topic.id))?.ownerUserId).toBe(otherUser.id);
  });
});
