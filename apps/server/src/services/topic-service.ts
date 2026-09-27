import type { CreateTopicRequest } from "@private-polis/contracts";
import type { TopicRecord } from "../presenters/topic.js";

const topics = new Map<string, TopicRecord>();

export const topicService = {
  list(): TopicRecord[] {
    return [...topics.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  get(id: string): TopicRecord | undefined {
    return topics.get(id);
  },

  create(input: CreateTopicRequest): TopicRecord {
    const now = new Date();
    const topic: TopicRecord = {
      id: crypto.randomUUID(),
      createdByUserId: "development-user",
      authorDisplayName: "Development User",
      title: input.title,
      description: input.description,
      authorVisibility: input.authorVisibility,
      statementIdentityPolicy: input.statementIdentityPolicy,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    };
    topics.set(topic.id, topic);
    return topic;
  },

  clearForTests(): void {
    topics.clear();
  },
};
