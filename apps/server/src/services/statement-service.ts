import type { CreateStatementRequest } from "@private-polis/contracts";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../auth/session.js";
import type { Database } from "../db/client.js";
import { appUsers, statements } from "../db/schema.js";
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
  get(id: string): Promise<StatementRecord | undefined>;
  create(
    topicId: string,
    input: CreateStatementRequest,
    user: AuthenticatedUser,
  ): Promise<StatementCreationResult>;
}

const statementSelection = {
  id: statements.id,
  topicId: statements.topicId,
  authorUserId: statements.authorUserId,
  authorDisplayName: appUsers.displayName,
  body: statements.body,
  authorVisibility: statements.authorVisibility,
  createdAt: statements.createdAt,
  updatedAt: statements.updatedAt,
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

    async get(id) {
      const [statement] = await database
        .select(statementSelection)
        .from(statements)
        .innerJoin(appUsers, eq(statements.authorUserId, appUsers.id))
        .where(and(eq(statements.id, id), isNull(statements.deletedAt)))
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
        },
      };
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
        .filter((statement) => statement.topicId === topicId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    async get(id) {
      return records.get(id);
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
      };
      records.set(statement.id, statement);
      await analysisQueue.enqueue(topicId);
      return { statement };
    },
    clearForTests() {
      records.clear();
    },
  };
}
