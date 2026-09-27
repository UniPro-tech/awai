import type { AdminUserResponse, UpdateAdminUserRequest } from "@private-polis/contracts";
import { asc, eq } from "drizzle-orm";
import type { AuthenticatedUser } from "../auth/session.js";
import type { Database } from "../db/client.js";
import { appUsers, auditLogs } from "../db/schema.js";

export type AdminUserMutationResult =
  | { user: AdminUserResponse }
  | { error: "PERMISSION_DENIED" | "USER_NOT_FOUND" | "ADMIN_SELF_LOCKOUT" };

export interface AdminService {
  listUsers(actor: AuthenticatedUser): Promise<AdminUserResponse[] | { error: "PERMISSION_DENIED" }>;
  updateUser(
    id: string,
    input: UpdateAdminUserRequest,
    actor: AuthenticatedUser,
  ): Promise<AdminUserMutationResult>;
}

const selection = {
  id: appUsers.id,
  displayName: appUsers.displayName,
  role: appUsers.role,
  suspended: appUsers.suspended,
  createdAt: appUsers.createdAt,
  updatedAt: appUsers.updatedAt,
};

function present(user: {
  id: string;
  displayName: string;
  role: "USER" | "ADMIN";
  suspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AdminUserResponse {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function createPostgresAdminService(database: Database): AdminService {
  return {
    async listUsers(actor) {
      if (actor.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
      const users = await database.select(selection).from(appUsers).orderBy(asc(appUsers.createdAt));
      return users.map(present);
    },
    async updateUser(id, input, actor) {
      if (actor.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
      const [current] = await database.select(selection).from(appUsers).where(eq(appUsers.id, id)).limit(1);
      if (!current) return { error: "USER_NOT_FOUND" };
      if (id === actor.id && (input.role === "USER" || input.suspended === true)) {
        return { error: "ADMIN_SELF_LOCKOUT" };
      }
      const now = new Date();
      const [updated] = await database.transaction(async (transaction) => {
        const rows = await transaction
          .update(appUsers)
          .set({
            ...(input.role === undefined ? {} : { role: input.role }),
            ...(input.suspended === undefined ? {} : { suspended: input.suspended }),
            updatedAt: now,
          })
          .where(eq(appUsers.id, id))
          .returning(selection);
        if (input.role !== undefined && input.role !== current.role) {
          await transaction.insert(auditLogs).values({
            actorUserId: actor.id,
            action: "ADMIN_ROLE_CHANGE",
            entityType: "user",
            entityId: id,
            metadata: { previousRole: current.role, role: input.role },
          });
        }
        if (input.suspended !== undefined && input.suspended !== current.suspended) {
          await transaction.insert(auditLogs).values({
            actorUserId: actor.id,
            action: "USER_SUSPENSION_CHANGE",
            entityType: "user",
            entityId: id,
            metadata: { previousSuspended: current.suspended, suspended: input.suspended },
          });
        }
        return rows;
      });
      if (!updated) return { error: "USER_NOT_FOUND" };
      return { user: present(updated) };
    },
  };
}

export function createMemoryAdminService(initialUsers: AdminUserResponse[] = []): AdminService {
  const users = new Map(initialUsers.map((user) => [user.id, user]));
  return {
    async listUsers(actor) {
      if (actor.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
      return [...users.values()];
    },
    async updateUser(id, input, actor) {
      if (actor.role !== "ADMIN") return { error: "PERMISSION_DENIED" };
      const current = users.get(id);
      if (!current) return { error: "USER_NOT_FOUND" };
      if (id === actor.id && (input.role === "USER" || input.suspended === true)) {
        return { error: "ADMIN_SELF_LOCKOUT" };
      }
      const updated = {
        ...current,
        ...input,
        updatedAt: new Date().toISOString(),
      };
      users.set(id, updated);
      return { user: updated };
    },
  };
}
