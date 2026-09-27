import type { CreateTopicRequest } from "@private-polis/contracts";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../auth/session.js";
import type { Database } from "../db/client.js";
import { appUsers, auditLogs, tags as tagTable, topicTags, topics } from "../db/schema.js";
import type { TopicRecord } from "../presenters/topic.js";

export interface TopicService {
  list(): Promise<TopicRecord[]>;
  get(id: string, options?: { includeDeleted?: boolean }): Promise<TopicRecord | undefined>;
  create(input: CreateTopicRequest, user: AuthenticatedUser): Promise<TopicRecord>;
  delete(id: string, user: AuthenticatedUser, reason: string): Promise<TopicModerationResult>;
  restore(id: string, user: AuthenticatedUser): Promise<TopicModerationResult>;
}

export type TopicModerationResult =
  | { ok: true }
  | { error: "TOPIC_NOT_FOUND" | "PERMISSION_DENIED" };

const topicSelection = {
  id: topics.id,
  createdByUserId: topics.createdByUserId,
  ownerUserId: topics.ownerUserId,
  title: topics.title,
  description: topics.description,
  authorVisibility: topics.authorVisibility,
  authorDisplayName: appUsers.displayName,
  statementIdentityPolicy: topics.statementIdentityPolicy,
  status: topics.status,
  createdAt: topics.createdAt,
  updatedAt: topics.updatedAt,
  deletedAt: topics.deletedAt,
};

export function createPostgresTopicService(database: Database): TopicService {
  return {
    async list() {
      return database
        .select(topicSelection)
        .from(topics)
        .innerJoin(appUsers, eq(topics.createdByUserId, appUsers.id))
        .where(isNull(topics.deletedAt))
        .orderBy(desc(topics.createdAt));
    },

    async get(id, options) {
      const [topic] = await database
        .select(topicSelection)
        .from(topics)
        .innerJoin(appUsers, eq(topics.createdByUserId, appUsers.id))
        .where(
          options?.includeDeleted
            ? eq(topics.id, id)
            : and(eq(topics.id, id), isNull(topics.deletedAt)),
        )
        .limit(1);
      return topic;
    },

    async create(input, user) {
      return database.transaction(async (transaction) => {
        const [topic] = await transaction
          .insert(topics)
          .values({
            createdByUserId: user.id,
            ownerUserId: user.id,
            title: input.title,
            description: input.description,
            authorVisibility: input.authorVisibility,
            statementIdentityPolicy: input.statementIdentityPolicy,
            categoryId: input.categoryId,
          })
          .returning();
        if (!topic) throw new Error("Topic insertion did not return a row.");

        for (const name of [...new Set(input.tags)]) {
          const [tag] = await transaction
            .insert(tagTable)
            .values({ name })
            .onConflictDoUpdate({ target: tagTable.name, set: { updatedAt: new Date() } })
            .returning({ id: tagTable.id });
          if (tag) {
            await transaction.insert(topicTags).values({ topicId: topic.id, tagId: tag.id });
          }
        }

        return {
          id: topic.id,
          createdByUserId: topic.createdByUserId,
          ownerUserId: topic.ownerUserId,
          title: topic.title,
          description: topic.description,
          authorVisibility: topic.authorVisibility,
          authorDisplayName: user.displayName,
          statementIdentityPolicy: topic.statementIdentityPolicy,
          status: topic.status,
          createdAt: topic.createdAt,
          updatedAt: topic.updatedAt,
          deletedAt: topic.deletedAt,
        };
      });
    },

    async delete(id, user, reason) {
      const topic = await this.get(id);
      if (!topic) return { error: "TOPIC_NOT_FOUND" };
      if (user.role !== "ADMIN" && topic.ownerUserId !== user.id) {
        return { error: "PERMISSION_DENIED" };
      }
      const now = new Date();
      await database.transaction(async (transaction) => {
        await transaction
          .update(topics)
          .set({ deletedAt: now, deletedByUserId: user.id, deletionReason: reason, updatedAt: now })
          .where(eq(topics.id, id));
        await transaction.insert(auditLogs).values({
          actorUserId: user.id,
          action: "TOPIC_DELETE",
          entityType: "topic",
          entityId: id,
          metadata: { reason },
        });
      });
      return { ok: true };
    },

    async restore(id, user) {
      const topic = await this.get(id, { includeDeleted: true });
      if (!topic?.deletedAt) return { error: "TOPIC_NOT_FOUND" };
      if (user.role !== "ADMIN" && topic.ownerUserId !== user.id) {
        return { error: "PERMISSION_DENIED" };
      }
      const now = new Date();
      await database.transaction(async (transaction) => {
        await transaction
          .update(topics)
          .set({ deletedAt: null, deletedByUserId: null, deletionReason: null, updatedAt: now })
          .where(eq(topics.id, id));
        await transaction.insert(auditLogs).values({
          actorUserId: user.id,
          action: "TOPIC_RESTORE",
          entityType: "topic",
          entityId: id,
        });
      });
      return { ok: true };
    },
  };
}

export interface MemoryTopicService extends TopicService {
  clearForTests(): void;
}

export function createMemoryTopicService(): MemoryTopicService {
  const records = new Map<string, TopicRecord>();
  return {
    async list() {
      return [...records.values()]
        .filter((topic) => !topic.deletedAt)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async get(id, options) {
      const topic = records.get(id);
      if (!options?.includeDeleted && topic?.deletedAt) return undefined;
      return topic;
    },
    async create(input, user) {
      const now = new Date();
      const topic: TopicRecord = {
        id: crypto.randomUUID(),
        createdByUserId: user.id,
        ownerUserId: user.id,
        authorDisplayName: user.displayName,
        title: input.title,
        description: input.description,
        authorVisibility: input.authorVisibility,
        statementIdentityPolicy: input.statementIdentityPolicy,
        status: "OPEN",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      records.set(topic.id, topic);
      return topic;
    },
    async delete(id, user) {
      const topic = records.get(id);
      if (!topic || topic.deletedAt) return { error: "TOPIC_NOT_FOUND" };
      if (user.role !== "ADMIN" && topic.ownerUserId !== user.id) {
        return { error: "PERMISSION_DENIED" };
      }
      records.set(id, { ...topic, deletedAt: new Date(), updatedAt: new Date() });
      return { ok: true };
    },
    async restore(id, user) {
      const topic = records.get(id);
      if (!topic?.deletedAt) return { error: "TOPIC_NOT_FOUND" };
      if (user.role !== "ADMIN" && topic.ownerUserId !== user.id) {
        return { error: "PERMISSION_DENIED" };
      }
      records.set(id, { ...topic, deletedAt: null, updatedAt: new Date() });
      return { ok: true };
    },
    clearForTests() {
      records.clear();
    },
  };
}
