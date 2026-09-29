import type {
  ChangeTopicOwnerRequest,
  CreateTopicRequest,
  UpdateTopicRequest,
} from "@private-polis/contracts";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../auth/session.js";
import type { Database } from "../db/client.js";
import {
  appUsers,
  auditLogs,
  categories,
  tags as tagTable,
  topicTags,
  topics,
} from "../db/schema.js";
import type { TopicRecord } from "../presenters/topic.js";

export interface TopicService {
  list(options?: TopicListOptions): Promise<TopicRecord[]>;
  get(id: string, options?: { includeDeleted?: boolean }): Promise<TopicRecord | undefined>;
  create(input: CreateTopicRequest, user: AuthenticatedUser): Promise<TopicRecord>;
  update(id: string, input: UpdateTopicRequest, user: AuthenticatedUser): Promise<TopicUpdateResult>;
  changeOwner(
    id: string,
    input: ChangeTopicOwnerRequest,
    user: AuthenticatedUser,
  ): Promise<TopicUpdateResult>;
  delete(id: string, user: AuthenticatedUser, reason: string): Promise<TopicModerationResult>;
  restore(id: string, user: AuthenticatedUser): Promise<TopicModerationResult>;
}

export interface TopicListOptions {
  categoryId?: string;
}

export type TopicModerationResult =
  | { ok: true }
  | { error: "TOPIC_NOT_FOUND" | "PERMISSION_DENIED" };

export type TopicUpdateResult =
  | { topic: TopicRecord }
  | { error: "TOPIC_NOT_FOUND" | "USER_NOT_FOUND" | "PERMISSION_DENIED" };

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
  categoryId: categories.id,
  categoryName: categories.name,
};

type TopicRow = Omit<TopicRecord, "category" | "tags"> & {
  categoryId: string | null;
  categoryName: string | null;
};

