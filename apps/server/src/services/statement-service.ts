import type { CreateStatementRequest } from "@private-polis/contracts";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../auth/session.js";
import type { Database } from "../db/client.js";
import { appUsers, auditLogs, statements } from "../db/schema.js";
import type { StatementRecord } from "../presenters/statement.js";
import type { AnalysisQueue } from "./analysis-queue.js";
import type { TopicService } from "./topic-service.js";

export type StatementCreationError =
  | "TOPIC_NOT_FOUND"
  | "TOPIC_CLOSED"
  | "STATEMENT_IDENTITY_POLICY_VIOLATION";

export type StatementCreationResult =
  | { statement: StatementRecord }
  | { error: StatementCreationError };

export interface StatementService {
  listByTopic(topicId: string): Promise<StatementRecord[]>;
  get(id: string, options?: { includeDeleted?: boolean }): Promise<StatementRecord | undefined>;
  create(
    topicId: string,
    input: CreateStatementRequest,
    user: AuthenticatedUser,
  ): Promise<StatementCreationResult>;
  delete(id: string, user: AuthenticatedUser, reason: string): Promise<StatementModerationResult>;
  restore(id: string, user: AuthenticatedUser): Promise<StatementModerationResult>;
}

export type StatementModerationResult =
  | { ok: true }
  | { error: "STATEMENT_NOT_FOUND" | "PERMISSION_DENIED" };

const statementSelection = {
  id: statements.id,
  topicId: statements.topicId,
  authorUserId: statements.authorUserId,
  authorDisplayName: appUsers.displayName,
  body: statements.body,
  authorVisibility: statements.authorVisibility,
  createdAt: statements.createdAt,
  updatedAt: statements.updatedAt,
  deletedAt: statements.deletedAt,
};

function identityPolicyViolation(
  policy: "OPTIONAL" | "ANONYMOUS_REQUIRED" | "IDENTIFIED_REQUIRED",
  visibility: "IDENTIFIED" | "ANONYMOUS",
): boolean {
  return (
    (policy === "ANONYMOUS_REQUIRED" && visibility !== "ANONYMOUS") ||
    (policy === "IDENTIFIED_REQUIRED" && visibility !== "IDENTIFIED")
  );
}

export function createPostgresStatementService(
  database: Database,
  topicService: TopicService,
  analysisQueue: AnalysisQueue,
): StatementService {
  return {
    async listByTopic(topicId) {
      return database
        .select(statementSelection)
        .from(statements)
        .innerJoin(appUsers, eq(statements.authorUserId, appUsers.id))
        .where(and(eq(statements.topicId, topicId), isNull(statements.deletedAt)))
        .orderBy(asc(statements.createdAt));
    },

    async get(id, options) {
      const [statement] = await database
        .select(statementSelection)
        .from(statements)
        .innerJoin(appUsers, eq(statements.authorUserId, appUsers.id))
        .where(
          options?.includeDeleted
            ? eq(statements.id, id)
            : and(eq(statements.id, id), isNull(statements.deletedAt)),
        )
        .limit(1);
      return statement;
    },

    async create(topicId, input, user) {
      const topic = await topicService.get(topicId);
      if (!topic) return { error: "TOPIC_NOT_FOUND" };
      if (topic.status !== "OPEN") return { error: "TOPIC_CLOSED" };
      if (identityPolicyViolation(topic.statementIdentityPolicy, input.authorVisibility)) {
        return { error: "STATEMENT_IDENTITY_POLICY_VIOLATION" };
      }

      const [statement] = await database
        .insert(statements)
        .values({
          topicId,
          authorUserId: user.id,
          body: input.body,
          authorVisibility: input.authorVisibility,
        })
        .returning();
      if (!statement) throw new Error("Statement insertion did not return a row.");
      await analysisQueue.enqueue(topicId);
      return {
        statement: {
          id: statement.id,
          topicId: statement.topicId,
          authorUserId: statement.authorUserId,
          authorDisplayName: user.displayName,
          body: statement.body,
          authorVisibility: statement.authorVisibility,
          createdAt: statement.createdAt,
          updatedAt: statement.updatedAt,
          deletedAt: statement.deletedAt,
        },
      };
    },

    async delete(id, user, reason) {
      const statement = await this.get(id);
      if (!statement) return { error: "STATEMENT_NOT_FOUND" };
      const topic = await topicService.get(statement.topicId, { includeDeleted: true });
      const permitted =
        user.role === "ADMIN" ||
        statement.authorUserId === user.id ||
        topic?.ownerUserId === user.id;
      if (!permitted) return { error: "PERMISSION_DENIED" };
      const now = new Date();
      await database.transaction(async (transaction) => {
        await transaction
          .update(statements)
          .set({ deletedAt: now, deletedByUserId: user.id, deletionReason: reason, updatedAt: now })
          .where(eq(statements.id, id));
        await transaction.insert(auditLogs).values({
          actorUserId: user.id,
          action: "STATEMENT_DELETE",
          entityType: "statement",
          entityId: id,
          metadata: { reason },
        });
      });
      await analysisQueue.enqueue(statement.topicId);
      return { ok: true };
    },

    async restore(id, user) {
      const statement = await this.get(id, { includeDeleted: true });
      if (!statement?.deletedAt) return { error: "STATEMENT_NOT_FOUND" };
      const topic = await topicService.get(statement.topicId, { includeDeleted: true });
      const permitted =
        user.role === "ADMIN" ||
        statement.authorUserId === user.id ||
        topic?.ownerUserId === user.id;
      if (!permitted) return { error: "PERMISSION_DENIED" };
      const now = new Date();
      await database.transaction(async (transaction) => {
        await transaction
          .update(statements)
          .set({ deletedAt: null, deletedByUserId: null, deletionReason: null, updatedAt: now })
          .where(eq(statements.id, id));
        await transaction.insert(auditLogs).values({
          actorUserId: user.id,
          action: "STATEMENT_RESTORE",
          entityType: "statement",
          entityId: id,
        });
      });
      await analysisQueue.enqueue(statement.topicId);
      return { ok: true };
    },
  };
}

