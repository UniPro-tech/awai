import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createMemoryServices } from "./services/services.js";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "User",
  role: "USER" as const,
};
const admin = {
  id: "00000000-0000-4000-8000-000000000002",
  displayName: "Admin",
  role: "ADMIN" as const,
};

function appFor(services: ReturnType<typeof createMemoryServices>, currentUser: typeof user | typeof admin) {
  return createApp({
    services,
    authenticate: async () => ({ status: "authenticated", user: currentUser }),
  });
}

describe("categories and tags", () => {
  it("allows all users to list taxonomy but only administrators to mutate it", async () => {
    const services = createMemoryServices();
    const userApp = appFor(services, user);
    const adminApp = appFor(services, admin);

    const denied = await userApp.request("/api/v1/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Governance" }),
    });
    expect(denied.status).toBe(403);

    const category = await adminApp.request("/api/v1/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Governance" }),
    });
    const tag = await adminApp.request("/api/v1/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "budget" }),
    });
    expect(category.status).toBe(201);
    expect(tag.status).toBe(201);
    const categories = await userApp.request("/api/v1/categories");
    const tags = await userApp.request("/api/v1/tags");
    expect(await categories.json()).toMatchObject({
      items: [{ name: "Governance" }],
    });
    expect(await tags.json()).toMatchObject({
      items: [{ name: "budget" }],
    });
  });
});
