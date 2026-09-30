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

function appFor(
  services: ReturnType<typeof createMemoryServices>,
  currentUser: typeof user | typeof admin,
  categoryCreationAdminOnly = false,
) {
  return createApp({
    services,
    authenticate: async () => ({ status: "authenticated", user: currentUser }),
    categoryCreationAdminOnly,
  });
}

describe("categories and tags", () => {
  it("allows members to create and list taxonomy while only administrators can delete it", async () => {
    const services = createMemoryServices();
    const userApp = appFor(services, user);
    const adminApp = appFor(services, admin);

    const category = await userApp.request("/api/v1/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Governance" }),
    });
    const tag = await userApp.request("/api/v1/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "budget" }),
    });
    expect(category.status).toBe(201);
    expect(tag.status).toBe(201);
    const categoryBody = await category.json();
    const tagBody = await tag.json();
    const deniedDelete = await userApp.request(`/api/v1/categories/${categoryBody.id}`, {
      method: "DELETE",
    });
    expect(deniedDelete.status).toBe(403);
    const categories = await userApp.request("/api/v1/categories");
    const tags = await userApp.request("/api/v1/tags");
    expect(await categories.json()).toMatchObject({
      items: [{ name: "Governance" }],
    });
    expect(await tags.json()).toMatchObject({
      items: [{ name: "budget" }],
    });
    expect((await adminApp.request(`/api/v1/categories/${categoryBody.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await adminApp.request(`/api/v1/tags/${tagBody.id}`, { method: "DELETE" })).status).toBe(204);
  });

  it("restricts category creation to administrators when configured", async () => {
    const services = createMemoryServices();
    const request = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Governance" }),
    };

    const denied = await appFor(services, user, true).request("/api/v1/categories", request);
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: { code: "PERMISSION_DENIED" } });

    const memberTag = await appFor(services, user, true).request("/api/v1/tags", {
      ...request,
      body: JSON.stringify({ name: "budget" }),
    });
    expect(memberTag.status).toBe(201);

    const created = await appFor(services, admin, true).request("/api/v1/categories", request);
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ name: "Governance" });
  });
});