export interface MemoryStatementService extends StatementService {
  clearForTests(): void;
}

export function createMemoryStatementService(
  topicService: TopicService,
  analysisQueue: AnalysisQueue,
): MemoryStatementService {
  const records = new Map<string, StatementRecord>();
  return {
    async listByTopic(topicId) {
      return [...records.values()]
        .filter((statement) => statement.topicId === topicId && !statement.deletedAt)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    async get(id, options) {
      const statement = records.get(id);
      if (!options?.includeDeleted && statement?.deletedAt) return undefined;
      return statement;
    },
    async create(topicId, input, user) {
      const topic = await topicService.get(topicId);
      if (!topic) return { error: "TOPIC_NOT_FOUND" };
      if (topic.status !== "OPEN") return { error: "TOPIC_CLOSED" };
      if (identityPolicyViolation(topic.statementIdentityPolicy, input.authorVisibility)) {
        return { error: "STATEMENT_IDENTITY_POLICY_VIOLATION" };
      }
      const now = new Date();
      const statement: StatementRecord = {
        id: crypto.randomUUID(),
        topicId,
        authorUserId: user.id,
        authorDisplayName: user.displayName,
        body: input.body,
        authorVisibility: input.authorVisibility,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      records.set(statement.id, statement);
      await analysisQueue.enqueue(topicId);
      return { statement };
    },
    async delete(id, user) {
      const statement = records.get(id);
      if (!statement || statement.deletedAt) return { error: "STATEMENT_NOT_FOUND" };
      const topic = await topicService.get(statement.topicId, { includeDeleted: true });
      const permitted =
        user.role === "ADMIN" ||
        statement.authorUserId === user.id ||
        topic?.ownerUserId === user.id;
      if (!permitted) return { error: "PERMISSION_DENIED" };
      records.set(id, { ...statement, deletedAt: new Date(), updatedAt: new Date() });
      await analysisQueue.enqueue(statement.topicId);
      return { ok: true };
    },
    async restore(id, user) {
      const statement = records.get(id);
      if (!statement?.deletedAt) return { error: "STATEMENT_NOT_FOUND" };
      const topic = await topicService.get(statement.topicId, { includeDeleted: true });
      const permitted =
        user.role === "ADMIN" ||
        statement.authorUserId === user.id ||
        topic?.ownerUserId === user.id;
      if (!permitted) return { error: "PERMISSION_DENIED" };
      records.set(id, { ...statement, deletedAt: null, updatedAt: new Date() });
      await analysisQueue.enqueue(statement.topicId);
      return { ok: true };
    },
    clearForTests() {
      records.clear();
    },
  };
}