export function createPostgresTopicService(database: Database): TopicService {
  async function hydrateTags(rows: TopicRow[]) {
    if (rows.length === 0) return [];
    const tagRows = await database
      .select({ topicId: topicTags.topicId, id: tagTable.id, name: tagTable.name })
      .from(topicTags)
      .innerJoin(tagTable, eq(topicTags.tagId, tagTable.id))
      .where(inArray(topicTags.topicId, rows.map((row) => row.id)))
      .orderBy(asc(tagTable.name));
    const tagsByTopic = new Map<string, Array<{ id: string; name: string }>>();
    for (const tag of tagRows) {
      const current = tagsByTopic.get(tag.topicId) ?? [];
      current.push({ id: tag.id, name: tag.name });
      tagsByTopic.set(tag.topicId, current);
    }
    return rows.map(({ categoryId, categoryName, ...topic }) => ({
      ...topic,
      category: categoryId && categoryName ? { id: categoryId, name: categoryName } : null,
      tags: tagsByTopic.get(topic.id) ?? [],
    })) as TopicRecord[];
  }

  return {
    async list(options) {
      const rows = await database
        .select(topicSelection)
        .from(topics)
        .innerJoin(appUsers, eq(topics.createdByUserId, appUsers.id))
        .leftJoin(categories, eq(topics.categoryId, categories.id))
        .where(
          options?.categoryId
            ? and(isNull(topics.deletedAt), eq(topics.categoryId, options.categoryId))
            : isNull(topics.deletedAt),
        )
        .orderBy(desc(topics.createdAt));
      return hydrateTags(rows);
    },

    async get(id, options) {
      const [topic] = await database
        .select(topicSelection)
        .from(topics)
        .innerJoin(appUsers, eq(topics.createdByUserId, appUsers.id))
        .leftJoin(categories, eq(topics.categoryId, categories.id))
        .where(
          options?.includeDeleted
            ? eq(topics.id, id)
            : and(eq(topics.id, id), isNull(topics.deletedAt)),
        )
        .limit(1);
      return topic ? (await hydrateTags([topic]))[0] : undefined;
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

        const topicTagRecords: Array<{ id: string; name: string }> = [];
        for (const name of [...new Set(input.tags)]) {
          const [tag] = await transaction
            .insert(tagTable)
            .values({ name })
            .onConflictDoUpdate({ target: tagTable.name, set: { updatedAt: new Date() } })
            .returning({ id: tagTable.id });
          if (tag) {
            await transaction.insert(topicTags).values({ topicId: topic.id, tagId: tag.id });
            topicTagRecords.push({ id: tag.id, name });
          }
        }

        const [category] = topic.categoryId
          ? await transaction
              .select({ id: categories.id, name: categories.name })
              .from(categories)
              .where(eq(categories.id, topic.categoryId))
              .limit(1)
          : [];

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
          category: category ?? null,
          tags: topicTagRecords.sort((a, b) => a.name.localeCompare(b.name)),
        };
      });
    },

    async update(id, input, user) {
      const current = await this.get(id);
      if (!current) return { error: "TOPIC_NOT_FOUND" };
      if (user.role !== "ADMIN" && current.ownerUserId !== user.id) {
        return { error: "PERMISSION_DENIED" };
      }
      const now = new Date();
      await database.transaction(async (transaction) => {
        await transaction
          .update(topics)
          .set({
            ...(input.status === undefined ? {} : { status: input.status }),
            ...(input.statementIdentityPolicy === undefined
              ? {}
              : { statementIdentityPolicy: input.statementIdentityPolicy }),
            updatedAt: now,
          })
          .where(and(eq(topics.id, id), isNull(topics.deletedAt)));
        if (
          input.statementIdentityPolicy !== undefined &&
          input.statementIdentityPolicy !== current.statementIdentityPolicy
        ) {
          await transaction.insert(auditLogs).values({
            actorUserId: user.id,
            action: "IDENTITY_POLICY_CHANGE",
            entityType: "topic",
            entityId: id,
            metadata: {
              previousPolicy: current.statementIdentityPolicy,
              policy: input.statementIdentityPolicy,
            },
          });
        }
        if (input.status !== undefined && input.status !== current.status) {
          await transaction.insert(auditLogs).values({
            actorUserId: user.id,
            action: "TOPIC_STATUS_CHANGE",
            entityType: "topic",
            entityId: id,
            metadata: { previousStatus: current.status, status: input.status },
          });
        }
      });
      const topic = await this.get(id);
      if (!topic) return { error: "TOPIC_NOT_FOUND" };
      return { topic };
    },

    async changeOwner(id, input, user) {
      const current = await this.get(id);
      if (!current) return { error: "TOPIC_NOT_FOUND" };
      if (user.role !== "ADMIN" && current.ownerUserId !== user.id) {
        return { error: "PERMISSION_DENIED" };
      }
      const [newOwner] = await database
        .select({ id: appUsers.id })
        .from(appUsers)
        .where(and(eq(appUsers.id, input.ownerUserId), eq(appUsers.suspended, false)))
        .limit(1);
      if (!newOwner) return { error: "USER_NOT_FOUND" };
      if (newOwner.id !== current.ownerUserId) {
        const now = new Date();
        await database.transaction(async (transaction) => {
          await transaction
            .update(topics)
            .set({ ownerUserId: newOwner.id, updatedAt: now })
            .where(and(eq(topics.id, id), isNull(topics.deletedAt)));
          await transaction.insert(auditLogs).values({
            actorUserId: user.id,
            action: "TOPIC_OWNER_CHANGE",
            entityType: "topic",
            entityId: id,
            metadata: { previousOwnerUserId: current.ownerUserId, ownerUserId: newOwner.id },
          });
        });
      }
      const topic = await this.get(id);
      if (!topic) return { error: "TOPIC_NOT_FOUND" };
      return { topic };
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
    async list(options) {
      return [...records.values()]
        .filter(
          (topic) =>
            !topic.deletedAt &&
            (!options?.categoryId || topic.category?.id === options.categoryId),
        )
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
        category: null,
        tags: [...new Set(input.tags)].map((name) => ({ id: crypto.randomUUID(), name })),
      };
      records.set(topic.id, topic);
      return topic;
    },
    async update(id, input, user) {
      const topic = records.get(id);
      if (!topic || topic.deletedAt) return { error: "TOPIC_NOT_FOUND" };
      if (user.role !== "ADMIN" && topic.ownerUserId !== user.id) {
        return { error: "PERMISSION_DENIED" };
      }
      const updated = { ...topic, ...input, updatedAt: new Date() };
      records.set(id, updated);
      return { topic: updated };
    },
    async changeOwner(id, input, user) {
      const topic = records.get(id);
      if (!topic || topic.deletedAt) return { error: "TOPIC_NOT_FOUND" };
      if (user.role !== "ADMIN" && topic.ownerUserId !== user.id) {
        return { error: "PERMISSION_DENIED" };
      }
      const updated = { ...topic, ownerUserId: input.ownerUserId, updatedAt: new Date() };
      records.set(id, updated);
      return { topic: updated };
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
