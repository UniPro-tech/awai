import type { CreateTopicRequest } from "@private-polis/contracts";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../auth/session.js";
import type { Database } from "../db/client.js";
import { appUsers, tags as tagTable, topicTags, topics } from "../db/schema.js";
import type { TopicRecord } from "../presenters/topic.js";

export interface TopicService {
  list(): Promise<TopicRecord[]>;
  get(id: string): Promise<TopicRecord | undefined>;
  create(input: CreateTopicRequest, user: AuthenticatedUser): Promise<TopicRecord>;
}

const topicSelection = {
  id: topics.id,
  createdByUserId: topics.createdByUserId,
  title: topics.title,
  description: topics.description,
  authorVisibility: topics.authorVisibility,
  authorDisplayName: appUsers.displayName,
  statementIdentityPolicy: topics.statementIdentityPolicy,
  status: topics.status,
  createdAt: topics.createdAt,
  updatedAt: topics.updatedAt,
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

    async get(id) {
      const [topic] = await database
        .select(topicSelection)
        .from(topics)
        .innerJoin(appUsers, eq(topics.createdByUserId, appUsers.id))
        .where(and(eq(topics.id, id), isNull(topics.deletedAt)))
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
          title: topic.title,
          description: topic.description,
          authorVisibility: topic.authorVisibility,
          authorDisplayName: user.displayName,
          statementIdentityPolicy: topic.statementIdentityPolicy,
          status: topic.status,
          createdAt: topic.createdAt,
          updatedAt: topic.updatedAt,
        };
      });
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
      return [...records.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async get(id) {
      return records.get(id);
    },
    async create(input, user) {
      const now = new Date();
      const topic: TopicRecord = {
        id: crypto.randomUUID(),
        createdByUserId: user.id,
        authorDisplayName: user.displayName,
        title: input.title,
        description: input.description,
        authorVisibility: input.authorVisibility,
        statementIdentityPolicy: input.statementIdentityPolicy,
        status: "OPEN",
        createdAt: now,
        updatedAt: now,
      };
      records.set(topic.id, topic);
      return topic;
    },
    clearForTests() {
      records.clear();
    },
  };
}
