import type { CreateStatementRequest } from "@private-polis/contracts";
import type { StatementRecord } from "../presenters/statement.js";
import { topicService } from "./topic-service.js";

export type StatementCreationError =
  | "TOPIC_NOT_FOUND"
  | "TOPIC_CLOSED"
  | "STATEMENT_IDENTITY_POLICY_VIOLATION";

const statements = new Map<string, StatementRecord>();

export const statementService = {
  listByTopic(topicId: string): StatementRecord[] {
    return [...statements.values()]
      .filter((statement) => statement.topicId === topicId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  get(id: string): StatementRecord | undefined {
    return statements.get(id);
  },

  create(
    topicId: string,
    input: CreateStatementRequest,
  ): { statement: StatementRecord } | { error: StatementCreationError } {
    const topic = topicService.get(topicId);
    if (!topic) return { error: "TOPIC_NOT_FOUND" };
    if (topic.status !== "OPEN") return { error: "TOPIC_CLOSED" };
    if (
      (topic.statementIdentityPolicy === "ANONYMOUS_REQUIRED" &&
        input.authorVisibility !== "ANONYMOUS") ||
      (topic.statementIdentityPolicy === "IDENTIFIED_REQUIRED" &&
        input.authorVisibility !== "IDENTIFIED")
    ) {
      return { error: "STATEMENT_IDENTITY_POLICY_VIOLATION" };
    }

    const now = new Date();
    const statement: StatementRecord = {
      id: crypto.randomUUID(),
      topicId,
      authorUserId: "development-user",
      authorDisplayName: "Development User",
      body: input.body,
      authorVisibility: input.authorVisibility,
      createdAt: now,
      updatedAt: now,
    };
    statements.set(statement.id, statement);
    return { statement };
  },

  clearForTests(): void {
    statements.clear();
  },
};
