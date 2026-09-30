import type {
  AdminAuditLogEntry,
  AdminUserResponse,
} from "@private-polis/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createMemoryAdminService } from "./services/admin-service.js";
import { createMemoryServices } from "./services/services.js";

const createdAt = "2026-09-28T00:00:00.000Z";
const adminUser: AdminUserResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Admin",
  role: "ADMIN",
  suspended: false,
  createdAt,
  updatedAt: createdAt,
};
const regularUser: AdminUserResponse = {
  id: "00000000-0000-4000-8000-000000000002",
  displayName: "Member",
  role: "USER",
  suspended: false,
  createdAt,
  updatedAt: createdAt,
};

const auditLogs: AdminAuditLogEntry[] = [
  {
    id: "00000000-0000-4000-8000-000000000020",
    actor: { id: adminUser.id, displayName: adminUser.displayName },
    action: "STATEMENT_DELETE",
    entityType: "statement",
    entityId: "00000000-0000-4000-8000-000000000010",
    metadata: { reason: "Duplicate" },
    createdAt: "2026-09-30T02:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000021",
    actor: { id: adminUser.id, displayName: adminUser.displayName },
    action: "TOPIC_STATUS_CHANGE",
    entityType: "topic",
    entityId: "00000000-0000-4000-8000-000000000011",
    metadata: { previousStatus: "DRAFT", status: "OPEN" },
    createdAt: "2026-09-30T01:00:00.000Z",
  },
];

function appFor(role: "USER" | "ADMIN") {
  const services = createMemoryServices();
  services.admin = createMemoryAdminService(
    [adminUser, regularUser],
    auditLogs,
  );
  return createApp({
    services,
    authenticate: async () => ({
      status: "authenticated",
      user: {
        id: role === "ADMIN" ? adminUser.id : regularUser.id,
        displayName: role === "ADMIN" ? "Admin" : "Member",
        role,
      },
    }),
  });
}

describe("admin users", () => {
  it("rejects a regular user", async () => {
    const response = await appFor("USER").request("/api/v1/admin/users");
    expect(response.status).toBe(403);
  });

  it("lists users and allows role and suspension changes", async () => {
    const app = appFor("ADMIN");
    const list = await app.request("/api/v1/admin/users");
    expect(list.status).toBe(200);
    expect((await list.json()).items).toHaveLength(2);

    const updated = await app.request(`/api/v1/admin/users/${regularUser.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "ADMIN", suspended: true }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ role: "ADMIN", suspended: true });
  });

  it("prevents an administrator from locking out their own account", async () => {
    const response = await appFor("ADMIN").request(`/api/v1/admin/users/${adminUser.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ suspended: true }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "ADMIN_SELF_LOCKOUT" } });
  });
});

describe("admin audit logs", () => {
  it("rejects a regular user", async () => {
    const response = await appFor("USER").request(
      "/api/v1/admin/audit-logs",
    );
    expect(response.status).toBe(403);
  });

  it("lists, filters, and paginates audit events newest first", async () => {
    const app = appFor("ADMIN");
    const list = await app.request(
      "/api/v1/admin/audit-logs?page=1&pageSize=1",
    );
    expect(list.status).toBe(200);
    expect(await list.json()).toMatchObject({
      items: [{ action: "STATEMENT_DELETE" }],
      pagination: { page: 1, pageSize: 1, total: 2, totalPages: 2 },
    });

    const filtered = await app.request(
      "/api/v1/admin/audit-logs?action=TOPIC_STATUS_CHANGE",
    );
    expect(filtered.status).toBe(200);
    expect(await filtered.json()).toMatchObject({
      items: [{ action: "TOPIC_STATUS_CHANGE" }],
      pagination: { total: 1, totalPages: 1 },
    });
  });

  it("rejects unsupported filters and pagination", async () => {
    const response = await appFor("ADMIN").request(
      "/api/v1/admin/audit-logs?action=UNKNOWN&page=0",
    );
    expect(response.status).toBe(400);
  });
});
